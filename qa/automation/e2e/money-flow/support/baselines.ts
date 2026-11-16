/**
 * Starting data sets — identical to the 'Baseline & Legend' sheet of
 * qa/test-cases/FinTrack-BD_Test-Cases.xlsx. Change both together.
 *
 *   B0  accounts only                         Net Worth ৳1,25,000
 *   B1  B0 + this month's salary ৳80,000      BRAC ৳1,80,000 · Net Worth ৳2,05,000
 *   T1  B0 + four FY salaries (gross ৳2,40,000 each, TDS ৳5,000) — tax baseline
 *       Gross ৳9,60,000 · Taxable ৳6,40,000 · Gross Tax ৳26,500 · TDS ৳20,000 · Remaining ৳6,500
 */
import type { Api, Account } from './api';
import { currentMonth, fyMonths, fyStartDate, fyStartYear } from './dates';
import { tk } from './money';

export const ACC = {
  BRAC: 'BRAC Bank',
  BKASH: 'bKash',
  CASH: 'In-Hand Cash',
  DPS: 'BRAC DPS',
  SANCH: 'Sanchaypatra',
  UPENSION: 'UPension',
  INSURANCE: 'Life Insurance',
  STOCKS: 'Stocks',
} as const;

export type Accounts = Record<keyof typeof ACC, Account>;

export async function baselineB0(api: Api, opts: { withCash?: boolean } = {}): Promise<Accounts> {
  const opening_date = fyStartDate();
  const brac = await api.createAccount({ name: ACC.BRAC, type: 'SAVINGS', bank_name: 'BRAC Bank', last_four: '4521', opening_balance_paisa: tk(1_00_000), opening_date });
  const bkash = await api.createAccount({ name: ACC.BKASH, type: 'MFS', bank_name: 'bKash', last_four: '01712345678', opening_balance_paisa: tk(20_000), opening_date });
  const cash = opts.withCash === false ? (undefined as unknown as Account)
    : await api.createAccount({ name: ACC.CASH, type: 'CASH', opening_balance_paisa: tk(5_000), opening_date });
  const dps = await api.createAccount({
    name: ACC.DPS, type: 'DPS', bank_name: 'BRAC Bank', parent_account_id: brac.id, opening_balance_paisa: 0, opening_date,
    monthly_installment_paisa: tk(10_000), maturity_date: `${fyStartYear() + 5}-06-30`,
  });
  const sanch = await api.createAccount({ name: ACC.SANCH, type: 'SANCHAYPATRA', bank_name: 'Bangladesh Bank', opening_balance_paisa: 0, opening_date });
  const upension = await api.createAccount({ name: ACC.UPENSION, type: 'UNIVERSAL_PENSION', bank_name: 'NPA', opening_balance_paisa: 0, opening_date });
  const insurance = await api.createAccount({ name: ACC.INSURANCE, type: 'INSURANCE', bank_name: 'MetLife', opening_balance_paisa: 0, opening_date });
  const stocks = await api.createAccount({ name: ACC.STOCKS, type: 'STOCKS', bank_name: 'DSE', opening_balance_paisa: 0, opening_date });
  return { BRAC: brac, BKASH: bkash, CASH: cash, DPS: dps, SANCH: sanch, UPENSION: upension, INSURANCE: insurance, STOCKS: stocks };
}

export async function baselineB1(api: Api, opts: { withCash?: boolean } = {}): Promise<Accounts> {
  const acc = await baselineB0(api, opts);
  await api.addIncome({ month: currentMonth(), income_type: 'SALARY', gross_paisa: tk(80_000), tds_paisa: 0, savings_account_id: acc.BRAC.id });
  return acc;
}

export async function baselineT1(api: Api): Promise<Accounts> {
  const acc = await baselineB0(api);
  for (const month of fyMonths(4)) {
    await api.addIncome({ month, income_type: 'SALARY', gross_paisa: tk(2_40_000), tds_paisa: tk(5_000), savings_account_id: acc.BRAC.id });
  }
  return acc;
}

/** F1 = B1 + three monthly Fixed Expense templates starting this month (Pending total ৳19,222). */
export async function baselineF1(api: Api): Promise<Accounts & { fe: { rent: any; dps: any; internet: any } }> {
  const acc = await baselineB1(api);
  const m = currentMonth();
  const rent = await api.addFixedExpense({ name: 'Mess Rent', standard_amount_paisa: tk(8_722), due_day: 15, category_id: await api.categoryId('Rent'), start_month: m });
  const dps = await api.addFixedExpense({ name: 'BRAC DPS Installment', standard_amount_paisa: tk(10_000), due_day: 14, category_id: await api.categoryId('DPS / Savings'), start_month: m, savings_account_id: acc.DPS.id });
  const internet = await api.addFixedExpense({ name: 'Home Internet', standard_amount_paisa: tk(500), due_day: 16, category_id: await api.categoryId('Utility'), start_month: m });
  return { ...acc, fe: { rent, dps, internet } };
}
