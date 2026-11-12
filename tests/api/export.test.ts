/**
 * TC-EXP-001 to TC-EXP-009, TC-EXP-011 — Data export
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestContext } from '../helpers/index';

type Ctx = Awaited<ReturnType<typeof createTestContext>>;

let ctx: Ctx;

beforeEach(async () => {
  ctx = await createTestContext();
});

async function login(ctx: Ctx, user: { email: string; password: string }) {
  const res = await ctx.makeRequest('POST', '/api/v1/auth/login', { body: { email: user.email, password: user.password } });
  const data = (await res.json()) as { accessToken: string };
  return data.accessToken;
}

async function getCategories(ctx: Ctx, token: string) {
  const res = await ctx.makeRequest('GET', '/api/v1/categories', { headers: { Authorization: `Bearer ${token}` } });
  return res.json() as Promise<Array<{ id: string; name: string; routing_type: string }>>;
}

// ── TC-EXP-001: Full export contains all records ──────────────────────────

describe('TC-EXP-001: full export contains all records', () => {
  it('JSON file has schema_version, exported_at and records', async () => {
    const user = await ctx.createUser();
    const token = await login(ctx, user);
    const cats = await getCategories(ctx, token);
    const none = cats.find((c) => c.routing_type === 'NONE')!;

    // Create a transaction
    await ctx.makeRequest('POST', '/api/v1/transactions', {
      headers: { Authorization: `Bearer ${token}` },
      body: { amount_paisa: 10000, date: '2026-11-01', description: 'Test', category_id: none.id, payment_method: 'CASH', idempotency_key: 'exp-tx-1' },
    });

    const res = await ctx.makeRequest('GET', '/api/v1/export/full', { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status).toBe(200);
    const data = await res.json() as { schema_version: string; exported_at: string; transactions: unknown[]; categories: unknown[] };
    expect(data.schema_version).toBe('1.0');
    expect(data.exported_at).toBeTruthy();
    expect(data.transactions.length).toBeGreaterThanOrEqual(1);
    expect(data.categories.length).toBeGreaterThanOrEqual(1);
  });
});

// ── TC-EXP-003: Password hashes and tokens absent ─────────────────────────

describe('TC-EXP-003: secrets not in full export', () => {
  it('no passwordHash or token fields in the export', async () => {
    const user = await ctx.createUser();
    const token = await login(ctx, user);
    const res = await ctx.makeRequest('GET', '/api/v1/export/full', { headers: { Authorization: `Bearer ${token}` } });
    const text = await res.text();
    expect(text).not.toContain('passwordHash');
    expect(text).not.toContain('password_hash');
    // refresh tokens not included
    expect(text).not.toContain('refresh_token');
  });
});

// ── TC-EXP-004: Cross-user isolation ─────────────────────────────────────

describe('TC-EXP-004: second user data not in export', () => {
  it("user A cannot see user B's transactions", async () => {
    const userA = await ctx.createUser();
    const userB = await ctx.createUser();
    const tokenA = await login(ctx, userA);
    const tokenB = await login(ctx, userB);

    const catsB = await getCategories(ctx, tokenB);
    const noneB = catsB.find((c) => c.routing_type === 'NONE')!;

    // B creates a transaction
    await ctx.makeRequest('POST', '/api/v1/transactions', {
      headers: { Authorization: `Bearer ${tokenB}` },
      body: { amount_paisa: 99900, date: '2026-11-01', description: 'Secret B', category_id: noneB.id, payment_method: 'CASH', idempotency_key: 'exp-b-1' },
    });

    // A's export
    const resA = await ctx.makeRequest('GET', '/api/v1/export/full', { headers: { Authorization: `Bearer ${tokenA}` } });
    const textA = await resA.text();
    expect(textA).not.toContain('Secret B');
  });
});

// ── TC-EXP-005: Transactions CSV ─────────────────────────────────────────

describe('TC-EXP-005: transactions CSV for date range', () => {
  it('returns CSV with correct columns', async () => {
    const user = await ctx.createUser();
    const token = await login(ctx, user);
    const cats = await getCategories(ctx, token);
    const none = cats.find((c) => c.routing_type === 'NONE')!;

    await ctx.makeRequest('POST', '/api/v1/transactions', {
      headers: { Authorization: `Bearer ${token}` },
      body: { amount_paisa: 119850, date: '2026-11-01', description: 'Groceries', category_id: none.id, payment_method: 'CASH', idempotency_key: 'exp-tx-csv-1' },
    });

    const res = await ctx.makeRequest('GET', '/api/v1/export/transactions?from=2026-11-01&to=2026-11-30', { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status).toBe(200);
    const text = await res.text();
    // Headers present
    expect(text).toContain('date');
    expect(text).toContain('amount_bdt');
    expect(text).toContain('description');
    // Data present
    expect(text).toContain('Groceries');
  });
});

// ── TC-EXP-006: Income CSV ───────────────────────────────────────────────

describe('TC-EXP-006: income CSV for fiscal year', () => {
  it('returns CSV with income entries', async () => {
    const user = await ctx.createUser();
    const token = await login(ctx, user);

    await ctx.makeRequest('POST', '/api/v1/income-entries', {
      headers: { Authorization: `Bearer ${token}` },
      body: { month: '2026-11', income_type: 'SALARY', gross_paisa: 14000000, tds_paisa: 0, idempotency_key: 'exp-inc-1' },
    });

    const res = await ctx.makeRequest('GET', '/api/v1/export/income?fiscal_year=2026-27', { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('month');
    expect(text).toContain('income_type');
    expect(text).toContain('SALARY');
  });
});

// ── TC-EXP-009: Amount formatting ────────────────────────────────────────

describe('TC-EXP-009: amounts formatted as decimals without grouping', () => {
  it('1198.50 appears without comma grouping', async () => {
    const user = await ctx.createUser();
    const token = await login(ctx, user);
    const cats = await getCategories(ctx, token);
    const none = cats.find((c) => c.routing_type === 'NONE')!;

    await ctx.makeRequest('POST', '/api/v1/transactions', {
      headers: { Authorization: `Bearer ${token}` },
      body: { amount_paisa: 119850, date: '2026-11-01', description: 'Test', category_id: none.id, payment_method: 'CASH', idempotency_key: 'exp-amt-1' },
    });

    const res = await ctx.makeRequest('GET', '/api/v1/export/transactions', { headers: { Authorization: `Bearer ${token}` } });
    const text = await res.text();
    expect(text).toContain('1198.50');
    expect(text).not.toContain('1,198.50');
  });
});
