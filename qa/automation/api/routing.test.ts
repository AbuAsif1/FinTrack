/**
 * TC-ROUTE-001 to TC-ROUTE-023 â€” Category routing through /transactions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContext } from '../helpers/index';
import { toDbDate } from '@fintrack/shared';

type Ctx = Awaited<ReturnType<typeof createTestContext>>;
type TestUser = { id: string; email: string; password: string; role: 'USER' | 'ADMIN' };

let ctx: Ctx;

beforeEach(async () => {
  ctx = await createTestContext();
});

afterEach(async () => {
  await ctx?.cleanup();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getCategories(ctx: Ctx, user: TestUser) {
  const headers = await ctx.authHeader(user);
  const res = await ctx.makeRequest('GET', '/api/v1/categories', { headers });
  return res.json() as Promise<Array<{ id: string; name: string; routing_type: string; is_archived: boolean }>>;
}

async function createSavingsAccount(ctx: Ctx, user: TestUser, overrides: Record<string, unknown> = {}) {
  const headers = await ctx.authHeader(user);
  const res = await ctx.makeRequest('POST', '/api/v1/savings-accounts', {
    headers,
    body: {
      name: 'Test Savings', type: 'SAVINGS', bank_name: 'BRAC Bank',
      opening_balance_paisa: 5000000, opening_date: '2024-01-01',
      ...overrides,
    },
  });
  return res.json();
}

async function postTx(ctx: Ctx, user: TestUser, body: Record<string, unknown>) {
  const headers = await ctx.authHeader(user);
  return ctx.makeRequest('POST', '/api/v1/transactions', {
    headers,
    body: { idempotency_key: `ikey-${Date.now()}-${Math.random()}`, ...body },
  });
}

async function getCategoryByType(ctx: Ctx, user: TestUser, routingType: string) {
  const cats = await getCategories(ctx, user);
  return cats.find((c) => c.routing_type === routingType && !c.is_archived);
}

// ---------------------------------------------------------------------------
// TC-ROUTE-001: SAVINGS_DEPOSIT with no savings_account_id â€” 422
// ---------------------------------------------------------------------------

describe('TC-ROUTE-001: savings deposit with no savings_account_id', () => {
  it('returns 422; nothing is written', async () => {
    const user = await ctx.createUser({ provision: true });
    const depositCat = await getCategoryByType(ctx, user, 'SAVINGS_DEPOSIT');

    const res = await postTx(ctx, user, {
      amount_paisa: 100000, date: '2026-11-01',
      description: 'Deposit', category_id: depositCat!.id, payment_method: 'BANK',
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');

    const headers = await ctx.authHeader(user);
    const txCount = await ctx.makeRequest('GET', '/api/v1/transactions', { headers });
    const txList = await txCount.json();
    expect(txList.total).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// TC-ROUTE-002: Create a deposit â€” balance rises
// ---------------------------------------------------------------------------

describe('TC-ROUTE-002: savings deposit â€” balance rises', () => {
  it('account balance increases by deposit amount', async () => {
    const user = await ctx.createUser({ provision: true });
    const acct = await createSavingsAccount(ctx, user, { opening_balance_paisa: 5000000 });
    const depositCat = await getCategoryByType(ctx, user, 'SAVINGS_DEPOSIT');

    const res = await postTx(ctx, user, {
      amount_paisa: 1000000, date: '2026-11-01', description: 'Deposit',
      category_id: depositCat!.id, payment_method: 'BANK',
      savings_account_id: acct.id,
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.routing.account.balance_paisa).toBe(6000000);
  });
});

// ---------------------------------------------------------------------------
// TC-ROUTE-003: Total Spending unchanged after deposit
// ---------------------------------------------------------------------------

describe('TC-ROUTE-003: deposit does not change spending', () => {
  it('type is SAVINGS_DEPOSIT â€” excluded from spending', async () => {
    const user = await ctx.createUser({ provision: true });
    const acct = await createSavingsAccount(ctx, user);
    const depositCat = await getCategoryByType(ctx, user, 'SAVINGS_DEPOSIT');

    const res = await postTx(ctx, user, {
      amount_paisa: 1000000, date: '2026-11-01', description: 'Deposit',
      category_id: depositCat!.id, payment_method: 'BANK',
      savings_account_id: acct.id,
    });
    const tx = await res.json();
    expect(tx.type).toBe('SAVINGS_DEPOSIT');
  });
});

// ---------------------------------------------------------------------------
// TC-ROUTE-004: Savings withdrawal â€” balance falls
// ---------------------------------------------------------------------------

describe('TC-ROUTE-004: savings withdrawal â€” balance falls', () => {
  it('account balance decreases by withdrawal amount', async () => {
    const user = await ctx.createUser({ provision: true });
    const acct = await createSavingsAccount(ctx, user, { opening_balance_paisa: 5000000 });
    const withdrawCat = await getCategoryByType(ctx, user, 'SAVINGS_WITHDRAWAL');

    const res = await postTx(ctx, user, {
      amount_paisa: 1000000, date: '2026-11-01', description: 'Withdraw',
      category_id: withdrawCat!.id, payment_method: 'BANK',
      savings_account_id: acct.id,
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.routing.account.balance_paisa).toBe(4000000);
  });
});

// ---------------------------------------------------------------------------
// TC-ROUTE-005: Withdrawal above balance â€” 422
// ---------------------------------------------------------------------------

describe('TC-ROUTE-005: withdrawal above balance â€” 422', () => {
  it('returns 422 INSUFFICIENT_BALANCE; balance unchanged', async () => {
    const user = await ctx.createUser({ provision: true });
    const acct = await createSavingsAccount(ctx, user, { opening_balance_paisa: 1000000 }); // à§³10,000
    const withdrawCat = await getCategoryByType(ctx, user, 'SAVINGS_WITHDRAWAL');

    const res = await postTx(ctx, user, {
      amount_paisa: 2000000, date: '2026-11-01', description: 'Big withdraw',
      category_id: withdrawCat!.id, payment_method: 'BANK',
      savings_account_id: acct.id,
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe('INSUFFICIENT_BALANCE');

    const headers = await ctx.authHeader(user);
    const detail = await ctx.makeRequest('GET', `/api/v1/savings-accounts/${acct.id}`, { headers });
    const acctBody = await detail.json();
    expect(acctBody.balance_paisa).toBe(1000000);
  });
});

// ---------------------------------------------------------------------------
// TC-ROUTE-006: Savings Interest â€” balance rises
// ---------------------------------------------------------------------------

describe('TC-ROUTE-006: savings interest â€” balance rises', () => {
  it('account balance increases by interest amount', async () => {
    const user = await ctx.createUser({ provision: true });
    const acct = await createSavingsAccount(ctx, user, { opening_balance_paisa: 5000000 });
    const interestCat = await getCategoryByType(ctx, user, 'SAVINGS_INTEREST');

    const res = await postTx(ctx, user, {
      amount_paisa: 125000, date: '2026-11-01', description: 'Interest',
      category_id: interestCat!.id, payment_method: 'BANK',
      savings_account_id: acct.id,
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.routing.account.balance_paisa).toBe(5125000);
  });
});

// ---------------------------------------------------------------------------
// TC-ROUTE-007: AC-SAV-1 through the transactions API
// ---------------------------------------------------------------------------

describe('TC-ROUTE-007: AC-SAV-1 via transactions API', () => {
  it('opening 50000 + 2Ã—10000 deposits + 1250 interest - 5000 withdrawal = 66250 BDT', async () => {
    const user = await ctx.createUser({ provision: true });
    const acct = await createSavingsAccount(ctx, user, { opening_balance_paisa: 5000000 });
    const depositCat = await getCategoryByType(ctx, user, 'SAVINGS_DEPOSIT');
    const interestCat = await getCategoryByType(ctx, user, 'SAVINGS_INTEREST');
    const withdrawCat = await getCategoryByType(ctx, user, 'SAVINGS_WITHDRAWAL');

    await postTx(ctx, user, { amount_paisa: 1000000, date: '2026-11-01', description: 'D1', category_id: depositCat!.id, payment_method: 'BANK', savings_account_id: acct.id });
    await postTx(ctx, user, { amount_paisa: 1000000, date: '2026-11-02', description: 'D2', category_id: depositCat!.id, payment_method: 'BANK', savings_account_id: acct.id });
    await postTx(ctx, user, { amount_paisa: 125000, date: '2026-11-03', description: 'Int', category_id: interestCat!.id, payment_method: 'BANK', savings_account_id: acct.id });
    const lastRes = await postTx(ctx, user, { amount_paisa: 500000, date: '2026-11-04', description: 'W1', category_id: withdrawCat!.id, payment_method: 'BANK', savings_account_id: acct.id });

    expect(lastRes.status).toBe(201);
    const body = await lastRes.json();
    expect(body.routing.account.balance_paisa).toBe(6625000); // à§³66,250
  });
});

// ---------------------------------------------------------------------------
// TC-ROUTE-008: Deposit before opening date â€” 422
// ---------------------------------------------------------------------------

describe('TC-ROUTE-008: deposit before opening date', () => {
  it('returns 422 DATE_BEFORE_OPENING', async () => {
    const user = await ctx.createUser({ provision: true });
    const acct = await createSavingsAccount(ctx, user, { opening_date: '2026-01-01' });
    const depositCat = await getCategoryByType(ctx, user, 'SAVINGS_DEPOSIT');

    const res = await postTx(ctx, user, {
      amount_paisa: 100000, date: '2025-12-31', description: 'Early',
      category_id: depositCat!.id, payment_method: 'BANK',
      savings_account_id: acct.id,
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe('DATE_BEFORE_OPENING');
  });
});

// ---------------------------------------------------------------------------
// TC-ROUTE-009: Deposit into a closed account â€” 422
// ---------------------------------------------------------------------------

describe('TC-ROUTE-009: deposit into closed account', () => {
  it('returns 422 ACCOUNT_CLOSED', async () => {
    const user = await ctx.createUser({ provision: true });
    // Create account with zero balance so we can close it
    const acct = await createSavingsAccount(ctx, user, { opening_balance_paisa: 0, opening_date: '2024-01-01' });
    const depositCat = await getCategoryByType(ctx, user, 'SAVINGS_DEPOSIT');

    // Close the account
    const headers = await ctx.authHeader(user);
    await ctx.makeRequest('PATCH', `/api/v1/savings-accounts/${acct.id}`, {
      headers,
      body: { closed_on: '2026-01-01' },
    });

    const res = await postTx(ctx, user, {
      amount_paisa: 100000, date: '2026-11-01', description: 'Deposit into closed',
      category_id: depositCat!.id, payment_method: 'BANK',
      savings_account_id: acct.id,
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe('ACCOUNT_CLOSED');
  });
});

// ---------------------------------------------------------------------------
// TC-ROUTE-010: Deposit using another user's savings account â€” 422
// ---------------------------------------------------------------------------

describe('TC-ROUTE-010: deposit naming another user\'s savings account', () => {
  it('returns 422 VALIDATION_ERROR; other user\'s account unchanged', async () => {
    const user1 = await ctx.createUser({ provision: true });
    const user2 = await ctx.createUser({ provision: true });

    const acct = await createSavingsAccount(ctx, user2, { opening_balance_paisa: 5000000 });
    const depositCat = await getCategoryByType(ctx, user1, 'SAVINGS_DEPOSIT');

    const res = await postTx(ctx, user1, {
      amount_paisa: 100000, date: '2026-11-01', description: 'Cross-user',
      category_id: depositCat!.id, payment_method: 'BANK',
      savings_account_id: acct.id,
    });
    expect(res.status).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// TC-ROUTE-011: Loan Given via /transactions â€” same as /loan-persons endpoint
// ---------------------------------------------------------------------------

describe('TC-ROUTE-011: loan given via /transactions with existing person', () => {
  it('creates same ledger entry as /loan-persons endpoint', async () => {
    const user = await ctx.createUser({ provision: true });
    const loanGivenCat = await getCategoryByType(ctx, user, 'LOAN_GIVEN');

    // Create person first
    const headers = await ctx.authHeader(user);
    const personRes = await ctx.makeRequest('POST', '/api/v1/loan-persons', {
      headers, body: { name: 'Mithun' },
    });
    const person = await personRes.json();

    const res = await postTx(ctx, user, {
      amount_paisa: 984100, date: '2026-11-01', description: 'Loan to Mithun',
      category_id: loanGivenCat!.id, payment_method: 'CASH',
      loan_person_id: person.id,
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.type).toBe('LOAN_GIVEN');
    expect(body.routing.person.running_balance_paisa).toBe(984100);
  });
});

// ---------------------------------------------------------------------------
// TC-ROUTE-012: Loan Given with new person name â€” creates person
// ---------------------------------------------------------------------------

describe('TC-ROUTE-012: loan given with new person name', () => {
  it('creates the person and the entry', async () => {
    const user = await ctx.createUser({ provision: true });
    const loanGivenCat = await getCategoryByType(ctx, user, 'LOAN_GIVEN');

    const res = await postTx(ctx, user, {
      amount_paisa: 100000, date: '2026-11-01', description: 'Loan to Amait',
      category_id: loanGivenCat!.id, payment_method: 'CASH',
      loan_person_name: 'Amait',
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.routing.person.name).toBe('Amait');
    expect(body.routing.person.running_balance_paisa).toBe(100000);

    const headers = await ctx.authHeader(user);
    const persons = await ctx.makeRequest('GET', '/api/v1/loan-persons', { headers });
    const personList = await persons.json();
    expect(personList.some((p: any) => p.name === 'Amait')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TC-ROUTE-013: Loan Given â€” name matches existing person case-insensitively
// ---------------------------------------------------------------------------

describe('TC-ROUTE-013: loan person name case-insensitive match', () => {
  it('uses the existing person; no new person created', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);
    await ctx.makeRequest('POST', '/api/v1/loan-persons', { headers, body: { name: 'Babu Bhai' } });

    const loanGivenCat = await getCategoryByType(ctx, user, 'LOAN_GIVEN');
    const res = await postTx(ctx, user, {
      amount_paisa: 50000, date: '2026-11-01', description: 'Loan',
      category_id: loanGivenCat!.id, payment_method: 'CASH',
      loan_person_name: 'babu bhai', // different case
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.routing.person.name).toBe('Babu Bhai'); // matched existing

    const persons = await (await ctx.makeRequest('GET', '/api/v1/loan-persons', { headers })).json();
    expect(persons.filter((p: any) => p.name.toLowerCase() === 'babu bhai').length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// TC-ROUTE-014: Loan category with no person â€” 422
// ---------------------------------------------------------------------------

describe('TC-ROUTE-014: loan category with no person', () => {
  it('returns 422; nothing is written', async () => {
    const user = await ctx.createUser({ provision: true });
    const loanGivenCat = await getCategoryByType(ctx, user, 'LOAN_GIVEN');

    const res = await postTx(ctx, user, {
      amount_paisa: 100000, date: '2026-11-01', description: 'Loan',
      category_id: loanGivenCat!.id, payment_method: 'CASH',
      // No loan_person_id or loan_person_name
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// TC-ROUTE-015: Tax Payment â€” defaults to Fiscal Year of its date
// ---------------------------------------------------------------------------

describe('TC-ROUTE-015: tax payment defaults to fiscal year of its date', () => {
  it('tax_fiscal_year is set to fiscalYear(date)', async () => {
    const user = await ctx.createUser({ provision: true });
    const taxCat = await getCategoryByType(ctx, user, 'TAX_PAYMENT');

    const res = await postTx(ctx, user, {
      amount_paisa: 1000000, date: '2026-11-01', description: 'Tax payment',
      category_id: taxCat!.id, payment_method: 'BANK',
      // No tax_fiscal_year â€” should default to 2026-27
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.tax_fiscal_year).toBe('2026-27');
    expect(body.routing.fiscal_year).toBe('2026-27');
  });
});

// ---------------------------------------------------------------------------
// TC-ROUTE-016: Tax Payment assigned to previous Fiscal Year â€” accepted
// ---------------------------------------------------------------------------

describe('TC-ROUTE-016: tax payment to previous fiscal year', () => {
  it('accepts the previous fiscal year', async () => {
    const user = await ctx.createUser({ provision: true });
    const taxCat = await getCategoryByType(ctx, user, 'TAX_PAYMENT');

    const res = await postTx(ctx, user, {
      amount_paisa: 500000, date: '2026-09-01', description: 'Old tax',
      category_id: taxCat!.id, payment_method: 'BANK',
      tax_fiscal_year: '2025-26', // previous FY
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.tax_fiscal_year).toBe('2025-26');
  });
});

// ---------------------------------------------------------------------------
// TC-ROUTE-017: Tax Payment to future or old fiscal year â€” 422
// ---------------------------------------------------------------------------

describe('TC-ROUTE-017: tax payment to future or old fiscal year', () => {
  it('returns 422 for future FY and two-years-back FY', async () => {
    const user = await ctx.createUser({ provision: true });
    const taxCat = await getCategoryByType(ctx, user, 'TAX_PAYMENT');

    // Future FY
    const future = await postTx(ctx, user, {
      amount_paisa: 500000, date: '2026-11-01', description: 'Future tax',
      category_id: taxCat!.id, payment_method: 'BANK',
      tax_fiscal_year: '2027-28',
    });
    expect(future.status).toBe(422);

    // Two years back
    const old = await postTx(ctx, user, {
      amount_paisa: 500000, date: '2026-11-01', description: 'Old tax',
      category_id: taxCat!.id, payment_method: 'BANK',
      tax_fiscal_year: '2024-25',
    });
    expect(old.status).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// TC-ROUTE-018: Change a deposit's amount â€” balance follows
// ---------------------------------------------------------------------------

describe('TC-ROUTE-018: update deposit amount â€” balance follows', () => {
  it('balance updates after PATCH', async () => {
    const user = await ctx.createUser({ provision: true });
    const acct = await createSavingsAccount(ctx, user, { opening_balance_paisa: 5000000 });
    const depositCat = await getCategoryByType(ctx, user, 'SAVINGS_DEPOSIT');

    const txRes = await postTx(ctx, user, {
      amount_paisa: 1000000, date: '2026-11-01', description: 'Deposit',
      category_id: depositCat!.id, payment_method: 'BANK',
      savings_account_id: acct.id,
    });
    const tx = await txRes.json();

    const headers = await ctx.authHeader(user);
    const patch = await ctx.makeRequest('PATCH', `/api/v1/transactions/${tx.id}`, {
      headers,
      body: { amount_paisa: 2000000 },
    });
    expect(patch.status).toBe(200);
    const patchBody = await patch.json();
    expect(patchBody.routing.account.balance_paisa).toBe(7000000); // 50000 + 20000
  });
});

// ---------------------------------------------------------------------------
// TC-ROUTE-020: Delete deposit and loan â€” balance recalculates
// ---------------------------------------------------------------------------

describe('TC-ROUTE-020: delete deposit and loan transaction', () => {
  it('savings balance falls; loan entry leaves the ledger', async () => {
    const user = await ctx.createUser({ provision: true });
    const acct = await createSavingsAccount(ctx, user, { opening_balance_paisa: 5000000 });
    const depositCat = await getCategoryByType(ctx, user, 'SAVINGS_DEPOSIT');
    const loanGivenCat = await getCategoryByType(ctx, user, 'LOAN_GIVEN');

    const depRes = await postTx(ctx, user, {
      amount_paisa: 1000000, date: '2026-11-01', description: 'Deposit',
      category_id: depositCat!.id, payment_method: 'BANK',
      savings_account_id: acct.id,
    });
    const depTx = await depRes.json();

    await postTx(ctx, user, {
      amount_paisa: 100000, date: '2026-11-01', description: 'Loan',
      category_id: loanGivenCat!.id, payment_method: 'CASH',
      loan_person_name: 'Nayan',
    });

    const headers = await ctx.authHeader(user);

    // Delete deposit
    const del = await ctx.makeRequest('DELETE', `/api/v1/transactions/${depTx.id}`, { headers });
    expect(del.status).toBe(204);

    // Balance should drop back
    const acctDetail = await ctx.makeRequest('GET', `/api/v1/savings-accounts/${acct.id}`, { headers });
    const acctBody = await acctDetail.json();
    expect(acctBody.balance_paisa).toBe(5000000); // back to opening
  });
});

// ---------------------------------------------------------------------------
// TC-ROUTE-021: Failure mid-write â€” no person, TX or entry
// ---------------------------------------------------------------------------

describe('TC-ROUTE-021: atomic failure â€” no person created', () => {
  it('invalid loan_person_id causes 422; no transaction created', async () => {
    const user = await ctx.createUser({ provision: true });
    const loanGivenCat = await getCategoryByType(ctx, user, 'LOAN_GIVEN');

    const res = await postTx(ctx, user, {
      amount_paisa: 100000, date: '2026-11-01', description: 'Fail loan',
      category_id: loanGivenCat!.id, payment_method: 'CASH',
      loan_person_id: 'nonexistent-id-that-does-not-exist',
    });
    expect(res.status).toBe(422);

    const headers = await ctx.authHeader(user);
    const txList = await (await ctx.makeRequest('GET', '/api/v1/transactions', { headers })).json();
    expect(txList.total).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// TC-ROUTE-022: Response includes routing summary
// ---------------------------------------------------------------------------

describe('TC-ROUTE-022: response includes routing summary', () => {
  it('deposit returns account+balance, loan returns person+balance, tax returns fiscal_year', async () => {
    const user = await ctx.createUser({ provision: true });
    const acct = await createSavingsAccount(ctx, user, { opening_balance_paisa: 1000000 });
    const depositCat = await getCategoryByType(ctx, user, 'SAVINGS_DEPOSIT');
    const loanGivenCat = await getCategoryByType(ctx, user, 'LOAN_GIVEN');
    const taxCat = await getCategoryByType(ctx, user, 'TAX_PAYMENT');

    const depRes = await postTx(ctx, user, {
      amount_paisa: 100000, date: '2026-11-01', description: 'D',
      category_id: depositCat!.id, payment_method: 'BANK',
      savings_account_id: acct.id,
    });
    const dep = await depRes.json();
    expect(dep.routing.account).toBeDefined();
    expect(typeof dep.routing.account.balance_paisa).toBe('number');

    const loanRes = await postTx(ctx, user, {
      amount_paisa: 100000, date: '2026-11-01', description: 'L',
      category_id: loanGivenCat!.id, payment_method: 'CASH',
      loan_person_name: 'Test',
    });
    const loan = await loanRes.json();
    expect(loan.routing.person).toBeDefined();
    expect(typeof loan.routing.person.running_balance_paisa).toBe('number');

    const taxRes = await postTx(ctx, user, {
      amount_paisa: 100000, date: '2026-11-01', description: 'T',
      category_id: taxCat!.id, payment_method: 'BANK',
    });
    const tax = await taxRes.json();
    expect(tax.routing.fiscal_year).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// TC-ROUTE-023: DPS, Sanchaypatra and plain Savings deposits in one FY
// ---------------------------------------------------------------------------

describe('TC-ROUTE-023: DPS, Sanchaypatra and plain Savings deposits in one FY', () => {
  it('savings list totals correctly separate DPS and Sanchaypatra', async () => {
    const user = await ctx.createUser({ provision: true });
    const depositCat = await getCategoryByType(ctx, user, 'SAVINGS_DEPOSIT');

    const savings = await createSavingsAccount(ctx, user, {
      name: 'Plain Savings', type: 'SAVINGS', opening_balance_paisa: 0,
    });
    const dps = await createSavingsAccount(ctx, user, {
      name: 'DPS', type: 'DPS', opening_balance_paisa: 0, parent_account_id: savings.id,
      monthly_installment_paisa: 1000000, maturity_date: '2030-01-01',
    });
    const sanchaypatra = await createSavingsAccount(ctx, user, {
      name: 'Sanchaypatra', type: 'SANCHAYPATRA', opening_balance_paisa: 0,
    });

    const thisMonth = new Date().toISOString().slice(0, 7);
    await postTx(ctx, user, { amount_paisa: 1000000, date: `${thisMonth}-05`, description: 'DPS', category_id: depositCat!.id, payment_method: 'BANK', savings_account_id: dps.id });
    await postTx(ctx, user, { amount_paisa: 2000000, date: `${thisMonth}-05`, description: 'SC', category_id: depositCat!.id, payment_method: 'BANK', savings_account_id: sanchaypatra.id });
    await postTx(ctx, user, { amount_paisa: 3000000, date: `${thisMonth}-05`, description: 'Plain', category_id: depositCat!.id, payment_method: 'BANK', savings_account_id: savings.id });

    const headers = await ctx.authHeader(user);
    const list = await (await ctx.makeRequest('GET', '/api/v1/savings-accounts', { headers })).json();
    expect(list.totals.dps_this_fy_paisa).toBe(1000000); // only DPS
    expect(list.totals.this_fy_deposits_paisa).toBe(6000000); // all three
  });
});
