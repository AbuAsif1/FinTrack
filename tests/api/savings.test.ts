/**
 * TC-SAV-001 to TC-SAV-012 â€” Savings accounts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContext } from '../helpers/index';
import type { PrismaClient } from '@prisma/client';
import { toDbDate } from '@fintrack/shared';

type Ctx = Awaited<ReturnType<typeof createTestContext>>;

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

async function createAccount(
  ctx: Ctx,
  user: { id: string; email: string; password: string; role: 'USER' | 'ADMIN' },
  overrides: Record<string, unknown> = {},
) {
  const headers = await ctx.authHeader(user);
  return ctx.makeRequest('POST', '/api/v1/savings-accounts', {
    headers,
    body: {
      name: 'Test Savings',
      type: 'SAVINGS',
      bank_name: 'BRAC Bank',
      opening_balance_paisa: 5000000,
      opening_date: '2024-01-01',
      ...overrides,
    },
  });
}

/** A Savings account to sit DPS/FDR accounts under */
async function parentAccountId(
  ctx: Ctx,
  user: { id: string; email: string; password: string; role: 'USER' | 'ADMIN' },
): Promise<string> {
  const res = await createAccount(ctx, user, { name: 'Parent Bank', type: 'SAVINGS' });
  return (await res.json()).id;
}

/** Insert a savings transaction directly via DB (fixture â€” until ticket 06) */
async function insertSavingsTx(
  db: PrismaClient,
  userId: string,
  savingsAccountId: string,
  type: 'SAVINGS_DEPOSIT' | 'SAVINGS_WITHDRAWAL' | 'SAVINGS_INTEREST',
  amountPaisa: number,
  date = '2026-11-01',
) {
  // Find or create a category matching the type
  let category = await db.category.findFirst({ where: { userId, routingType: type } });
  if (!category) {
    category = await db.category.create({
      data: { userId, name: `${type} cat`, routingType: type, colorHex: '#888888' },
    });
  }
  return db.transaction.create({
    data: {
      userId,
      amountPaisa: BigInt(amountPaisa),
      date: toDbDate(date),
      description: `${type} fixture`,
      categoryId: category.id,
      type,
      paymentMethod: 'BANK',
      savingsAccountId,
      idempotencyKey: `ikey-${type}-${Date.now()}-${Math.random()}`,
    },
  });
}

// ---------------------------------------------------------------------------
// TC-SAV-001: Create an account of each type
// ---------------------------------------------------------------------------

