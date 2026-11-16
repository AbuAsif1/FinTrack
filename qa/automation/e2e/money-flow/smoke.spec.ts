/**
 * Money-flow SMOKE cases — the five core money paths from the master workbook.
 * Each test: build the baseline via API → perform the action in the UI → check every screen the
 * money touches (UI figures) → cross-check exact numbers via API.
 * Expected values are the literals from the workbook, not recomputed.
 */
import { test, expect } from './support/fixtures';
import { mf } from './support/cases';
import { ACC, baselineB0, baselineB1, baselineT1 } from './support/baselines';
import { optionTexts, waitForApp } from './support/pages';
import { tk } from './support/money';
import { currentMonth } from './support/dates';

test.describe('Add Expenses — Spending', () => {
  const c = mf('MF-EXP-001');
  test(c.title, c.details, async ({ page, api, addExpenses, bankWallet, dashboard, taxPage, transactions }) => {
    await baselineB1(api);
    await page.goto('/');
    await waitForApp(page);

    await test.step('Add Expenses: Groceries ৳1,500 paid in Cash', async () => {
      await addExpenses.open();
      await addExpenses.category('Groceries');
      await addExpenses.paymentMethod('Cash');
      await expect(addExpenses.cashNote()).toContainText('Paid from In-Hand Cash (৳5,000.00 available)');
      await addExpenses.description('Meena Bazar');
      await addExpenses.amount('1500');
      await addExpenses.save();
    });

    await test.step('Bank & Wallet: only In-Hand Cash drops', async () => {
      await bankWallet.open();
      expect(await bankWallet.balance(ACC.CASH)).toBe(tk(3_500));
      expect(await bankWallet.balance(ACC.BRAC)).toBe(tk(1_80_000));
      expect(await bankWallet.balance(ACC.BKASH)).toBe(tk(20_000));
      expect(await bankWallet.tile('Cash on Hand')).toBe(tk(3_500));
      expect(await bankWallet.tile('Net Worth')).toBe(tk(2_03_500));
    });

    await test.step('Dashboard: counted as spending', async () => {
      await dashboard.open();
      expect(await dashboard.tile('Income')).toBe(tk(80_000));
      expect(await dashboard.tile('Spending')).toBe(tk(1_500));
      expect(await dashboard.tile('Net Savings')).toBe(tk(78_500));
      expect(await dashboard.tileText('Savings Rate')).toMatch(/^98(\.1)?%$/);
      const d = await api.dashboard();
      expect(d.current_month.remaining_to_spend_paisa).toBe(tk(78_500));
      expect(d.current_month.discretionary_cash_paisa).toBe(tk(80_000));
    });

    await test.step('Tax: unchanged', async () => {
      await taxPage.open();
      expect(await taxPage.row('Gross Annual Income')).toBe(tk(80_000));
      expect(await taxPage.row('Taxable Income')).toBe(tk(53_333.33));
      expect(await taxPage.row('Gross Tax')).toBe(0);
      expect(await taxPage.row('Total Paid')).toBe(0);
    });

    await test.step('Transactions: new row', async () => {
      await transactions.open();
      await expect(transactions.row('Meena Bazar', '−৳1,500.00')).toContainText('Groceries');
    });
  });

  const c2 = mf('MF-EXP-002');
  test(c2.title, c2.details, async ({ page, api, addExpenses, bankWallet, dashboard }) => {
    await baselineB1(api);
    await page.goto('/');
    await waitForApp(page);

    await test.step('Add Expenses: Groceries ৳1,500 paid by Bank / MFS from BRAC Bank', async () => {
      await addExpenses.open();
      await addExpenses.category('Groceries');
      await addExpenses.paymentMethod('Bank / MFS');
      const offered = (await optionTexts(addExpenses.payFromSelect)).join(' | ');
      expect(offered, 'only Payment Accounts may pay').toContain(ACC.BRAC);
      expect(offered).toContain(ACC.BKASH);
      for (const notPayable of [ACC.DPS, ACC.SANCH, ACC.UPENSION, ACC.INSURANCE, ACC.STOCKS]) {
        expect(offered, `${notPayable} must not be offered`).not.toContain(notPayable);
      }
      await addExpenses.payFrom(ACC.BRAC);
      await addExpenses.description('Meena Bazar');
      await addExpenses.amount('1500');
      await addExpenses.save();
    });

    await test.step('Bank & Wallet: only BRAC Bank drops', async () => {
      await bankWallet.open();
      expect(await bankWallet.balance(ACC.BRAC)).toBe(tk(1_78_500));
      expect(await bankWallet.balance(ACC.CASH)).toBe(tk(5_000));
      expect(await bankWallet.balance(ACC.BKASH)).toBe(tk(20_000));
      expect(await bankWallet.tile('Bank Balance')).toBe(tk(1_78_500));
      expect(await bankWallet.tile('Net Worth')).toBe(tk(2_03_500));
    });

    await test.step('Dashboard: counted as spending', async () => {
      await dashboard.open();
      expect(await dashboard.tile('Spending')).toBe(tk(1_500));
      expect(await dashboard.tile('Net Savings')).toBe(tk(78_500));
      expect((await api.dashboard()).current_month.remaining_to_spend_paisa).toBe(tk(78_500));
    });
  });
});

