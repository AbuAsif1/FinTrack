/**
 * Sanity area: INCOME — MF-INC-002…027 (MF-INC-001 lives in smoke.spec.ts).
 * Every case: an income entry through the Add Income form → the receiving account rises by the
 * In-Hand amount (gross − TDS), the Dashboard shows In-Hand, the Tax page uses Gross and credits TDS.
 * Tax literals assume baseline T1 (four FY salaries, gross ৳2,40,000, TDS ৳5,000): Gross ৳9,60,000,
 * Taxable ৳6,40,000, Gross Tax ৳26,500, TDS ৳20,000.
 */
import { test, expect } from './support/fixtures';
import { mf } from './support/cases';
import { ACC, baselineB0, baselineT1 } from './support/baselines';
import { startAt } from './support/flow';
import { tk } from './support/money';
import { currentMonth, fiscalYear, fyStartYear, today } from './support/dates';
import { monthLabel } from './support/pages';
import type { AddIncomeForm, TaxPage } from './support/pages';
import type { Api } from './support/api';

type Salary = { month?: string; inHand: string; tds?: string; into?: string; bonus?: string; other?: string; employer?: string };
type Other = { type: string; amount: string; tds?: string; into?: string; payer?: string; period?: string; taxable?: boolean; month?: string };

async function addSalary(f: AddIncomeForm, s: Salary, save = true) {
  await f.open();
  await f.kind('Salary');
  await f.month(s.month ?? currentMonth());
  await f.moneyField('In-Hand Salary (৳)', s.inHand);
  if (s.tds) await f.moneyField('TDS Amount (৳)', s.tds);
  if (s.bonus) await f.moneyField('Bonus (৳)', s.bonus);
  if (s.other) await f.moneyField('Other Allowances (৳)', s.other);
  if (s.employer) await f.text('Employer', s.employer);
  if (s.into) await f.receivedInto(s.into);
  if (save) await f.save();
}

async function addOther(f: AddIncomeForm, o: Other, save = true) {
  await f.open();
  await f.kind('Other Income');
  await f.month(o.month ?? currentMonth());
  await f.incomeType(o.type);
  await f.moneyField('Amount Received (৳)', o.amount);
  if (o.tds) await f.moneyField('TDS (৳)', o.tds);
  if (o.payer) await f.text('Payer Name', o.payer);
  if (o.period) await f.text('Earned Period', o.period);
  if (o.into) await f.receivedInto(o.into);
  if (o.taxable !== undefined) await f.taxableCheckbox().setChecked(o.taxable);
  if (save) await f.save();
}

/** Gross → Taxable → Gross Tax → TDS → remaining, read from the Tax page. */
async function expectTaxPage(taxPage: TaxPage, x: { gross: number; taxable: number; grossTax: number; tds?: number; remaining?: number; overpaid?: number }) {
  await taxPage.open();
  expect(await taxPage.row('Gross Annual Income')).toBe(x.gross);
  expect(await taxPage.row('Taxable Income')).toBe(x.taxable);
  expect(await taxPage.row('Gross Tax')).toBe(x.grossTax);
  if (x.tds !== undefined) expect(await taxPage.row('TDS deducted from salary')).toBe(x.tds);
  if (x.remaining !== undefined) expect(await taxPage.row('Remaining to Pay')).toBe(x.remaining);
  if (x.overpaid !== undefined) expect(await taxPage.row('Overpaid (refundable)')).toBe(x.overpaid);
}

async function entries(api: Api, month = currentMonth()) {
  const r = await api.get(`/income-entries?month=${month}`);
  return Array.isArray(r) ? r : r.entries ?? r.data ?? [];
}

function previousFY() {
  const s = fyStartYear() - 1;
  return `${s}-${String(s + 1).slice(-2)}`;
}

