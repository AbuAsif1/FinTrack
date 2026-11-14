/**
 * p2-21 — Interface Polish (backend API sub-items)
 * Sub-item B: preferred_period in user profile
 * Sub-item C: has_prior_period_data flag in dashboard tiles
 * Sub-item H: upcoming_events (loan returns + savings maturity) in dashboard
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

describe('Sub-item B: Preferred Period', () => {
  it('user can set and retrieve preferred_period', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    const patchRes = await ctx.makeRequest('PATCH', '/api/v1/me', {
      headers,
      body: { preferred_period: 'last_3_months' },
    });
    expect(patchRes.status).toBe(200);
    const patched = await patchRes.json();
    expect(patched.preferredPeriod).toBe('last_3_months');

    const getRes = await ctx.makeRequest('GET', '/api/v1/me', { headers });
    const meBody = await getRes.json();
    expect(meBody.preferredPeriod).toBe('last_3_months');
  });
});

describe('Sub-item C: Change Indicator Guard', () => {
  it('new user has no prior period data — changes are null', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    const res = await ctx.makeRequest('GET', '/api/v1/dashboard/summary', { headers });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tiles.has_prior_period_data).toBe(false);
    expect(body.tiles.in_hand_income_change_paisa).toBeNull();
    expect(body.tiles.total_spending_change_paisa).toBeNull();
  });
});

describe('Sub-item H: Upcoming Events', () => {
  it('dashboard includes upcoming_events array', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    const res = await ctx.makeRequest('GET', '/api/v1/dashboard/summary', { headers });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.upcoming_events)).toBe(true);
  });

  it('upcoming_events includes savings maturity within 30 days', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    // Create a savings account maturing 7 days from now
    const maturityDate = new Date(Date.now() + 7 * 86400000);
    const maturityStr = maturityDate.toISOString().slice(0, 10);

    const parentRes = await ctx.makeRequest('POST', '/api/v1/savings-accounts', {
      headers,
      body: { name: 'Parent Bank', type: 'SAVINGS', bank_name: 'Test Bank', opening_balance_paisa: 0, opening_date: '2024-01-01' },
    });
    const parent = await parentRes.json();

    await ctx.makeRequest('POST', '/api/v1/savings-accounts', {
      headers,
      body: {
        name: 'DPS Test',
        type: 'DPS',
        parent_account_id: parent.id,
        bank_name: 'Test Bank',
        opening_balance_paisa: 1000000,
        opening_date: '2024-01-01',
        maturity_date: maturityStr,
      },
    });

    const res = await ctx.makeRequest('GET', '/api/v1/dashboard/summary', { headers });
    expect(res.status).toBe(200);
    const body = await res.json();
    const maturityEvents = body.upcoming_events.filter((e: { type: string }) => e.type === 'savings_maturity');
    expect(maturityEvents.length).toBeGreaterThan(0);
    expect(maturityEvents[0].label).toContain('DPS Test');
  });
});
