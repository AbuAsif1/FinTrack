/**
 * Sanity area: DPS & INVESTMENT — MF-EXP-021…029 and MF-EXP-035…043.
 * (MF-EXP-020 lives in smoke.spec.ts.) Tax figures are the workbook's literals for baseline T1:
 * Gross ৳9,60,000 · Taxable ৳6,40,000 · Gross Tax ৳26,500 · TDS ৳20,000 · 3%-of-taxable ceiling ৳19,200.
 */
import { test, expect } from './support/fixtures';
import { mf } from './support/cases';
import { ACC, baselineB1, baselineT1 } from './support/baselines';
import { addExpense, fillExpense, startAt } from './support/flow';
import { tk } from './support/money';
import { currentMonth, today } from './support/dates';
import type { Api } from './support/api';
import type { AddExpensesForm, TaxPage } from './support/pages';

/** Rebate bucket from the tax summary: dps | sanchaypatra | stocks | insurance | others | universal_pension. */
async function bucket(api: Api, category: string) {
  return (await api.tax()).investment_breakdown.find((b: any) => b.category === category);
}

/** Investment mode of Add Expenses: Investment → which investment → how paying → amount. */
async function invest(f: AddExpensesForm, account: string, amount: string, from?: string) {
  await f.open();
  await f.category('Investment');
  await f.investment(account);
  await f.paymentMethod(from ? 'Bank / MFS' : 'Cash');
  if (from) await f.payFrom(from);
  await f.amount(amount);
  await f.save();
}

/** The tax lines every T1 case checks on the Tax page. */
async function expectTax(taxPage: TaxPage, net: number, remainingOrOverpaid: number) {
  await taxPage.open();
  expect(await taxPage.row('Gross Tax'), 'gross tax is unchanged by investing').toBe(tk(26_500));
  expect(await taxPage.row('Net Tax Payable')).toBe(net);
  if (remainingOrOverpaid >= 0) expect(await taxPage.row('Remaining to Pay')).toBe(remainingOrOverpaid);
  else expect(await taxPage.row('Overpaid (refundable)')).toBe(-remainingOrOverpaid);
}

/** Suggested monthly TDS is date-dependent (months left in the FY); check its formula, and the literal in November. */
async function expectSuggestedTds(api: Api, novemberLiteral: number) {
  const t = await api.tax();
  if (t.remaining_tax_paisa <= 0) return expect(t.suggested_monthly_tds_paisa ?? 0).toBe(0);
  expect(t.suggested_monthly_tds_paisa).toBe(Math.round(t.remaining_tax_paisa / t.remaining_salary_months));
  if (currentMonth().endsWith('-11')) expect(t.suggested_monthly_tds_paisa).toBe(novemberLiteral);
}

