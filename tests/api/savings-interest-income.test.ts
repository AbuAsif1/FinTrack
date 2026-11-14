/**
 * p2-10 — Savings Interest TDS and Sanchaypatra Profit
 * Seams:
 *   POST /api/v1/income-entries — accept SAVINGS_INTEREST / SANCHAYPATRA_PROFIT types with gross + TDS
 *   GET  /api/v1/tax/summary    — gross savings income added to Gross Income; TDS reduces tax paid
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

async function createIncome(ctx: Ctx, user: TestUser, overrides: Record<string, unknown> = {}) {
  const headers = await ctx.authHeader(user);
  return ctx.makeRequest('POST', '/api/v1/income-entries', {
    headers,
    body: {
      month: '2026-11',
      income_type: 'SAVINGS_INTEREST',
      gross_paisa: 1000000, // ৳10,000
      tds_paisa: 150000,    // ৳1,500
      idempotency_key: `ikey-${Date.now()}-${Math.random()}`,
      ...overrides,
    },
  });
}

// ── SAVINGS_INTEREST ──────────────────────────────────────────────────────────

describe('SAVINGS_INTEREST income type', () => {
  it('creates a SAVINGS_INTEREST entry with gross and TDS', async () => {
    const user = await ctx.createUser({ provision: true });
    const res = await createIncome(ctx, user, {
      income_type: 'SAVINGS_INTEREST',
      gross_paisa: 1000000,
      tds_paisa: 150000,
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.income_type).toBe('SAVINGS_INTEREST');
    expect(body.gross_paisa).toBe(1000000);
    expect(body.tds_paisa).toBe(150000);
    expect(body.in_hand_paisa).toBe(850000); // 1000000 - 150000
  });

  it('is taxable by default (contributes to gross income)', async () => {
    const user = await ctx.createUser({ provision: true });
    const res = await createIncome(ctx, user, {
      income_type: 'SAVINGS_INTEREST',
      gross_paisa: 1000000,
      tds_paisa: 150000,
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.is_taxable ?? true).toBe(true);
  });

  it('can be linked to a savings account', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    // Create a savings account first
    const accRes = await ctx.makeRequest('POST', '/api/v1/savings-accounts', {
      headers,
      body: {
        name: 'BRAC Bank Savings',
        type: 'SAVINGS',
        bank_name: 'BRAC Bank',
        opening_date: '2026-01-01',
        opening_balance_paisa: 50000000,
      },
    });
    expect(accRes.status).toBe(201);
    const { id: savingsAccountId } = await accRes.json();

    const res = await createIncome(ctx, user, {
      income_type: 'SAVINGS_INTEREST',
      gross_paisa: 1000000,
      tds_paisa: 150000,
      savings_account_id: savingsAccountId,
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.savings_account_id).toBe(savingsAccountId);
  });
});

// ── SANCHAYPATRA_PROFIT ───────────────────────────────────────────────────────

describe('SANCHAYPATRA_PROFIT income type', () => {
  it('creates a SANCHAYPATRA_PROFIT entry with gross and TDS', async () => {
    const user = await ctx.createUser({ provision: true });
    const res = await createIncome(ctx, user, {
      income_type: 'SANCHAYPATRA_PROFIT',
      gross_paisa: 7750000, // ৳77,500
      tds_paisa: 775000,    // ৳7,750 (10%)
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.income_type).toBe('SANCHAYPATRA_PROFIT');
    expect(body.in_hand_paisa).toBe(6975000); // 7750000 - 775000
  });
});

// ── Tax engine integration ────────────────────────────────────────────────────

describe('Tax summary includes savings interest in gross income', () => {
  it('savings interest gross is included in tax gross income and TDS reduces tax paid', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    // Add a salary entry
    await ctx.makeRequest('POST', '/api/v1/income-entries', {
      headers,
      body: {
        month: '2026-11',
        income_type: 'SALARY',
        gross_paisa: 50000000, // ৳5,00,000
        tds_paisa: 0,
        idempotency_key: `sal-${Date.now()}`,
      },
    });

    // Add savings interest
    await createIncome(ctx, user, {
      income_type: 'SAVINGS_INTEREST',
      gross_paisa: 2000000, // ৳20,000
      tds_paisa: 300000,    // ৳3,000 TDS
      idempotency_key: `int-${Date.now()}`,
    });

    const taxRes = await ctx.makeRequest('GET', '/api/v1/tax/summary?fy=2026-27', { headers });
    expect(taxRes.status).toBe(200);
    const tax = await taxRes.json();

    // Gross income must include the savings interest gross
    expect(tax.gross_income_paisa).toBeGreaterThanOrEqual(50000000 + 2000000);

    // TDS paid must include the interest TDS
    expect(tax.tds_paisa).toBeGreaterThanOrEqual(300000);
  });
});
