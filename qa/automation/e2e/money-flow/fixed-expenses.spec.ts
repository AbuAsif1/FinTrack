/**
 * Sanity area: FIXED EXPENSES — MF-EXP-095…104.
 * Baseline F1 = B1 + Mess Rent ৳8,722 (day 15, Rent) · BRAC DPS Installment ৳10,000 (day 14, DPS) ·
 * Home Internet ৳500 (day 16, Utility). This month: Fixed commitments ৳19,222 · Discretionary ৳60,778.
 */
import { test, expect } from './support/fixtures';
import { mf } from './support/cases';
import { ACC, baselineB1, baselineF1 } from './support/baselines';
import { startAt } from './support/flow';
import { tk } from './support/money';
import { currentMonth, today } from './support/dates';
import type { Api } from './support/api';
import type { AddExpensesForm } from './support/pages';

async function payFixed(f: AddExpensesForm, template: string, amount: string | null, from: string | null, month?: string) {
  await f.open();
  await f.category('Fixed Expenses');
  await f.fixedExpense(template);
  if (month) await f.payingForMonth(month);
  if (amount) await f.amount(amount);
  if (from) {
    await f.paymentMethod('Bank / MFS');
    await f.payFrom(from);
  }
}

async function instance(api: Api, template: string, month = currentMonth()) {
  return (await api.instances(month)).find((i) => i.template_name === template);
}

function previousMonth(m = currentMonth()) {
  const [y, mm] = m.split('-').map(Number);
  return mm === 1 ? `${y - 1}-12` : `${y}-${String(mm - 1).padStart(2, '0')}`;
}