test.describe('Salary', () => {
  let c = mf('MF-INC-002');
  test(c.title, c.details, async ({ page, api, addIncome, bankWallet, taxPage }) => {
    await baselineT1(api);
    await startAt(page);
    await addSalary(addIncome, { inHand: '235000', tds: '5000', into: ACC.BRAC });
    await bankWallet.open();
    expect(await bankWallet.balance(ACC.BRAC)).toBe(tk(12_75_000));
    const d = await api.dashboard();
    expect(d.tiles.in_hand_income_paisa).toBe(tk(2_35_000));
    expect(d.current_month.income_is_estimated, 'no longer estimated').toBe(false);
    await expectTaxPage(taxPage, { gross: tk(12_00_000), taxable: tk(8_00_000), grossTax: tk(48_750), tds: tk(25_000), remaining: tk(23_750) });
    const t = await api.tax();
    expect(t.exemption_paisa).toBe(tk(4_00_000));
    expect(t.slab_breakdown.map((s: any) => s.tax).filter((x: number) => x > 0), '10% ৳30,000 + 15% ৳18,750').toEqual([tk(30_000), tk(18_750)]);
    expect(t.months_entered).toBe(5);
    expect(t.further_investment_for_max_rebate_paisa).toBe(tk(2_40_000));
    expect(t.suggested_monthly_tds_paisa).toBe(Math.round(t.remaining_tax_paisa / t.remaining_salary_months));
  });

  c = mf('MF-INC-003');
  test(c.title, c.details, async ({ page, api, addIncome }) => {
    await baselineT1(api);
    await startAt(page);
    await addIncome.open();
    await addIncome.kind('Salary');
    const inHand = (await addIncome.moneyValue('In-Hand Salary (৳)')).replace(/[,\s]/g, '');
    const tds = (await addIncome.moneyValue('TDS Amount (৳)')).replace(/[,\s]/g, '');
    expect(Number(inHand), "last month's In-Hand pre-filled").toBe(235000);
    expect(Number(tds), "last month's TDS pre-filled").toBe(5000);
  });

  c = mf('MF-INC-004');
  test(c.title, c.details, async ({ page, api, addIncome }) => {
    await baselineB0(api);
    await startAt(page);
    await addSalary(addIncome, { inHand: '50000' }, false);
    await addIncome.dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(addIncome.dialog, 'blocked: a salary needs a receiving account').toBeVisible();
    expect(await entries(api)).toHaveLength(0);
  });

  c = mf('MF-INC-005');
  test(c.title, c.details, async ({ page, api, addIncome }) => {
    await baselineB0(api);
    await startAt(page);
    await addIncome.open();
    await addIncome.kind('Salary');
    const select = addIncome.dialog.getByLabel('Received into');
    await expect(select.locator('option', { hasText: ACC.BRAC })).toBeAttached();
    const options = (await select.locator('option').allTextContents()).join(' | ');
    for (const ok of [ACC.BRAC, ACC.BKASH, ACC.CASH]) expect(options).toContain(ok);
    for (const no of [ACC.DPS, ACC.SANCH, ACC.UPENSION, ACC.INSURANCE, ACC.STOCKS]) expect(options, `${no} cannot receive income`).not.toContain(no);
    await addIncome.dialog.getByRole('button', { name: 'Cancel' }).click();
    await addSalary(addIncome, { inHand: '20000', into: ACC.BKASH });
    expect(await api.balanceOf(ACC.BKASH)).toBe(tk(40_000));
    expect((await api.dashboard()).tiles.in_hand_income_paisa).toBe(tk(20_000));
    expect((await api.tax()).gross_income_paisa).toBe(tk(20_000));
  });

  c = mf('MF-INC-006');
  test(c.title, c.details, async ({ page, api, addIncome }) => {
    await baselineT1(api);
    await startAt(page);
    await addSalary(addIncome, { inHand: '235000', tds: '5000', bonus: '20000', other: '5000', into: ACC.BRAC });
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(13_00_000));
    expect((await api.dashboard()).tiles.in_hand_income_paisa).toBe(tk(2_60_000));
    expect((await api.tax()).gross_income_paisa).toBe(tk(12_25_000));
    const types = (await entries(api)).map((e: any) => e.income_type);
    expect(types, 'FR-03: the bonus is its own income component, not merged into Salary').toEqual(expect.arrayContaining([expect.not.stringMatching(/^SALARY$/)]));
  });

  c = mf('MF-INC-007');
  test(c.title, c.details, async ({ page, api, addIncome, taxPage }) => {
    await baselineT1(api);
    await startAt(page);
    await addSalary(addIncome, { inHand: '290000', tds: '10000', into: ACC.BRAC });
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(13_30_000));
    await expectTaxPage(taxPage, { gross: tk(12_60_000), taxable: tk(8_40_000), grossTax: tk(54_750), tds: tk(30_000), remaining: tk(24_750) });
    expect((await api.tax()).gross_income_paisa, 'actual sum, NOT ৳3,00,000 × 12').toBe(tk(12_60_000));
    await page.getByRole('button', { name: 'Forecast' }).click();
    await expect(page.getByText(/PROJECTED/).first(), 'the forecast is labelled as a projection').toBeVisible();
  });

  c = mf('MF-INC-008');
  test(c.title, c.details, async ({ page, api, addIncome }) => {
    await baselineB0(api);
    await startAt(page);
    await addSalary(addIncome, { inHand: '50000', tds: '-1000', into: ACC.BRAC }, false);
    await expect(addIncome.dialog.getByText('Enter a valid amount')).toBeVisible();
    await addIncome.dialog.getByRole('button', { name: 'Save', exact: true }).click();
    // Let the save finish either way, then look at what was stored (F-35: the invalid TDS becomes ৳0 and saves).
    await expect(addIncome.dialog).toBeHidden({ timeout: 10_000 }).catch(() => undefined);
    const all = await api.get('/income-entries');
    const stored = Array.isArray(all) ? all : all.entries ?? all.data ?? [];
    expect(stored.map((e: any) => `gross ${e.gross_paisa} tds ${e.tds_paisa}`), 'an invalid (negative) TDS blocks the save').toEqual([]);
    await expect(addIncome.dialog, 'the form stays open').toBeVisible();
    // Same dialog: clear the amounts and try again.
    await addIncome.moneyField('In-Hand Salary (৳)', '');
    await addIncome.moneyField('TDS Amount (৳)', '');
    await addIncome.dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(addIncome.error()).toContainText('Amount is required');
    expect(await entries(api)).toHaveLength(0);
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(1_00_000));
  });

  c = mf('MF-INC-009');
  test(c.title, c.details, async ({ page, api, addIncome }) => {
    const s = fyStartYear();
    await api.createAccount({ name: ACC.BRAC, type: 'SAVINGS', bank_name: 'BRAC Bank', opening_balance_paisa: tk(1_00_000), opening_date: `${s}-06-01` });
    await startAt(page);
    await addSalary(addIncome, { month: `${s}-06`, inHand: '50000', into: ACC.BRAC });
    await addSalary(addIncome, { month: `${s}-07`, inHand: '60000', into: ACC.BRAC });
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(2_10_000));
    expect((await api.tax(previousFY())).gross_income_paisa, '30 June → previous FY').toBe(tk(50_000));
    expect((await api.tax(fiscalYear())).gross_income_paisa, '1 July → new FY').toBe(tk(60_000));
  });

  c = mf('MF-INC-010');
  test(c.title, c.details, async ({ page, api, addIncome }) => {
    const acc = await baselineB0(api);
    await api.addIncome({ month: currentMonth(), income_type: 'SALARY', gross_paisa: tk(1_10_000), tds_paisa: tk(10_000), savings_account_id: acc.BRAC.id });
    await startAt(page);
    // The form pre-fills last month's TDS (US-19); arrears had none, so clear it as a user would.
    await addSalary(addIncome, { inHand: '10000', tds: '0', into: ACC.BRAC, employer: 'Arrears' });
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(2_10_000));
    expect((await api.dashboard()).tiles.in_hand_income_paisa).toBe(tk(1_10_000));
    expect((await api.tax()).gross_income_paisa).toBe(tk(1_20_000));
    expect(await entries(api), 'both entries listed').toHaveLength(2);
  });
});

