/**
 * Sanity areas: TAX PAYMENT (MF-EXP-086…088; 085 is in smoke.spec.ts) and TRANSFER (MF-EXP-110…112).
 */
import { test, expect } from './support/fixtures';
import { mf } from './support/cases';
import { ACC, baselineB1 } from './support/baselines';
import { addExpense, fillExpense, startAt } from './support/flow';
import { tk } from './support/money';
import { fiscalYear, fyStartYear } from './support/dates';

test.describe('Tax Payment', () => {
  let c = mf('MF-EXP-086');
  test(c.title, c.details, async ({ page, api, addExpenses, dashboard, taxPage }) => {
    await baselineB1(api);
    await startAt(page);
    await addExpense(addExpenses, { category: 'Tax Payment', method: 'Cash', amount: '2000' });
    expect(await api.balanceOf(ACC.CASH)).toBe(tk(3_000));
    await dashboard.open();
    expect(await dashboard.tile('Spending'), 'tax is not spending').toBe(0);
    expect(await dashboard.tile('Net Savings'), 'Income − Spending − Tax Payments').toBe(tk(78_000));
    expect(await dashboard.tileText('Savings Rate')).toMatch(/^97\.5%$/);
    expect((await api.dashboard()).current_month.remaining_to_spend_paisa).toBe(tk(78_000));
    await taxPage.open();
    expect(await taxPage.row('Advance / self-assessment tax')).toBe(tk(2_000));
    expect(await taxPage.row('Total Paid')).toBe(tk(2_000));
    expect(await taxPage.row('Net Tax Payable')).toBe(0);
    expect(await taxPage.row('Overpaid (refundable)')).toBe(tk(2_000));
  });

  c = mf('MF-EXP-087');
  test(c.title, c.details, async ({ page, api, addExpenses }) => {
    await baselineB1(api);
    const previous = `${fyStartYear() - 1}-${String(fyStartYear()).slice(-2)}`;
    await startAt(page);
    await fillExpense(addExpenses, { category: 'Tax Payment', method: 'Bank / MFS', from: ACC.BRAC, amount: '4000' });
    const fySelect = addExpenses.form.locator('select').filter({ has: page.locator('option', { hasText: previous }) });
    await expect(fySelect, `a Fiscal Year choice offering ${previous}`).toBeVisible({ timeout: 5_000 });
    await fySelect.selectOption({ label: new RegExp(previous).source });
    await addExpenses.save();
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(1_76_000));
    expect((await api.tax(previous)).tax_payments_paisa).toBe(tk(4_000));
    expect((await api.tax(fiscalYear())).tax_payments_paisa, 'current FY untouched').toBe(0);
  });

  c = mf('MF-EXP-088');
  test(c.title, c.details, async ({ page, api, addExpenses }) => {
    await baselineB1(api);
    await startAt(page);
    await fillExpense(addExpenses, { category: 'Tax Payment', method: 'Bank / MFS', from: ACC.BKASH, amount: '25000' });
    await addExpenses.saveExpectingError(/bKash|balance/i);
    expect(await api.balanceOf(ACC.BKASH)).toBe(tk(20_000));
    expect(await api.transactions()).toHaveLength(0);
  });
});

test.describe('Transfer between accounts', () => {
  async function transfer(page: any, addExpenses: any, from: string, to: string, amount: string) {
    await addExpenses.open();
    await addExpenses.category('Transfer between accounts');
    await addExpenses.transfer(from, to);
    await addExpenses.amount(amount);
  }

  let c = mf('MF-EXP-110');
  test(c.title, c.details, async ({ page, api, addExpenses, bankWallet, dashboard }) => {
    await baselineB1(api);
    await startAt(page);
    await transfer(page, addExpenses, ACC.BRAC, ACC.CASH, '10000');
    await addExpenses.save();
    await bankWallet.open();
    expect(await bankWallet.balance(ACC.BRAC)).toBe(tk(1_70_000));
    expect(await bankWallet.balance(ACC.CASH)).toBe(tk(15_000));
    expect(await bankWallet.tile('Net Worth')).toBe(tk(2_05_000));
    await dashboard.open();
    expect(await dashboard.tile('Spending')).toBe(0);
    expect(await dashboard.tile('Income')).toBe(tk(80_000));
    expect(await dashboard.tile('Net Savings')).toBe(tk(80_000));
    expect((await api.dashboard()).current_month.remaining_to_spend_paisa, 'a transfer is neither cash in nor out').toBe(tk(80_000));
  });

  c = mf('MF-EXP-111');
  test(c.title, c.details, async ({ page, api, addExpenses, bankWallet }) => {
    await baselineB1(api);
    await startAt(page);
    await transfer(page, addExpenses, ACC.BRAC, ACC.BKASH, '5000');
    await addExpenses.save();
    await bankWallet.open();
    expect(await bankWallet.balance(ACC.BRAC)).toBe(tk(1_75_000));
    expect(await bankWallet.balance(ACC.BKASH)).toBe(tk(25_000));
    expect(await bankWallet.tile('MFS Balance')).toBe(tk(25_000));
  });

  c = mf('MF-EXP-112');
  test(c.title, c.details, async ({ page, api, addExpenses }) => {
    await baselineB1(api);
    await startAt(page);
    await addExpenses.open();
    await addExpenses.category('Transfer between accounts');
    const from = addExpenses.form.getByLabel('From account');
    await expect(from.locator('option', { hasText: ACC.BRAC })).toBeAttached();
    const fromOptions = (await from.locator('option').allTextContents()).join(' | ');
    for (const notPayable of [ACC.DPS, ACC.SANCH, ACC.UPENSION, ACC.INSURANCE, ACC.STOCKS]) {
      expect(fromOptions, `${notPayable} cannot send a transfer`).not.toContain(notPayable);
    }
    await from.selectOption({ index: (await from.locator('option').allTextContents()).findIndex((t) => t.startsWith(ACC.BRAC)) });
    const toOptions = (await addExpenses.form.getByLabel('To account').locator('option').allTextContents()).join(' | ');
    expect(toOptions, 'source and destination must differ').not.toContain(ACC.BRAC);
    await addExpenses.cancel();

    await transfer(page, addExpenses, ACC.BKASH, ACC.BRAC, '30000');
    await addExpenses.saveExpectingError(/bKash|balance|exceed/i);
    expect(await api.balanceOf(ACC.BKASH)).toBe(tk(20_000));
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(1_80_000));
  });
});
