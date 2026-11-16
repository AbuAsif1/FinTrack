/**
 * Sanity area: SPENDING (routing NONE) — MF-EXP-003…017 and MF-EXP-120…127.
 * (MF-EXP-001/002 live in smoke.spec.ts.) Expected values are the workbook's literals.
 */
import { test, expect } from './support/fixtures';
import { mf } from './support/cases';
import { ACC, baselineB1, baselineF1, baselineT1 } from './support/baselines';
import { addExpense, fillExpense, startAt } from './support/flow';
import { tk } from './support/money';
import { createFreshUser, deleteUser } from './support/db';
import { currentMonth } from './support/dates';

test.describe('Spending', () => {
  let c = mf('MF-EXP-003');
  test(c.title, c.details, async ({ page, api, addExpenses, bankWallet, dashboard }) => {
    await baselineB1(api);
    await startAt(page);
    await addExpense(addExpenses, { category: 'Dining', method: 'Bank / MFS', from: ACC.BKASH, amount: '850' });

    await bankWallet.open();
    expect(await bankWallet.balance(ACC.BKASH)).toBe(tk(19_150));
    expect(await bankWallet.balance(ACC.BRAC)).toBe(tk(1_80_000));
    expect(await bankWallet.balance(ACC.CASH)).toBe(tk(5_000));
    expect(await bankWallet.tile('MFS Balance')).toBe(tk(19_150));
    expect(await bankWallet.tile('Net Worth')).toBe(tk(2_04_150));
    await dashboard.open();
    expect(await dashboard.tile('Spending')).toBe(tk(850));
    expect(await dashboard.tile('Net Savings')).toBe(tk(79_150));
    expect((await api.dashboard()).current_month.remaining_to_spend_paisa).toBe(tk(79_150));
  });

  c = mf('MF-EXP-004');
  test(c.title, c.details, async ({ page, api, addExpenses, bankWallet, dashboard }) => {
    test.setTimeout(300_000);
    await baselineB1(api);
    await startAt(page);
    const entries = [
      { category: 'Transport', method: 'Cash', amount: '300', paisa: tk(300) },
      { category: 'Utility', method: 'Bank / MFS', from: ACC.BRAC, amount: '1200', paisa: tk(1_200) },
      { category: 'Rent', method: 'Bank / MFS', from: ACC.BRAC, amount: '8000', paisa: tk(8_000) },
      { category: 'Entertainment', method: 'Bank / MFS', from: ACC.BKASH, amount: '600', paisa: tk(600) },
      { category: 'Health', method: 'Bank / MFS', from: ACC.BRAC, amount: '2000', paisa: tk(2_000) },
      { category: 'Shopping', method: 'Bank / MFS', from: ACC.BKASH, amount: '3500', paisa: tk(3_500) },
      { category: 'Other', method: 'Cash', amount: '250', paisa: tk(250) },
    ] as const;
    for (const e of entries) {
      await addExpense(addExpenses, e);
      const slice = (await api.dashboard()).spending_by_category.find((s: any) => s.category_name === e.category);
      expect(slice?.amount_paisa, `${e.category} slice`).toBe(e.paisa);
    }

    await bankWallet.open();
    expect(await bankWallet.balance(ACC.CASH)).toBe(tk(4_450));
    expect(await bankWallet.balance(ACC.BRAC)).toBe(tk(1_68_800));
    expect(await bankWallet.balance(ACC.BKASH)).toBe(tk(15_900));
    expect(await bankWallet.tile('Net Worth')).toBe(tk(1_89_150));
    await dashboard.open();
    expect(await dashboard.tile('Spending')).toBe(tk(15_850));
    expect(await dashboard.tile('Net Savings')).toBe(tk(64_150));
    expect(await dashboard.tileText('Savings Rate')).toMatch(/^80(\.2)?%$/);
    const d = await api.dashboard();
    expect(d.spending_by_category.reduce((s: number, x: any) => s + x.amount_paisa, 0), 'chart slices add up to Spending').toBe(tk(15_850));
  });

  c = mf('MF-EXP-005');
  test(c.title, c.details, async ({ page, api, addExpenses }) => {
    await baselineB1(api);
    await startAt(page);
    await fillExpense(addExpenses, { category: 'Dining', method: 'Bank / MFS', amount: '500' });
    await addExpenses.form.getByRole('button', { name: 'Save Transaction' }).click();
    await expect(page.getByRole('heading', { name: 'Add Expenses' }), 'form stays open').toBeVisible();
    expect(await api.transactions()).toHaveLength(0);
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(1_80_000));
  });

  c = mf('MF-EXP-006');
  test(c.title, c.details, async ({ page, api, addExpenses }) => {
    await baselineB1(api);
    await startAt(page);
    await fillExpense(addExpenses, { category: 'Shopping', method: 'Cash', amount: '6000' });
    await addExpenses.saveExpectingError(/In-Hand Cash.*(balance|available)/i);
    expect(await api.balanceOf(ACC.CASH)).toBe(tk(5_000));
    expect(await api.transactions()).toHaveLength(0);
    expect((await api.dashboard()).tiles.total_spending_paisa).toBe(0);
  });

  c = mf('MF-EXP-007');
  test(c.title, c.details, async ({ page, api, addExpenses }) => {
    await baselineB1(api);
    await startAt(page);
    await fillExpense(addExpenses, { category: 'Shopping', method: 'Bank / MFS', from: ACC.BKASH, amount: '25000' });
    await addExpenses.saveExpectingError(/bKash/);
    expect(await api.balanceOf(ACC.BKASH)).toBe(tk(20_000));
    expect(await api.transactions()).toHaveLength(0);
  });

  c = mf('MF-EXP-008');
  test(c.title, c.details, async ({ page, api, addExpenses, bankWallet, dashboard }) => {
    await baselineB1(api);
    await startAt(page);
    await addExpense(addExpenses, { category: 'Transport', method: 'Cash', amount: '5000.00' });
    await bankWallet.open();
    expect(await bankWallet.balance(ACC.CASH), 'not negative').toBe(0);
    expect(await bankWallet.tile('Net Worth')).toBe(tk(2_00_000));
    await dashboard.open();
    expect(await dashboard.tile('Spending')).toBe(tk(5_000));
  });

  c = mf('MF-EXP-009');
  test(c.title, c.details, async ({ page, api, addExpenses, dashboard }) => {
    await baselineB1(api, { withCash: false });
    await startAt(page);
    await addExpenses.open();
    await addExpenses.category('Dining');
    await addExpenses.paymentMethod('Cash');
    await expect(addExpenses.cashNote()).toContainText('Add an In-Hand Cash account on Bank & Wallet to track your cash balance.');
    await addExpenses.description('Dining 400');
    await addExpenses.amount('400');
    await addExpenses.save();
    const { totals } = await api.accounts();
    expect(totals.net_worth_paisa, 'no account was charged').toBe(tk(2_00_000));
    await dashboard.open();
    expect(await dashboard.tile('Spending')).toBe(tk(400));
    expect(await dashboard.tile('Net Savings')).toBe(tk(79_600));
  });

  c = mf('MF-EXP-010');
  test(c.title, c.details, async ({ page, api, addExpenses, bankWallet, dashboard }) => {
    await baselineB1(api);
    await startAt(page);
    for (const bad of ['0', '-100', '']) {
      await fillExpense(addExpenses, { category: 'Groceries', method: 'Cash', amount: bad || '1' });
      if (!bad) await addExpenses.form.getByLabel('Amount (৳)').fill('');
      await addExpenses.form.getByRole('button', { name: 'Save Transaction' }).click();
      await expect(page.getByRole('heading', { name: 'Add Expenses' }), `amount "${bad}" is refused`).toBeVisible();
      await addExpenses.cancel();
    }
    expect(await api.transactions()).toHaveLength(0);
    await addExpense(addExpenses, { category: 'Groceries', method: 'Cash', amount: '99.50' });
    await bankWallet.open();
    expect(await bankWallet.balance(ACC.CASH), 'exact paisa').toBe(tk(4_900.5));
    await dashboard.open();
    expect(await dashboard.tile('Spending')).toBe(tk(99.5));
  });

  c = mf('MF-EXP-011');
  test(c.title, c.details, async ({ page, api, addExpenses, bankWallet, dashboard, transactions }) => {
    await baselineB1(api);
    await startAt(page);
    await addExpense(addExpenses, { category: 'Shopping', method: 'Bank / MFS', from: ACC.BRAC, description: 'Laptop', amount: '125000.75' });
    await bankWallet.open();
    expect(await bankWallet.balance(ACC.BRAC)).toBe(tk(54_999.25));
    await expect(page.getByText('৳54,999.25').first(), 'lakh grouping').toBeVisible();
    await dashboard.open();
    expect(await dashboard.tile('Spending')).toBe(tk(1_25_000.75));
    expect(await dashboard.tile('Net Savings')).toBe(tk(-45_000.75));
    await transactions.open();
    await expect(transactions.row('Laptop', '৳1,25,000.75')).toBeVisible();
  });

  c = mf('MF-EXP-012');
  test(c.title, c.details, async ({ page, api, addExpenses, transactions }) => {
    // US-26: entry date defaults to today and can be changed (was F-05: no date field).
    test.skip(currentMonth().endsWith('-07'), 'last month is before the baseline accounts open (1 July)');
    await baselineB1(api);
    const [y, m] = currentMonth().split('-').map(Number);
    const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
    const lastDay = new Date(Date.UTC(Number(prev.slice(0, 4)), Number(prev.slice(5, 7)), 0)).getUTCDate();
    const backDate = `${prev}-${String(lastDay).padStart(2, '0')}`;
    await startAt(page);
    await addExpenses.open();
    await addExpenses.category('Dining');
    await expect(addExpenses.form.getByRole('button', { name: /^Date/ }), 'Add Expenses offers a Date field').toBeVisible();
    await addExpenses.date(backDate);
    await addExpenses.paymentMethod('Cash');
    await addExpenses.description('Late dinner');
    await addExpenses.amount('700');
    await addExpenses.save();
    expect(await api.balanceOf(ACC.CASH)).toBe(tk(4_300));
    expect((await api.dashboard()).tiles.total_spending_paisa, 'not in this month').toBe(0);
    const last = await api.get(`/dashboard/summary?from=${prev}-01&to=${backDate}`);
    expect(last.tiles.total_spending_paisa, 'in last month').toBe(tk(700));
    expect((await api.transactions()).find((t) => t.description === 'Late dinner').date).toBe(backDate);
    await transactions.open();
    await expect(page.locator('main')).toContainText('Late dinner');
  });

  c = mf('MF-EXP-013');
  test(c.title, c.details, async ({ page, api, addExpenses, budgetsPage }) => {
    test.setTimeout(300_000);
    await baselineB1(api);
    await api.setBudget(await api.categoryId('Groceries'), tk(5_000));
    await startAt(page);

    // Notifications are recomputed when the dashboard loads (FR-09 "computed on login; manual refresh").
    const alertTypes = async (): Promise<string[]> => {
      await api.dashboard();
      const list = await api.get('/notifications');
      return (Array.isArray(list) ? list : list.notifications ?? list.data ?? []).map((n: any) => n.type as string);
    };

    await addExpense(addExpenses, { category: 'Groceries', method: 'Bank / MFS', from: ACC.BRAC, amount: '3000' });
    await budgetsPage.open();
    expect(await budgetsPage.line('Groceries')).toEqual({ spent: tk(3_000), limit: tk(5_000), pct: 60 });
    expect(await alertTypes(), 'no budget alert below 80%').not.toContain('BUDGET_80');

    await addExpense(addExpenses, { category: 'Groceries', method: 'Cash', amount: '1000' });
    await budgetsPage.open();
    expect(await budgetsPage.line('Groceries')).toEqual({ spent: tk(4_000), limit: tk(5_000), pct: 80 });
    const amber = (await api.budgets()).find((b) => b.category_name === 'Groceries');
    expect(amber.state, 'BRD FR-10: 70–100% is amber (warning)').not.toBe('ok');
    expect(await alertTypes(), 'FR-09: alert at 80% of the budget').toContain('BUDGET_80');

    await addExpense(addExpenses, { category: 'Groceries', method: 'Bank / MFS', from: ACC.BRAC, amount: '1100' });
    await budgetsPage.open();
    expect(await budgetsPage.line('Groceries')).toEqual({ spent: tk(5_100), limit: tk(5_000), pct: 102 });
    const types = await alertTypes();
    expect(types, 'FR-09: alert when the budget is exceeded').toContain('BUDGET_EXCEEDED');
    expect(types.filter((t) => t === 'BUDGET_EXCEEDED'), 'shown once').toHaveLength(1);
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(1_75_900));
    expect(await api.balanceOf(ACC.CASH)).toBe(tk(4_000));

    await addExpense(addExpenses, { category: 'DPS / Savings', method: 'Bank / MFS', from: ACC.BRAC, savings: ACC.DPS, amount: '10000' });
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(1_65_900));
    expect((await api.budgets()).find((b) => b.category_name === 'Groceries').spent_paisa, 'a DPS deposit is not Groceries spending').toBe(tk(5_100));
    expect((await api.dashboard()).tiles.total_spending_paisa).toBe(tk(5_100));
  });

  c = mf('MF-EXP-014');
  test(c.title, c.details, async ({ page, api, addExpenses }) => {
    test.setTimeout(300_000);
    await baselineB1(api);
    await api.setMonthlyLimit(tk(10_000));
    await startAt(page);
    await addExpense(addExpenses, { category: 'Groceries', method: 'Bank / MFS', from: ACC.BRAC, amount: '7500' });
    await startAt(page);
    await expect(page.locator('main'), 'ring 75%').toContainText('75%');
    await addExpense(addExpenses, { category: 'Dining', method: 'Bank / MFS', from: ACC.BKASH, amount: '3000' });
    await startAt(page);
    await expect(page.locator('main'), 'ring over the limit').toContainText('105%');
    await addExpense(addExpenses, { category: 'DPS / Savings', method: 'Bank / MFS', from: ACC.BRAC, savings: ACC.DPS, amount: '10000' });
    const d = await api.dashboard();
    expect(d.tiles.total_spending_paisa, 'DPS deposit does not move the ring').toBe(tk(10_500));
    expect(d.monthly_limit_paisa).toBe(tk(10_000));
  });

  c = mf('MF-EXP-015');
  test(c.title, c.details, async ({ page, api, addExpenses }) => {
    await baselineB1(api);
    await startAt(page);
    await fillExpense(addExpenses, { category: 'Groceries', method: 'Bank / MFS', from: ACC.BRAC, amount: '2000' });
    await addExpenses.form.getByRole('button', { name: 'Save Transaction' }).dblclick();
    await expect(page.getByRole('heading', { name: 'Add Expenses' })).toBeHidden({ timeout: 15_000 });
    expect(await api.transactions(), 'one row').toHaveLength(1);
    expect(await api.balanceOf(ACC.BRAC), 'charged once').toBe(tk(1_78_000));
    expect((await api.dashboard()).tiles.total_spending_paisa).toBe(tk(2_000));
  });

  c = mf('MF-EXP-016');
  test(c.title, c.details, async ({ page, api, addExpenses }) => {
    await baselineB1(api);
    await api.addTransaction({ category: 'Shopping', amount_paisa: tk(1_000), payment_method: 'CASH', description: 'Old shopping' });
    await api.archiveCategory(await api.categoryId('Shopping'));
    await startAt(page);
    await addExpenses.open();
    expect(await addExpenses.categoryOptions()).not.toContain('Shopping');
    expect((await api.dashboard()).tiles.total_spending_paisa, 'archived history still counts').toBe(tk(1_000));
    expect(await api.balanceOf(ACC.CASH)).toBe(tk(4_000));
  });

  c = mf('MF-EXP-017');
  test(c.title, c.details, async ({ page, api, addExpenses }) => {
    // FR-04: any spending can be recorded. (Business Findings F-11: categories used by a template are hidden.)
    await baselineF1(api);
    await startAt(page);
    await addExpenses.open();
    const offered = await addExpenses.categoryOptions();
    expect(offered, 'Utility is still offered for an ad-hoc bill').toContain('Utility');
    expect(offered, 'Rent is still offered').toContain('Rent');
    await addExpenses.cancel();
    await addExpense(addExpenses, { category: 'Utility', method: 'Bank / MFS', from: ACC.BRAC, description: 'Gas bill', amount: '700' });
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(1_79_300));
    const internet = (await api.instances((await api.dashboard()).current_month.month)).find((i) => i.template_name === 'Home Internet');
    expect(internet.status, 'a different bill must not mark Home Internet paid').not.toBe('PAID');
  });
});

