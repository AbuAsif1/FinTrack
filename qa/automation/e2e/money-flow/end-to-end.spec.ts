/**
 * END-TO-END journeys — MF-E2E-001 (one realistic month, every routing type, every screen must
 * reconcile) and MF-E2E-002 (fiscal-year tax journey). Run these after any change to money routing.
 */
import { test, expect } from './support/fixtures';
import { mf } from './support/cases';
import { ACC, baselineB0, baselineT1 } from './support/baselines';
import { addExpense, startAt } from './support/flow';
import { tk } from './support/money';
import { currentMonth } from './support/dates';
import type { AddExpensesForm, AddIncomeForm } from './support/pages';

async function salary(f: AddIncomeForm, inHand: string, tds: string, into: string) {
  await f.open();
  await f.kind('Salary');
  await f.month(currentMonth());
  await f.moneyField('In-Hand Salary (৳)', inHand);
  await f.moneyField('TDS Amount (৳)', tds);
  await f.receivedInto(into);
  await f.save();
}

async function payFixed(f: AddExpensesForm, template: string, from: string, amount?: string) {
  await f.open();
  await f.category('Fixed Expenses');
  await f.fixedExpense(template);
  if (amount) await f.amount(amount);
  await f.paymentMethod('Bank / MFS');
  await f.payFrom(from);
  await f.save();
}

async function invest(f: AddExpensesForm, account: string, amount: string, from: string) {
  await f.open();
  await f.category('Investment');
  await f.investment(account);
  await f.paymentMethod('Bank / MFS');
  await f.payFrom(from);
  await f.amount(amount);
  await f.save();
}

async function transfer(f: AddExpensesForm, from: string, to: string, amount: string) {
  await f.open();
  await f.category('Transfer between accounts');
  await f.transfer(from, to);
  await f.amount(amount);
  await f.save();
}

