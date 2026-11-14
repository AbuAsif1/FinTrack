/**
 * p2-05 — Wallet Balances and Net Worth
 * Seams:
 *   GET /api/v1/wallets           – list wallets with computed balances
 *   PUT /api/v1/wallets/:method   – set/update opening balance
 *   GET /api/v1/wallets/:method/transactions – transactions for a wallet
 *   POST /api/v1/wallets/transfers – wallet-to-wallet transfer
 *   GET /api/v1/dashboard/summary – net_worth_paisa field added
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContext } from '../helpers/index';
import { toDbDate } from '@fintrack/shared';

type Ctx = Awaited<ReturnType<typeof createTestContext>>;

let ctx: Ctx;

beforeEach(async () => {
  ctx = await createTestContext();
});

afterEach(async () => {
  await ctx?.cleanup();
});

// ── helpers ──────────────────────────────────────────────────────────────────

async function setWallet(
  ctx: Ctx,
  user: { id: string; email: string; password: string; role: 'USER' | 'ADMIN' },
  method: string,
  body: Record<string, unknown> = {},
) {
  const headers = await ctx.authHeader(user);
  return ctx.makeRequest('PUT', `/api/v1/wallets/${method}`, {
    headers,
    body: {
      name: `My ${method} wallet`,
      opening_balance_paisa: 100000,
      opening_balance_date: '2026-01-01',
      ...body,
    },
  });
}

async function insertSpendingTx(
  ctx: Ctx,
  userId: string,
  amountPaisa: number,
  method: string,
  date: string,
) {
  let category = await ctx.db.category.findFirst({ where: { userId, routingType: 'NONE' } });
  if (!category) {
    category = await ctx.db.category.create({
      data: { userId, name: 'Misc', routingType: 'NONE', colorHex: '#888' },
    });
  }
  return ctx.db.transaction.create({
    data: {
      userId,
      date: toDbDate(date),
      amountPaisa: BigInt(amountPaisa),
      description: 'Test spend',
      categoryId: category.id,
      type: 'NONE',
      paymentMethod: method as 'CASH' | 'BKASH' | 'BANK' | 'CARD',
      idempotencyKey: `test-${Date.now()}-${Math.random()}`,
    },
  });
}

// ── GET /api/v1/wallets ───────────────────────────────────────────────────────

describe('GET /api/v1/wallets', () => {
  it('requires auth', async () => {
    const res = await ctx.makeRequest('GET', '/api/v1/wallets');
    expect(res.status).toBe(401);
  });

  it('returns empty list when no wallets set up', async () => {
    const user = await ctx.createUser();
    const headers = await ctx.authHeader(user);
    const res = await ctx.makeRequest('GET', '/api/v1/wallets', { headers });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.wallets).toEqual([]);
    expect(body.net_worth_paisa).toBeDefined();
  });

  it('returns wallet with computed balance after transactions', async () => {
    const user = await ctx.createUser();

    // Set up CASH wallet with ৳1,000 opening balance from 2026-01-01
    await setWallet(ctx, user, 'CASH', {
      opening_balance_paisa: 100000,
      opening_balance_date: '2026-01-01',
    });

    // Spend ৳300 on 2026-01-05
    await insertSpendingTx(ctx, user.id, 30000, 'CASH', '2026-01-05');

    const headers = await ctx.authHeader(user);
    const res = await ctx.makeRequest('GET', '/api/v1/wallets', { headers });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.wallets).toHaveLength(1);
    const wallet = body.wallets[0];
    expect(wallet.method).toBe('CASH');
    // balance = 100000 - 30000 = 70000
    expect(wallet.balance_paisa).toBe(70000);
  });

  it('excludes transactions before opening_balance_date from balance', async () => {
    const user = await ctx.createUser();

    await setWallet(ctx, user, 'CASH', {
      opening_balance_paisa: 100000,
      opening_balance_date: '2026-02-01',
    });

    // This transaction is BEFORE opening date — must not affect balance
    await insertSpendingTx(ctx, user.id, 50000, 'CASH', '2026-01-15');

    const headers = await ctx.authHeader(user);
    const res = await ctx.makeRequest('GET', '/api/v1/wallets', { headers });
    const body = await res.json();
    expect(body.wallets[0].balance_paisa).toBe(100000);
  });

  it('does not leak other users wallets', async () => {
    const a = await ctx.createUser();
    const b = await ctx.createUser();
    await setWallet(ctx, a, 'CASH');
    const headers = await ctx.authHeader(b);
    const res = await ctx.makeRequest('GET', '/api/v1/wallets', { headers });
    const body = await res.json();
    expect(body.wallets).toHaveLength(0);
  });
});

// ── PUT /api/v1/wallets/:method ───────────────────────────────────────────────

describe('PUT /api/v1/wallets/:method', () => {
  it('creates wallet on first call', async () => {
    const user = await ctx.createUser();
    const res = await setWallet(ctx, user, 'BKASH', {
      name: 'bKash Personal',
      opening_balance_paisa: 500000,
      opening_balance_date: '2026-03-01',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.method).toBe('BKASH');
    expect(body.name).toBe('bKash Personal');
    expect(body.opening_balance_paisa).toBe(500000);
  });

  it('updates wallet on subsequent call', async () => {
    const user = await ctx.createUser();
    await setWallet(ctx, user, 'BANK', { opening_balance_paisa: 100000 });
    const res = await setWallet(ctx, user, 'BANK', {
      name: 'BRAC Bank',
      opening_balance_paisa: 200000,
      opening_balance_date: '2026-01-01',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.opening_balance_paisa).toBe(200000);
    expect(body.name).toBe('BRAC Bank');
  });

  it('rejects invalid payment method', async () => {
    const user = await ctx.createUser();
    const headers = await ctx.authHeader(user);
    const res = await ctx.makeRequest('PUT', '/api/v1/wallets/INVALID', {
      headers,
      body: { name: 'x', opening_balance_paisa: 0, opening_balance_date: '2026-01-01' },
    });
    expect(res.status).toBe(422);
  });

  it('rejects negative opening balance', async () => {
    const user = await ctx.createUser();
    const headers = await ctx.authHeader(user);
    const res = await ctx.makeRequest('PUT', '/api/v1/wallets/CASH', {
      headers,
      body: { name: 'Cash', opening_balance_paisa: -1, opening_balance_date: '2026-01-01' },
    });
    expect(res.status).toBe(422);
  });
});

// ── GET /api/v1/wallets/:method/transactions ─────────────────────────────────

describe('GET /api/v1/wallets/:method/transactions', () => {
  it('requires auth', async () => {
    const res = await ctx.makeRequest('GET', '/api/v1/wallets/CASH/transactions');
    expect(res.status).toBe(401);
  });

  it('returns transactions for the matching payment method', async () => {
    const user = await ctx.createUser();
    await setWallet(ctx, user, 'CASH', { opening_balance_date: '2026-01-01' });
    await insertSpendingTx(ctx, user.id, 10000, 'CASH', '2026-01-10');
    await insertSpendingTx(ctx, user.id, 20000, 'BKASH', '2026-01-11');

    const headers = await ctx.authHeader(user);
    const res = await ctx.makeRequest('GET', '/api/v1/wallets/CASH/transactions', { headers });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.transactions).toHaveLength(1);
    expect(body.transactions[0].amount_paisa).toBe(10000);
  });
});

// ── POST /api/v1/wallets/transfers ────────────────────────────────────────────

describe('POST /api/v1/wallets/transfers', () => {
  it('requires auth', async () => {
    const res = await ctx.makeRequest('POST', '/api/v1/wallets/transfers');
    expect(res.status).toBe(401);
  });

  it('creates a transfer and updates both balances', async () => {
    const user = await ctx.createUser();
    await setWallet(ctx, user, 'BANK', { opening_balance_paisa: 1000000, opening_balance_date: '2026-01-01' });
    await setWallet(ctx, user, 'BKASH', { opening_balance_paisa: 0, opening_balance_date: '2026-01-01' });

    const headers = await ctx.authHeader(user);
    const res = await ctx.makeRequest('POST', '/api/v1/wallets/transfers', {
      headers,
      body: {
        from_method: 'BANK',
        to_method: 'BKASH',
        amount_paisa: 50000,
        date: '2026-01-15',
        note: 'bKash top-up',
        idempotency_key: 'transfer-1',
      },
    });
    expect(res.status).toBe(201);

    // Check balances updated
    const listRes = await ctx.makeRequest('GET', '/api/v1/wallets', { headers });
    const body = await listRes.json();
    const bank = body.wallets.find((w: { method: string }) => w.method === 'BANK');
    const bkash = body.wallets.find((w: { method: string }) => w.method === 'BKASH');
    expect(bank.balance_paisa).toBe(950000);  // 1000000 - 50000
    expect(bkash.balance_paisa).toBe(50000);  // 0 + 50000
  });

  it('requires both wallets to exist', async () => {
    const user = await ctx.createUser();
    await setWallet(ctx, user, 'BANK', { opening_balance_paisa: 1000000, opening_balance_date: '2026-01-01' });

    const headers = await ctx.authHeader(user);
    const res = await ctx.makeRequest('POST', '/api/v1/wallets/transfers', {
      headers,
      body: {
        from_method: 'BANK',
        to_method: 'BKASH',
        amount_paisa: 50000,
        date: '2026-01-15',
        idempotency_key: 'transfer-2',
      },
    });
    expect(res.status).toBe(422);
  });

  it('is idempotent on duplicate key', async () => {
    const user = await ctx.createUser();
    await setWallet(ctx, user, 'BANK', { opening_balance_paisa: 1000000, opening_balance_date: '2026-01-01' });
    await setWallet(ctx, user, 'BKASH', { opening_balance_paisa: 0, opening_balance_date: '2026-01-01' });

    const headers = await ctx.authHeader(user);
    const payload = {
      from_method: 'BANK',
      to_method: 'BKASH',
      amount_paisa: 50000,
      date: '2026-01-15',
      idempotency_key: 'dup-key-1',
    };
    const r1 = await ctx.makeRequest('POST', '/api/v1/wallets/transfers', { headers, body: payload });
    const r2 = await ctx.makeRequest('POST', '/api/v1/wallets/transfers', { headers, body: payload });
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(200);

    const b1 = await r1.json();
    const b2 = await r2.json();
    expect(b1.id).toBe(b2.id);
  });
});

// ── Dashboard net worth ───────────────────────────────────────────────────────

describe('Dashboard summary: net_worth_paisa', () => {
  it('includes net_worth_paisa in dashboard summary', async () => {
    const user = await ctx.createUser({ provision: true });
    await setWallet(ctx, user, 'CASH', { opening_balance_paisa: 500000, opening_balance_date: '2026-01-01' });

    const headers = await ctx.authHeader(user);
    const res = await ctx.makeRequest('GET', '/api/v1/dashboard/summary?month=2026-01', { headers });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('net_worth_paisa');
    expect(typeof body.net_worth_paisa).toBe('number');
  });
});
