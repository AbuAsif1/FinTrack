/**
 * TC-DASH-001 to TC-DASH-022 — Dashboard & Analytics API
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestContext } from '../helpers/index';
import { todayInDhaka } from '@fintrack/shared';

type Ctx = Awaited<ReturnType<typeof createTestContext>>;
type TestUser = { id: string; email: string; password: string; role: 'USER' | 'ADMIN' };

let ctx: Ctx;

beforeEach(async () => {
  ctx = await createTestContext();
});

afterEach(async () => {
  await ctx?.cleanup();
});

async function authHeader(ctx: Ctx, user: TestUser) {
  return ctx.authHeader(user);
}

// ---------------------------------------------------------------------------
// Helpers for AC-CASH-1 setup
// November 2026: In-Hand Income ৳1,40,000. The seven defaults exist.
// YouTube Premium (৳160) and Upension DPS (৳10,000) are Paid; the rest Pending.
// Groceries ৳3,000 (NONE), Loan Given ৳2,000, Loan Received ৳500, Savings Withdrawal ৳5,000.
// ---------------------------------------------------------------------------

async function setupAcCash1(ctx: Ctx, user: TestUser) {
  // Income entry for November 2026
  await ctx.db.incomeEntry.create({
    data: {
      userId: user.id,
      month: new Date('2026-11-01'),
      incomeType: 'SALARY',
      grossPaisa: BigInt(14000000), // ৳1,40,000
      tdsPaisa: BigInt(0),
      isTaxable: true,
      fiscalYear: '2026-27',
      idempotencyKey: 'inc-nov-2026',
    },
  });

  // Create the NONE-routing category for Groceries (upsert: starter categories with same name may already exist)
  const groceriesCat = await ctx.db.category.upsert({
    where: { userId_name: { userId: user.id, name: 'Groceries' } },
    update: {},
    create: { userId: user.id, name: 'Groceries', colorHex: '#00FF00', routingType: 'NONE' },
  });

  // Seven default fixed expenses totaling ৳60,732
  // YouTube Premium: ৳160
  const ytCat = await ctx.db.category.upsert({
    where: { userId_name: { userId: user.id, name: 'Subscriptions' } },
    update: {},
    create: { userId: user.id, name: 'Subscriptions', colorHex: '#FF0000', routingType: 'NONE' },
  });
  const ytExp = await ctx.db.fixedExpense.create({
    data: { userId: user.id, name: 'YouTube Premium', categoryId: ytCat.id, standardAmountPaisa: BigInt(16000), dueDay: 5, startMonth: new Date('2026-11-01') },
  });
  // DPS: ৳10,000
  const dpsCat = await ctx.db.category.upsert({
    where: { userId_name: { userId: user.id, name: 'DPS Test' } },
    update: {},
    create: { userId: user.id, name: 'DPS Test', colorHex: '#0000FF', routingType: 'SAVINGS_DEPOSIT' },
  });
  const dpsExp = await ctx.db.fixedExpense.create({
    data: { userId: user.id, name: 'Upension DPS', categoryId: dpsCat.id, standardAmountPaisa: BigInt(1000000), dueDay: 10, startMonth: new Date('2026-11-01') },
  });
  // Remaining five to reach ৳60,732: ৳60,732 - 160 - 10,000 = ৳50,572 split across five
  const otherCat = await ctx.db.category.upsert({
    where: { userId_name: { userId: user.id, name: 'Other' } },
    update: {},
    create: { userId: user.id, name: 'Other', colorHex: '#AAAAAA', routingType: 'NONE' },
  });
  // Five more fixed expenses totaling ৳50,572: amounts in paisa
  // ৳50,572 = 5057200 paisa; split: 1200000 + 1000000 + 1000000 + 1000000 + 857200
  const otherAmounts = [1200000n, 1000000n, 1000000n, 1000000n, 857200n];
  for (let i = 0; i < 5; i++) {
    await ctx.db.fixedExpense.create({
      data: { userId: user.id, name: `Fixed ${i + 1}`, categoryId: otherCat.id, standardAmountPaisa: otherAmounts[i], dueDay: 15, startMonth: new Date('2026-11-01') },
    });
  }

  // Create instances manually for November 2026
  const novMonth = new Date('2026-11-01');
  // YouTube Premium: PAID, actual ৳160
  await ctx.db.fixedExpenseInstance.create({
    data: { userId: user.id, fixedExpenseId: ytExp.id, month: novMonth, dueDate: new Date('2026-11-05'), status: 'PAID', standardAmountPaisa: BigInt(16000), actualAmountPaisa: BigInt(16000) },
  });
  // DPS: PAID, actual ৳10,000
  await ctx.db.fixedExpenseInstance.create({
    data: { userId: user.id, fixedExpenseId: dpsExp.id, month: novMonth, dueDate: new Date('2026-11-10'), status: 'PAID', standardAmountPaisa: BigInt(1000000), actualAmountPaisa: BigInt(1000000) },
  });
  // Other five: PENDING
  const fixedExps = await ctx.db.fixedExpense.findMany({ where: { userId: user.id, name: { startsWith: 'Fixed' } } });
  for (const fe of fixedExps) {
    await ctx.db.fixedExpenseInstance.create({
      data: { userId: user.id, fixedExpenseId: fe.id, month: novMonth, dueDate: new Date('2026-11-15'), status: 'PENDING', standardAmountPaisa: fe.standardAmountPaisa },
    });
  }

  // Transactions for November 2026
  // PAID instances' underlying transactions
  await ctx.db.transaction.create({
    data: { userId: user.id, categoryId: ytCat.id, amountPaisa: BigInt(16000), date: new Date('2026-11-05'), description: 'YouTube Premium', type: 'NONE', paymentMethod: 'BKASH', idempotencyKey: 'yt-1' },
  });
  const dpsSa = await ctx.db.savingsAccount.create({
    data: { userId: user.id, name: 'Upension DPS', type: 'DPS', bankName: 'Upension', openingDate: new Date('2026-01-01'), openingBalancePaisa: 0n },
  });
  await ctx.db.transaction.create({
    data: { userId: user.id, categoryId: dpsCat.id, savingsAccountId: dpsSa.id, amountPaisa: BigInt(1000000), date: new Date('2026-11-10'), description: 'DPS Deposit', type: 'SAVINGS_DEPOSIT', paymentMethod: 'BANK', idempotencyKey: 'dps-1' },
  });
  // Other spending
  await ctx.db.transaction.create({
    data: { userId: user.id, categoryId: groceriesCat.id, amountPaisa: BigInt(300000), date: new Date('2026-11-10'), description: 'Groceries', type: 'NONE', paymentMethod: 'CASH', idempotencyKey: 'groc-1' },
  });

  // Loan Given ৳2,000
  const lp = await ctx.db.loanPerson.create({ data: { userId: user.id, name: 'Alice' } });
  const loanTx = await ctx.db.transaction.create({
    data: { userId: user.id, categoryId: otherCat.id, amountPaisa: BigInt(200000), date: new Date('2026-11-12'), description: 'Loan to Alice', type: 'LOAN_GIVEN', paymentMethod: 'CASH', idempotencyKey: 'loan-given-1' },
  });
  await ctx.db.loanEntry.create({
    data: { userId: user.id, loanPersonId: lp.id, direction: 'GIVEN', transactionId: loanTx.id },
  });

  // Loan Received ৳500
  const loanRxTx = await ctx.db.transaction.create({
    data: { userId: user.id, categoryId: otherCat.id, amountPaisa: BigInt(50000), date: new Date('2026-11-13'), description: 'Loan from Alice', type: 'LOAN_RECEIVED', paymentMethod: 'CASH', idempotencyKey: 'loan-rx-1' },
  });
  await ctx.db.loanEntry.create({
    data: { userId: user.id, loanPersonId: lp.id, direction: 'RECEIVED', transactionId: loanRxTx.id },
  });

  // Savings Withdrawal ৳5,000
  const sa = await ctx.db.savingsAccount.create({
    data: { userId: user.id, name: 'Main Savings', type: 'DPS', bankName: 'Test Bank', openingDate: new Date('2026-01-01'), openingBalancePaisa: BigInt(5000000) },
  });
  await ctx.db.transaction.create({
    data: { userId: user.id, categoryId: otherCat.id, savingsAccountId: sa.id, amountPaisa: BigInt(500000), date: new Date('2026-11-14'), description: 'Withdrawal', type: 'SAVINGS_WITHDRAWAL', paymentMethod: 'BANK', idempotencyKey: 'sav-wd-1' },
  });

  return { groceriesCat };
}

// ---------------------------------------------------------------------------
// TC-DASH-001: AC-CASH-1 month figures
// ---------------------------------------------------------------------------

describe('TC-DASH-001: AC-CASH-1 fixed commitments, discretionary cash, remaining to spend', () => {
  it('returns correct figures for the AC-CASH-1 scenario', async () => {
    // Mock today to be in November 2026
    vi.setSystemTime(new Date('2026-11-15T12:00:00Z'));

    const user = await ctx.createUser({ provision: true });
    await setupAcCash1(ctx, user);

    const headers = await authHeader(ctx, user);
    const res = await ctx.makeRequest('GET', '/api/v1/dashboard/summary', { headers });
    expect(res.status).toBe(200);
    const body = await res.json();

    // AC-CASH-1: Fixed Commitments ৳60,732; Discretionary Cash ৳79,268; Remaining to Spend ৳79,768
    expect(body.current_month.fixed_commitments_paisa).toBe(6073200);
    expect(body.current_month.discretionary_cash_paisa).toBe(7926800);
    expect(body.current_month.remaining_to_spend_paisa).toBe(7976800);

    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// TC-DASH-002: Period tiles for the AC-CASH-1 month
// ---------------------------------------------------------------------------

describe('TC-DASH-002: period tiles for AC-CASH-1 month', () => {
  it('total spending, net savings, savings rate', async () => {
    vi.setSystemTime(new Date('2026-11-30T12:00:00Z'));

    const user = await ctx.createUser({ provision: true });
    await setupAcCash1(ctx, user);

    const headers = await authHeader(ctx, user);
    const res = await ctx.makeRequest('GET', '/api/v1/dashboard/summary?from=2026-11-01&to=2026-11-30', { headers });
    expect(res.status).toBe(200);
    const body = await res.json();

    // TC-DASH-002: Total Spending ৳3,160; Net Savings ৳1,36,840; Savings Rate 97.7%
    expect(body.tiles.total_spending_paisa).toBe(316000);
    // Net = 14000000 - 316000 - 0 = 13684000
    expect(body.tiles.net_savings_paisa).toBe(13684000);
    // Savings rate = 13684000/14000000 ≈ 97.74% → 9774 bps (rounding may vary)
    expect(body.tiles.savings_rate_bps).toBeGreaterThanOrEqual(9770);
    expect(body.tiles.savings_rate_bps).toBeLessThanOrEqual(9780);

    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// TC-DASH-003: Deposit, loan given, tax payment but no spending → Total Spending = 0
// ---------------------------------------------------------------------------

describe('TC-DASH-003: transfer/loan/tax payment excluded from total spending', () => {
  it('total spending is 0 when only non-NONE transactions exist', async () => {
    vi.setSystemTime(new Date('2026-11-30T12:00:00Z'));

    const user = await ctx.createUser({ provision: true });
    const headers = await authHeader(ctx, user);

    // Create categories
    const cat = await ctx.db.category.create({ data: { userId: user.id, name: 'Misc', colorHex: '#000000', routingType: 'NONE' } });

    // Savings deposit
    const sa = await ctx.db.savingsAccount.create({ data: { userId: user.id, name: 'Savings', type: 'DPS', bankName: 'Test Bank', openingDate: new Date('2026-01-01'), openingBalancePaisa: 0n } });
    await ctx.db.transaction.create({ data: { userId: user.id, categoryId: cat.id, savingsAccountId: sa.id, amountPaisa: 500000n, date: new Date('2026-11-10'), description: 'Deposit', type: 'SAVINGS_DEPOSIT', paymentMethod: 'BANK', idempotencyKey: 'dep-1' } });

    // Loan given
    const lp = await ctx.db.loanPerson.create({ data: { userId: user.id, name: 'Bob' } });
    const loanTx = await ctx.db.transaction.create({ data: { userId: user.id, categoryId: cat.id, amountPaisa: 200000n, date: new Date('2026-11-11'), description: 'Loan', type: 'LOAN_GIVEN', paymentMethod: 'CASH', idempotencyKey: 'loan-2' } });
    await ctx.db.loanEntry.create({ data: { userId: user.id, loanPersonId: lp.id, direction: 'GIVEN', transactionId: loanTx.id } });

    // Tax payment
    await ctx.db.transaction.create({ data: { userId: user.id, categoryId: cat.id, amountPaisa: 300000n, date: new Date('2026-11-12'), description: 'Tax', type: 'TAX_PAYMENT', paymentMethod: 'BANK', taxFiscalYear: '2026-27', idempotencyKey: 'tax-1' } });

    const res = await ctx.makeRequest('GET', '/api/v1/dashboard/summary?from=2026-11-01&to=2026-11-30', { headers });
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.tiles.total_spending_paisa).toBe(0);

    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// TC-DASH-004: Tax payment falls out of spending, reduces net savings
// ---------------------------------------------------------------------------

describe('TC-DASH-004: tax payment reduces net savings but not total spending', () => {
  it('net savings falls by tax payment; total spending unchanged', async () => {
    vi.setSystemTime(new Date('2026-11-30T12:00:00Z'));

    const user = await ctx.createUser({ provision: true });

    await ctx.db.incomeEntry.create({
      data: { userId: user.id, month: new Date('2026-11-01'), incomeType: 'SALARY', grossPaisa: 10000000n, tdsPaisa: 0n, isTaxable: true, fiscalYear: '2026-27', idempotencyKey: 'inc-nov-04' },
    });
    const cat = await ctx.db.category.create({ data: { userId: user.id, name: 'Food', colorHex: '#111', routingType: 'NONE' } });
    await ctx.db.transaction.create({ data: { userId: user.id, categoryId: cat.id, amountPaisa: 300000n, date: new Date('2026-11-10'), description: 'Food', type: 'NONE', paymentMethod: 'CASH', idempotencyKey: 'food-1' } });
    await ctx.db.transaction.create({ data: { userId: user.id, categoryId: cat.id, amountPaisa: 500000n, date: new Date('2026-11-10'), description: 'Tax pmt', type: 'TAX_PAYMENT', paymentMethod: 'BANK', taxFiscalYear: '2026-27', idempotencyKey: 'taxp-1' } });

    const headers = await authHeader(ctx, user);
    const res = await ctx.makeRequest('GET', '/api/v1/dashboard/summary?from=2026-11-01&to=2026-11-30', { headers });
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.tiles.total_spending_paisa).toBe(300000);
    // net = 10000000 - 300000 - 500000 = 9200000
    expect(body.tiles.net_savings_paisa).toBe(9200000);

    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// TC-DASH-005: No income → savings rate null
// ---------------------------------------------------------------------------

describe('TC-DASH-005: no income → savings rate null', () => {
  it('savings_rate_bps is null when income is 0', async () => {
    vi.setSystemTime(new Date('2026-11-30T12:00:00Z'));

    const user = await ctx.createUser({ provision: true });
    const headers = await authHeader(ctx, user);

    const res = await ctx.makeRequest('GET', '/api/v1/dashboard/summary?from=2026-11-01&to=2026-11-30', { headers });
    const body = await res.json();
    expect(body.tiles.savings_rate_bps).toBeNull();

    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// TC-DASH-007: No salary this month → income_is_estimated = true, uses last month
// ---------------------------------------------------------------------------

describe('TC-DASH-007: income_is_estimated when no salary entry this month', () => {
  it('cash figures use last month salary; income_is_estimated is true', async () => {
    vi.setSystemTime(new Date('2026-11-15T12:00:00Z'));

    const user = await ctx.createUser({ provision: true });

    // Last month's salary (October 2026)
    await ctx.db.incomeEntry.create({
      data: { userId: user.id, month: new Date('2026-10-01'), incomeType: 'SALARY', grossPaisa: 12000000n, tdsPaisa: 100000n, isTaxable: true, fiscalYear: '2026-27', idempotencyKey: 'inc-oct-07' },
    });
    // No November salary entry

    const headers = await authHeader(ctx, user);
    const res = await ctx.makeRequest('GET', '/api/v1/dashboard/summary', { headers });
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.current_month.income_is_estimated).toBe(true);
    // In-hand from last month: 12000000 - 100000 = 11900000
    // remaining_to_spend = 11900000 (no spending, no pending instances)
    expect(body.current_month.remaining_to_spend_paisa).toBe(11900000);

    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// TC-DASH-008: This month's salary entered → income_is_estimated = false
// ---------------------------------------------------------------------------

describe('TC-DASH-008: salary entered this month → income_is_estimated is false', () => {
  it('income_is_estimated is false', async () => {
    vi.setSystemTime(new Date('2026-11-15T12:00:00Z'));

    const user = await ctx.createUser({ provision: true });

    await ctx.db.incomeEntry.create({
      data: { userId: user.id, month: new Date('2026-11-01'), incomeType: 'SALARY', grossPaisa: 12000000n, tdsPaisa: 0n, isTaxable: true, fiscalYear: '2026-27', idempotencyKey: 'inc-nov-08' },
    });

    const headers = await authHeader(ctx, user);
    const res = await ctx.makeRequest('GET', '/api/v1/dashboard/summary', { headers });
    const body = await res.json();

    expect(body.current_month.income_is_estimated).toBe(false);

    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// TC-DASH-012: Spending by category sums to total spending
// ---------------------------------------------------------------------------

describe('TC-DASH-012: spending by category adds up to total spending', () => {
  it('category parts sum to tiles.total_spending_paisa', async () => {
    vi.setSystemTime(new Date('2026-11-30T12:00:00Z'));

    const user = await ctx.createUser({ provision: true });
    await setupAcCash1(ctx, user);

    const headers = await authHeader(ctx, user);
    const res = await ctx.makeRequest('GET', '/api/v1/dashboard/summary?from=2026-11-01&to=2026-11-30', { headers });
    const body = await res.json();

    const categoryTotal = (body.spending_by_category as { amount_paisa: number }[]).reduce((s, c) => s + c.amount_paisa, 0);
    expect(categoryTotal).toBe(body.tiles.total_spending_paisa);

    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// TC-DASH-015: Recent transactions — deleted ones excluded
// ---------------------------------------------------------------------------

describe('TC-DASH-015: recent transactions exclude soft-deleted rows', () => {
  it('deleted transactions do not appear', async () => {
    vi.setSystemTime(new Date('2026-11-30T12:00:00Z'));

    const user = await ctx.createUser({ provision: true });
    const cat = await ctx.db.category.create({ data: { userId: user.id, name: 'Food', colorHex: '#000', routingType: 'NONE' } });

    // Active tx
    await ctx.db.transaction.create({ data: { userId: user.id, categoryId: cat.id, amountPaisa: 100000n, date: new Date('2026-11-10'), description: 'Active', type: 'NONE', paymentMethod: 'CASH', idempotencyKey: 'act-1' } });
    // Deleted tx
    await ctx.db.transaction.create({ data: { userId: user.id, categoryId: cat.id, amountPaisa: 200000n, date: new Date('2026-11-11'), description: 'Deleted', type: 'NONE', paymentMethod: 'CASH', isDeleted: true, deletedAt: new Date(), idempotencyKey: 'del-1' } });

    const headers = await authHeader(ctx, user);
    const res = await ctx.makeRequest('GET', '/api/v1/dashboard/summary', { headers });
    const body = await res.json();

    const ids = (body.recent_transactions as { description: string }[]).map((t) => t.description);
    expect(ids).toContain('Active');
    expect(ids).not.toContain('Deleted');

    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// TC-DASH-019: Monthly analytics for three months
// ---------------------------------------------------------------------------

describe('TC-DASH-019: monthly analytics per month', () => {
  it('returns correct per-month aggregates', async () => {
    const user = await ctx.createUser({ provision: true });
    const cat = await ctx.db.category.create({ data: { userId: user.id, name: 'Food', colorHex: '#000', routingType: 'NONE' } });

    await ctx.db.incomeEntry.create({ data: { userId: user.id, month: new Date('2026-09-01'), incomeType: 'SALARY', grossPaisa: 10000000n, tdsPaisa: 500000n, isTaxable: true, fiscalYear: '2026-27', idempotencyKey: 'inc-sep-19' } });
    await ctx.db.incomeEntry.create({ data: { userId: user.id, month: new Date('2026-10-01'), incomeType: 'SALARY', grossPaisa: 11000000n, tdsPaisa: 600000n, isTaxable: true, fiscalYear: '2026-27', idempotencyKey: 'inc-oct-19' } });
    await ctx.db.incomeEntry.create({ data: { userId: user.id, month: new Date('2026-11-01'), incomeType: 'SALARY', grossPaisa: 12000000n, tdsPaisa: 700000n, isTaxable: true, fiscalYear: '2026-27', idempotencyKey: 'inc-nov-19' } });

    await ctx.db.transaction.create({ data: { userId: user.id, categoryId: cat.id, amountPaisa: 200000n, date: new Date('2026-09-15'), description: 'Sep spend', type: 'NONE', paymentMethod: 'CASH', idempotencyKey: 'sep-1' } });
    await ctx.db.transaction.create({ data: { userId: user.id, categoryId: cat.id, amountPaisa: 300000n, date: new Date('2026-10-15'), description: 'Oct spend', type: 'NONE', paymentMethod: 'CASH', idempotencyKey: 'oct-1' } });
    await ctx.db.transaction.create({ data: { userId: user.id, categoryId: cat.id, amountPaisa: 400000n, date: new Date('2026-11-15'), description: 'Nov spend', type: 'NONE', paymentMethod: 'CASH', idempotencyKey: 'nov-1' } });

    const headers = await authHeader(ctx, user);
    const res = await ctx.makeRequest('GET', '/api/v1/analytics/monthly?from=2026-09&to=2026-11', { headers });
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.months).toHaveLength(3);
    const sep = body.months.find((m: { month: string }) => m.month === '2026-09');
    expect(sep.in_hand_income_paisa).toBe(9500000); // 10000000 - 500000
    expect(sep.total_spending_paisa).toBe(200000);
    expect(sep.net_savings_paisa).toBe(9300000);
    expect(sep.tds_paisa).toBe(500000);

    const oct = body.months.find((m: { month: string }) => m.month === '2026-10');
    expect(oct.in_hand_income_paisa).toBe(10400000);
    expect(oct.total_spending_paisa).toBe(300000);
  });
});
