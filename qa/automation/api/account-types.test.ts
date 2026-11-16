/**
 * TC-P2ACC-001 to TC-P2ACC-015 — Account types, Parent Accounts and Bank & Wallet totals.
 * Every money case reads each touched account's balance back, not just the write status.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContext, type TestUser } from '../helpers/index';

type Ctx = Awaited<ReturnType<typeof createTestContext>>;
type Headers = { Authorization: string };

let ctx: Ctx;
let user: TestUser;
let headers: Headers;

beforeEach(async () => {
  ctx = await createTestContext();
  user = await ctx.createUser({ provision: true });
  headers = await ctx.authHeader(user);
});

afterEach(async () => {
  await ctx?.cleanup();
});

async function createAccount(body: Record<string, unknown>) {
  return ctx.makeRequest('POST', '/api/v1/savings-accounts', {
    headers,
    body: { bank_name: 'BRAC Bank', opening_date: '2026-01-01', opening_balance_paisa: 0, ...body },
  });
}

async function account(body: Record<string, unknown>): Promise<{ id: string }> {
  const res = await createAccount(body);
  expect(res.status, `create ${String(body.name)}`).toBe(201);
  return res.json();
}

async function listAccounts() {
  const res = await ctx.makeRequest('GET', '/api/v1/savings-accounts', { headers });
  expect(res.status).toBe(200);
  return res.json() as Promise<{
    accounts: { id: string; balance_paisa: number; parent_account_id: string | null }[];
    totals: Record<string, number>;
  }>;
}

async function balanceOf(id: string): Promise<number> {
  const { accounts } = await listAccounts();
  const found = accounts.find((a) => a.id === id);
  expect(found, `account ${id} listed`).toBeDefined();
  return found!.balance_paisa;
}

async function categoryId(routingType: string): Promise<string> {
  const existing = await ctx.db.category.findFirst({ where: { userId: user.id, routingType: routingType as never, isArchived: false } });
  if (existing) return existing.id;
  const created = await ctx.db.category.create({
    data: { userId: user.id, name: `${routingType} test`, routingType: routingType as never, colorHex: '#888888' },
  });
  return created.id;
}

let keySeq = 0;
async function postTx(body: Record<string, unknown>) {
  keySeq += 1;
  return ctx.makeRequest('POST', '/api/v1/transactions', {
    headers,
    body: { description: 'test', idempotency_key: `acc-${Date.now()}-${keySeq}`, ...body },
  });
}

// ---------------------------------------------------------------------------

describe('TC-P2ACC-001: DPS and FDR need a Savings or MFS parent', () => {
  it('rejects a missing or non-parent parent and accepts Savings and MFS parents', async () => {
    const brac = await account({ name: 'BRAC Savings', type: 'SAVINGS' });
    const bkash = await account({ name: 'bKash', type: 'MFS', bank_name: 'bKash' });

    expect((await createAccount({ name: 'Orphan DPS', type: 'DPS' })).status).toBe(422);

    const dpsRes = await createAccount({ name: 'BRAC DPS', type: 'DPS', parent_account_id: brac.id });
    expect(dpsRes.status).toBe(201);
    const dps = await dpsRes.json();
    expect(dps.parent_account_id).toBe(brac.id);

    const fdrRes = await createAccount({ name: 'bKash FDR', type: 'FDR', parent_account_id: bkash.id });
    expect(fdrRes.status).toBe(201);
    expect((await fdrRes.json()).parent_account_id).toBe(bkash.id);

    expect((await createAccount({ name: 'DPS under DPS', type: 'DPS', parent_account_id: dps.id })).status).toBe(422);
  });
});

describe('TC-P2ACC-003: Spending by BANK from an MFS account', () => {
  it('reduces the MFS balance by the amount', async () => {
    const bkash = await account({ name: 'bKash', type: 'MFS', bank_name: 'bKash', opening_balance_paisa: 1000000 });
    const res = await postTx({ amount_paisa: 150000, category_id: await categoryId('NONE'), payment_method: 'BANK', savings_account_id: bkash.id });
    expect(res.status).toBe(201);
    expect(await balanceOf(bkash.id)).toBe(850000);
  });
});

describe('TC-P2ACC-004: a DPS cannot pay Spending', () => {
  it('returns 422 ACCOUNT_NOT_PAYABLE and writes nothing', async () => {
    const brac = await account({ name: 'BRAC Savings', type: 'SAVINGS' });
    const dps = await account({ name: 'BRAC DPS', type: 'DPS', parent_account_id: brac.id, opening_balance_paisa: 500000 });
    const res = await postTx({ amount_paisa: 10000, category_id: await categoryId('NONE'), payment_method: 'BANK', savings_account_id: dps.id });
    expect(res.status).toBe(422);
    expect((await res.json()).code).toBe('ACCOUNT_NOT_PAYABLE');
    expect(await balanceOf(dps.id)).toBe(500000);
    expect(await ctx.db.transaction.count({ where: { userId: user.id } })).toBe(0);
  });
});

describe('TC-P2ACC-005: Spending by CASH takes from In-Hand Cash', () => {
  it('reduces the In-Hand Cash balance without naming an account', async () => {
    const cash = await account({ name: 'In-Hand Cash', type: 'CASH', opening_balance_paisa: 200000 });
    const res = await postTx({ amount_paisa: 30000, category_id: await categoryId('NONE'), payment_method: 'CASH' });
    expect(res.status).toBe(201);
    expect(await balanceOf(cash.id)).toBe(170000);
  });
});

describe('TC-P2ACC-006: DPS installment paid from any Payment Account', () => {
  it('takes the installment from bKash and adds it to the DPS; the parent is untouched', async () => {
    const brac = await account({ name: 'BRAC Savings', type: 'SAVINGS', opening_balance_paisa: 5000000 });
    const bkash = await account({ name: 'bKash', type: 'MFS', bank_name: 'bKash', opening_balance_paisa: 2000000 });
    const dps = await account({ name: 'BRAC DPS', type: 'DPS', parent_account_id: brac.id });
    const res = await postTx({
      amount_paisa: 500000, category_id: await categoryId('SAVINGS_DEPOSIT'),
      payment_method: 'BANK', savings_account_id: dps.id, bank_account_id: bkash.id,
    });
    expect(res.status).toBe(201);
    expect(await balanceOf(bkash.id)).toBe(1500000);
    expect(await balanceOf(dps.id)).toBe(500000);
    expect(await balanceOf(brac.id)).toBe(5000000);
  });
});

describe('TC-P2ACC-010: loans and tax payments move money in the paying account', () => {
  it('loan given −4,000, loan received +1,000, tax −2,000 leaves BRAC at 45,000', async () => {
    const brac = await account({ name: 'BRAC Savings', type: 'SAVINGS', opening_balance_paisa: 5000000 });
    const given = await postTx({ amount_paisa: 400000, category_id: await categoryId('LOAN_GIVEN'), payment_method: 'BANK', bank_account_id: brac.id, loan_person_name: 'Rahim' });
    expect(given.status).toBe(201);
    const received = await postTx({ amount_paisa: 100000, category_id: await categoryId('LOAN_RECEIVED'), payment_method: 'BANK', bank_account_id: brac.id, loan_person_name: 'Rahim' });
    expect(received.status).toBe(201);
    const tax = await postTx({ amount_paisa: 200000, category_id: await categoryId('TAX_PAYMENT'), payment_method: 'BANK', bank_account_id: brac.id });
    expect(tax.status).toBe(201);
    expect(await balanceOf(brac.id)).toBe(4500000);
  });
});

describe('TC-P2ACC-011: a DPS withdrawal returns the money to the parent', () => {
  it('DPS 30,000 withdrawn fully: DPS 0, BRAC 10,000 → 40,000', async () => {
    const brac = await account({ name: 'BRAC Savings', type: 'SAVINGS', opening_balance_paisa: 1000000 });
    const dps = await account({ name: 'BRAC DPS', type: 'DPS', parent_account_id: brac.id, opening_balance_paisa: 3000000 });
    const res = await postTx({ amount_paisa: 3000000, category_id: await categoryId('SAVINGS_WITHDRAWAL'), payment_method: 'BANK', savings_account_id: dps.id });
    expect(res.status).toBe(201);
    expect(await balanceOf(dps.id)).toBe(0);
    expect(await balanceOf(brac.id)).toBe(4000000);
  });
});

async function postIncome(body: Record<string, unknown>) {
  keySeq += 1;
  return ctx.makeRequest('POST', '/api/v1/income-entries', {
    headers,
    body: { month: '2026-11', income_type: 'SALARY', idempotency_key: `inc-${Date.now()}-${keySeq}`, ...body },
  });
}

describe('TC-P2ACC-007: income raises the receiving account by gross − TDS', () => {
  it('80,000 gross with 8,000 TDS into BRAC at 10,000 → 82,000', async () => {
    const brac = await account({ name: 'BRAC Savings', type: 'SAVINGS', opening_balance_paisa: 1000000 });
    const res = await postIncome({ gross_paisa: 8000000, tds_paisa: 800000, savings_account_id: brac.id });
    expect(res.status).toBe(201);
    expect(await balanceOf(brac.id)).toBe(8200000);
  });
});

describe('TC-P2ACC-008: a DPS cannot receive income', () => {
  it('returns 422 ACCOUNT_NOT_PAYABLE and writes nothing', async () => {
    const brac = await account({ name: 'BRAC Savings', type: 'SAVINGS' });
    const dps = await account({ name: 'BRAC DPS', type: 'DPS', parent_account_id: brac.id });
    const res = await postIncome({ gross_paisa: 100000, savings_account_id: dps.id });
    expect(res.status).toBe(422);
    expect((await res.json()).code).toBe('ACCOUNT_NOT_PAYABLE');
    expect(await ctx.db.incomeEntry.count({ where: { userId: user.id } })).toBe(0);
  });
});

describe('TC-P2ACC-009: deleting income takes it back out of the account', () => {
  it('BRAC returns to 10,000 after the income is soft-deleted', async () => {
    const brac = await account({ name: 'BRAC Savings', type: 'SAVINGS', opening_balance_paisa: 1000000 });
    const res = await postIncome({ gross_paisa: 8000000, tds_paisa: 800000, savings_account_id: brac.id });
    const entry = await res.json();
    const del = await ctx.makeRequest('DELETE', `/api/v1/income-entries/${entry.id}`, { headers });
    expect([200, 204]).toContain(del.status);
    expect(await balanceOf(brac.id)).toBe(1000000);
  });
});

describe('TC-P2ACC-012: Bank & Wallet totals and Net Worth', () => {
  it('groups children under their parent and the dashboard shows the same Net Worth', async () => {
    const brac = await account({ name: 'BRAC Savings', type: 'SAVINGS', opening_balance_paisa: 1000000 });
    await account({ name: 'BRAC DPS', type: 'DPS', parent_account_id: brac.id, opening_balance_paisa: 500000 });
    const bkash = await account({ name: 'bKash', type: 'MFS', bank_name: 'bKash', opening_balance_paisa: 200000 });
    await account({ name: 'bKash DPS', type: 'DPS', parent_account_id: bkash.id, opening_balance_paisa: 100000 });
    await account({ name: 'In-Hand Cash', type: 'CASH', opening_balance_paisa: 50000 });
    await account({ name: 'Sanchaypatra', type: 'SANCHAYPATRA', bank_name: 'Bangladesh Bank', opening_balance_paisa: 2000000 });
    // A spend makes balances differ from opening balances, so Net Worth must come from live balances
    expect((await postTx({ amount_paisa: 100000, category_id: await categoryId('NONE'), payment_method: 'BANK', savings_account_id: brac.id })).status).toBe(201);

    const { totals } = await listAccounts();
    expect(totals.bank_paisa).toBe(1400000);
    expect(totals.mfs_paisa).toBe(300000);
    expect(totals.cash_paisa).toBe(50000);
    expect(totals.investment_paisa).toBe(2000000);
    expect(totals.net_worth_paisa).toBe(3750000);

    const dash = await ctx.makeRequest('GET', '/api/v1/dashboard/summary', { headers });
    expect(dash.status).toBe(200);
    expect((await dash.json()).net_worth_paisa).toBe(3750000);
  });
});

describe('TC-P2ACC-013: transfers between Payment Accounts', () => {
  it('moves BRAC → In-Hand Cash and refuses a transfer out of a DPS', async () => {
    const brac = await account({ name: 'BRAC Savings', type: 'SAVINGS', opening_balance_paisa: 1000000 });
    const cash = await account({ name: 'In-Hand Cash', type: 'CASH', opening_balance_paisa: 0 });
    const dps = await account({ name: 'BRAC DPS', type: 'DPS', parent_account_id: brac.id, opening_balance_paisa: 500000 });

    const ok = await ctx.makeRequest('POST', '/api/v1/savings-accounts/transfer', {
      headers, body: { from_account_id: brac.id, to_account_id: cash.id, amount_paisa: 100000, date: '2026-11-14' },
    });
    expect(ok.status).toBe(201);
    expect(await balanceOf(brac.id)).toBe(900000);
    expect(await balanceOf(cash.id)).toBe(100000);

    const bad = await ctx.makeRequest('POST', '/api/v1/savings-accounts/transfer', {
      headers, body: { from_account_id: dps.id, to_account_id: cash.id, amount_paisa: 1000, date: '2026-11-14' },
    });
    expect(bad.status).toBe(422);
    expect((await bad.json()).code).toBe('ACCOUNT_NOT_PAYABLE');
    expect(await balanceOf(dps.id)).toBe(500000);
  });
});

describe('TC-P2ACC-014: only one In-Hand Cash account', () => {
  it('returns 409 CASH_ACCOUNT_EXISTS for a second one', async () => {
    await account({ name: 'In-Hand Cash', type: 'CASH' });
    const res = await createAccount({ name: 'More Cash', type: 'CASH' });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('CASH_ACCOUNT_EXISTS');
  });
});

describe('TC-P2ACC-015: link an existing parentless DPS', () => {
  it('sets the parent and moves the DPS into the bank total', async () => {
    const brac = await account({ name: 'BRAC Savings', type: 'SAVINGS', opening_balance_paisa: 1000000 });
    const legacy = await ctx.db.savingsAccount.create({
      data: { userId: user.id, name: 'Old DPS', type: 'DPS', bankName: 'BRAC Bank', openingDate: new Date('2026-01-01'), openingBalancePaisa: 300000n },
    });
    let { totals } = await listAccounts();
    expect(totals.bank_paisa).toBe(1000000);
    expect(totals.net_worth_paisa).toBe(1300000);

    const res = await ctx.makeRequest('PATCH', `/api/v1/savings-accounts/${legacy.id}`, { headers, body: { parent_account_id: brac.id } });
    expect(res.status).toBe(200);
    expect((await res.json()).parent_account_id).toBe(brac.id);
    ({ totals } = await listAccounts());
    expect(totals.bank_paisa).toBe(1300000);
  });
});

describe('TC-P2ACC-016: Mark Paid on a DPS Fixed Expense moves money from the paying account', () => {
  it('BRAC 50,000 pays the 5,000 installment: BRAC 45,000, DPS 5,000', async () => {
    const brac = await account({ name: 'BRAC Savings', type: 'SAVINGS', opening_balance_paisa: 5000000 });
    const dps = await account({ name: 'BRAC DPS', type: 'DPS', parent_account_id: brac.id });
    const month = '2026-11';
    const tmplRes = await ctx.makeRequest('POST', '/api/v1/fixed-expenses', {
      headers,
      body: { name: 'BRAC DPS installment', standard_amount_paisa: 500000, due_day: 5, category_id: await categoryId('SAVINGS_DEPOSIT'), savings_account_id: dps.id, start_month: month },
    });
    expect(tmplRes.status).toBe(201);
    const tmpl = await tmplRes.json();
    const instances = await (await ctx.makeRequest('GET', `/api/v1/fixed-expense-instances?from=${month}&to=${month}`, { headers })).json();
    const inst = instances.find((i: { fixed_expense_id: string }) => i.fixed_expense_id === tmpl.id);

    const res = await ctx.makeRequest('POST', `/api/v1/fixed-expense-instances/${inst.id}/pay`, {
      headers, body: { actual_amount_paisa: 500000, paid_date: '2026-11-05', payment_method: 'BANK', bank_account_id: brac.id },
    });
    expect(res.status).toBe(200);
    expect(await balanceOf(brac.id)).toBe(4500000);
    expect(await balanceOf(dps.id)).toBe(500000);
  });
});

async function investedInTax(category: string): Promise<number> {
  const res = await ctx.makeRequest('GET', '/api/v1/tax/summary', { headers });
  expect(res.status).toBe(200);
  const body = await res.json();
  const breakdown = (body.investment_breakdown ?? body.result?.investment_breakdown) as { category: string; invested: number }[];
  return breakdown.find((b) => b.category === category)?.invested ?? 0;
}

describe('TC-P2ACC-017: Investment kinds are independent and carry a monthly installment', () => {
  it('creates a UPension with an installment and rejects one with a parent', async () => {
    const brac = await account({ name: 'BRAC Savings', type: 'SAVINGS' });
    const res = await createAccount({ name: 'UPension', type: 'UNIVERSAL_PENSION', bank_name: 'NPA', monthly_installment_paisa: 500000 });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.type).toBe('UNIVERSAL_PENSION');
    expect(body.monthly_installment_paisa).toBe(500000);
    for (const type of ['STOCKS', 'INSURANCE']) {
      expect((await createAccount({ name: type, type })).status, type).toBe(201);
    }
    expect((await createAccount({ name: 'UPension child', type: 'UNIVERSAL_PENSION', parent_account_id: brac.id })).status).toBe(422);
  });
});

describe('TC-P2ACC-018: a UPension installment moves money and fills only the Universal Pension rebate', () => {
  it('BRAC 50,000 pays 5,000 with the "DPS / Savings" category: BRAC 45,000, UPension 5,000, tax counts it once', async () => {
    const brac = await account({ name: 'BRAC Savings', type: 'SAVINGS', opening_balance_paisa: 5000000 });
    const ups = await account({ name: 'UPension', type: 'UNIVERSAL_PENSION', bank_name: 'NPA' });
    const dpsNamed = await ctx.db.category.create({
      data: { userId: user.id, name: 'DPS / Savings test', routingType: 'SAVINGS_DEPOSIT', colorHex: '#888888' },
    });
    const res = await postTx({ amount_paisa: 500000, category_id: dpsNamed.id, payment_method: 'BANK', savings_account_id: ups.id, bank_account_id: brac.id });
    expect(res.status).toBe(201);
    expect(await balanceOf(brac.id)).toBe(4500000);
    expect(await balanceOf(ups.id)).toBe(500000);
    expect(await investedInTax('universal_pension')).toBe(500000);
    expect(await investedInTax('dps')).toBe(0);
  });
});

describe('TC-P2ACC-019: every Investment kind counts in the Investment total and Net Worth', () => {
  it('Sanchaypatra 20,000 + UPension 5,000 + Insurance 3,000 = 28,000 investment; Net Worth adds BRAC 10,000', async () => {
    await account({ name: 'BRAC Savings', type: 'SAVINGS', opening_balance_paisa: 1000000 });
    await account({ name: 'Sanchaypatra', type: 'SANCHAYPATRA', opening_balance_paisa: 2000000 });
    await account({ name: 'UPension', type: 'UNIVERSAL_PENSION', opening_balance_paisa: 500000 });
    await account({ name: 'Life policy', type: 'INSURANCE', opening_balance_paisa: 300000 });
    const { totals } = await listAccounts();
    expect(totals.investment_paisa).toBe(2800000);
    expect(totals.net_worth_paisa).toBe(3800000);
  });
});

describe('TC-P2ACC-020: Add Expenses → Investment pays into an Investment Account', () => {
  it('bKash 20,000 pays a 3,000 Insurance premium: bKash 17,000, Insurance 3,000, Insurance rebate 3,000, listed for the FY', async () => {
    const bkash = await account({ name: 'bKash', type: 'MFS', bank_name: 'bKash', opening_balance_paisa: 2000000 });
    const policy = await account({ name: 'Life policy', type: 'INSURANCE', bank_name: 'MetLife', monthly_installment_paisa: 300000 });
    keySeq += 1;
    const res = await ctx.makeRequest('POST', '/api/v1/investments', {
      headers,
      body: { savings_account_id: policy.id, amount_paisa: 300000, payment_method: 'BANK', bank_account_id: bkash.id, idempotency_key: `inv-${Date.now()}-${keySeq}` },
    });
    expect(res.status).toBe(201);
    expect(await balanceOf(bkash.id)).toBe(1700000);
    expect(await balanceOf(policy.id)).toBe(300000);
    expect(await investedInTax('insurance')).toBe(300000);

    const list = await (await ctx.makeRequest('GET', '/api/v1/investments', { headers })).json();
    expect(list.transactions.map((t: { account_name: string }) => t.account_name)).toEqual(['Life policy']);
  });
});

describe('TC-P2ACC-002: only DPS and FDR take a parent', () => {
  it('rejects a parent on Sanchaypatra, Investment and Savings accounts', async () => {
    const brac = await account({ name: 'BRAC Savings', type: 'SAVINGS' });
    for (const type of ['SANCHAYPATRA', 'INVESTMENT', 'SAVINGS']) {
      const res = await createAccount({ name: `${type} child`, type, parent_account_id: brac.id });
      expect(res.status, type).toBe(422);
    }
  });
});