test.describe('Fixed Expenses', () => {
  let c = mf('MF-EXP-095');
  test(c.title, c.details, async ({ page, api, addExpenses, fixedExpenses }) => {
    await baselineF1(api);
    await startAt(page);
    await payFixed(addExpenses, 'Mess Rent', null, ACC.BRAC);
    await expect(addExpenses.form.getByLabel('Amount (৳)'), 'amount pre-filled from the template').toHaveValue('8722');
    await addExpenses.save();

    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(1_71_278));
    const d = await api.dashboard();
    expect(d.tiles.total_spending_paisa).toBe(tk(8_722));
    expect(d.tiles.net_savings_paisa).toBe(tk(71_278));
    expect(d.current_month.fixed_commitments_paisa).toBe(tk(19_222));
    expect(d.current_month.discretionary_cash_paisa).toBe(tk(60_778));
    expect(d.current_month.remaining_to_spend_paisa, 'pending ৳8,722 became actual').toBe(tk(60_778));
    const inst = await instance(api, 'Mess Rent');
    expect(inst).toMatchObject({ status: 'PAID', actual_amount_paisa: tk(8_722), paid_date: today() });
    expect(inst.transaction_id, 'linked transaction').toBeTruthy();
    await fixedExpenses.open();
    await expect(fixedExpenses.alerts().filter({ hasText: 'Mess Rent' }), 'no banner for a paid bill').toHaveCount(0);
  });

  c = mf('MF-EXP-096');
  test(c.title, c.details, async ({ page, api, addExpenses }) => {
    await baselineF1(api);
    await startAt(page);
    await payFixed(addExpenses, 'Home Internet', '650', ACC.BKASH);
    await addExpenses.save();
    expect(await api.balanceOf(ACC.BKASH)).toBe(tk(19_350));
    const d = await api.dashboard();
    expect(d.tiles.total_spending_paisa).toBe(tk(650));
    expect(d.current_month.fixed_commitments_paisa, 'actual ৳650 replaces standard ৳500').toBe(tk(19_372));
    expect(d.current_month.discretionary_cash_paisa).toBe(tk(60_628));
    expect(d.current_month.remaining_to_spend_paisa).toBe(tk(60_628));
    expect(await instance(api, 'Home Internet')).toMatchObject({ status: 'PAID', actual_amount_paisa: tk(650) });
  });

  c = mf('MF-EXP-097');
  test(c.title, c.details, async ({ page, api, addExpenses, bankWallet }) => {
    await baselineF1(api);
    await startAt(page);
    await payFixed(addExpenses, 'BRAC DPS Installment', null, ACC.BRAC);
    await expect(addExpenses.form.getByText(/Deposits into/)).toContainText(ACC.DPS);
    await addExpenses.save();
    await bankWallet.open();
    expect(await bankWallet.balance(ACC.BRAC)).toBe(tk(1_70_000));
    expect(await bankWallet.balance(ACC.DPS)).toBe(tk(10_000));
    expect(await bankWallet.tile('Bank Balance')).toBe(tk(1_80_000));
    expect(await bankWallet.tile('Net Worth')).toBe(tk(2_05_000));
    const d = await api.dashboard();
    expect(d.tiles.total_spending_paisa, 'DPS is a transfer').toBe(0);
    expect(d.tiles.net_savings_paisa).toBe(tk(80_000));
    expect(d.current_month.remaining_to_spend_paisa).toBe(tk(60_778));
    expect((await api.tax()).investment_breakdown.find((b: any) => b.category === 'dps').invested).toBe(tk(10_000));
    expect((await instance(api, 'BRAC DPS Installment')).status).toBe('PAID');
  });

  c = mf('MF-EXP-098');
  test(c.title, c.details, async ({ page, api, addExpenses }) => {
    const acc = await baselineB1(api);
    const prev = previousMonth();
    await api.addFixedExpense({ name: 'Mess Rent', standard_amount_paisa: tk(8_722), due_day: 15, category_id: await api.categoryId('Rent'), start_month: prev });
    await startAt(page);
    await payFixed(addExpenses, 'Mess Rent', null, ACC.BRAC, prev);
    await addExpenses.save();
    expect((await instance(api, 'Mess Rent', prev)).status, 'last month is paid').toBe('PAID');
    expect((await instance(api, 'Mess Rent')).status, 'this month still due').not.toBe('PAID');
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(1_71_278));
    expect((await api.dashboard()).tiles.total_spending_paisa, 'F-16 (question): counted in the payment month').toBe(tk(8_722));
    void acc;
  });

  c = mf('MF-EXP-099');
  test(c.title, c.details, async ({ page, api, addExpenses }) => {
    const acc = await baselineF1(api);
    await api.addTransaction({ category: 'Rent', amount_paisa: tk(8_722), description: 'Mess Rent', savings_account_id: acc.BRAC.id, fixed_expense_id: acc.fe.rent.id, for_month: currentMonth() });
    await startAt(page);
    await payFixed(addExpenses, 'Mess Rent', null, ACC.BRAC);
    await addExpenses.form.getByRole('button', { name: 'Save Transaction' }).click();
    await page.waitForLoadState('networkidle');
    // The money: the second payment is refused, so BRAC is charged once.
    expect(await api.balanceOf(ACC.BRAC), 'charged once').toBe(tk(1_71_278));
    expect((await api.transactions()).filter((t) => t.description === 'Mess Rent'), 'one payment').toHaveLength(1);
    // The user is told why (F-29: the form treats the server's 409 ALREADY_PAID as success and just closes).
    await expect(addExpenses.form.locator('div[style*="var(--danger)"]').first(), 'the form says it is already paid').toHaveText(/already paid/i, { timeout: 5_000 });
  });

  /** The "This Month" item for a template on the Fixed Expenses page. */
  const item = (page: any, name: string) =>
    page.locator('main div').filter({ hasText: name }).filter({ has: page.getByRole('button', { name: 'Mark Paid', exact: true }) }).last();

  c = mf('MF-EXP-100');
  test(c.title, c.details, async ({ page, api, fixedExpenses, bankWallet }) => {
    await baselineF1(api);
    await fixedExpenses.open();
    const markPaid = item(page, 'BRAC DPS Installment').getByRole('button', { name: 'Mark Paid', exact: true });
    await expect(markPaid, 'Mark Paid on the Fixed Expenses page').toBeVisible({ timeout: 5_000 });
    await markPaid.click();
    const payFrom = page.getByLabel('Which account are you paying from?');
    await expect(payFrom, 'asks which account pays').toBeVisible();
    await payFrom.selectOption({ label: ACC.BRAC });
    await page.getByRole('button', { name: 'Confirm & Create Transaction' }).click();
    // The button relabels to "Confirming…" at once; wait for the drawer itself to close (request done).
    await expect(page.getByRole('heading', { name: 'BRAC DPS Installment', level: 2 })).toBeHidden({ timeout: 15_000 });
    await bankWallet.open();
    expect(await bankWallet.balance(ACC.BRAC), 'the paying account goes down').toBe(tk(1_70_000));
    expect(await bankWallet.balance(ACC.DPS), 'the DPS goes up').toBe(tk(10_000));
    const inst = await instance(api, 'BRAC DPS Installment');
    expect(inst).toMatchObject({ status: 'PAID', actual_amount_paisa: tk(10_000) });
    expect(inst.transaction_id, 'linked transaction').toBeTruthy();
  });

  c = mf('MF-EXP-101');
  test(c.title, c.details, async ({ page, api, fixedExpenses }) => {
    await baselineF1(api);
    await fixedExpenses.open();
    const skip = item(page, 'Mess Rent').getByRole('button', { name: 'Skip', exact: true });
    await expect(skip, 'Skip on the Fixed Expenses page').toBeVisible({ timeout: 5_000 });
    await skip.click();
    await page.getByPlaceholder('Why are you skipping?').fill('away this month');
    await page.getByRole('button', { name: 'Skip this month' }).click();
    await expect(page.getByRole('heading', { name: 'Mess Rent', level: 2 })).toBeHidden({ timeout: 15_000 });
    expect(await instance(api, 'Mess Rent')).toMatchObject({ status: 'SKIPPED', note: 'away this month' });
    expect(await api.balanceOf(ACC.BRAC), 'no money moves').toBe(tk(1_80_000));
    const d = await api.dashboard();
    expect(d.current_month.fixed_commitments_paisa, 'Skipped counts as 0').toBe(tk(10_500));
    expect(d.current_month.discretionary_cash_paisa).toBe(tk(69_500));
    expect(d.current_month.remaining_to_spend_paisa).toBe(tk(69_500));
    // Reopen returns it to Pending.
    await fixedExpenses.open();
    await page.locator('main div').filter({ hasText: 'Mess Rent' }).getByRole('button', { name: 'Reopen', exact: true }).last().click();
    await page.getByRole('button', { name: /^Reopen \(set to Pending\)/ }).click();
    await expect.poll(async () => (await instance(api, 'Mess Rent')).status, { message: 'reopened' }).not.toBe('SKIPPED');
  });

  c = mf('MF-EXP-102');
  test(c.title, c.details, async ({ api, transactions }) => {
    const acc = await baselineF1(api);
    await api.addTransaction({ category: 'Rent', amount_paisa: tk(8_722), description: 'Mess Rent', savings_account_id: acc.BRAC.id, fixed_expense_id: acc.fe.rent.id, for_month: currentMonth() });
    expect((await instance(api, 'Mess Rent')).status, 'precondition').toBe('PAID');
    await transactions.open();
    await transactions.remove('Mess Rent');
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(1_80_000));
    const d = await api.dashboard();
    expect(d.tiles.total_spending_paisa).toBe(0);
    expect(d.current_month.remaining_to_spend_paisa).toBe(tk(60_778));
    const inst = await instance(api, 'Mess Rent');
    expect(inst.status, 'back to pending (or overdue)').not.toBe('PAID');
    expect(inst.transaction_id).toBeNull();
  });

  c = mf('MF-EXP-103');
  test(c.title, c.details, async ({ page, api, addExpenses, fixedExpenses }) => {
    const acc = await baselineB1(api);
    const day = Number(today().slice(8, 10));
    test.skip(day < 2 || day > 26, 'needs a due day two days ahead and one day behind within this month');
    const cat = await api.categoryId('Utility');
    await api.addFixedExpense({ name: 'Due Soon Bill', standard_amount_paisa: tk(1_000), due_day: day + 2, category_id: cat, start_month: currentMonth() });
    await api.addFixedExpense({ name: 'Late Bill', standard_amount_paisa: tk(2_000), due_day: day - 1, category_id: cat, start_month: currentMonth() });
    await fixedExpenses.open();
    await expect(fixedExpenses.alerts().filter({ hasText: 'Due Soon Bill' }), 'amber: due within 3 days').toHaveCount(1);
    await expect(fixedExpenses.alerts().filter({ hasText: /Overdue.*Late Bill/ }), 'red: overdue').toHaveCount(1);
    await startAt(page);
    await payFixed(addExpenses, 'Late Bill', null, ACC.BRAC);
    await addExpenses.save();
    await fixedExpenses.open();
    await expect(fixedExpenses.alerts().filter({ hasText: 'Late Bill' }), 'banner gone once paid').toHaveCount(0);
  });

  c = mf('MF-EXP-104');
  test(c.title, c.details, async ({ page, api }) => {
    await baselineB1(api);
    await api.addFixedExpense({ name: 'Car Insurance', standard_amount_paisa: tk(36_000), due_day: 10, category_id: await api.categoryId('Other'), start_month: currentMonth(), cadence: 'ANNUAL', due_month: 6 });
    await startAt(page, '/fixed-expenses');
    await expect(page.locator('main'), 'monthly equivalent shown').toContainText(/৳3,000(\.00)?\s*\/\s*month/);
    expect((await api.dashboard()).current_month.fixed_commitments_paisa, 'p2-07: committed uses the monthly equivalent').toBe(tk(3_000));
  });
});