test.describe('Spending — edit, delete, isolation', () => {
  /** MF-EXP-001's end state, built via API: Groceries ৳1,500 cash "Meena Bazar". */
  async function meenaBazar(api: any) {
    await baselineB1(api);
    await api.addTransaction({ category: 'Groceries', amount_paisa: tk(1_500), payment_method: 'CASH', description: 'Meena Bazar' });
  }

  /** MF-EXP-004's end state, built via API. */
  async function sevenCategories(api: any, acc: any) {
    const rows: [string, number, string | null][] = [
      ['Transport', 300, null], ['Utility', 1_200, acc.BRAC.id], ['Rent', 8_000, acc.BRAC.id], ['Entertainment', 600, acc.BKASH.id],
      ['Health', 2_000, acc.BRAC.id], ['Shopping', 3_500, acc.BKASH.id], ['Other', 250, null],
    ];
    for (const [category, bdt, from] of rows) {
      await api.addTransaction({ category, amount_paisa: tk(bdt), description: category, payment_method: from ? 'BANK' : 'CASH', ...(from ? { savings_account_id: from } : {}) });
    }
  }

  let c = mf('MF-EXP-120');
  test(c.title, c.details, async ({ page, api, transactions, budgetsPage }) => {
    await meenaBazar(api);
    await api.setBudget(await api.categoryId('Groceries'), tk(5_000));
    await transactions.open();
    await transactions.openEdit('Meena Bazar');
    await page.locator('form').getByLabel('Amount (৳)').fill('2000');
    await transactions.saveEdit();
    expect(await api.balanceOf(ACC.CASH)).toBe(tk(3_000));
    const d = await api.dashboard();
    expect(d.tiles.total_spending_paisa).toBe(tk(2_000));
    expect(d.tiles.net_savings_paisa).toBe(tk(78_000));
    await budgetsPage.open();
    expect(await budgetsPage.line('Groceries')).toEqual({ spent: tk(2_000), limit: tk(5_000), pct: 40 });
  });

  c = mf('MF-EXP-121');
  test(c.title, c.details, async ({ page, api, transactions, addExpenses }) => {
    await meenaBazar(api);
    await transactions.open();
    await transactions.openEdit('Meena Bazar');
    await addExpenses.category('Dining');
    await transactions.saveEdit();
    const slices = (await api.dashboard()).spending_by_category;
    expect(slices.find((s: any) => s.category_name === 'Dining')?.amount_paisa).toBe(tk(1_500));
    expect(slices.find((s: any) => s.category_name === 'Groceries')).toBeUndefined();
    expect(await api.balanceOf(ACC.CASH), 'no balance change').toBe(tk(3_500));

    await transactions.openEdit('Meena Bazar');
    const offered = await addExpenses.categoryOptions();
    if (offered.includes('Loan Given')) {
      // The edit form offers other routing types; a user would then fill the fields it reveals.
      await addExpenses.category('Loan Given');
      await addExpenses.loanPerson('Rana');
      await page.locator('form').getByRole('button', { name: 'Save Changes' }).click();
      await page.getByRole('button', { name: 'Confirm & Save' }).click({ timeout: 5_000 }).catch(() => undefined);
      await expect(page.locator('body'), 'routing type cannot change on edit').toContainText(/different routing type|delete and re-enter/i);
    }
    expect((await api.transactions())[0].type, 'still Spending').toBe('NONE');
  });

  c = mf('MF-EXP-122');
  test(c.title, c.details, async ({ api, transactions, dashboard }) => {
    const acc = await baselineB1(api);
    await sevenCategories(api, acc);
    await transactions.open();
    await transactions.remove('Rent');
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(1_76_800));
    await dashboard.open();
    expect(await dashboard.tile('Spending')).toBe(tk(7_850));
    expect(await dashboard.tile('Net Savings')).toBe(tk(72_150));
    const deleted = await api.get('/transactions?include_deleted=true').catch(() => null);
    if (deleted?.transactions) expect(deleted.transactions.length).toBeGreaterThanOrEqual(6);
  });

  c = mf('MF-EXP-123');
  test(c.title, c.details, async ({ api, transactions, taxPage }) => {
    const acc = await baselineT1(api);
    await api.addTransaction({ category: 'DPS / Savings', amount_paisa: tk(10_000), description: 'DPS installment', savings_account_id: acc.DPS.id, bank_account_id: acc.BRAC.id });
    expect((await api.tax()).tax_rebate_paisa, 'precondition: rebate ৳1,000').toBe(tk(1_000));
    await transactions.open();
    await transactions.remove('DPS installment');
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(10_40_000));
    expect(await api.balanceOf(ACC.DPS)).toBe(0);
    await taxPage.open();
    expect(await taxPage.row('Net Tax Payable')).toBe(tk(26_500));
    expect(await taxPage.row('Remaining to Pay')).toBe(tk(6_500));
    expect((await api.tax()).tax_rebate_paisa).toBe(0);
  });

  c = mf('MF-EXP-124');
  test(c.title, c.details, async ({ api, transactions, loans, taxPage }) => {
    const acc = await baselineT1(api);
    await api.addTransaction({ category: 'Loan Given', amount_paisa: tk(5_000), description: 'Lent to Mithun', payment_method: 'CASH', loan_person_name: 'Mithun' });
    await api.addTransaction({ category: 'Tax Payment', amount_paisa: tk(5_000), description: 'Advance tax', bank_account_id: acc.BRAC.id });
    await transactions.open();
    await transactions.remove('Lent to Mithun');
    await transactions.remove('Advance tax');
    expect(await api.balanceOf(ACC.CASH)).toBe(tk(5_000));
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(10_40_000));
    await loans.open();
    expect(await loans.summary('Owed to Me')).toBe(0);
    await taxPage.open();
    expect(await taxPage.row('Total Paid')).toBe(tk(20_000));
    expect(await taxPage.row('Remaining to Pay')).toBe(tk(6_500));
  });

  c = mf('MF-EXP-125');
  test(c.title, c.details, async ({ api, transactions }) => {
    const acc = await baselineB1(api);
    await sevenCategories(api, acc);
    await transactions.open();
    await transactions.bulkDelete(['Transport', 'Utility', 'Other']);
    expect(await api.balanceOf(ACC.CASH)).toBe(tk(5_000));
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(1_70_000));
    expect((await api.dashboard()).tiles.total_spending_paisa).toBe(tk(14_100));
  });

  c = mf('MF-EXP-126');
  test(c.title, c.details, async ({ page, api, transactions, addExpenses }) => {
    // RT-UPD: links may change on update (was F-06: the edit form hid the account picker).
    const acc = await baselineB1(api);
    await api.addTransaction({ category: 'Groceries', amount_paisa: tk(1_500), description: 'Wrong account', savings_account_id: acc.BRAC.id });
    expect(await api.balanceOf(ACC.BRAC), 'precondition').toBe(tk(1_78_500));
    await transactions.open();
    await transactions.openEdit('Wrong account');
    await expect(page.locator('form').getByText(/Which account are you paying from\?/), 'edit lets the user correct the paying account').toBeVisible({ timeout: 5_000 });
    await addExpenses.payFrom(ACC.BKASH);
    await transactions.saveEdit();
    expect(await api.balanceOf(ACC.BRAC), 'BRAC refunded').toBe(tk(1_80_000));
    expect(await api.balanceOf(ACC.BKASH), 'bKash charged').toBe(tk(18_500));
    expect((await api.dashboard()).tiles.total_spending_paisa, 'spending unchanged').toBe(tk(1_500));
  });

  c = mf('MF-EXP-127');
  test(c.title, c.details, async ({ browser, api }) => {
    const acc = await baselineB1(api);
    await sevenCategories(api, acc);
    const other = await createFreshUser();
    const ctx = await browser.newContext({ baseURL: process.env.APP_URL ?? 'http://localhost:3000' });
    try {
      const page = ctx.newPage();
      const p = await page;
      const login = await p.request.post('/api/v1/auth/login', { data: { email: other.email, password: other.password } });
      expect(login.ok()).toBeTruthy();
      await startAt(p, '/savings');
      await expect(p.locator('main'), "B sees none of A's accounts").not.toContainText(ACC.BRAC);
      const token = (await login.json()).accessToken;
      const r = await p.request.get('/api/v1/transactions', { headers: { Authorization: `Bearer ${token}` } });
      const body = await r.json();
      expect((body.data ?? body.transactions ?? body).length, "B has none of A's transactions").toBe(0);
      const d = await (await p.request.get('/api/v1/dashboard/summary', { headers: { Authorization: `Bearer ${token}` } })).json();
      expect(d.tiles.total_spending_paisa).toBe(0);
    } finally {
      await ctx.close();
      await deleteUser(other.id);
    }
  });
});