test.describe('Other income types', () => {
  let c = mf('MF-INC-011');
  test(c.title, c.details, async ({ page, api, addIncome, taxPage }) => {
    await baselineT1(api);
    await startAt(page);
    await addOther(addIncome, { type: 'Cheer', amount: '20000', payer: 'Rakib', period: 'Q3 2026', into: ACC.BKASH, taxable: true });
    expect(await api.balanceOf(ACC.BKASH)).toBe(tk(40_000));
    await expectTaxPage(taxPage, { gross: tk(9_80_000), taxable: tk(6_53_333.33), grossTax: tk(27_833.33), remaining: tk(7_833.33) });
    const cheer = (await entries(api)).find((e: any) => e.income_type === 'CHEER');
    expect(cheer).toMatchObject({ payer_name: 'Rakib', earned_period: 'Q3 2026' });
  });

  c = mf('MF-INC-012');
  test(c.title, c.details, async ({ page, api, addIncome, taxPage }) => {
    await baselineT1(api);
    await startAt(page);
    await addOther(addIncome, { type: 'Profit Share', amount: '45000', tds: '5000', into: ACC.BRAC });
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(10_85_000));
    await expectTaxPage(taxPage, { gross: tk(10_10_000), taxable: tk(6_73_333.33), grossTax: tk(29_833.33), tds: tk(25_000), remaining: tk(4_833.33) });
  });

  c = mf('MF-INC-013');
  test(c.title, c.details, async ({ page, api, addIncome, taxPage }) => {
    await baselineT1(api);
    await startAt(page);
    await addOther(addIncome, { type: 'Eid Festival Bonus', amount: '120000', into: ACC.BRAC });
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(11_60_000));
    await expectTaxPage(taxPage, { gross: tk(10_80_000), taxable: tk(7_20_000), grossTax: tk(36_750), remaining: tk(16_750) });
    expect((await api.tax()).slab_breakdown.map((s: any) => s.tax).filter((x: number) => x > 0), 'into the 15% slab').toEqual([tk(30_000), tk(6_750)]);
  });

  c = mf('MF-INC-014');
  test(c.title, c.details, async ({ page, api, addIncome, taxPage }) => {
    await baselineT1(api);
    await startAt(page);
    await addOther(addIncome, { type: 'Leave Encashment', amount: '27000', tds: '3000', into: ACC.BRAC });
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(10_67_000));
    await expectTaxPage(taxPage, { gross: tk(9_90_000), taxable: tk(6_60_000), grossTax: tk(28_500), tds: tk(23_000), remaining: tk(5_500) });
  });

  c = mf('MF-INC-015');
  test(c.title, c.details, async ({ page, api, addIncome, taxPage }) => {
    await baselineT1(api);
    await startAt(page);
    await addIncome.open();
    await addIncome.kind('Other Income');
    await addIncome.incomeType('Certification Reimbursement');
    await expect(addIncome.taxableCheckbox(), 'not taxable by default').not.toBeChecked();
    await addIncome.dialog.getByRole('button', { name: 'Cancel' }).click();
    await addOther(addIncome, { type: 'Certification Reimbursement', amount: '15000', into: ACC.BRAC });
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(10_55_000));
    expect((await api.dashboard()).tiles.in_hand_income_paisa, 'In-Hand still counts').toBe(tk(15_000));
    await expectTaxPage(taxPage, { gross: tk(9_60_000), taxable: tk(6_40_000), grossTax: tk(26_500) });
  });

  c = mf('MF-INC-016');
  test(c.title, c.details, async ({ page, api, addIncome, taxPage }) => {
    await baselineT1(api);
    await startAt(page);
    await addOther(addIncome, { type: 'Certification Reimbursement', amount: '15000', into: ACC.BRAC, taxable: true });
    await expectTaxPage(taxPage, { gross: tk(9_75_000), taxable: tk(6_50_000), grossTax: tk(27_500) });
  });

  c = mf('MF-INC-017');
  test(c.title, c.details, async ({ page, api, addIncome, taxPage }) => {
    await baselineT1(api);
    await api.post('/holiday-support-entries', { date: today(), days: 2, rate_type: 'HOLIDAY', rate_paisa: tk(4_000), note: 'Eid duty' });
    const grossAfterLog = (await api.tax()).gross_income_paisa;
    await startAt(page);
    if (grossAfterLog === tk(9_60_000)) {
      // The log did not reach income/tax: record it as a Holiday Support income entry (as the workbook says).
      await addOther(addIncome, { type: 'Holiday Support', amount: '8000', into: ACC.BRAC });
    }
    await expectTaxPage(taxPage, { gross: tk(9_68_000), taxable: tk(6_45_333.33), grossTax: tk(27_033.33) });
    expect(await api.balanceOf(ACC.BRAC), 'received once').toBe(tk(10_48_000));
  });

  c = mf('MF-INC-018');
  test(c.title, c.details, async ({ page, api, addIncome, taxPage }) => {
    await baselineT1(api);
    await startAt(page);
    await addOther(addIncome, { type: 'Bank Savings Interest', amount: '9000', tds: '1000', into: ACC.BRAC });
    expect(await api.balanceOf(ACC.BRAC), '+ the net ৳9,000').toBe(tk(10_49_000));
    await expectTaxPage(taxPage, { gross: tk(9_70_000), taxable: tk(6_46_666.67), grossTax: tk(27_166.67), remaining: tk(6_166.67) });
    expect((await api.tax()).tds_paisa, 'TDS on interest is credited').toBe(tk(21_000));
  });

  c = mf('MF-INC-019');
  test(c.title, c.details, async ({ page, api, addIncome, taxPage }) => {
    const acc = await baselineT1(api);
    await api.addTransaction({ category: 'Investment (Sanchaypatra)', amount_paisa: tk(50_000), description: 'Sanchaypatra purchase', savings_account_id: acc.SANCH.id, bank_account_id: acc.BRAC.id });
    await startAt(page);
    await addOther(addIncome, { type: 'Sanchaypatra Profit', amount: '69750', tds: '7750', into: ACC.BRAC });
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(10_59_750));
    expect(await api.balanceOf(ACC.SANCH), 'profit is not principal').toBe(tk(50_000));
    await expectTaxPage(taxPage, { gross: tk(10_37_500), taxable: tk(6_91_666.67), grossTax: tk(32_500), overpaid: tk(250) });
    const t = await api.tax();
    expect(t.tax_rebate_paisa).toBe(tk(5_000));
    expect(t.net_tax_payable_paisa).toBe(tk(27_500));
    expect(t.tds_paisa).toBe(tk(27_750));
  });

  c = mf('MF-INC-020');
  test(c.title, c.details, async ({ page, api, addIncome }) => {
    await baselineB0(api);
    await startAt(page);
    await addIncome.open();
    await addIncome.kind('Other Income');
    await addIncome.month(currentMonth());
    await addIncome.incomeType('Other');
    await addIncome.moneyField('Amount Received (৳)', '10000');
    await addIncome.dialog.getByLabel('Received into').selectOption({ label: 'Not into one of my accounts' });
    await addIncome.save();
    expect((await api.accounts()).totals.net_worth_paisa, 'no account changes').toBe(tk(1_25_000));
    expect((await api.dashboard()).tiles.in_hand_income_paisa).toBe(tk(10_000));
    expect((await api.tax()).gross_income_paisa).toBe(tk(10_000));
  });
});

