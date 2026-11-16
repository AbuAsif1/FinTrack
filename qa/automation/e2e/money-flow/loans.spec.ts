/**
 * Sanity area: LOANS — MF-EXP-070…079 (Loan Given / Loan Received via Add Expenses, Settle Up).
 * Net Worth here is the architecture definition (Σ account balances). Business Findings F-07 records
 * that ticket p2-05 defines it with loans included; that is an open owner decision, not asserted.
 */
import { test, expect } from './support/fixtures';
import { mf } from './support/cases';
import { ACC, baselineB1 } from './support/baselines';
import { addExpense, fillExpense, startAt } from './support/flow';
import { parsePaisa, tk } from './support/money';
import { today } from './support/dates';
import type { Page } from '@playwright/test';
import type { Api } from './support/api';

/** Dashboard loan card: "People owe you ৳X" / "You owe ৳Y". */
async function dashboardLoanFigure(page: Page, label: 'People owe you' | 'You owe'): Promise<number> {
  await startAt(page);
  const re = new RegExp(label + '\\s*(৳[\\d,]+\\.\\d{2})');
  // The loan card fills in after the dashboard data arrives.
  await expect.poll(async () => re.test((await page.locator('main').textContent()) ?? ''), { message: `"${label}" on the dashboard`, timeout: 30_000 }).toBe(true);
  return parsePaisa(((await page.locator('main').textContent()) ?? '').match(re)![1]);
}

async function notificationTypes(api: Api): Promise<string[]> {
  await api.dashboard(); // notifications are recomputed when the dashboard loads
  const list = await api.get('/notifications');
  return (Array.isArray(list) ? list : list.notifications ?? list.data ?? []).map((n: any) => n.type);
}

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

