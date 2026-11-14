/**
 * p2-18 — Browser Push Notifications (backend API layer)
 * Seams:
 *   POST   /api/v1/push/subscribe           — save push subscription
 *   GET    /api/v1/push/subscriptions        — list user's subscriptions
 *   DELETE /api/v1/push/subscriptions/:id   — remove a subscription
 *   GET    /api/v1/push/preferences          — get notification preferences
 *   PATCH  /api/v1/push/preferences          — update preferences
 *
 * Note: actual Web Push dispatch requires VAPID keys (ready-for-human).
 * These tests cover subscription management and preference CRUD only.
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

const MOCK_SUBSCRIPTION = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/mock-endpoint-123',
  keys: {
    auth: 'mock-auth-key-base64',
    p256dh: 'mock-p256dh-key-base64',
  },
  device_label: 'Test Phone',
};

describe('Push Subscriptions', () => {
  it('user can subscribe to push notifications', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    const res = await ctx.makeRequest('POST', '/api/v1/push/subscribe', {
      headers,
      body: MOCK_SUBSCRIPTION,
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.device_label).toBe('Test Phone');
    expect(body.endpoint).toBe(MOCK_SUBSCRIPTION.endpoint);
  });

  it('user can list their push subscriptions', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    await ctx.makeRequest('POST', '/api/v1/push/subscribe', { headers, body: MOCK_SUBSCRIPTION });

    const res = await ctx.makeRequest('GET', '/api/v1/push/subscriptions', { headers });
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBe(1);
    expect(list[0].device_label).toBe('Test Phone');
  });

  it('user can delete a push subscription', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    const subRes = await ctx.makeRequest('POST', '/api/v1/push/subscribe', { headers, body: MOCK_SUBSCRIPTION });
    const sub = await subRes.json();

    const deleteRes = await ctx.makeRequest('DELETE', `/api/v1/push/subscriptions/${sub.id}`, { headers });
    expect(deleteRes.status).toBe(204);

    const listRes = await ctx.makeRequest('GET', '/api/v1/push/subscriptions', { headers });
    const list = await listRes.json();
    expect(list.length).toBe(0);
  });

  it('subscribing with same endpoint updates instead of creating duplicate', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    await ctx.makeRequest('POST', '/api/v1/push/subscribe', { headers, body: MOCK_SUBSCRIPTION });
    // Subscribe again with same endpoint but different label
    await ctx.makeRequest('POST', '/api/v1/push/subscribe', {
      headers,
      body: { ...MOCK_SUBSCRIPTION, device_label: 'Updated Label' },
    });

    const listRes = await ctx.makeRequest('GET', '/api/v1/push/subscriptions', { headers });
    const list = await listRes.json();
    expect(list.length).toBe(1);
    expect(list[0].device_label).toBe('Updated Label');
  });
});

describe('Notification Preferences', () => {
  it('new user has default preferences', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    const res = await ctx.makeRequest('GET', '/api/v1/push/preferences', { headers });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.fixed_expenses_due).toBe('boolean');
    expect(typeof body.overdue_loans).toBe('boolean');
    expect(typeof body.savings_maturity).toBe('boolean');
    expect(typeof body.budget_exceeded).toBe('boolean');
  });

  it('user can update notification preferences', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    const res = await ctx.makeRequest('PATCH', '/api/v1/push/preferences', {
      headers,
      body: {
        fixed_expenses_due: false,
        overdue_loans: true,
        savings_maturity: false,
        budget_exceeded: true,
      },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fixed_expenses_due).toBe(false);
    expect(body.overdue_loans).toBe(true);
    expect(body.budget_exceeded).toBe(true);
  });
});