test.describe('Income — edit, delete, locked year, proposal, filing', () => {
  /** MF-INC-001's end state via API: November Salary In-Hand ৳1,00,000 + TDS ৳10,000 into BRAC. */
  async function inc001(api: Api) {
    const acc = await baselineB0(api);
    await api.addIncome({ month: currentMonth(), income_type: 'SALARY', gross_paisa: tk(1_10_000), tds_paisa: tk(10_000), savings_account_id: acc.BRAC.id });
    return acc;
  }

  let c = mf('MF-INC-021');
  test(c.title, c.details, async ({ page, api, incomePage, addIncome }) => {
    await inc001(api);
    await incomePage.open();
    await incomePage.showDetails(monthLabel(currentMonth()));
    await incomePage.entryAction(monthLabel(currentMonth()), 'Edit');
    await addIncome.moneyField('In-Hand Salary (৳)', '120000');
    await addIncome.save();
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(2_20_000));
    expect((await api.dashboard()).tiles.in_hand_income_paisa).toBe(tk(1_20_000));
    const t = await api.tax();
    expect(t.gross_income_paisa).toBe(tk(1_30_000));
    expect(t.tds_paisa).toBe(tk(10_000));
  });

  c = mf('MF-INC-022');
  test(c.title, c.details, async ({ page, api, incomePage, dashboard }) => {
    await inc001(api);
    await incomePage.open();
    await incomePage.showDetails(monthLabel(currentMonth()));
    await incomePage.entryAction(monthLabel(currentMonth()), 'Delete');
    await page.getByRole('dialog').filter({ hasText: 'Delete entry?' }).getByRole('button', { name: 'Delete', exact: true }).click();
    await expect.poll(async () => (await entries(api)).length, { message: 'entry removed' }).toBe(0);
    expect(await api.balanceOf(ACC.BRAC)).toBe(tk(1_00_000));
    // With no income or spending left the dashboard shows its first-run checklist, so read the tiles via API.
    const d = await api.dashboard();
    expect(d.tiles.in_hand_income_paisa).toBe(0);
    expect(d.tiles.savings_rate_bps, 'no income → no savings rate').toBeNull();
    void dashboard;
    const t = await api.tax();
    expect(t.gross_income_paisa).toBe(0);
    expect(t.tds_paisa).toBe(0);
    await incomePage.open();
    await expect(incomePage.row(monthLabel(currentMonth())), 'back to Pending').toContainText('Pending');
  });

  c = mf('MF-INC-023');
  test(c.title, c.details, async ({ page, api, addIncome }) => {
    await api.createAccount({ name: ACC.BRAC, type: 'SAVINGS', bank_name: 'BRAC Bank', opening_balance_paisa: tk(1_00_000), opening_date: `${fyStartYear() - 1}-07-01` });
    await api.fileTaxYear(previousFY(), `${fyStartYear()}-09-15`);
    await startAt(page);
    await addSalary(addIncome, { month: `${fyStartYear()}-05`, inHand: '10000', into: ACC.BRAC }, false);
    await addIncome.dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(addIncome.error(), 'the filed year is locked').toContainText(/lock|filed/i);
    expect((await api.tax(previousFY())).gross_income_paisa).toBe(0);
  });

  c = mf('MF-INC-024');
  test(c.title, c.details, async ({ page, api }) => {
    test.skip(['07', '08', '09', '10'].includes(currentMonth().slice(5)), 'T1 salaries cover this month');
    await baselineT1(api);
    await startAt(page);
    const card = page.locator('main').getByText(/Your salary was/).first();
    await expect(card, 'p2-11: the new-month salary proposal').toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /^Confirm/ }).first().click();
    await expect.poll(() => api.balanceOf(ACC.BRAC), { message: 'same receiving account as last month' }).toBe(tk(12_75_000));
    expect((await api.tax()).gross_income_paisa).toBe(tk(12_00_000));
    await startAt(page);
    await expect(page.locator('main').getByText(/Your salary was/), 'not shown again this month').toHaveCount(0);
  });

  c = mf('MF-INC-025');
  test(c.title, c.details, async ({ page, api, taxPage }) => {
    const s = fyStartYear();
    await api.addIncome({ month: `${s}-06`, income_type: 'SALARY', gross_paisa: tk(12_00_000), tds_paisa: 0 });
    const fy = previousFY();
    expect((await api.tax(fy)).net_tax_payable_paisa, 'before filing').toBe(tk(48_750));
    await api.fileTaxYear(fy, `${s}-09-15`);
    await taxPage.open();
    await taxPage.selectFY(fy);
    expect(await taxPage.row('Net Tax Payable'), 'filed by 30 Sep: 5% early-filing rebate').toBe(tk(46_312.5));
    expect((await api.tax(fy)).early_filing_rebate_applied_paisa).toBe(tk(2_437.5));
    await api.post(`/tax-years/${fy}/reopen`, {});
    await api.fileTaxYear(fy, `${s}-10-05`);
    expect((await api.tax(fy)).net_tax_payable_paisa, 'filed after 30 Sep: no rebate').toBe(tk(48_750));
  });

  c = mf('MF-INC-026');
  test(c.title, c.details, async ({ page, api }) => {
    test.skip(['07', '08', '09', '10'].includes(currentMonth().slice(5)), 'T1 salaries cover this month');
    await baselineT1(api);
    const d = await api.dashboard();
    expect(d.tiles.in_hand_income_paisa).toBe(0);
    expect(d.current_month.income_is_estimated).toBe(true);
    expect(d.current_month.discretionary_cash_paisa, "last month's ৳2,35,000").toBe(tk(2_35_000));
    expect(d.current_month.remaining_to_spend_paisa).toBe(tk(2_35_000));
    await startAt(page);
    await expect(page.locator('main'), 'labelled as estimated').toContainText(/estimat/i);
  });

  c = mf('MF-INC-027');
  test(c.title, c.details, async ({ page, api, addIncome }) => {
    test.skip(['07', '08', '09', '10'].includes(currentMonth().slice(5)), 'T1 salaries cover this month');
    await baselineT1(api);
    expect((await api.tax()).months_entered).toBe(4);
    await startAt(page);
    await addSalary(addIncome, { inHand: '235000', tds: '5000', into: ACC.BRAC });
    expect((await api.tax()).months_entered).toBe(5);
    await startAt(page, '/tax');
    await expect(page.locator('main'), 'completeness 5 of 12').toContainText(/5\s*(of|\/)\s*12/);
  });
});
