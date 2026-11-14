/**
 * p2-04 — Monthly Spending Limit
 * Seams:
 *   GET  /api/v1/budgets/monthly-limit  — returns current limit (null if unset)
 *   PUT  /api/v1/budgets/monthly-limit  — set or clear the limit
 *   GET  /api/v1/dashboard/summary      — includes monthly_limit_paisa
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

describe('Monthly Spending Limit API', () => {
  it('returns null when no limit is set', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    const res = await ctx.makeRequest('GET', '/api/v1/budgets/monthly-limit', { headers });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.monthly_limit_paisa).toBeNull();
  });

  it('sets the monthly limit', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    const res = await ctx.makeRequest('PUT', '/api/v1/budgets/monthly-limit', {
      headers,
      body: { monthly_limit_paisa: 2500000 },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.monthly_limit_paisa).toBe(2500000);
  });

  it('updates the limit to a new value', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    await ctx.makeRequest('PUT', '/api/v1/budgets/monthly-limit', {
      headers,
      body: { monthly_limit_paisa: 2500000 },
    });

    const res = await ctx.makeRequest('PUT', '/api/v1/budgets/monthly-limit', {
      headers,
      body: { monthly_limit_paisa: 4000000 },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.monthly_limit_paisa).toBe(4000000);

    const getRes = await ctx.makeRequest('GET', '/api/v1/budgets/monthly-limit', { headers });
    const getBody = await getRes.json();
    expect(getBody.monthly_limit_paisa).toBe(4000000);
  });

  it('clears the limit by passing null', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    await ctx.makeRequest('PUT', '/api/v1/budgets/monthly-limit', {
      headers,
      body: { monthly_limit_paisa: 2500000 },
    });

    const res = await ctx.makeRequest('PUT', '/api/v1/budgets/monthly-limit', {
      headers,
      body: { monthly_limit_paisa: null },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.monthly_limit_paisa).toBeNull();
  });

  it('dashboard summary includes monthly_limit_paisa', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    await ctx.makeRequest('PUT', '/api/v1/budgets/monthly-limit', {
      headers,
      body: { monthly_limit_paisa: 3000000 },
    });

    const res = await ctx.makeRequest('GET', '/api/v1/dashboard/summary', { headers });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.monthly_limit_paisa).toBe(3000000);
  });
});