test.describe('End-to-End', () => {
  let c = mf('MF-E2E-001');
  test(c.title, c.details, async ({ page, api, addIncome, addExpenses, bankWallet, dashboard, taxPage, loans }) => {
    test.setTimeout(900_000);
    const acc = await baselineB0(api);
    const m = currentMonth();
    await api.addFixedExpense({ name: 'Mess Rent', standard_amount_paisa: tk(8_722), due_day: 15, category_id: await api.categoryId('Rent'), start_month: m });
    await api.addFixedExpense({ name: 'BRAC DPS Installment', standard_amount_paisa: tk(10_000), due_day: 14, category_id: await api.categoryId('DPS / Savings'), start_month: m, savings_account_id: acc.DPS.id });
    await api.addFixedExpense({ name: 'Home Internet', standard_amount_paisa: tk(500), due_day: 16, category_id: await api.categoryId('Utility'), start_month: m });
    await startAt(page);

    await test.step('1–11: the month, entered as a user would', async () => {
      await salary(addIncome, '150000', '10000', ACC.BRAC);
      await transfer(addExpenses, ACC.BRAC, ACC.CASH, '10000');
      await addExpense(addExpenses, { category: 'Groceries', method: 'Cash', amount: '3200' });
      await payFixed(addExpenses, 'Mess Rent', ACC.BRAC);
      await payFixed(addExpenses, 'BRAC DPS Installment', ACC.BRAC);
      await payFixed(addExpenses, 'Home Internet', ACC.BKASH);
      await addExpense(addExpenses, { category: 'Dining', method: 'Bank / MFS', from: ACC.BKASH, amount: '1250' });
      await addExpense(addExpenses, { category: 'Loan Given', method: 'Bank / MFS', from: ACC.BKASH, person: 'Mithun', amount: '5000' });
      await addExpense(addExpenses, { category: 'Loan Received', method: 'Cash', person: 'Sohel', amount: '2000' });
      await invest(addExpenses, ACC.SANCH, '20000', ACC.BRAC);
      await addExpense(addExpenses, { category: 'Tax Payment', method: 'Bank / MFS', from: ACC.BRAC, amount: '3000' });
    });

    await test.step('Bank & Wallet reconciles', async () => {
      await bankWallet.open();
      expect(await bankWallet.balance(ACC.BRAC)).toBe(tk(1_98_278));
      expect(await bankWallet.balance(ACC.DPS)).toBe(tk(10_000));
      expect(await bankWallet.balance(ACC.BKASH)).toBe(tk(13_250));
      expect(await bankWallet.balance(ACC.CASH)).toBe(tk(13_800));
      expect(await bankWallet.balance(ACC.SANCH)).toBe(tk(20_000));
      expect(await bankWallet.tile('Bank Balance')).toBe(tk(2_08_278));
      expect(await bankWallet.tile('Net Worth'), '৳1,25,000 + ৳1,50,000 − ৳13,672 − ৳5,000 + ৳2,000 − ৳3,000').toBe(tk(2_55_328));
    });

    await test.step('Dashboard reconciles', async () => {
      await dashboard.open();
      expect(await dashboard.tile('Income')).toBe(tk(1_50_000));
      expect(await dashboard.tile('Spending')).toBe(tk(13_672));
      expect(await dashboard.tile('Net Savings')).toBe(tk(1_33_328));
      expect(await dashboard.tileText('Savings Rate')).toMatch(/^88\.9%$/);
      const d = await api.dashboard();
      const slices = Object.fromEntries(d.spending_by_category.map((s: any) => [s.category_name, s.amount_paisa]));
      expect(slices).toEqual({ Groceries: tk(3_200), Rent: tk(8_722), Utility: tk(500), Dining: tk(1_250) });
      expect(d.current_month.fixed_commitments_paisa).toBe(tk(19_222));
      expect(d.current_month.discretionary_cash_paisa).toBe(tk(1_30_778));
      expect(d.current_month.remaining_to_spend_paisa).toBe(tk(1_00_328));
      expect(d.loan_summary).toMatchObject({ owed_to_me_paisa: tk(5_000), i_owe_paisa: tk(2_000) });
    });

    await test.step('Tax reconciles', async () => {
      await taxPage.open();
      expect(await taxPage.row('Gross Annual Income')).toBe(tk(1_60_000));
      expect(await taxPage.row('Taxable Income')).toBe(tk(1_06_666.67));
      expect(await taxPage.row('Gross Tax')).toBe(0);
      expect(await taxPage.row('TDS deducted from salary')).toBe(tk(10_000));
      expect(await taxPage.row('Advance / self-assessment tax')).toBe(tk(3_000));
      expect(await taxPage.row('Total Paid')).toBe(tk(13_000));
      expect(await taxPage.row('Overpaid (refundable)')).toBe(tk(13_000));
      const t = await api.tax();
      const inv = Object.fromEntries(t.investment_breakdown.map((b: any) => [b.category, b.invested]));
      expect(inv).toMatchObject({ dps: tk(10_000), sanchaypatra: tk(20_000) });
      expect(t.eligible_investment_paisa).toBe(tk(30_000));
      expect(t.tax_rebate_paisa, 'no tax to rebate').toBe(0);
    });

    await test.step('Loans and Fixed Expenses reconcile', async () => {
      await loans.open();
      expect(await loans.balance('Mithun')).toBe(tk(5_000));
      expect(await loans.balance('Sohel')).toBe(-tk(2_000));
      const statuses = (await api.instances(m)).map((i) => `${i.template_name}:${i.status}`).sort();
      expect(statuses).toEqual(['BRAC DPS Installment:PAID', 'Home Internet:PAID', 'Mess Rent:PAID']);
      expect((await api.transactions()).length, '11 money entries minus the income (income is not a transaction)').toBeGreaterThanOrEqual(10);
    });
  });

  c = mf('MF-E2E-002');
  test(c.title, c.details, async ({ page, api, addIncome, addExpenses, bankWallet, dashboard, taxPage }) => {
    test.setTimeout(600_000);
    await baselineT1(api);
    await startAt(page);

    await test.step('Salary, DPS, Sanchaypatra, advance tax', async () => {
      await salary(addIncome, '235000', '5000', ACC.BRAC);
      await addExpense(addExpenses, { category: 'DPS / Savings', method: 'Bank / MFS', from: ACC.BRAC, savings: ACC.DPS, amount: '10000' });
      await invest(addExpenses, ACC.SANCH, '50000', ACC.BRAC);
      await addExpense(addExpenses, { category: 'Tax Payment', method: 'Bank / MFS', from: ACC.BRAC, amount: '10000' });
    });

    await test.step('Accounts', async () => {
      await bankWallet.open();
      expect(await bankWallet.balance(ACC.BRAC)).toBe(tk(12_05_000));
      expect(await bankWallet.balance(ACC.DPS)).toBe(tk(10_000));
      expect(await bankWallet.balance(ACC.SANCH)).toBe(tk(50_000));
    });

    await test.step('Tax for the year', async () => {
      await taxPage.open();
      expect(await taxPage.row('Gross Annual Income')).toBe(tk(12_00_000));
      expect(await taxPage.row('Taxable Income')).toBe(tk(8_00_000));
      expect(await taxPage.row('Gross Tax')).toBe(tk(48_750));
      expect(await taxPage.row('Net Tax Payable')).toBe(tk(42_750));
      expect(await taxPage.row('TDS deducted from salary')).toBe(tk(25_000));
      expect(await taxPage.row('Advance / self-assessment tax')).toBe(tk(10_000));
      expect(await taxPage.row('Total Paid')).toBe(tk(35_000));
      expect(await taxPage.row('Remaining to Pay')).toBe(tk(7_750));
      const t = await api.tax();
      expect(t.eligible_investment_paisa).toBe(tk(60_000));
      expect(t.tax_rebate_paisa, 'MIN(৳24,000; ৳6,000; ৳10L)').toBe(tk(6_000));
      expect(t.further_investment_for_max_rebate_paisa).toBe(tk(1_80_000));
      expect(t.suggested_monthly_tds_paisa).toBe(Math.round(t.remaining_tax_paisa / t.remaining_salary_months));
      if (currentMonth().endsWith('-11')) expect(t.suggested_monthly_tds_paisa).toBe(tk(1_107.14));
    });

    await test.step('What-if planner: +৳50,000 investment saves ৳5,000', async () => {
      const plan = await api.get(`/tax/planner?year=${(await api.tax()).fiscal_year}&additional_investment=${tk(50_000)}`);
      expect(JSON.stringify(plan), 'tax saved ৳5,000 (rebate ৳6,000 → ৳11,000)').toContain(String(tk(5_000)));
      await taxPage.open();
      await expect(page.getByText(/what-if tax planner/i).first(), 'the planner is on the Tax page').toBeVisible({ timeout: 5_000 });
      await page.getByLabel('Additional investment (৳)').fill('50000');
      await expect(page.locator('main'), 'p2-09: "If you invest ৳50,000 more, you save ৳5,000"').toContainText(/If you invest ৳50,000\.00 more, you save ৳5,000\.00/, { timeout: 10_000 });
    });

    await test.step('Dashboard tax card', async () => {
      await dashboard.open();
      expect(await dashboard.taxCard('Paid so far'), 'F-21: equals Tax → Total Paid').toBe(tk(35_000));
    });
  });
});