describe('TC-SAV-001: create an account of each type', () => {
  it('creates Savings, DPS, Sanchaypatra, Investment and Cash accounts', async () => {
    const user = await ctx.createUser({ provision: true });

    const types = ['SAVINGS', 'DPS', 'SANCHAYPATRA', 'INVESTMENT', 'CASH'];
    let parentId = '';
    for (const type of types) {
      const extraFields =
        type === 'DPS'
          ? { monthly_installment_paisa: 1000000, maturity_date: '2030-01-01', parent_account_id: parentId }
          : {};
      const res = await createAccount(ctx, user, { type, name: `My ${type}`, ...extraFields });
      expect(res.status, `type ${type} should be 201`).toBe(201);
      const body = await res.json();
      expect(body.type).toBe(type);
      expect(body.id).toBeDefined();
      if (type === 'SAVINGS') parentId = body.id;
    }

    const headers = await ctx.authHeader(user);
    const listRes = await ctx.makeRequest('GET', '/api/v1/savings-accounts', { headers });
    expect(listRes.status).toBe(200);
    const list = await listRes.json();
    expect(list.accounts.length).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// TC-SAV-002: last_four validation
// ---------------------------------------------------------------------------

describe('TC-SAV-002: last_four validation', () => {
  it('accepts 4-digit last_four and rejects full account number', async () => {
    const user = await ctx.createUser({ provision: true });

    // Valid: 4 digits
    const good = await createAccount(ctx, user, { last_four: '4521' });
    expect(good.status).toBe(201);
    const goodBody = await good.json();
    expect(goodBody.last_four).toBe('4521');

    // Invalid: full account number (more than 4 chars)
    const bad = await createAccount(ctx, user, { last_four: '123456789012' });
    expect(bad.status).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// TC-SAV-003: Account with no transactions â€” balance equals opening balance
// ---------------------------------------------------------------------------

describe('TC-SAV-003: no transactions â€” balance equals opening balance', () => {
  it('returns balance_paisa equal to opening_balance_paisa', async () => {
    const user = await ctx.createUser({ provision: true });

    const res = await createAccount(ctx, user, { opening_balance_paisa: 5000000 });
    expect(res.status).toBe(201);
    const acct = await res.json();

    const headers = await ctx.authHeader(user);
    const detail = await ctx.makeRequest('GET', `/api/v1/savings-accounts/${acct.id}`, { headers });
    expect(detail.status).toBe(200);
    const body = await detail.json();
    expect(body.balance_paisa).toBe(5000000);
  });
});

// ---------------------------------------------------------------------------
// TC-SAV-004 / AC-SAV-1: Balance with deposits, interest and withdrawal
// ---------------------------------------------------------------------------

describe('TC-SAV-004 / AC-SAV-1: balance computation', () => {
  it('opening 50000 + 2Ã—10000 deposits + interest 1250 âˆ’ withdrawal 5000 = 66250 BDT', async () => {
    const user = await ctx.createUser({ provision: true });

    const res = await createAccount(ctx, user, { opening_balance_paisa: 5000000 }); // à§³50,000
    const acct = await res.json();

    await insertSavingsTx(ctx.db, user.id, acct.id, 'SAVINGS_DEPOSIT', 1000000); // à§³10,000
    await insertSavingsTx(ctx.db, user.id, acct.id, 'SAVINGS_DEPOSIT', 1000000); // à§³10,000
    await insertSavingsTx(ctx.db, user.id, acct.id, 'SAVINGS_INTEREST', 125000);  // à§³1,250
    await insertSavingsTx(ctx.db, user.id, acct.id, 'SAVINGS_WITHDRAWAL', 500000); // à§³5,000

    const headers = await ctx.authHeader(user);
    const detail = await ctx.makeRequest('GET', `/api/v1/savings-accounts/${acct.id}`, { headers });
    expect(detail.status).toBe(200);
    const body = await detail.json();
    expect(body.balance_paisa).toBe(6625000); // à§³66,250
  });
});

// ---------------------------------------------------------------------------
// TC-SAV-005: Soft-deleted deposit does not count
// ---------------------------------------------------------------------------

describe('TC-SAV-005: soft-deleted deposit does not count', () => {
  it('balance falls when a deposit is soft-deleted', async () => {
    const user = await ctx.createUser({ provision: true });
    const res = await createAccount(ctx, user, { opening_balance_paisa: 5000000 });
    const acct = await res.json();

    const tx = await insertSavingsTx(ctx.db, user.id, acct.id, 'SAVINGS_DEPOSIT', 1000000);

    const headers = await ctx.authHeader(user);
    // Confirm balance before delete
    const before = await ctx.makeRequest('GET', `/api/v1/savings-accounts/${acct.id}`, { headers });
    const beforeBody = await before.json();
    expect(beforeBody.balance_paisa).toBe(6000000); // à§³60,000

    // Soft-delete via DELETE /transactions/:id
    const del = await ctx.makeRequest('DELETE', `/api/v1/transactions/${tx.id}`, { headers });
    expect(del.status).toBe(204);

    // Balance should drop back to opening balance
    const after = await ctx.makeRequest('GET', `/api/v1/savings-accounts/${acct.id}`, { headers });
    const afterBody = await after.json();
    expect(afterBody.balance_paisa).toBe(5000000); // à§³50,000
  });
});

// ---------------------------------------------------------------------------
// TC-SAV-006: Savings list totals
// ---------------------------------------------------------------------------

describe('TC-SAV-006: savings list totals', () => {
  it('totals match the transactions', async () => {
    const user = await ctx.createUser({ provision: true });
    const res = await createAccount(ctx, user, { opening_balance_paisa: 1000000 });
    const acct = await res.json();

    // Deposit this calendar month
    const thisMonth = new Date().toISOString().slice(0, 7);
    await insertSavingsTx(ctx.db, user.id, acct.id, 'SAVINGS_DEPOSIT', 500000, `${thisMonth}-05`);

    const headers = await ctx.authHeader(user);
    const list = await ctx.makeRequest('GET', '/api/v1/savings-accounts', { headers });
    expect(list.status).toBe(200);
    const body = await list.json();
    expect(body.totals.total_saved_paisa).toBe(1500000); // opening + deposit
    expect(body.totals.this_month_deposits_paisa).toBe(500000);
    expect(body.totals.this_fy_deposits_paisa).toBeGreaterThanOrEqual(500000);
  });
});

// ---------------------------------------------------------------------------
// TC-SAV-007: Combined DPS cap progress across two DPS accounts
// ---------------------------------------------------------------------------

describe('TC-SAV-007: combined DPS cap progress', () => {
  it('dps_this_fy_paisa aggregates deposits from two DPS accounts', async () => {
    const user = await ctx.createUser({ provision: true });
    const parent = await parentAccountId(ctx, user);

    const res1 = await createAccount(ctx, user, {
      name: 'DPS 1', type: 'DPS', parent_account_id: parent,
      monthly_installment_paisa: 1000000, maturity_date: '2030-01-01',
      opening_balance_paisa: 0,
    });
    const acct1 = await res1.json();

    const res2 = await createAccount(ctx, user, {
      name: 'DPS 2', type: 'DPS', parent_account_id: parent,
      monthly_installment_paisa: 1000000, maturity_date: '2030-01-01',
      opening_balance_paisa: 0,
    });
    const acct2 = await res2.json();

    const thisMonth = new Date().toISOString().slice(0, 7);
    await insertSavingsTx(ctx.db, user.id, acct1.id, 'SAVINGS_DEPOSIT', 1000000, `${thisMonth}-05`);
    await insertSavingsTx(ctx.db, user.id, acct2.id, 'SAVINGS_DEPOSIT', 2000000, `${thisMonth}-05`);

    const headers = await ctx.authHeader(user);
    const list = await ctx.makeRequest('GET', '/api/v1/savings-accounts', { headers });
    const body = await list.json();
    expect(body.totals.dps_this_fy_paisa).toBe(3000000);
    expect(body.totals.dps_cap_paisa).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// TC-SAV-008: DPS projected principal at maturity
// ---------------------------------------------------------------------------

describe('TC-SAV-008: DPS projected principal at maturity', () => {
  it('balance 80000 + installment 10000 Ã— 88 months = 960000 BDT', async () => {
    const user = await ctx.createUser({ provision: true });

    // Create a DPS account with 88 installments remaining from next month
    const today = new Date();
    const maturityDate = new Date(today.getFullYear(), today.getMonth() + 1 + 88 - 1, 1);
    const maturityStr = `${maturityDate.getFullYear()}-${String(maturityDate.getMonth() + 1).padStart(2, '0')}-01`;

    const res = await createAccount(ctx, user, {
      name: 'DPS Account', type: 'DPS', parent_account_id: await parentAccountId(ctx, user),
      monthly_installment_paisa: 1000000, // à§³10,000
      maturity_date: maturityStr,
      opening_balance_paisa: 8000000, // à§³80,000 (no additional transactions)
    });
    const acct = await res.json();

    const headers = await ctx.authHeader(user);
    const detail = await ctx.makeRequest('GET', `/api/v1/savings-accounts/${acct.id}`, { headers });
    expect(detail.status).toBe(200);
    const body = await detail.json();
    expect(body.balance_paisa).toBe(8000000); // à§³80,000
    // projected = 80000 + 10000 Ã— 88 = à§³9,60,000
    expect(body.projected_principal_paisa).toBe(96000000);
  });
});

// ---------------------------------------------------------------------------
// TC-SAV-009: Close account with balance (422), then at zero (success)
// ---------------------------------------------------------------------------

describe('TC-SAV-009: closing an account', () => {
  it('returns 422 with balance, then closes at zero', async () => {
    const user = await ctx.createUser({ provision: true });
    const res = await createAccount(ctx, user, { opening_balance_paisa: 1000000 });
    const acct = await res.json();

    const headers = await ctx.authHeader(user);

    // Cannot close with balance
    const failClose = await ctx.makeRequest('PATCH', `/api/v1/savings-accounts/${acct.id}`, {
      headers,
      body: { closed_on: '2026-11-01' },
    });
    expect(failClose.status).toBe(422);
    const failBody = await failClose.json();
    expect(failBody.code).toBe('BALANCE_NOT_ZERO');

    // Withdraw the entire balance
    await insertSavingsTx(ctx.db, user.id, acct.id, 'SAVINGS_WITHDRAWAL', 1000000);

    // Can close at zero
    const successClose = await ctx.makeRequest('PATCH', `/api/v1/savings-accounts/${acct.id}`, {
      headers,
      body: { closed_on: '2026-11-01' },
    });
    expect(successClose.status).toBe(200);
    const successBody = await successClose.json();
    expect(successBody.closed_on).toBe('2026-11-01');
  });
});

// ---------------------------------------------------------------------------
// TC-SAV-010: Account's transaction history
// ---------------------------------------------------------------------------

describe('TC-SAV-010: account transaction history', () => {
  it('returns only that account\'s transactions, newest first', async () => {
    const user = await ctx.createUser({ provision: true });
    const res = await createAccount(ctx, user, { opening_balance_paisa: 0 });
    const acct = await res.json();
    const res2 = await createAccount(ctx, user, { name: 'Other', opening_balance_paisa: 0 });
    const other = await res2.json();

    // Insert into our account
    await insertSavingsTx(ctx.db, user.id, acct.id, 'SAVINGS_DEPOSIT', 100000, '2026-11-01');
    await insertSavingsTx(ctx.db, user.id, acct.id, 'SAVINGS_DEPOSIT', 200000, '2026-11-10');
    // Insert into other account â€” should not appear
    await insertSavingsTx(ctx.db, user.id, other.id, 'SAVINGS_DEPOSIT', 500000, '2026-11-05');

    const headers = await ctx.authHeader(user);
    const txRes = await ctx.makeRequest('GET', `/api/v1/savings-accounts/${acct.id}/transactions`, { headers });
    expect(txRes.status).toBe(200);
    const body = await txRes.json();
    expect(body.transactions.length).toBe(2);
    // Newest first
    expect(body.transactions[0].date).toBe('2026-11-10');
    expect(body.transactions[1].date).toBe('2026-11-01');
    // All belong to this account
    for (const tx of body.transactions) {
      expect(tx.savings_account_id).toBe(acct.id);
    }
  });
});

// ---------------------------------------------------------------------------
// TC-SAV-011: Update name, bank name and DPS fields
// ---------------------------------------------------------------------------

describe('TC-SAV-011: update savings account fields', () => {
  it('saves updated name, bank_name and DPS monthly installment', async () => {
    const user = await ctx.createUser({ provision: true });
    const res = await createAccount(ctx, user, {
      name: 'Old Name', type: 'DPS', parent_account_id: await parentAccountId(ctx, user),
      monthly_installment_paisa: 1000000, maturity_date: '2030-01-01',
    });
    const acct = await res.json();

    const headers = await ctx.authHeader(user);
    const patch = await ctx.makeRequest('PATCH', `/api/v1/savings-accounts/${acct.id}`, {
      headers,
      body: {
        name: 'New Name',
        bank_name: 'City Bank',
        monthly_installment_paisa: 2000000,
      },
    });
    expect(patch.status).toBe(200);
    const body = await patch.json();
    expect(body.name).toBe('New Name');
    expect(body.bank_name).toBe('City Bank');
    expect(body.monthly_installment_paisa).toBe(2000000);
  });
});

// ---------------------------------------------------------------------------
// TC-SAV-012: Sanchaypatra account balance
// ---------------------------------------------------------------------------

describe('TC-SAV-012: Sanchaypatra account balance', () => {
  it('balance = opening_balance + purchase (deposit)', async () => {
    const user = await ctx.createUser({ provision: true });
    const res = await createAccount(ctx, user, {
      name: 'Sanchaypatra', type: 'SANCHAYPATRA',
      opening_balance_paisa: 2000000, // à§³20,000
    });
    const acct = await res.json();

    // One purchase = a SAVINGS_DEPOSIT
    await insertSavingsTx(ctx.db, user.id, acct.id, 'SAVINGS_DEPOSIT', 1000000); // à§³10,000

    const headers = await ctx.authHeader(user);
    const detail = await ctx.makeRequest('GET', `/api/v1/savings-accounts/${acct.id}`, { headers });
    expect(detail.status).toBe(200);
    const body = await detail.json();
    expect(body.balance_paisa).toBe(3000000); // à§³30,000
  });
});
