/**
 * TC-BUD-001 to TC-BUD-010 â€” Budgets & Notifications
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

async function createSpendingCategory(ctx: Ctx, user: TestUser, name = 'BudgetCat') {
  const headers = await ctx.authHeader(user);
  const res = await ctx.makeRequest('POST', '/api/v1/categories', {
    headers,
    body: { name, colorHex: '#888888', routing_type: 'NONE' },
  });
  return res.json();
}

async function setBudget(ctx: Ctx, user: TestUser, categoryId: string, limitPaisa: number) {
  const headers = await ctx.authHeader(user);
  return ctx.makeRequest('PUT', `/api/v1/budgets/${categoryId}`, {
    headers,
    body: { monthly_limit_paisa: limitPaisa },
  });
}

async function getbudgets(ctx: Ctx, user: TestUser) {
  const headers = await ctx.authHeader(user);
  return ctx.makeRequest('GET', '/api/v1/budgets', { headers });
}

// ---------------------------------------------------------------------------
// TC-BUD-001: Set a budget limit
// ---------------------------------------------------------------------------

describe('TC-BUD-001: set budget limit', () => {
  it('upserts and returns the limit', async () => {
    const user = await ctx.createUser({ provision: true });
    const cat = await createSpendingCategory(ctx, user);
    const res = await setBudget(ctx, user, cat.id, 350000);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.monthly_limit_paisa).toBe(350000);
  });
});

// ---------------------------------------------------------------------------
// TC-BUD-002: Routing-type categories can't have budgets
// ---------------------------------------------------------------------------

describe('TC-BUD-002: non-spending category budget rejected', () => {
  it('returns 422 for SAVINGS_DEPOSIT category', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);
    const catRes = await ctx.makeRequest('POST', '/api/v1/categories', {
      headers,
      body: { name: 'DPS Cat', colorHex: '#888888', routing_type: 'SAVINGS_DEPOSIT' },
    });
    const cat = await catRes.json();
    const res = await setBudget(ctx, user, cat.id, 350000);
    expect(res.status).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// TC-BUD-003: Budget GET includes spending and state
// ---------------------------------------------------------------------------

describe('TC-BUD-003: budget GET includes spent and state', () => {
  it('spent is summed from transactions; state = ok/warn/over', async () => {
    const user = await ctx.createUser({ provision: true });
    const cat = await createSpendingCategory(ctx, user);
    await setBudget(ctx, user, cat.id, 350000);

    // Add spending at 50%
    const headers = await ctx.authHeader(user);
    await ctx.makeRequest('POST', '/api/v1/transactions', {
      headers,
      body: {
        amount_paisa: 175000,
        date: new Date().toISOString().slice(0, 10),
        description: 'Groceries',
        category_id: cat.id,
        payment_method: 'CASH',
        idempotency_key: `ikey-budget-003-${Date.now()}`,
      },
    });

    const list = await (await getbudgets(ctx, user)).json();
    const catBudget = list.find((b: { category_id: string }) => b.category_id === cat.id);
    expect(catBudget.spent_paisa).toBe(175000);
    expect(catBudget.pct).toBe(50);
    expect(catBudget.state).toBe('ok');
  });
});

// ---------------------------------------------------------------------------
// TC-BUD-004: Different limit history â€” this month vs last month
// ---------------------------------------------------------------------------

describe('TC-BUD-004: changing limit this month leaves last month unchanged', () => {
  it('budget query for last month uses previous limit', async () => {
    const user = await ctx.createUser({ provision: true });
    const cat = await createSpendingCategory(ctx, user);

    // Insert budget effective from last month
    const lastMonth = (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    })();

    await ctx.db.budget.create({
      data: {
        userId: user.id,
        categoryId: cat.id,
        effectiveFromMonth: new Date(`${lastMonth}-01`),
        monthlyLimitPaisa: BigInt(200000),
      },
    });

    // Update this month to a different limit
    await setBudget(ctx, user, cat.id, 500000);

    // Last month budget query
    const headers = await ctx.authHeader(user);
    const lastMonthList = await (await ctx.makeRequest('GET', `/api/v1/budgets?month=${lastMonth}`, { headers })).json();
    const catBudgetLastMonth = lastMonthList.find((b: { category_id: string }) => b.category_id === cat.id);
    expect(catBudgetLastMonth.monthly_limit_paisa).toBe(200000);
  });
});

// ---------------------------------------------------------------------------
// TC-BUD-005: Delete budget (null limit)
// ---------------------------------------------------------------------------

describe('TC-BUD-005: delete budget', () => {
  it('budget no longer appears in GET after deletion', async () => {
    const user = await ctx.createUser({ provision: true });
    const cat = await createSpendingCategory(ctx, user);
    await setBudget(ctx, user, cat.id, 350000);

    const headers = await ctx.authHeader(user);
    const del = await ctx.makeRequest('DELETE', `/api/v1/budgets/${cat.id}`, { headers });
    expect(del.status).toBe(204);

    const list = await (await getbudgets(ctx, user)).json();
    const catBudget = list.find((b: { category_id: string }) => b.category_id === cat.id);
    expect(catBudget).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// TC-BUD-006: Notifications â€” budget alerts fire at 80% and 100%
// ---------------------------------------------------------------------------

describe('TC-BUD-006: budget alerts', () => {
  it('BUDGET_80 at 80%; BUDGET_EXCEEDED at 100%', async () => {
    const user = await ctx.createUser({ provision: true });
    const cat = await createSpendingCategory(ctx, user);
    await setBudget(ctx, user, cat.id, 100000);

    const headers = await ctx.authHeader(user);
    const today = new Date().toISOString().slice(0, 10);

    // Spend 80%
    await ctx.makeRequest('POST', '/api/v1/transactions', {
      headers,
      body: { amount_paisa: 80000, date: today, description: 'Spent', category_id: cat.id, payment_method: 'CASH', idempotency_key: `ikey-bud-006a-${Date.now()}` },
    });

    const notifs80 = await (await ctx.makeRequest('GET', '/api/v1/notifications', { headers })).json();
    const has80 = notifs80.some((n: { type: string }) => n.type === 'BUDGET_80');
    expect(has80).toBe(true);

    // Spend over 100%
    await ctx.makeRequest('POST', '/api/v1/transactions', {
      headers,
      body: { amount_paisa: 30000, date: today, description: 'More', category_id: cat.id, payment_method: 'CASH', idempotency_key: `ikey-bud-006b-${Date.now()}` },
    });

    const notifsOver = await (await ctx.makeRequest('GET', '/api/v1/notifications', { headers })).json();
    const hasOver = notifsOver.some((n: { type: string }) => n.type === 'BUDGET_EXCEEDED');
    expect(hasOver).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TC-BUD-007: Mark notification as read
// ---------------------------------------------------------------------------

describe('TC-BUD-007: mark notification read', () => {
  it('is_read becomes true after mark-read', async () => {
    const user = await ctx.createUser({ provision: true });
    const cat = await createSpendingCategory(ctx, user);
    await setBudget(ctx, user, cat.id, 100000);

    const headers = await ctx.authHeader(user);
    const today = new Date().toISOString().slice(0, 10);
    await ctx.makeRequest('POST', '/api/v1/transactions', {
      headers,
      body: { amount_paisa: 85000, date: today, description: 'Spent', category_id: cat.id, payment_method: 'CASH', idempotency_key: `ikey-bud-007-${Date.now()}` },
    });

    const notifs = await (await ctx.makeRequest('GET', '/api/v1/notifications', { headers })).json();
    const notif = notifs[0];
    expect(notif.is_read).toBe(false);

    await ctx.makeRequest('POST', `/api/v1/notifications/${notif.id}/read`, { headers, body: {} });

    const updated = await (await ctx.makeRequest('GET', '/api/v1/notifications', { headers })).json();
    const after = updated.find((n: { id: string }) => n.id === notif.id);
    expect(after.is_read).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TC-BUD-008: Read all notifications
// ---------------------------------------------------------------------------

describe('TC-BUD-008: read all notifications', () => {
  it('all notifications marked read', async () => {
    const user = await ctx.createUser({ provision: true });
    const cat = await createSpendingCategory(ctx, user);
    await setBudget(ctx, user, cat.id, 100000);

    const headers = await ctx.authHeader(user);
    const today = new Date().toISOString().slice(0, 10);
    await ctx.makeRequest('POST', '/api/v1/transactions', {
      headers,
      body: { amount_paisa: 90000, date: today, description: 'Spent', category_id: cat.id, payment_method: 'CASH', idempotency_key: `ikey-bud-008-${Date.now()}` },
    });

    const before = await (await ctx.makeRequest('GET', '/api/v1/notifications', { headers })).json();
    expect(before.some((n: { is_read: boolean }) => !n.is_read)).toBe(true);

    await ctx.makeRequest('POST', '/api/v1/notifications/read-all', { headers, body: {} });

    const after = await (await ctx.makeRequest('GET', '/api/v1/notifications', { headers })).json();
    expect(after.every((n: { is_read: boolean }) => n.is_read)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TC-BUD-009: Duplicate refresh creates no extra notifications
// ---------------------------------------------------------------------------

describe('TC-BUD-009: idempotent refresh', () => {
  it('refreshing twice creates no duplicate notifications', async () => {
    const user = await ctx.createUser({ provision: true });
    const cat = await createSpendingCategory(ctx, user);
    await setBudget(ctx, user, cat.id, 100000);

    const headers = await ctx.authHeader(user);
    const today = new Date().toISOString().slice(0, 10);
    await ctx.makeRequest('POST', '/api/v1/transactions', {
      headers,
      body: { amount_paisa: 90000, date: today, description: 'Spent', category_id: cat.id, payment_method: 'CASH', idempotency_key: `ikey-bud-009-${Date.now()}` },
    });

    await ctx.makeRequest('GET', '/api/v1/notifications', { headers });
    const count1 = await ctx.db.notification.count({ where: { userId: user.id } });

    await ctx.makeRequest('GET', '/api/v1/notifications', { headers });
    const count2 = await ctx.db.notification.count({ where: { userId: user.id } });

    expect(count1).toBe(count2);
  });
});
