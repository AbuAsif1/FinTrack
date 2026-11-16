/**
 * p2-11 — Recurring Income + Transaction Templates
 * Seams:
 *   GET  /api/v1/income-entries/salary-proposal          — proposal card data
 *   POST /api/v1/income-entries/salary-proposal/confirm  — one-tap confirm
 *   GET  /api/v1/transaction-templates                   — list templates
 *   POST /api/v1/transaction-templates                   — create template
 *   PATCH /api/v1/transaction-templates/:id              — update template
 *   DELETE /api/v1/transaction-templates/:id             — delete template
 *   POST /api/v1/transaction-templates/:id/use           — record usage
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

async function getCategory(ctx: Ctx, user: { token: string }) {
  const headers = await ctx.authHeader(user);
  const catRes = await ctx.makeRequest('POST', '/api/v1/categories', {
    headers,
    body: { name: `Cat-${Math.random().toString(36).slice(2)}`, routing_type: 'NONE', color_hex: '#aabbcc' },
  });
  const cat = await catRes.json();
  return cat.id as string;
}

describe('Salary Proposal', () => {
  it('returns no proposal when user has no prior salary', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    const res = await ctx.makeRequest('GET', '/api/v1/income-entries/salary-proposal', { headers });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.has_proposal).toBe(false);
  });

  it('returns proposal when prior salary exists and current month has none', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    // Add salary for a past month (not current)
    await ctx.makeRequest('POST', '/api/v1/income-entries', {
      headers,
      body: {
        month: '2025-10',
        income_type: 'SALARY',
        gross_paisa: 8500000,
        tds_paisa: 0,
        is_taxable: true,
        employer_name: 'Acme Corp',
        idempotency_key: `ikey-sal-past-${Math.random().toString(36).slice(2)}`,
      },
    });

    const res = await ctx.makeRequest('GET', '/api/v1/income-entries/salary-proposal', { headers });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.has_proposal).toBe(true);
    expect(body.last_salary).toBeDefined();
    expect(body.last_salary.gross_paisa).toBe(8500000);
    expect(body.last_salary.employer_name).toBe('Acme Corp');
  });

  it('returns no proposal when current month already has salary', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    // Add salary for the current month (November 2026 in test env)
    // We use a date that is in the "current" month as far as the endpoint is concerned
    // The endpoint uses today's date in BD timezone — we'll use a recent date
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    await ctx.makeRequest('POST', '/api/v1/income-entries', {
      headers,
      body: {
        month: currentMonth,
        income_type: 'SALARY',
        gross_paisa: 9000000,
        tds_paisa: 0,
        is_taxable: true,
        employer_name: 'Acme Corp',
        idempotency_key: `ikey-sal-cur-${Math.random().toString(36).slice(2)}`,
      },
    });

    const res = await ctx.makeRequest('GET', '/api/v1/income-entries/salary-proposal', { headers });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.has_proposal).toBe(false);
    expect(body.this_month_has_salary).toBe(true);
  });

  it('confirm salary proposal creates income entry for current month', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    // Create prior salary
    await ctx.makeRequest('POST', '/api/v1/income-entries', {
      headers,
      body: {
        month: '2025-10',
        income_type: 'SALARY',
        gross_paisa: 8500000,
        tds_paisa: 100000,
        is_taxable: true,
        employer_name: 'Acme Corp',
        idempotency_key: `ikey-sal-prev-${Math.random().toString(36).slice(2)}`,
      },
    });

    const confirmRes = await ctx.makeRequest('POST', '/api/v1/income-entries/salary-proposal/confirm', {
      headers,
      body: {},
    });
    expect(confirmRes.status).toBe(201);
    const confirmBody = await confirmRes.json();
    expect(confirmBody.income_type).toBe('SALARY');
    expect(confirmBody.gross_paisa).toBe(8500000);
    expect(confirmBody.tds_paisa).toBe(100000);
    expect(confirmBody.employer_name).toBe('Acme Corp');
  });
});

describe('Transaction Templates', () => {
  it('creates a template and lists it', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);
    const categoryId = await getCategory(ctx, user);

    const createRes = await ctx.makeRequest('POST', '/api/v1/transaction-templates', {
      headers,
      body: {
        name: 'Meena Bazar weekly',
        description: 'Weekly grocery run',
        amount_paisa: 250000,
        category_id: categoryId,
        payment_method: 'CASH',
      },
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.name).toBe('Meena Bazar weekly');
    expect(created.amount_paisa).toBe(250000);

    const listRes = await ctx.makeRequest('GET', '/api/v1/transaction-templates', { headers });
    expect(listRes.status).toBe(200);
    const list = await listRes.json();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBe(1);
    expect(list[0].name).toBe('Meena Bazar weekly');
  });

  it('updates a template', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);
    const categoryId = await getCategory(ctx, user);

    const createRes = await ctx.makeRequest('POST', '/api/v1/transaction-templates', {
      headers,
      body: {
        name: 'Old name',
        description: 'Old desc',
        amount_paisa: 100000,
        category_id: categoryId,
        payment_method: 'CASH',
      },
    });
    const { id } = await createRes.json();

    const patchRes = await ctx.makeRequest('PATCH', `/api/v1/transaction-templates/${id}`, {
      headers,
      body: { name: 'New name', amount_paisa: 200000 },
    });
    expect(patchRes.status).toBe(200);
    const patched = await patchRes.json();
    expect(patched.name).toBe('New name');
    expect(patched.amount_paisa).toBe(200000);
  });

  it('deletes a template', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);
    const categoryId = await getCategory(ctx, user);

    const createRes = await ctx.makeRequest('POST', '/api/v1/transaction-templates', {
      headers,
      body: {
        name: 'To delete',
        description: null,
        amount_paisa: 50000,
        category_id: categoryId,
        payment_method: 'BKASH',
      },
    });
    const { id } = await createRes.json();

    const deleteRes = await ctx.makeRequest('DELETE', `/api/v1/transaction-templates/${id}`, { headers });
    expect(deleteRes.status).toBe(204);

    const listRes = await ctx.makeRequest('GET', '/api/v1/transaction-templates', { headers });
    const list = await listRes.json();
    expect(list.length).toBe(0);
  });

  it('records usage and orders by most recently used', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);
    const categoryId = await getCategory(ctx, user);

    const [r1, r2] = await Promise.all([
      ctx.makeRequest('POST', '/api/v1/transaction-templates', {
        headers,
        body: { name: 'Template A', description: null, amount_paisa: 10000, category_id: categoryId, payment_method: 'CASH' },
      }),
      ctx.makeRequest('POST', '/api/v1/transaction-templates', {
        headers,
        body: { name: 'Template B', description: null, amount_paisa: 20000, category_id: categoryId, payment_method: 'CASH' },
      }),
    ]);
    const a = await r1.json();
    const b = await r2.json();

    // Use template B — it should sort first after use
    const useRes = await ctx.makeRequest('POST', `/api/v1/transaction-templates/${b.id}/use`, { headers, body: {} });
    expect(useRes.status).toBe(200);

    const listRes = await ctx.makeRequest('GET', '/api/v1/transaction-templates', { headers });
    const list = await listRes.json();
    expect(list[0].id).toBe(b.id);
    expect(list[1].id).toBe(a.id);
  });
});
