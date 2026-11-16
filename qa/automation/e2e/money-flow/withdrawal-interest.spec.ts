/**
 * Sanity area: WITHDRAWAL & INTEREST — MF-EXP-050…054 and MF-EXP-060…062.
 * Several cases assert business rules the app is known to break (tagged @known-defect):
 *   F-01 Savings Interest has no account picker · F-02 withdrawals never name a receiving account
 *   F-09 interest can be entered twice (Add Expenses and Add Income)
 */
import { test, expect } from './support/fixtures';
import { mf } from './support/cases';
import { ACC, baselineB1, baselineT1 } from './support/baselines';
import { fillExpense, addExpense, startAt } from './support/flow';
import { tk } from './support/money';
import { currentMonth } from './support/dates';
import type { Api } from './support/api';
import type { Accounts } from './support/baselines';

/** MF-EXP-050 precondition: B1 + ৳30,000 into BRAC DPS from BRAC (BRAC ৳1,50,000, DPS ৳30,000). */
async function dpsWith30k(api: Api): Promise<Accounts> {
  const acc = await baselineB1(api);
  await api.addTransaction({ category: 'DPS / Savings', amount_paisa: tk(30_000), description: 'DPS 30k', savings_account_id: acc.DPS.id, bank_account_id: acc.BRAC.id });
  expect(await api.balanceOf(ACC.BRAC), 'precondition').toBe(tk(1_50_000));
  return acc;
}

test.describe('Savings Withdrawal', () => {
  let c = mf('MF-EXP-050');
  test(c.title, c.details, async ({ page, api, addExpenses, bankWallet, dashboard }) => {
    await dpsWith30k(api);
    await startAt(page);
    await addExpense(addExpenses, { category: 'Savings Withdrawal', savings: ACC.DPS, amount: '30000' });
    await bankWallet.open();
    expect(await bankWallet.balance(ACC.DPS)).toBe(0);
    expect(await bankWallet.balance(ACC.BRAC), 'returns to the parent account').toBe(tk(1_80_000));
    expect(await bankWallet.tile('Bank Balance')).toBe(tk(1_80_000));
    expect(await bankWallet.tile('Net Worth')).toBe(tk(2_05_000));
    await dashboard.open();
    expect(await dashboard.tile('Spending')).toBe(0);
    expect(await dashboard.tile('Income'), 'a withdrawal is not income').toBe(tk(80_000));
    expect((await api.dashboard()).current_month.remaining_to_spend_paisa, 'cash in').toBe(tk(80_000));
    const t = await api.tax();
    expect(t.gross_income_paisa).toBe(tk(80_000));
    expect(t.investment_breakdown.find((b: any) => b.category === 'dps').invested, 'F-15 (question): unchanged by the withdrawal').toBe(tk(30_000));
  });

  c = mf('MF-EXP-051');
  test(c.title, c.details, async ({ page, api, addExpenses }) => {
    await dpsWith30k(api);
    await startAt(page);
    await addExpense(addExpenses, { category: 'Savings Withdrawal', savings: ACC.DPS, amount: '10000' });
    expect(await api.balanceOf(ACC.DPS)).toBe(tk(20_000));
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(1_60_000));
    expect((await api.accounts()).totals.net_worth_paisa).toBe(tk(2_05_000));
    expect((await api.dashboard()).current_month.remaining_to_spend_paisa).toBe(tk(60_000));
  });

  c = mf('MF-EXP-052');
  test(c.title, c.details, async ({ page, api, addExpenses }) => {
    await dpsWith30k(api);
    await startAt(page);
    await fillExpense(addExpenses, { category: 'Savings Withdrawal', savings: ACC.DPS, amount: '40000' });
    await addExpenses.saveExpectingError(/exceeds/i);
    expect(await api.balanceOf(ACC.DPS)).toBe(tk(30_000));
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(1_50_000));
  });

  c = mf('MF-EXP-053');
  test(c.title, c.details, async ({ page, api, addExpenses, bankWallet }) => {
    await baselineB1(api);
    await startAt(page);
    await fillExpense(addExpenses, { category: 'Savings Withdrawal', savings: ACC.BRAC, amount: '5000' });
    await expect(addExpenses.form.getByText('Which account receives the money?'), 'the user says where the money goes').toBeVisible({ timeout: 5_000 });
    await addExpenses.payFrom(ACC.CASH);
    await addExpenses.save();
    await bankWallet.open();
    expect(await bankWallet.balance(ACC.BRAC)).toBe(tk(1_75_000));
    expect(await bankWallet.balance(ACC.CASH)).toBe(tk(10_000));
    expect(await bankWallet.tile('Net Worth'), 'money moves, it does not vanish').toBe(tk(2_05_000));
  });

  c = mf('MF-EXP-054');
  test(c.title, c.details, async ({ page, api, addExpenses }) => {
    const acc = await baselineT1(api);
    await api.addTransaction({ category: 'Investment (Sanchaypatra)', amount_paisa: tk(50_000), description: 'Sanchaypatra purchase', savings_account_id: acc.SANCH.id, bank_account_id: acc.BRAC.id });
    await startAt(page);
    await fillExpense(addExpenses, { category: 'Savings Withdrawal', savings: ACC.SANCH, amount: '50000' });
    await expect(addExpenses.form.getByText('Which account receives the money?'), 'encashment names the receiving account').toBeVisible({ timeout: 5_000 });
    await addExpenses.payFrom(ACC.BRAC);
    await addExpenses.save();
    expect(await api.balanceOf(ACC.SANCH)).toBe(0);
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(10_40_000));
    expect((await api.accounts()).totals.net_worth_paisa).toBe(tk(10_65_000));
  });
});