test.describe('DPS / Savings', () => {
  let c = mf('MF-EXP-021');
  test(c.title, c.details, async ({ page, api, addExpenses, bankWallet }) => {
    await baselineB1(api);
    await startAt(page);
    await addExpense(addExpenses, { category: 'DPS / Savings', method: 'Bank / MFS', from: ACC.BKASH, savings: ACC.DPS, amount: '5000' });
    await bankWallet.open();
    expect(await bankWallet.balance(ACC.BKASH)).toBe(tk(15_000));
    expect(await bankWallet.balance(ACC.DPS)).toBe(tk(5_000));
    expect(await bankWallet.balance(ACC.BRAC)).toBe(tk(1_80_000));
    expect(await bankWallet.tile('Bank Balance')).toBe(tk(1_85_000));
    expect(await bankWallet.tile('MFS Balance')).toBe(tk(15_000));
    expect(await bankWallet.tile('Net Worth')).toBe(tk(2_05_000));
    const d = await api.dashboard();
    expect(d.tiles.total_spending_paisa).toBe(0);
    expect(d.current_month.remaining_to_spend_paisa).toBe(tk(75_000));
    expect((await bucket(api, 'dps')).invested).toBe(tk(5_000));
  });

  c = mf('MF-EXP-022');
  test(c.title, c.details, async ({ page, api, addExpenses, bankWallet }) => {
    await baselineB1(api);
    await startAt(page);
    await addExpense(addExpenses, { category: 'DPS / Savings', method: 'Cash', savings: ACC.DPS, amount: '2000' });
    await bankWallet.open();
    expect(await bankWallet.balance(ACC.CASH)).toBe(tk(3_000));
    expect(await bankWallet.balance(ACC.DPS)).toBe(tk(2_000));
    expect(await bankWallet.tile('Bank Balance')).toBe(tk(1_82_000));
    expect(await bankWallet.tile('Cash on Hand')).toBe(tk(3_000));
    const d = await api.dashboard();
    expect(d.tiles.total_spending_paisa).toBe(0);
    expect(d.current_month.remaining_to_spend_paisa).toBe(tk(78_000));
    expect((await bucket(api, 'dps')).invested).toBe(tk(2_000));
  });

  c = mf('MF-EXP-023');
  test(c.title, c.details, async ({ page, api, addExpenses }) => {
    await baselineB1(api);
    await startAt(page);
    await fillExpense(addExpenses, { category: 'DPS / Savings', method: 'Bank / MFS', from: ACC.BRAC, amount: '1000' });
    await addExpenses.form.getByRole('button', { name: 'Save Transaction' }).click();
    await expect(page.getByRole('heading', { name: 'Add Expenses' }), 'blocked without a savings account').toBeVisible();
    expect(await api.transactions()).toHaveLength(0);
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(1_80_000));
  });

  c = mf('MF-EXP-024');
  test(c.title, c.details, async ({ page, api, addExpenses }) => {
    await baselineB1(api);
    await startAt(page);
    await fillExpense(addExpenses, { category: 'DPS / Savings', method: 'Bank / MFS', from: ACC.BRAC, savings: ACC.BRAC, amount: '1000' });
    await addExpenses.saveExpectingError(/different/i);
    expect(await api.transactions()).toHaveLength(0);
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(1_80_000));
  });

  c = mf('MF-EXP-025');
  test(c.title, c.details, async ({ page, api, addExpenses, taxPage }) => {
    await baselineT1(api);
    await startAt(page);
    await addExpense(addExpenses, { category: 'DPS / Savings', method: 'Bank / MFS', from: ACC.BKASH, savings: ACC.BRAC, amount: '3000' });
    expect(await api.balanceOf(ACC.BKASH)).toBe(tk(17_000));
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(10_43_000));
    expect((await api.accounts()).totals.net_worth_paisa).toBe(tk(10_65_000));
    expect((await bucket(api, 'dps')).invested, 'a plain bank account feeds no rebate bucket').toBe(0);
    expect((await api.tax()).tax_rebate_paisa).toBe(0);
    await expectTax(taxPage, tk(26_500), tk(6_500));
  });

  c = mf('MF-EXP-026');
  test(c.title, c.details, async ({ page, api, addExpenses }) => {
    await baselineB1(api);
    await startAt(page);
    await fillExpense(addExpenses, { category: 'DPS / Savings', method: 'Bank / MFS', from: ACC.BKASH, savings: ACC.DPS, amount: '25000' });
    await addExpenses.saveExpectingError(/bKash|balance/i);
    expect(await api.balanceOf(ACC.BKASH)).toBe(tk(20_000));
    expect(await api.balanceOf(ACC.DPS)).toBe(0);
    expect(await api.transactions(), 'neither side written').toHaveLength(0);
  });

  c = mf('MF-EXP-027');
  test(c.title, c.details, async ({ page, api, addExpenses }) => {
    const acc = await baselineB1(api);
    const old = await api.createAccount({ name: 'Old DPS', type: 'DPS', bank_name: 'BRAC Bank', parent_account_id: acc.BRAC.id, opening_balance_paisa: 0, opening_date: acc.BRAC ? `${currentMonth().slice(0, 4)}-01-01` : today(), monthly_installment_paisa: tk(1_000), maturity_date: '2030-06-30' }).catch(async () =>
      api.createAccount({ name: 'Old DPS', type: 'DPS', bank_name: 'BRAC Bank', parent_account_id: acc.BRAC.id, opening_balance_paisa: 0, opening_date: today(), monthly_installment_paisa: tk(1_000), maturity_date: '2030-06-30' }));
    await api.patch(`/savings-accounts/${old.id}`, { closed_on: today() });
    await startAt(page);
    await addExpenses.open();
    await addExpenses.category('DPS / Savings');
    const select = addExpenses.form.getByLabel('Savings Account');
    await expect(select.locator('option', { hasText: ACC.DPS }), 'accounts loaded').toBeAttached();
    const options = await select.locator('option').allTextContents();
    expect(options).toContain(ACC.DPS);
    expect(options, 'a closed account is not offered').not.toContain('Old DPS');
  });

  c = mf('MF-EXP-028');
  test(c.title, c.details, async ({ page, api, addExpenses, bankWallet, taxPage }) => {
    await baselineT1(api);
    await startAt(page);
    await addExpense(addExpenses, { category: 'DPS / Savings', method: 'Bank / MFS', from: ACC.BRAC, savings: ACC.DPS, amount: '10000' });
    await bankWallet.open();
    expect(await bankWallet.balance(ACC.BRAC)).toBe(tk(10_30_000));
    expect(await bankWallet.balance(ACC.DPS)).toBe(tk(10_000));
    expect(await bankWallet.tile('Net Worth')).toBe(tk(10_65_000));
    expect(await bucket(api, 'dps')).toMatchObject({ invested: tk(10_000), cap: tk(1_20_000), eligible: tk(10_000) });
    const t = await api.tax();
    expect(t.eligible_investment_paisa).toBe(tk(10_000));
    expect(t.rebate_candidate_income_paisa, '3% of taxable').toBe(tk(19_200));
    expect(t.tax_rebate_paisa, 'MIN(৳19,200; 10% × ৳10,000; ৳10L)').toBe(tk(1_000));
    expect(t.further_investment_for_max_rebate_paisa).toBe(tk(1_82_000));
    await expectTax(taxPage, tk(25_500), tk(5_500));
    expect(await taxPage.row('Total Paid')).toBe(tk(20_000));
    await expectSuggestedTds(api, tk(687.5));
  });

  c = mf('MF-EXP-029');
  test(c.title, c.details, async ({ page, api, addExpenses, bankWallet, taxPage }) => {
    await baselineT1(api);
    await startAt(page);
    await addExpense(addExpenses, { category: 'DPS / Savings', method: 'Bank / MFS', from: ACC.BRAC, savings: ACC.DPS, amount: '150000' });
    await bankWallet.open();
    expect(await bankWallet.balance(ACC.DPS), 'the full amount; the cap is for tax only').toBe(tk(1_50_000));
    expect(await bankWallet.balance(ACC.BRAC)).toBe(tk(8_90_000));
    expect(await bucket(api, 'dps')).toMatchObject({ invested: tk(1_50_000), cap: tk(1_20_000), eligible: tk(1_20_000) });
    const t = await api.tax();
    expect(t.tax_rebate_paisa).toBe(tk(12_000));
    expect(t.further_investment_for_max_rebate_paisa).toBe(tk(72_000));
    await expectTax(taxPage, tk(14_500), -tk(5_500));
    await expectSuggestedTds(api, 0);
  });
});