test.describe('Loan Given / Loan Received', () => {
  let c = mf('MF-EXP-070');
  test(c.title, c.details, async ({ page, api, addExpenses, bankWallet, loans }) => {
    await baselineB1(api);
    await startAt(page);
    await addExpense(addExpenses, { category: 'Loan Given', method: 'Cash', person: 'Mithun', reason: 'Hospital bill', amount: '5000' });

    await bankWallet.open();
    expect(await bankWallet.balance(ACC.CASH)).toBe(0);
    expect(await bankWallet.tile('Net Worth'), 'accounts only (F-07 open)').toBe(tk(2_00_000));
    await loans.open();
    expect(await loans.summary('Owed to Me')).toBe(tk(5_000));
    expect(await loans.summary('I Owe (Total)')).toBe(0);
    expect(await loans.balance('Mithun')).toBe(tk(5_000));
    await expect(loans.personCard('Mithun')).toContainText('Mithun owes you ৳5,000.00');
    expect(await dashboardLoanFigure(page, 'People owe you')).toBe(tk(5_000));
    const d = await api.dashboard();
    expect(d.tiles.total_spending_paisa, 'a loan is not spending').toBe(0);
    expect(d.tiles.net_savings_paisa).toBe(tk(80_000));
    expect(d.current_month.remaining_to_spend_paisa, 'cash out').toBe(tk(75_000));
    expect((await api.tax()).gross_income_paisa).toBe(tk(80_000));
  });

  c = mf('MF-EXP-071');
  test(c.title, c.details, async ({ page, api, addExpenses, loans }) => {
    await baselineB1(api);
    await api.addTransaction({ category: 'Loan Given', amount_paisa: tk(5_000), payment_method: 'CASH', description: 'Hospital bill', loan_person_name: 'Mithun' });
    await startAt(page);
    await addExpense(addExpenses, { category: 'Loan Given', method: 'Bank / MFS', from: ACC.BKASH, person: 'mithun', amount: '4000' });
    expect(await api.balanceOf(ACC.BKASH)).toBe(tk(16_000));
    const persons = await api.loanPersons();
    expect(persons, 'case-insensitive: still one Mithun').toHaveLength(1);
    expect(persons[0].running_balance_paisa).toBe(tk(9_000));
    await loans.open();
    expect(await loans.balance('Mithun')).toBe(tk(9_000));
    expect(await loans.summary('Owed to Me')).toBe(tk(9_000));
    const entries = await api.get(`/loan-persons/${persons[0].id}/entries`);
    // The endpoint returns a plain array (note: `[].entries` is Array.prototype.entries, a function).
    expect((Array.isArray(entries) ? entries : entries.data).length).toBe(2);
  });

  c = mf('MF-EXP-072');
  test(c.title, c.details, async ({ page, api, addExpenses }) => {
    await baselineB1(api);
    await startAt(page);
    await addExpense(addExpenses, { category: 'Loan Given', method: 'Cash', person: 'Babu bhai', description: 'Lent to Babu bhai', amount: '1000' });
    expect(await api.balanceOf(ACC.CASH)).toBe(tk(4_000));
    // Return due date in 2 days (set on the entry), and a second entry already overdue.
    const tx = (await api.transactions()).find((t) => t.description === 'Lent to Babu bhai');
    await api.patch(`/transactions/${tx.id}`, { return_due_date: addDays(today(), 2) });
    expect(await notificationTypes(api), 'FR-07/FR-09: due within 3 days').toContain('LOAN_RETURN_DUE_SOON');
    await api.addTransaction({ category: 'Loan Given', amount_paisa: tk(500), payment_method: 'CASH', description: 'Older loan', loan_person_name: 'Babu bhai', return_due_date: addDays(today(), -1) });
    expect(await notificationTypes(api), 'past the due date').toContain('LOAN_RETURN_OVERDUE');
  });

  c = mf('MF-EXP-073');
  test(c.title, c.details, async ({ page, api, addExpenses, bankWallet, loans }) => {
    await baselineB1(api);
    await startAt(page);
    await fillExpense(addExpenses, { category: 'Loan Received', method: 'Bank / MFS', person: 'Sohel', amount: '3145.42' });
    await expect(addExpenses.form.getByText('Which account receives the money?')).toBeVisible();
    await addExpenses.payFrom(ACC.BRAC);
    await addExpenses.save();

    await bankWallet.open();
    expect(await bankWallet.balance(ACC.BRAC)).toBe(tk(1_83_145.42));
    expect(await bankWallet.tile('Net Worth')).toBe(tk(2_08_145.42));
    await loans.open();
    expect(await loans.summary('I Owe (Total)')).toBe(tk(3_145.42));
    expect(await loans.balance('Sohel')).toBe(-tk(3_145.42));
    await expect(loans.personCard('Sohel')).toContainText('You owe Sohel ৳3,145.42');
    const d = await api.dashboard();
    expect(d.tiles.in_hand_income_paisa, 'borrowed money is not income').toBe(tk(80_000));
    expect(d.tiles.total_spending_paisa).toBe(0);
    expect(d.current_month.remaining_to_spend_paisa, 'cash in').toBe(tk(83_145.42));
    expect((await api.tax()).gross_income_paisa).toBe(tk(80_000));
    expect(await dashboardLoanFigure(page, 'You owe')).toBe(tk(3_145.42));
  });

  c = mf('MF-EXP-074');
  test(c.title, c.details, async ({ page, api, addExpenses, loans }) => {
    const acc = await baselineB1(api);
    await api.addTransaction({ category: 'Loan Given', amount_paisa: tk(5_000), payment_method: 'CASH', description: 'Hospital bill', loan_person_name: 'Mithun' });
    await api.addTransaction({ category: 'Loan Given', amount_paisa: tk(4_000), description: 'Second loan', loan_person_name: 'Mithun', bank_account_id: acc.BKASH.id });
    expect(await api.balanceOf(ACC.CASH), 'precondition').toBe(0);
    await startAt(page);
    await addExpense(addExpenses, { category: 'Loan Received', method: 'Cash', person: 'Mithun', amount: '9000' });
    expect(await api.balanceOf(ACC.CASH)).toBe(tk(9_000));
    await loans.open();
    expect(await loans.balance('Mithun')).toBe(0);
    expect(await loans.summary('Owed to Me')).toBe(0);
    await expect(loans.personCard('Mithun'), 'neutral, neither owes').not.toContainText(/owes you|You owe/);
  });

  c = mf('MF-EXP-075');
  test(c.title, c.details, async ({ page, api, addExpenses, loans }) => {
    test.setTimeout(240_000);
    await baselineB1(api);
    await startAt(page);
    await addExpense(addExpenses, { category: 'Loan Given', method: 'Bank / MFS', from: ACC.BRAC, person: 'Mithun', amount: '9841' });
    await addExpense(addExpenses, { category: 'Loan Given', method: 'Bank / MFS', from: ACC.BKASH, person: 'Amait', amount: '1198.50' });
    await addExpense(addExpenses, { category: 'Loan Received', method: 'Bank / MFS', from: ACC.BRAC, person: 'Sohel', amount: '3145.42' });
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(1_73_304.42));
    expect(await api.balanceOf(ACC.BKASH)).toBe(tk(18_801.5));
    await loans.open();
    expect(await loans.balance('Mithun')).toBe(tk(9_841));
    expect(await loans.balance('Amait')).toBe(tk(1_198.5));
    expect(await loans.balance('Sohel')).toBe(-tk(3_145.42));
    await expect(loans.personCard('Sohel')).toContainText('You owe Sohel ৳3,145.42');
    expect(await loans.summary('Owed to Me')).toBe(tk(11_039.5));
    expect(await loans.summary('I Owe (Total)')).toBe(tk(3_145.42));
    expect(await loans.summary('Net Position')).toBe(tk(7_894.08));
  });

  c = mf('MF-EXP-076');
  test(c.title, c.details, async ({ page, api, addExpenses }) => {
    await baselineB1(api);
    await startAt(page);
    await fillExpense(addExpenses, { category: 'Loan Given', method: 'Cash', person: 'Rana', amount: '1000' });
    await addExpenses.loanDirection('I received');
    await addExpenses.form.getByRole('button', { name: 'Save Transaction' }).click();
    // Wait for the save to finish either way (checking immediately would see the form mid-save).
    const saved = await expect(page.getByRole('heading', { name: 'Add Expenses' })).toBeHidden({ timeout: 15_000 }).then(() => true, () => false);
    if (!saved) {
      expect(await addExpenses.errorText(), 'if blocked, the form says why').toBeTruthy();
      expect(await api.transactions()).toHaveLength(0);
    } else {
      // Saved: money and ledger must both follow the direction the user chose ("I received").
      expect(await api.balanceOf(ACC.CASH), 'cash came in, as chosen').toBe(tk(6_000));
      expect((await api.loanPerson('Rana'))?.running_balance_paisa, 'You owe Rana').toBe(-tk(1_000));
    }
  });

  c = mf('MF-EXP-077');
  test(c.title, c.details, async ({ page, api, addExpenses }) => {
    await baselineB1(api);
    await startAt(page);
    await fillExpense(addExpenses, { category: 'Loan Given', method: 'Bank / MFS', from: ACC.BKASH, person: 'Rana', amount: '25000' });
    await addExpenses.saveExpectingError(/bKash|balance/i);
    expect(await api.balanceOf(ACC.BKASH)).toBe(tk(20_000));
    expect(await api.loanPerson('Rana'), 'atomic: no Loan Person created').toBeUndefined();
  });

  c = mf('MF-EXP-078');
  test(c.title, c.details, async ({ page, api, addExpenses }) => {
    await baselineB1(api);
    await startAt(page);
    await fillExpense(addExpenses, { category: 'Loan Given', method: 'Cash', amount: '1000' });
    await addExpenses.form.getByRole('button', { name: 'Save Transaction' }).click();
    await expect(page.getByRole('heading', { name: 'Add Expenses' }), 'Person is required').toBeVisible();
    expect(await api.transactions()).toHaveLength(0);
  });

  c = mf('MF-EXP-079');
  test(c.title, c.details, async ({ page, api, loans }) => {
    await baselineB1(api);
    await api.addTransaction({ category: 'Loan Given', amount_paisa: tk(5_000), payment_method: 'CASH', description: 'Hospital bill', loan_person_name: 'Mithun' });
    await loans.open();
    await loans.settleUp('Mithun');
    await expect(page.getByText(/Which account receives|Received into|Choose an account/i), 'Settle Up names the account the money arrives in').toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: 'Confirm Settle Up' }).click();
    await expect(page.getByRole('heading', { name: 'Settle Up with Mithun' }), 'settlement saved').toBeHidden({ timeout: 15_000 });
    expect(await api.balanceOf(ACC.CASH), 'In-Hand Cash +৳5,000').toBe(tk(5_000));
    expect((await api.loanPerson('Mithun')).running_balance_paisa).toBe(0);
  });
});
