/**
 * p2-06 — Savings Goals
 * Seams:
 *   GET  /api/v1/savings-goals       — list user's goals with derived progress
 *   POST /api/v1/savings-goals       — create a goal
 *   PATCH /api/v1/savings-goals/:id  — update goal (name, target, date, account)
 *   DELETE /api/v1/savings-goals/:id — delete a goal
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContext } from '../helpers/index';

type Ctx = Awaited<ReturnType<typeof createTestContext>>;

let ctx: Ctx;

beforeEach(async () => {
  ctx = await createTestContext();
});

afterEach(async () => {
  await ctx?.cleanup();
});

async function createSavingsAccount(ctx: Ctx, user: { id: string; email: string; password: string; role: 'USER' | 'ADMIN' }) {
  const headers = await ctx.authHeader(user);
  const res = await ctx.makeRequest('POST', '/api/v1/savings-accounts', {
    headers,
    body: {
      name: 'Emergency Fund',
      type: 'SAVINGS',
      bank_name: 'BRAC Bank',
      opening_balance_paisa: 150000,
      opening_date: '2026-01-01',
    },
  });
  return { res, id: res.status === 201 ? (await res.json()).id as string : null };
}

describe('Savings Goals API', () => {
  it('creates a savings goal', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);
    const { id: accountId } = await createSavingsAccount(ctx, user);

    const res = await ctx.makeRequest('POST', '/api/v1/savings-goals', {
      headers,
      body: {
        name: 'Emergency Fund',
        target_amount_paisa: 50000000,
        target_date: '2027-06-30',
        linked_account_id: accountId,
      },
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe('Emergency Fund');
    expect(body.target_amount_paisa).toBe(50000000);
    expect(body.id).toBeDefined();
  });

  it('lists goals with derived progress', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);
    const { id: accountId } = await createSavingsAccount(ctx, user);

    await ctx.makeRequest('POST', '/api/v1/savings-goals', {
      headers,
      body: {
        name: 'Car Down Payment',
        target_amount_paisa: 50000000,
        target_date: '2027-06-30',
        linked_account_id: accountId,
      },
    });

    const listRes = await ctx.makeRequest('GET', '/api/v1/savings-goals', { headers });
    expect(listRes.status).toBe(200);
    const list = await listRes.json();
    expect(list.length).toBeGreaterThanOrEqual(1);
    const goal = list.find((g: { name: string }) => g.name === 'Car Down Payment');
    expect(goal).toBeDefined();
    expect(goal.current_balance_paisa).toBeDefined();
    expect(goal.progress_pct).toBeDefined();
    expect(goal.progress_status).toMatch(/ON_TRACK|BEHIND|ACHIEVED|MISSED/);
  });

  it('updates a savings goal', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    const createRes = await ctx.makeRequest('POST', '/api/v1/savings-goals', {
      headers,
      body: {
        name: 'Old Name',
        target_amount_paisa: 10000000,
        target_date: '2027-01-01',
        linked_account_id: null,
      },
    });
    expect(createRes.status).toBe(201);
    const { id } = await createRes.json();

    const patchRes = await ctx.makeRequest('PATCH', `/api/v1/savings-goals/${id}`, {
      headers,
      body: { name: 'New Name', target_amount_paisa: 20000000 },
    });
    expect(patchRes.status).toBe(200);
    const body = await patchRes.json();
    expect(body.name).toBe('New Name');
    expect(body.target_amount_paisa).toBe(20000000);
  });

  it('deletes a savings goal', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    const createRes = await ctx.makeRequest('POST', '/api/v1/savings-goals', {
      headers,
      body: {
        name: 'Temp Goal',
        target_amount_paisa: 5000000,
        target_date: '2026-12-31',
        linked_account_id: null,
      },
    });
    const { id } = await createRes.json();

    const delRes = await ctx.makeRequest('DELETE', `/api/v1/savings-goals/${id}`, { headers });
    expect(delRes.status).toBe(204);

    const listRes = await ctx.makeRequest('GET', '/api/v1/savings-goals', { headers });
    const list = await listRes.json();
    expect(list.find((g: { id: string }) => g.id === id)).toBeUndefined();
  });

  it('progress_status is ACHIEVED when balance >= target', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    // Create account with opening balance = target amount
    const acctRes = await ctx.makeRequest('POST', '/api/v1/savings-accounts', {
      headers,
      body: {
        name: 'Fully Funded',
        type: 'SAVINGS',
        bank_name: 'City Bank',
        opening_balance_paisa: 100000,
        opening_date: '2026-01-01',
      },
    });
    const { id: acctId } = await acctRes.json();

    await ctx.makeRequest('POST', '/api/v1/savings-goals', {
      headers,
      body: {
        name: 'Small Goal',
        target_amount_paisa: 100000,
        target_date: '2027-01-01',
        linked_account_id: acctId,
      },
    });

    const listRes = await ctx.makeRequest('GET', '/api/v1/savings-goals', { headers });
    const list = await listRes.json();
    const goal = list.find((g: { name: string }) => g.name === 'Small Goal');
    expect(goal?.progress_status).toBe('ACHIEVED');
  });
});