test.describe('Add Expenses — DPS / Savings', () => {
  const c = mf('MF-EXP-020');
  test(c.title, c.details, async ({ page, api, addExpenses, bankWallet, dashboard }) => {
    await baselineB1(api);
    await page.goto('/');
    await waitForApp(page);

    await test.step('Add Expenses: DPS / Savings ৳10,000 into BRAC DPS, paid from BRAC Bank', async () => {
      await addExpenses.open();
      await addExpenses.category('DPS / Savings');
      await expect(addExpenses.form.getByText('This will deposit into your savings account.')).toBeVisible();
      await addExpenses.paymentMethod('Bank / MFS');
      await addExpenses.payFrom(ACC.BRAC);
      await addExpenses.savingsAccount(ACC.DPS);
      await addExpenses.description('DPS installment');
      await addExpenses.amount('10000');
      await addExpenses.save();
    });

    await test.step('Bank & Wallet: BRAC −৳10,000, DPS +৳10,000, totals unchanged', async () => {
      await bankWallet.open();
      expect(await bankWallet.balance(ACC.BRAC)).toBe(tk(1_70_000));
      expect(await bankWallet.balance(ACC.DPS)).toBe(tk(10_000));
      expect(await bankWallet.tile('Bank Balance'), 'DPS counts under its parent bank').toBe(tk(1_80_000));
      expect(await bankWallet.tile('Net Worth'), 'a transfer between own accounts').toBe(tk(2_05_000));
    });

    await test.step('Dashboard: a transfer, NOT spending', async () => {
      await dashboard.open();
      expect(await dashboard.tile('Spending')).toBe(0);
      expect(await dashboard.tile('Net Savings')).toBe(tk(80_000));
      expect((await api.dashboard()).current_month.remaining_to_spend_paisa, 'cash out').toBe(tk(70_000));
    });

    await test.step('Tax: DPS invested ৳10,000 toward the ৳1,20,000 cap', async () => {
      const dps = (await api.tax()).investment_breakdown.find((b: { category: string }) => b.category === 'dps');
      expect(dps).toMatchObject({ invested: tk(10_000), cap: tk(1_20_000), eligible: tk(10_000) });
    });
  });
});

