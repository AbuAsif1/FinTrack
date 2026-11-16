/**
 * Thin REST client for SETUP and CROSS-CHECKS only. The action under test is always performed
 * through the UI; the API is used to build the starting data quickly and to read back exact
 * figures that the UI shows in rounded or combined form.
 */
import type { APIRequestContext } from '@playwright/test';
import { currentMonth, fiscalYear } from './dates';

export type Account = {
  id: string; name: string; type: string; balance_paisa: number; opening_balance_paisa: number;
  parent_account_id: string | null; last_four: string | null;
};
export type AccountsList = {
  accounts: Account[];
  totals: { bank_paisa: number; mfs_paisa: number; cash_paisa: number; investment_paisa: number; net_worth_paisa: number; [k: string]: number };
};

export class Api {
  constructor(private request: APIRequestContext, private token: string) {}

  private headers() {
    return { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' };
  }

  async get<T = any>(path: string): Promise<T> {
    const r = await this.request.get(`/api/v1${path}`, { headers: this.headers() });
    if (!r.ok()) throw new Error(`GET ${path} → ${r.status()} ${await r.text()}`);
    return r.json();
  }

  async post<T = any>(path: string, data: unknown): Promise<T> {
    const r = await this.request.post(`/api/v1${path}`, { headers: this.headers(), data });
    if (!r.ok()) throw new Error(`POST ${path} → ${r.status()} ${await r.text()}`);
    return r.json();
  }

  // ── setup ────────────────────────────────────────────────────────────────
  createAccount(body: Record<string, unknown>): Promise<Account> {
    return this.post('/savings-accounts', body);
  }

  addIncome(body: { month: string; income_type: string; gross_paisa: number; tds_paisa?: number; savings_account_id?: string; is_taxable?: boolean; employer_name?: string }) {
    return this.post('/income-entries', {
      tds_paisa: 0, is_taxable: true, ...body,
      idempotency_key: `mf-${body.month}-${body.income_type}-${Date.now()}-${Math.random()}`,
    });
  }

  async put<T = any>(path: string, data: unknown): Promise<T> {
    const r = await this.request.put(`/api/v1${path}`, { headers: this.headers(), data });
    if (!r.ok()) throw new Error(`PUT ${path} → ${r.status()} ${await r.text()}`);
    return r.json();
  }

  async patch<T = any>(path: string, data: unknown): Promise<T> {
    const r = await this.request.patch(`/api/v1${path}`, { headers: this.headers(), data });
    if (!r.ok()) throw new Error(`PATCH ${path} → ${r.status()} ${await r.text()}`);
    return r.json();
  }

  async del(path: string): Promise<void> {
    const r = await this.request.delete(`/api/v1${path}`, { headers: this.headers() });
    if (!r.ok()) throw new Error(`DELETE ${path} → ${r.status()} ${await r.text()}`);
  }

  /** Raw POST that returns the response (for "the API refuses this" checks). */
  postRaw(path: string, data: unknown) {
    return this.request.post(`/api/v1${path}`, { headers: this.headers(), data });
  }

  // ── categories ───────────────────────────────────────────────────────────
  async categories(): Promise<{ id: string; name: string; routing_type: string; is_archived: boolean }[]> {
    const r = await this.get('/categories');
    return r.categories ?? r;
  }

  async categoryId(name: string): Promise<string> {
    const c = (await this.categories()).find((x) => x.name === name);
    if (!c) throw new Error(`No category named ${name}`);
    return c.id;
  }

  archiveCategory(id: string) {
    return this.patch(`/categories/${id}`, { is_archived: true });
  }

  // ── transactions (setup only — the action under test goes through the UI) ─
  async addTransaction(body: Record<string, unknown> & { category: string }) {
    const { category, ...rest } = body;
    const r = await this.post('/transactions', {
      date: rest.date ?? undefined, payment_method: 'BANK', description: String(category),
      ...rest, category_id: await this.categoryId(category),
      idempotency_key: `mf-tx-${Date.now()}-${Math.random()}`,
    });
    return r.transaction ?? r;
  }

  // ── fixed expenses ───────────────────────────────────────────────────────
  addFixedExpense(body: { name: string; standard_amount_paisa: number; due_day: number; category_id: string; start_month: string; savings_account_id?: string; cadence?: string; due_month?: number }) {
    return this.post('/fixed-expenses', body);
  }

  async instances(month: string): Promise<any[]> {
    const r = await this.get(`/fixed-expense-instances?from=${month}&to=${month}`);
    return r.instances ?? r;
  }

  // ── budgets ──────────────────────────────────────────────────────────────
  setBudget(categoryId: string, limitPaisa: number | null) {
    return this.put(`/budgets/${categoryId}`, { monthly_limit_paisa: limitPaisa });
  }

  async budgets(): Promise<any[]> {
    const r = await this.get('/budgets');
    return r.budgets ?? r;
  }

  setMonthlyLimit(limitPaisa: number | null) {
    return this.put('/budgets/monthly-limit', { monthly_limit_paisa: limitPaisa });
  }

  // ── loans ────────────────────────────────────────────────────────────────
  async loanPersons(): Promise<any[]> {
    const r = await this.get('/loan-persons');
    return r.persons ?? r.loan_persons ?? r;
  }

  async loanPerson(name: string): Promise<any | undefined> {
    return (await this.loanPersons()).find((p) => p.name.toLowerCase() === name.toLowerCase());
  }

  // ── tax ──────────────────────────────────────────────────────────────────
  taxYear(fy: string) {
    return this.get(`/tax-years/${fy}`);
  }

  putTaxYear(fy: string, body: unknown) {
    return this.put(`/tax-years/${fy}`, body);
  }

  fileTaxYear(fy: string, filedOn: string) {
    return this.post(`/tax-years/${fy}/file`, { filed_on: filedOn });
  }

  // ── read-back ────────────────────────────────────────────────────────────
  accounts(): Promise<AccountsList> {
    return this.get('/savings-accounts');
  }

  async balanceOf(name: string): Promise<number> {
    const { accounts } = await this.accounts();
    const a = accounts.find((x) => x.name === name);
    if (!a) throw new Error(`No account named ${name}`);
    return a.balance_paisa;
  }

  /** Dashboard summary for the current calendar month. */
  dashboard() {
    const m = currentMonth();
    const [y, mm] = m.split('-').map(Number);
    const last = new Date(Date.UTC(y, mm, 0)).getUTCDate();
    return this.get(`/dashboard/summary?from=${m}-01&to=${m}-${String(last).padStart(2, '0')}`);
  }

  /** Tax summary for a fiscal year (default: the current one). */
  tax(fy = fiscalYear()) {
    return this.get(`/tax/summary?fiscal_year=${fy}`);
  }

  /** Live (not deleted) transactions. The list endpoint is paginated: { data, page, page_size, total }. */
  async transactions(): Promise<any[]> {
    const r = await this.get('/transactions?limit=100');
    return r.data ?? r.transactions ?? r;
  }
}