test.describe('Investment', () => {
  let c = mf('MF-EXP-035');
  test(c.title, c.details, async ({ page, api, addExpenses, bankWallet, taxPage }) => {
    await baselineT1(api);
    await startAt(page);
    await invest(addExpenses, ACC.SANCH, '50000', ACC.BRAC);
    await bankWallet.open();
    expect(await bankWallet.balance(ACC.BRAC)).toBe(tk(9_90_000));
    expect(await bankWallet.balance(ACC.SANCH)).toBe(tk(50_000));
    expect(await bankWallet.tile('Investments')).toBe(tk(50_000));
    expect(await bankWallet.tile('Bank Balance')).toBe(tk(9_90_000));
    expect(await bankWallet.tile('Net Worth')).toBe(tk(10_65_000));
    expect((await api.dashboard()).tiles.total_spending_paisa, 'a transfer, not spending').toBe(0);
    expect(await bucket(api, 'sanchaypatra')).toMatchObject({ invested: tk(50_000), cap: tk(5_00_000), eligible: tk(50_000) });
    const t = await api.tax();
    expect(t.tax_rebate_paisa).toBe(tk(5_000));
    expect(t.further_investment_for_max_rebate_paisa).toBe(tk(1_42_000));
    await expectTax(taxPage, tk(21_500), tk(1_500));
    await expectSuggestedTds(api, tk(187.5));
    const records = await api.get('/investments');
    expect(JSON.stringify(records), "listed under 'Investment records this year'").toContain(ACC.SANCH);
  });

  c = mf('MF-EXP-036');
  test(c.title, c.details, async ({ page, api, addExpenses, taxPage }) => {
    await baselineT1(api);
    await startAt(page);
    await invest(addExpenses, ACC.UPENSION, '30000', ACC.BRAC);
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(10_10_000));
    expect(await api.balanceOf(ACC.UPENSION)).toBe(tk(30_000));
    expect((await api.accounts()).totals.investment_paisa).toBe(tk(30_000));
    expect(await bucket(api, 'universal_pension')).toMatchObject({ invested: tk(30_000), cap: null, eligible: tk(30_000) });
    expect((await bucket(api, 'dps')).invested).toBe(0);
    expect((await api.tax()).tax_rebate_paisa).toBe(tk(3_000));
    await expectTax(taxPage, tk(23_500), tk(3_500));
    await expectSuggestedTds(api, tk(437.5));
  });

  c = mf('MF-EXP-037');
  test(c.title, c.details, async ({ page, api, addExpenses, bankWallet, taxPage }) => {
    await baselineT1(api);
    await startAt(page);
    await invest(addExpenses, ACC.INSURANCE, '3000', ACC.BKASH);
    await bankWallet.open();
    expect(await bankWallet.balance(ACC.BKASH)).toBe(tk(17_000));
    expect(await bankWallet.balance(ACC.INSURANCE)).toBe(tk(3_000));
    expect(await bankWallet.tile('Investments')).toBe(tk(3_000));
    expect(await bankWallet.tile('Net Worth'), 'Insurance counts in Net Worth').toBe(tk(10_65_000));
    expect(await bucket(api, 'insurance')).toMatchObject({ invested: tk(3_000), cap: null });
    expect((await api.tax()).tax_rebate_paisa).toBe(tk(300));
    await expectTax(taxPage, tk(26_200), tk(6_200));
    await expectSuggestedTds(api, tk(775));
  });

  c = mf('MF-EXP-038');
  test(c.title, c.details, async ({ page, api, addExpenses, taxPage }) => {
    await baselineT1(api);
    await startAt(page);
    await invest(addExpenses, ACC.STOCKS, '600000', ACC.BRAC);
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(4_40_000));
    expect(await api.balanceOf(ACC.STOCKS)).toBe(tk(6_00_000));
    expect(await bucket(api, 'stocks')).toMatchObject({ invested: tk(6_00_000), cap: tk(5_00_000), eligible: tk(5_00_000) });
    const t = await api.tax();
    expect(t.rebate_candidate_investment_paisa).toBe(tk(50_000));
    expect(t.tax_rebate_paisa, 'limited by 3% of taxable').toBe(tk(19_200));
    expect(t.minimum_tax_applied).toBe(false);
    expect(t.further_investment_for_max_rebate_paisa).toBe(0);
    await expectTax(taxPage, tk(7_300), -tk(12_700));
  });

  c = mf('MF-EXP-039');
  test(c.title, c.details, async ({ page, api, addExpenses, bankWallet, taxPage }) => {
    test.setTimeout(240_000);
    await baselineT1(api);
    await startAt(page);
    await addExpense(addExpenses, { category: 'DPS / Savings', method: 'Bank / MFS', from: ACC.BRAC, savings: ACC.DPS, amount: '10000' });
    await invest(addExpenses, ACC.SANCH, '50000', ACC.BRAC);
    await invest(addExpenses, ACC.UPENSION, '30000', ACC.BRAC);
    await invest(addExpenses, ACC.INSURANCE, '3000', ACC.BKASH);
    await bankWallet.open();
    expect(await bankWallet.balance(ACC.BRAC)).toBe(tk(9_50_000));
    expect(await bankWallet.balance(ACC.BKASH)).toBe(tk(17_000));
    expect(await bankWallet.balance(ACC.DPS)).toBe(tk(10_000));
    expect(await bankWallet.tile('Investments')).toBe(tk(83_000));
    expect(await bankWallet.tile('Net Worth')).toBe(tk(10_65_000));
    const t = await api.tax();
    expect(t.eligible_investment_paisa).toBe(tk(93_000));
    expect(t.tax_rebate_paisa).toBe(tk(9_300));
    expect(t.further_investment_for_max_rebate_paisa).toBe(tk(99_000));
    await expectTax(taxPage, tk(17_200), -tk(2_800));
  });

  c = mf('MF-EXP-040');
  test(c.title, c.details, async ({ page, api, addExpenses }) => {
    await baselineT1(api);
    await startAt(page);
    await addExpenses.open();
    expect(await addExpenses.categoryOptions(), "'Investment (Sanchaypatra)' lives under Investment").not.toContain('Investment (Sanchaypatra)');
    await addExpenses.cancel();
    await addExpense(addExpenses, { category: 'DPS / Savings', method: 'Bank / MFS', from: ACC.BRAC, savings: ACC.UPENSION, amount: '5000' });
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(10_35_000));
    expect(await api.balanceOf(ACC.UPENSION)).toBe(tk(5_000));
    expect((await bucket(api, 'universal_pension')).invested).toBe(tk(5_000));
    expect((await bucket(api, 'dps')).invested, 'counted once').toBe(0);
    expect((await api.tax()).tax_rebate_paisa).toBe(tk(500));
  });

  c = mf('MF-EXP-041');
  test(c.title, c.details, async ({ page, api, addExpenses }) => {
    await baselineB1(api);
    await startAt(page);
    await addExpenses.open();
    await addExpenses.category('Investment');
    await addExpenses.amount('1000');
    await addExpenses.form.getByRole('button', { name: 'Save Investment' }).click();
    await expect(page.getByRole('heading', { name: 'Add Expenses' }), 'blocked without an investment').toBeVisible();
    await addExpenses.investment(ACC.SANCH);
    await addExpenses.paymentMethod('Bank / MFS');
    await addExpenses.form.getByRole('button', { name: 'Save Investment' }).click();
    await expect(page.getByRole('heading', { name: 'Add Expenses' }), 'blocked without a paying account').toBeVisible();
    expect(await api.transactions()).toHaveLength(0);
    expect(await api.balanceOf(ACC.SANCH)).toBe(0);
  });

  c = mf('MF-EXP-042');
  test(c.title, c.details, async ({ api, taxPage }) => {
    const acc = await baselineT1(api);
    await api.addTransaction({ category: 'DPS / Savings', amount_paisa: tk(10_000), description: 'DPS installment', savings_account_id: acc.DPS.id, bank_account_id: acc.BRAC.id });
    const fy = (await api.tax()).fiscal_year;
    const original = await api.taxYear(fy);
    const cfg = structuredClone(original.config_json ?? original.config ?? original);
    try {
      cfg.rebate.investment_rate_bps = 1500;
      await api.putTaxYear(fy, cfg);
      await taxPage.open();
      expect(await taxPage.row('Net Tax Payable'), '15% of ৳10,000 = ৳1,500 rebate').toBe(tk(25_000));
      expect((await api.tax()).tax_rebate_paisa).toBe(tk(1_500));
    } finally {
      cfg.rebate.investment_rate_bps = 1000;
      await api.putTaxYear(fy, cfg);
    }
    expect((await api.tax()).tax_rebate_paisa, 'back to 10%').toBe(tk(1_000));
  });

  c = mf('MF-EXP-043');
  test(c.title, c.details, async ({ page, api, addExpenses }) => {
    const acc = await baselineB1(api);
    await api.post('/savings-goals', { name: 'Emergency fund', target_amount_paisa: tk(1_00_000), target_date: `${Number(currentMonth().slice(0, 4)) + 1}-12-31`, linked_account_id: acc.DPS.id });
    await startAt(page);
    await addExpense(addExpenses, { category: 'DPS / Savings', method: 'Bank / MFS', from: ACC.BRAC, savings: ACC.DPS, description: 'Goal deposit', amount: '10000' });
    const goals = await api.get('/savings-goals');
    const goal = (goals.goals ?? goals.data ?? goals).find((g: any) => g.name === 'Emergency fund');
    expect(goal.progress_pct).toBe(10);
    const tx = (await api.transactions()).find((t) => t.description === 'Goal deposit');
    await api.del(`/transactions/${tx.id}`);
    const after = await api.get('/savings-goals');
    expect((after.goals ?? after.data ?? after).find((g: any) => g.name === 'Emergency fund').progress_pct, 'deleting the deposit returns it to 0%').toBe(0);
  });
});