test.describe('Savings Interest', () => {
  let c = mf('MF-EXP-060');
  test(c.title, c.details, async ({ page, api, addExpenses, bankWallet }) => {
    await baselineB1(api);
    await startAt(page);
    await addExpenses.open();
    await addExpenses.category('Savings Interest');
    await expect(addExpenses.form.getByLabel('Savings Account'), 'interest is credited to a named account').toBeVisible({ timeout: 5_000 });
    await addExpenses.savingsAccount(ACC.BRAC);
    await addExpenses.description('Monthly interest');
    await addExpenses.amount('1250');
    await addExpenses.save();
    await bankWallet.open();
    expect(await bankWallet.balance(ACC.BRAC)).toBe(tk(1_81_250));
    expect(await bankWallet.tile('Net Worth')).toBe(tk(2_06_250));
    const d = await api.dashboard();
    expect(d.tiles.total_spending_paisa).toBe(0);
    expect(d.current_month.remaining_to_spend_paisa, 'neither cash in nor cash out').toBe(tk(80_000));
    expect((await api.tax()).gross_income_paisa).toBe(tk(80_000));
  });

  c = mf('MF-EXP-061');
  test(c.title, c.details, async ({ page, api, addExpenses }) => {
    const acc = await baselineB1(api);
    await api.addTransaction({ category: 'DPS / Savings', amount_paisa: tk(10_000), description: 'DPS 10k', savings_account_id: acc.DPS.id, bank_account_id: acc.BRAC.id });
    await startAt(page);
    await addExpenses.open();
    await addExpenses.category('Savings Interest');
    await expect(addExpenses.form.getByLabel('Savings Account')).toBeVisible({ timeout: 5_000 });
    await addExpenses.savingsAccount(ACC.DPS);
    await addExpenses.description('DPS interest');
    await addExpenses.amount('500');
    await addExpenses.save();
    expect(await api.balanceOf(ACC.DPS)).toBe(tk(10_500));
    expect((await api.accounts()).totals.bank_paisa).toBe(tk(1_80_500));
    expect((await api.tax()).investment_breakdown.find((b: any) => b.category === 'dps').invested, 'interest is not an investment').toBe(tk(10_000));
  });

  c = mf('MF-EXP-062');
  test(c.title, c.details, async ({ page, api, addIncome, addExpenses }) => {
    await baselineB1(api);
    await startAt(page);
    await addIncome.open();
    await addIncome.kind('Other Income');
    await addIncome.month(currentMonth());
    await addIncome.incomeType('Bank Savings Interest');
    await addIncome.moneyField('Amount Received (৳)', '9000');
    await addIncome.receivedInto(ACC.BRAC);
    await addIncome.save();
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(1_89_000));

    // The same interest again via Add Expenses → Savings Interest: business expects one path only.
    await addExpenses.open();
    await addExpenses.category('Savings Interest');
    await expect(addExpenses.form.getByText(/already|Add Income|record interest (as|under) income/i), 'the app guides the user to a single path').toBeVisible({ timeout: 5_000 });
    expect(await api.balanceOf(ACC.BRAC), 'BRAC rises once').toBe(tk(1_89_000));
  });
});
