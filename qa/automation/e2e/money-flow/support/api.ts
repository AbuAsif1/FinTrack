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

  async transactions(): Promise<any[]> {
    const r = await this.get('/transactions');
    return r.transactions ?? r;
  }
}
