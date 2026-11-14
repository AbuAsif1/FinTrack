/**
 * p2-07 — Quarterly and Annual Fixed Expenses
 * Seams:
 *   POST /api/v1/fixed-expenses        — accept cadence + due_month
 *   GET  /api/v1/fixed-expenses/:month — instances only in due months; monthly_equivalent_paisa on all
 *   GET  /api/v1/dashboard/summary     — committed total uses monthly equivalents
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContext } from '../helpers/index';

type Ctx = Awaited<ReturnType<typeof createTestContext>>;
type TestUser = { id: string; email: string; password: string; role: 'USER' | 'ADMIN' };

let ctx: Ctx;

beforeEach(async () => {
  ctx = await createTestContext();
});

afterEach(async () => {
  await ctx?.cleanup();
});

// ── helpers ───────────────────────────────────────────────────────────────────

async function createCategory(ctx: Ctx, user: TestUser) {
  const headers = await ctx.authHeader(user);
  const res = await ctx.makeRequest('POST', '/api/v1/categories', {
    headers,
    body: { name: 'Test Cat', routing_type: 'NONE', color_hex: '#ff0000' },
  });
  const { id } = await res.json();
  return id as string;
}

async function createFixedExpense(ctx: Ctx, user: TestUser, overrides: Record<string, unknown> = {}) {
  const headers = await ctx.authHeader(user);
  const categoryId = await createCategory(ctx, user);
  return ctx.makeRequest('POST', '/api/v1/fixed-expenses', {
    headers,
    body: {
      name: 'Test Expense',
      standard_amount_paisa: 3000000, // ৳30,000
      due_day: 10,
      category_id: categoryId,
      start_month: '2026-01',
      cadence: 'MONTHLY',
      ...overrides,
    },
  });
}

// ── Cadence field acceptance ──────────────────────────────────────────────────

describe('Fixed Expense cadence field', () => {
  it('creates a MONTHLY fixed expense (default cadence)', async () => {
    const user = await ctx.createUser({ provision: true });
    const res = await createFixedExpense(ctx, user, { cadence: 'MONTHLY' });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.cadence).toBe('MONTHLY');
    expect(body.monthly_equivalent_paisa).toBe(3000000);
  });

  it('creates a QUARTERLY fixed expense with due_month', async () => {
    const user = await ctx.createUser({ provision: true });
    const res = await createFixedExpense(ctx, user, {
      cadence: 'QUARTERLY',
      due_month: 1, // Jan → due in Jan, Apr, Jul, Oct
      standard_amount_paisa: 1500000, // ৳15,000 per quarter
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.cadence).toBe('QUARTERLY');
    expect(body.due_month).toBe(1);
    expect(body.monthly_equivalent_paisa).toBe(500000); // 1500000 / 3
  });

  it('creates an ANNUAL fixed expense with due_month', async () => {
    const user = await ctx.createUser({ provision: true });
    const res = await createFixedExpense(ctx, user, {
      cadence: 'ANNUAL',
      due_month: 6, // June every year
      standard_amount_paisa: 3600000, // ৳36,000 per year
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.cadence).toBe('ANNUAL');
    expect(body.due_month).toBe(6);
    expect(body.monthly_equivalent_paisa).toBe(300000); // 3600000 / 12
  });

  it('rejects QUARTERLY expense without due_month', async () => {
    const user = await ctx.createUser({ provision: true });
    const res = await createFixedExpense(ctx, user, { cadence: 'QUARTERLY' });
    expect(res.status).toBe(422);
  });
});

// ── Instance generation cadence ───────────────────────────────────────────────

describe('Instance generation respects cadence', () => {
  it('QUARTERLY: creates instance in due month but not in off months', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    // Create quarterly expense due in Jan (→ Jan, Apr, Jul, Oct)
    const res = await createFixedExpense(ctx, user, {
      cadence: 'QUARTERLY',
      due_month: 1,
      start_month: '2026-01',
      standard_amount_paisa: 1500000,
    });
    expect(res.status).toBe(201);

    // Jan 2026 is a due month → should have an instance
    const janRes = await ctx.makeRequest('GET', '/api/v1/fixed-expense-instances?from=2026-01&to=2026-01', { headers });
    expect(janRes.status).toBe(200);
    const jan = await janRes.json();
    expect(jan.length).toBeGreaterThanOrEqual(1);

    // Feb 2026 is NOT a due month → no instance for this expense
    const febRes = await ctx.makeRequest('GET', '/api/v1/fixed-expense-instances?from=2026-02&to=2026-02', { headers });
    expect(febRes.status).toBe(200);
    const feb = await febRes.json();
    // The quarterly expense should NOT appear in Feb
    const febInstance = feb.find((i: { template_name: string }) => i.template_name === 'Test Expense');
    expect(febInstance).toBeUndefined();
  });

  it('ANNUAL: creates instance only in the due month', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    // Create annual expense due in November (month 11)
    const res = await createFixedExpense(ctx, user, {
      cadence: 'ANNUAL',
      due_month: 11,
      start_month: '2026-11',
      amount_paisa: 3600000,
    });
    expect(res.status).toBe(201);

    // Nov 2026 is the due month → should have an instance
    const novRes = await ctx.makeRequest('GET', '/api/v1/fixed-expense-instances?from=2026-11&to=2026-11', { headers });
    expect(novRes.status).toBe(200);
    const nov = await novRes.json();
    expect(nov.length).toBeGreaterThanOrEqual(1);

    // Dec 2026 is NOT the due month → no instance
    const decRes = await ctx.makeRequest('GET', '/api/v1/fixed-expense-instances?from=2026-12&to=2026-12', { headers });
    expect(decRes.status).toBe(200);
    const dec = await decRes.json();
    const decInstance = dec.find((i: { template_name: string }) => i.template_name === 'Test Expense');
    expect(decInstance).toBeUndefined();
  });
});

// ── Monthly equivalent in list ────────────────────────────────────────────────

describe('monthly_equivalent_paisa in fixed expense list', () => {
  it('list response includes monthly_equivalent_paisa for all cadences', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    await createFixedExpense(ctx, user, { cadence: 'ANNUAL', due_month: 6, standard_amount_paisa: 1200000 });

    const listRes = await ctx.makeRequest('GET', '/api/v1/fixed-expenses', { headers });
    expect(listRes.status).toBe(200);
    const list = await listRes.json();
    // The annual expense has monthly equivalent of 1200000 / 12 = 100000
    const annual = list.find((e: { cadence: string; monthly_equivalent_paisa: number }) => e.cadence === 'ANNUAL');
    expect(annual).toBeDefined();
    expect(annual.monthly_equivalent_paisa).toBe(100000);
  });
});