test.describe('Add Income — Salary', () => {
  const c = mf('MF-INC-001');
  test(c.title, c.details, async ({ page, api, addIncome, bankWallet, dashboard, taxPage }) => {
    await baselineB0(api);
    await page.goto('/');
    await waitForApp(page);

    await test.step('Add Income: Salary this month, In-Hand ৳1,00,000 + TDS ৳10,000 into BRAC Bank', async () => {
      await addIncome.open();
      await addIncome.kind('Salary');
      await addIncome.month(currentMonth());
      await addIncome.moneyField('In-Hand Salary (৳)', '100000');
      await addIncome.moneyField('TDS Amount (৳)', '10000');
      await addIncome.receivedInto(ACC.BRAC);
      await expect(addIncome.dialog).toContainText('৳1,10,000.00');
      await addIncome.save();
    });

    await test.step('Bank & Wallet: BRAC + In-Hand (not gross)', async () => {
      await bankWallet.open();
      expect(await bankWallet.balance(ACC.BRAC)).toBe(tk(2_00_000));
      expect(await bankWallet.tile('Net Worth')).toBe(tk(2_25_000));
    });

    await test.step('Dashboard: In-Hand income', async () => {
      await dashboard.open();
      expect(await dashboard.tile('Income')).toBe(tk(1_00_000));
      expect(await dashboard.tile('Net Savings')).toBe(tk(1_00_000));
      expect(await dashboard.tileText('Savings Rate')).toMatch(/^100(\.0)?%$/);
      const d = await api.dashboard();
      expect(d.current_month.discretionary_cash_paisa).toBe(tk(1_00_000));
      expect(d.current_month.remaining_to_spend_paisa).toBe(tk(1_00_000));
    });

    await test.step('Tax: gross income, TDS credited', async () => {
      await taxPage.open();
      expect(await taxPage.row('Gross Annual Income')).toBe(tk(1_10_000));
      expect(await taxPage.row('Taxable Income')).toBe(tk(73_333.33));
      expect(await taxPage.row('Gross Tax')).toBe(0);
      expect(await taxPage.row('TDS deducted from salary')).toBe(tk(10_000));
      expect(await taxPage.row('Total Paid')).toBe(tk(10_000));
      expect(await taxPage.row('Overpaid (refundable)')).toBe(tk(10_000));
    });
  });
});

test.describe('Add Expenses — Tax Payment', () => {
  const c = mf('MF-EXP-085');
  test(c.title, c.details, async ({ page, api, addExpenses, bankWallet, dashboard, taxPage }) => {
    await baselineT1(api);
    await page.goto('/');
    await waitForApp(page);

    await test.step('Add Expenses: Tax Payment ৳5,000 from BRAC Bank', async () => {
      await addExpenses.open();
      await addExpenses.category('Tax Payment');
      await expect(addExpenses.form.getByLabel('Fiscal Year'), 'defaults to the current Fiscal Year').toHaveValue((await api.tax()).fiscal_year);
      await addExpenses.paymentMethod('Bank / MFS');
      await addExpenses.payFrom(ACC.BRAC);
      await addExpenses.description('Advance tax');
      await addExpenses.amount('5000');
      await addExpenses.save();
    });

    await test.step('Bank & Wallet: BRAC −৳5,000', async () => {
      await bankWallet.open();
      expect(await bankWallet.balance(ACC.BRAC)).toBe(tk(10_35_000));
      expect(await bankWallet.tile('Net Worth')).toBe(tk(10_60_000));
    });

    await test.step('Tax: Remaining falls, Net Tax unchanged', async () => {
      await taxPage.open();
      expect(await taxPage.row('Gross Annual Income')).toBe(tk(9_60_000));
      expect(await taxPage.row('Taxable Income')).toBe(tk(6_40_000));
      expect(await taxPage.row('Gross Tax')).toBe(tk(26_500));
      expect(await taxPage.row('Net Tax Payable')).toBe(tk(26_500));
      expect(await taxPage.row('TDS deducted from salary')).toBe(tk(20_000));
      expect(await taxPage.row('Advance / self-assessment tax')).toBe(tk(5_000));
      expect(await taxPage.row('Total Paid')).toBe(tk(25_000));
      expect(await taxPage.row('Remaining to Pay')).toBe(tk(1_500));
    });

    await test.step('Dashboard: not spending; tax card shows tax actually paid', async () => {
      await dashboard.open();
      expect(await dashboard.tile('Spending')).toBe(0);
      // BRD FR-02 "Tax paid so far" = money actually paid (TDS ৳20,000 + advance ৳5,000), the same
      // figure as Tax → Total Paid. Business Findings F-21: the card currently shows a 12-month projection.
      // ("Est. remaining" may legitimately be a projection, so it is not asserted here.)
      expect(await dashboard.taxCard('Paid so far'), 'Paid so far must equal Tax → Total Paid').toBe(tk(25_000));
    });
  });
});
