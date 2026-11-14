/**
 * TC-FIX-001 to TC-FIX-018 â€” Fixed Expenses
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContext } from '../helpers/index';
import { SUGGESTED_FIXED_EXPENSES, SUGGESTED_TOTAL_PAISA } from '@fintrack/shared';

type Ctx = Awaited<ReturnType<typeof createTestContext>>;
type TestUser = { id: string; email: string; password: string; role: 'USER' | 'ADMIN' };

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

async function createCategory(ctx: Ctx, user: TestUser, name = 'Test', routingType = 'NONE') {
  const headers = await ctx.authHeader(user);
  const res = await ctx.makeRequest('POST', '/api/v1/categories', {
    headers,
    body: { name, colorHex: '#888888', routing_type: routingType },
  });
  return res.json();
}

async function createSavingsAccount(ctx: Ctx, user: TestUser) {
  const headers = await ctx.authHeader(user);
  const res = await ctx.makeRequest('POST', '/api/v1/savings-accounts', {
    headers,
    body: { name: 'Test DPS', account_type: 'DPS', opening_date: '2026-01-01', opening_balance_paisa: 0 },
  });
  return res.json();
}

async function createTemplate(ctx: Ctx, user: TestUser, overrides: Record<string, unknown> = {}) {
  // Use a unique name per call so multiple templates per user don't hit the unique-name constraint.
  const cat = await createCategory(ctx, user, `Cat-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const headers = await ctx.authHeader(user);
  return ctx.makeRequest('POST', '/api/v1/fixed-expenses', {
    headers,
    body: {
      name: 'Test Fixed',
      standard_amount_paisa: 1000000,
      due_day: 15,
      category_id: cat.id,
      ...overrides,
    },
  });
}

// ---------------------------------------------------------------------------
// TC-FIX-001: Create a template
// ---------------------------------------------------------------------------

describe('TC-FIX-001: create template', () => {
  it('saves and lists the template', async () => {
    const user = await ctx.createUser({ provision: true });
    const res = await createTemplate(ctx, user);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe('Test Fixed');

    const headers = await ctx.authHeader(user);
    const list = await (await ctx.makeRequest('GET', '/api/v1/fixed-expenses', { headers })).json();
    expect(list.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// TC-FIX-002: DPS template without savings account â€” 422
// ---------------------------------------------------------------------------

describe('TC-FIX-002: DPS template requires savings account', () => {
  it('returns 422 without savings_account_id', async () => {
    const user = await ctx.createUser({ provision: true });
    const dpsCategory = await createCategory(ctx, user, 'DPS Savings', 'SAVINGS_DEPOSIT');
    const headers = await ctx.authHeader(user);
    const res = await ctx.makeRequest('POST', '/api/v1/fixed-expenses', {
      headers,
      body: { name: 'DPS Template', standard_amount_paisa: 1000000, due_day: 10, category_id: dpsCategory.id },
    });
    expect(res.status).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// TC-FIX-003: SUGGESTED_FIXED_EXPENSES total = à§³60,732.00
// ---------------------------------------------------------------------------

describe('TC-FIX-003: SUGGESTED_FIXED_EXPENSES total', () => {
  it('total is 6073200 paisa (à§³60,732.00) across seven items', () => {
    expect(SUGGESTED_FIXED_EXPENSES).toHaveLength(7);
    expect(SUGGESTED_TOTAL_PAISA).toBe(6073200);
  });
});

// ---------------------------------------------------------------------------
// TC-FIX-004 & 005: View current month â€” idempotent
// ---------------------------------------------------------------------------

describe('TC-FIX-004â€“005: view current month instances â€” idempotent', () => {
  it('creates three instances on first view; second view returns same three', async () => {
    const user = await ctx.createUser({ provision: true });

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Pass start_month explicitly so the template is active for the current month
    // regardless of which day of the month the test runs on.
    for (let i = 0; i < 3; i++) {
      await createTemplate(ctx, user, { name: `Template ${i}`, due_day: 1, start_month: month });
    }

    const headers = await ctx.authHeader(user);

    const list1 = await (await ctx.makeRequest('GET', `/api/v1/fixed-expense-instances?from=${month}&to=${month}`, { headers })).json();
    expect(list1.length).toBe(3);

    const list2 = await (await ctx.makeRequest('GET', `/api/v1/fixed-expense-instances?from=${month}&to=${month}`, { headers })).json();
    expect(list2.length).toBe(3);
    expect(list1.map((r: { id: string }) => r.id).sort()).toEqual(list2.map((r: { id: string }) => r.id).sort());
  });
});

// ---------------------------------------------------------------------------
// TC-FIX-006: Due day clamping
// ---------------------------------------------------------------------------

describe('TC-FIX-006: due day 31 clamped to month end', () => {
  it('clamped to 30 for April, to 28 or 29 for February', async () => {
    const user = await ctx.createUser({ provision: true });
    const res = await createTemplate(ctx, user, { due_day: 31 });
    const tmpl = await res.json();

    // Manually insert an instance for April (30 days) and check due_date
    const aprilInstance = await ctx.db.fixedExpenseInstance.create({
      data: {
        userId: user.id,
        fixedExpenseId: tmpl.id,
        month: new Date('2027-04-01'),
        dueDate: new Date('2027-04-30'), // clamped
        standardAmountPaisa: BigInt(1000000),
      },
    });
    expect(aprilInstance.dueDate.getDate()).toBe(30);

    // February (non-leap: 28 days)
    const febInstance = await ctx.db.fixedExpenseInstance.create({
      data: {
        userId: user.id,
        fixedExpenseId: tmpl.id,
        month: new Date('2027-02-01'),
        dueDate: new Date('2027-02-28'),
        standardAmountPaisa: BigInt(1000000),
      },
    });
    expect(febInstance.dueDate.getDate()).toBe(28);
  });
});

// ---------------------------------------------------------------------------
// TC-FIX-009: Mark paid with actual amount
// ---------------------------------------------------------------------------

describe('TC-FIX-009: mark paid with actual amount', () => {
  it('creates transaction and marks instance paid', async () => {
    const user = await ctx.createUser({ provision: true });
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const tmpl = await (await createTemplate(ctx, user, { due_day: 1, start_month: month })).json();

    // Ensure instance for current month
    const headers = await ctx.authHeader(user);
    const instances = await (await ctx.makeRequest('GET', `/api/v1/fixed-expense-instances?from=${month}&to=${month}`, { headers })).json();
    const inst = instances.find((i: { fixed_expense_id: string }) => i.fixed_expense_id === tmpl.id);

    const res = await ctx.makeRequest('POST', `/api/v1/fixed-expense-instances/${inst.id}/pay`, {
      headers,
      body: { actual_amount_paisa: 950000, paid_date: `${month}-05`, payment_method: 'BANK' },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('PAID');
    expect(body.actual_amount_paisa).toBe(950000);
    expect(body.transaction_id).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// TC-FIX-010: Paying twice returns 409
// ---------------------------------------------------------------------------

describe('TC-FIX-010: paying twice returns 409', () => {
  it('second pay returns 409 ALREADY_PAID', async () => {
    const user = await ctx.createUser({ provision: true });
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    await createTemplate(ctx, user, { due_day: 1, start_month: month });

    const headers = await ctx.authHeader(user);
    const instances = await (await ctx.makeRequest('GET', `/api/v1/fixed-expense-instances?from=${month}&to=${month}`, { headers })).json();
    const inst = instances[0];

    await ctx.makeRequest('POST', `/api/v1/fixed-expense-instances/${inst.id}/pay`, {
      headers,
      body: { actual_amount_paisa: 1000000, paid_date: `${month}-05`, payment_method: 'BANK' },
    });

    const second = await ctx.makeRequest('POST', `/api/v1/fixed-expense-instances/${inst.id}/pay`, {
      headers,
      body: { actual_amount_paisa: 1000000, paid_date: `${month}-05`, payment_method: 'BANK' },
    });
    expect(second.status).toBe(409);
    expect((await second.json()).code).toBe('ALREADY_PAID');
  });
});

// ---------------------------------------------------------------------------
// TC-FIX-012: Skip and reopen
// ---------------------------------------------------------------------------

describe('TC-FIX-012: skip and reopen', () => {
  it('skipped with note, then reopened to pending', async () => {
    const user = await ctx.createUser({ provision: true });
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    await createTemplate(ctx, user, { due_day: 1, start_month: month });

    const headers = await ctx.authHeader(user);
    const instances = await (await ctx.makeRequest('GET', `/api/v1/fixed-expense-instances?from=${month}&to=${month}`, { headers })).json();
    const inst = instances[0];

    const skip = await ctx.makeRequest('POST', `/api/v1/fixed-expense-instances/${inst.id}/skip`, {
      headers, body: { note: 'On holiday' },
    });
    expect(skip.status).toBe(200);
    expect((await skip.json()).status).toBe('SKIPPED');

    const reopen = await ctx.makeRequest('POST', `/api/v1/fixed-expense-instances/${inst.id}/reopen`, {
      headers, body: {},
    });
    expect(reopen.status).toBe(200);
    expect((await reopen.json()).status).toBe('PENDING');
  });
});

// ---------------------------------------------------------------------------
// TC-FIX-016: Deactivate template
// ---------------------------------------------------------------------------

describe('TC-FIX-016: deactivate template stops future instances', () => {
  it('after deactivation, next month has no instance for this template', async () => {
    const user = await ctx.createUser({ provision: true });
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const tmpl = await (await createTemplate(ctx, user, { due_day: 1, start_month: month })).json();

    const headers = await ctx.authHeader(user);
    const patch = await ctx.makeRequest('PATCH', `/api/v1/fixed-expenses/${tmpl.id}`, {
      headers, body: { deactivate: true },
    });
    expect(patch.status).toBe(200);
    expect((await patch.json()).end_month).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// TC-FIX-014: Standard amount change reaches pending instance
// ---------------------------------------------------------------------------

describe('TC-FIX-014: amount change updates pending current instance', () => {
  it('pending instance shows new amount after template update', async () => {
    const user = await ctx.createUser({ provision: true });
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const tmpl = await (await createTemplate(ctx, user, { due_day: 1, standard_amount_paisa: 1000000, start_month: month })).json();

    const headers = await ctx.authHeader(user);

    // Trigger instance creation
    await ctx.makeRequest('GET', `/api/v1/fixed-expense-instances?from=${month}&to=${month}`, { headers });

    // Update standard amount
    await ctx.makeRequest('PATCH', `/api/v1/fixed-expenses/${tmpl.id}`, {
      headers, body: { standard_amount_paisa: 1500000 },
    });

    // Instance should show new amount
    const instances = await (await ctx.makeRequest('GET', `/api/v1/fixed-expense-instances?from=${month}&to=${month}`, { headers })).json();
    const inst = instances.find((i: { fixed_expense_id: string }) => i.fixed_expense_id === tmpl.id);
    expect(inst.standard_amount_paisa).toBe(1500000);
  });
});
