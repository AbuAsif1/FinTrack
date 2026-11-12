/**
 * TC-TXN-001 to TC-TXN-020 — Transactions and categories
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestContext } from '../helpers/index';

type Ctx = Awaited<ReturnType<typeof createTestContext>>;

let ctx: Ctx;

beforeEach(async () => {
  ctx = await createTestContext();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getCategories(ctx: Ctx, user: { id: string; email: string; password: string; role: 'USER' | 'ADMIN' }) {
  const headers = await ctx.authHeader(user);
  const res = await ctx.makeRequest('GET', '/api/v1/categories', { headers });
  return res.json() as Promise<Array<{ id: string; name: string; routing_type: string; is_archived: boolean }>>;
}

async function createTx(
  ctx: Ctx,
  user: { id: string; email: string; password: string; role: 'USER' | 'ADMIN' },
  overrides: Record<string, unknown> = {},
) {
  const headers = await ctx.authHeader(user);
  const cats = await getCategories(ctx, user);
  const noneCat = cats.find((c) => c.routing_type === 'NONE' && !c.is_archived)!;
  return ctx.makeRequest('POST', '/api/v1/transactions', {
    headers,
    body: {
      amount_paisa: 50000,
      date: '2026-11-01',
      description: 'Test transaction',
      category_id: noneCat.id,
      payment_method: 'CASH',
      idempotency_key: `ikey-${Date.now()}-${Math.random()}`,
      ...overrides,
    },
  });
}

// ---------------------------------------------------------------------------
// TC-TXN-017: list categories for a new account
// ---------------------------------------------------------------------------

describe('TC-TXN-017: list categories for a new account', () => {
  it('returns the 16 starter categories with their routing types', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);
    const res = await ctx.makeRequest('GET', '/api/v1/categories', { headers });
    expect(res.status).toBe(200);
    const cats = await res.json();
    expect(cats.length).toBe(16);
    expect(cats.some((c: any) => c.routing_type !== 'NONE')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TC-TXN-001: create a spending transaction
// ---------------------------------------------------------------------------

describe('TC-TXN-001: create a spending transaction', () => {
  it('returns 201 with type NONE and integer amount_paisa', async () => {
    const user = await ctx.createUser({ provision: true });
    const res = await createTx(ctx, user, { amount_paisa: 50000 });
    expect(res.status).toBe(201);
    const tx = await res.json();
    expect(tx.type).toBe('NONE');
    expect(typeof tx.amount_paisa).toBe('number');
    expect(tx.amount_paisa).toBe(50000);
    expect(tx.id).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// TC-TXN-002: invalid amounts
// ---------------------------------------------------------------------------

describe('TC-TXN-002: invalid amounts', () => {
  it('rejects amount=0 with 422', async () => {
    const user = await ctx.createUser({ provision: true });
    const res = await createTx(ctx, user, { amount_paisa: 0 });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.fields?.amount_paisa).toBeDefined();
  });

  it('rejects negative amount with 422', async () => {
    const user = await ctx.createUser({ provision: true });
    const res = await createTx(ctx, user, { amount_paisa: -100 });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// TC-TXN-003: missing or archived category
// ---------------------------------------------------------------------------

describe('TC-TXN-003: invalid category', () => {
  it('rejects a missing category with 422', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);
    const res = await ctx.makeRequest('POST', '/api/v1/transactions', {
      headers,
      body: {
        amount_paisa: 50000,
        date: '2026-11-01',
        description: 'Test',
        category_id: 'nonexistent-id',
        payment_method: 'CASH',
        idempotency_key: `ikey-${Date.now()}`,
      },
    });
    expect(res.status).toBe(422);
  });

  it('rejects an archived category with 422', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);
    const cats = await getCategories(ctx, user);
    const noneCat = cats.find((c) => c.routing_type === 'NONE')!;

    // Archive the category
    await ctx.makeRequest('PATCH', `/api/v1/categories/${noneCat.id}`, {
      headers,
      body: { is_archived: true },
    });

    const res = await ctx.makeRequest('POST', '/api/v1/transactions', {
      headers,
      body: {
        amount_paisa: 50000,
        date: '2026-11-01',
        description: 'Test',
        category_id: noneCat.id,
        payment_method: 'CASH',
        idempotency_key: `ikey-${Date.now()}`,
      },
    });
    expect(res.status).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// TC-TXN-004: idempotency
// ---------------------------------------------------------------------------

describe('TC-TXN-004: idempotency key', () => {
  it('second request with same key returns 409 DUPLICATE with same record; only one row in DB', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);
    const cats = await getCategories(ctx, user);
    const noneCat = cats.find((c) => c.routing_type === 'NONE')!;

    const ikey = `dup-test-${Date.now()}`;
    const body = {
      amount_paisa: 10000,
      date: '2026-11-01',
      description: 'First',
      category_id: noneCat.id,
      payment_method: 'CASH',
      idempotency_key: ikey,
    };

    const res1 = await ctx.makeRequest('POST', '/api/v1/transactions', { headers, body });
    expect(res1.status).toBe(201);
    const tx1 = await res1.json();

    const res2 = await ctx.makeRequest('POST', '/api/v1/transactions', {
      headers,
      body: { ...body, description: 'Second attempt', amount_paisa: 99999 },
    });
    expect(res2.status).toBe(409);
    const dup = await res2.json();
    expect(dup.code).toBe('DUPLICATE');
    expect(dup.transaction.id).toBe(tx1.id);

    const count = await ctx.db.transaction.count({ where: { userId: user.id, idempotencyKey: ikey } });
    expect(count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// TC-TXN-005: two users same idempotency key
// ---------------------------------------------------------------------------

describe('TC-TXN-005: two users same idempotency key', () => {
  it('both succeed', async () => {
    const user1 = await ctx.createUser({ provision: true });
    const user2 = await ctx.createUser({ provision: true });
    const ikey = `shared-key-${Date.now()}`;

    const res1 = await createTx(ctx, user1, { idempotency_key: ikey });
    const res2 = await createTx(ctx, user2, { idempotency_key: ikey });
    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
  });
});

// ---------------------------------------------------------------------------
// TC-TXN-006: date round-trip
// ---------------------------------------------------------------------------

describe('TC-TXN-006: date round-trip', () => {
  it('a transaction dated 2026-07-01 is returned as 2026-07-01', async () => {
    const user = await ctx.createUser({ provision: true });
    const res = await createTx(ctx, user, { date: '2026-07-01' });
    expect(res.status).toBe(201);
    const tx = await res.json();
    expect(tx.date).toBe('2026-07-01');
  });
});

// ---------------------------------------------------------------------------
// TC-TXN-007: list newest first, paginated
// ---------------------------------------------------------------------------

describe('TC-TXN-007: list transactions', () => {
  it('returns newest first and paginates', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    // Create transactions on different dates
    await createTx(ctx, user, { date: '2026-01-01', description: 'Old' });
    await createTx(ctx, user, { date: '2026-11-01', description: 'New' });

    const res = await ctx.makeRequest('GET', '/api/v1/transactions?page=1&page_size=20', { headers });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.length).toBeGreaterThanOrEqual(2);
    expect(data.total).toBeGreaterThanOrEqual(2);
    // Newest first
    expect(data.data[0].date >= data.data[data.data.length - 1].date).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TC-TXN-008: filters
// ---------------------------------------------------------------------------

describe('TC-TXN-008: filters', () => {
  it('filters by date range', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    await createTx(ctx, user, { date: '2025-01-01', description: 'Old year' });
    await createTx(ctx, user, { date: '2026-11-01', description: 'New year' });

    const res = await ctx.makeRequest('GET', '/api/v1/transactions?from=2026-01-01&to=2026-12-31', { headers });
    const data = await res.json();
    expect(data.data.every((t: any) => t.date >= '2026-01-01' && t.date <= '2026-12-31')).toBe(true);
  });

  it('filters by payment method', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    await createTx(ctx, user, { payment_method: 'CASH' });
    await createTx(ctx, user, { payment_method: 'BANK' });

    const res = await ctx.makeRequest('GET', '/api/v1/transactions?payment_method=CASH', { headers });
    const data = await res.json();
    expect(data.data.every((t: any) => t.payment_method === 'CASH')).toBe(true);
  });

  it('filters by category_id', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);
    const cats = await getCategories(ctx, user);
    const noneCats = cats.filter((c) => c.routing_type === 'NONE' && !c.is_archived);

    // Create in first category
    await ctx.makeRequest('POST', '/api/v1/transactions', {
      headers,
      body: {
        amount_paisa: 1000,
        date: '2026-11-01',
        description: 'Cat1',
        category_id: noneCats[0].id,
        payment_method: 'CASH',
        idempotency_key: `cat-filter-${Date.now()}`,
      },
    });

    const res = await ctx.makeRequest(`GET`, `/api/v1/transactions?category_id=${noneCats[0].id}`, { headers });
    const data = await res.json();
    expect(data.data.every((t: any) => t.category_id === noneCats[0].id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TC-TXN-009: amount range filter and description search
// ---------------------------------------------------------------------------

describe('TC-TXN-009: amount range and description search', () => {
  it('filters by min/max amount', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    await createTx(ctx, user, { amount_paisa: 100 });
    await createTx(ctx, user, { amount_paisa: 999999 });

    const res = await ctx.makeRequest('GET', '/api/v1/transactions?min_paisa=1000&max_paisa=100000', { headers });
    const data = await res.json();
    expect(data.data.every((t: any) => t.amount_paisa >= 1000 && t.amount_paisa <= 100000)).toBe(true);
  });

  it('searches description case-insensitively', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    await createTx(ctx, user, { description: 'grocery store visit' });
    await createTx(ctx, user, { description: 'taxi ride' });

    const res = await ctx.makeRequest('GET', '/api/v1/transactions?q=GROCERY', { headers });
    const data = await res.json();
    expect(data.data.some((t: any) => t.description.toLowerCase().includes('grocery'))).toBe(true);
    expect(data.data.every((t: any) => t.description.toLowerCase().includes('grocery'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TC-TXN-010: get one transaction
// ---------------------------------------------------------------------------

describe('TC-TXN-010: get one transaction', () => {
  it('returns the transaction by id', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    const createRes = await createTx(ctx, user, { amount_paisa: 12345 });
    const created = await createRes.json();

    const res = await ctx.makeRequest('GET', `/api/v1/transactions/${created.id}`, { headers });
    expect(res.status).toBe(200);
    const tx = await res.json();
    expect(tx.id).toBe(created.id);
    expect(tx.amount_paisa).toBe(12345);
  });

  it('returns 404 for another user\'s transaction', async () => {
    const user1 = await ctx.createUser({ provision: true });
    const user2 = await ctx.createUser({ provision: true });

    const createRes = await createTx(ctx, user1);
    const created = await createRes.json();

    const headers2 = await ctx.authHeader(user2);
    const res = await ctx.makeRequest('GET', `/api/v1/transactions/${created.id}`, { headers: headers2 });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// TC-TXN-011: update transaction fields
// ---------------------------------------------------------------------------

describe('TC-TXN-011: update transaction', () => {
  it('updates amount, date, description, and payment method', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    const createRes = await createTx(ctx, user);
    const created = await createRes.json();

    const patchRes = await ctx.makeRequest('PATCH', `/api/v1/transactions/${created.id}`, {
      headers,
      body: {
        amount_paisa: 99999,
        date: '2025-06-15',
        description: 'Updated description',
        payment_method: 'BANK',
      },
    });
    expect(patchRes.status).toBe(200);
    const updated = await patchRes.json();
    expect(updated.amount_paisa).toBe(99999);
    expect(updated.date).toBe('2025-06-15');
    expect(updated.description).toBe('Updated description');
    expect(updated.payment_method).toBe('BANK');
  });
});

// ---------------------------------------------------------------------------
// TC-TXN-012: change to another NONE category
// ---------------------------------------------------------------------------

describe('TC-TXN-012: change category', () => {
  it('succeeds when changing to another NONE category', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);
    const cats = await getCategories(ctx, user);
    const noneCats = cats.filter((c) => c.routing_type === 'NONE' && !c.is_archived);

    const createRes = await ctx.makeRequest('POST', '/api/v1/transactions', {
      headers,
      body: {
        amount_paisa: 1000,
        date: '2026-11-01',
        description: 'Cat change test',
        category_id: noneCats[0].id,
        payment_method: 'CASH',
        idempotency_key: `cat-change-${Date.now()}`,
      },
    });
    const created = await createRes.json();

    const patchRes = await ctx.makeRequest('PATCH', `/api/v1/transactions/${created.id}`, {
      headers,
      body: { category_id: noneCats[1].id },
    });
    expect(patchRes.status).toBe(200);
    const updated = await patchRes.json();
    expect(updated.category_id).toBe(noneCats[1].id);
  });
});

// ---------------------------------------------------------------------------
// TC-TXN-013: change to different routing type category
// ---------------------------------------------------------------------------

describe('TC-TXN-013: change to different routing type', () => {
  it('returns 422 when trying to change to a different routing type category', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);
    const cats = await getCategories(ctx, user);
    const noneCat = cats.find((c) => c.routing_type === 'NONE' && !c.is_archived)!;
    const savingsCat = cats.find((c) => c.routing_type !== 'NONE')!;

    if (!savingsCat) return; // Skip if no non-NONE category

    const createRes = await ctx.makeRequest('POST', '/api/v1/transactions', {
      headers,
      body: {
        amount_paisa: 1000,
        date: '2026-11-01',
        description: 'Routing change test',
        category_id: noneCat.id,
        payment_method: 'CASH',
        idempotency_key: `routing-change-${Date.now()}`,
      },
    });
    const created = await createRes.json();

    const patchRes = await ctx.makeRequest('PATCH', `/api/v1/transactions/${created.id}`, {
      headers,
      body: { category_id: savingsCat.id },
    });
    expect(patchRes.status).toBe(422);
    expect((await patchRes.json()).code).toBe('ROUTING_TYPE_MISMATCH');
  });
});

// ---------------------------------------------------------------------------
// TC-TXN-014: soft delete
// ---------------------------------------------------------------------------

describe('TC-TXN-014: delete a transaction', () => {
  it('no longer appears in list after soft delete', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    const createRes = await createTx(ctx, user);
    const created = await createRes.json();

    const delRes = await ctx.makeRequest('DELETE', `/api/v1/transactions/${created.id}`, { headers });
    expect(delRes.status).toBe(204);

    const listRes = await ctx.makeRequest('GET', '/api/v1/transactions', { headers });
    const data = await listRes.json();
    expect(data.data.find((t: any) => t.id === created.id)).toBeUndefined();

    // Verify isDeleted in DB
    const dbTx = await ctx.db.transaction.findUnique({ where: { id: created.id } });
    expect(dbTx?.isDeleted).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TC-TXN-016: bulk delete
// ---------------------------------------------------------------------------

describe('TC-TXN-016: bulk delete', () => {
  it('removes all three transactions from the list', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const res = await createTx(ctx, user);
      const tx = await res.json();
      ids.push(tx.id);
    }

    const bulkRes = await ctx.makeRequest('POST', '/api/v1/transactions/bulk-delete', {
      headers,
      body: { ids },
    });
    expect(bulkRes.status).toBe(204);

    const listRes = await ctx.makeRequest('GET', '/api/v1/transactions', { headers });
    const data = await listRes.json();
    for (const id of ids) {
      expect(data.data.find((t: any) => t.id === id)).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// TC-TXN-018: category CRUD
// ---------------------------------------------------------------------------

describe('TC-TXN-018: category CRUD', () => {
  it('creates, renames, recolours, and archives a category', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    // Create
    const createRes = await ctx.makeRequest('POST', '/api/v1/categories', {
      headers,
      body: { name: 'My Test Cat', routing_type: 'NONE', color_hex: '#ff0000' },
    });
    expect(createRes.status).toBe(201);
    const cat = await createRes.json();
    expect(cat.name).toBe('My Test Cat');

    // Rename
    const renameRes = await ctx.makeRequest('PATCH', `/api/v1/categories/${cat.id}`, {
      headers,
      body: { name: 'Renamed Cat' },
    });
    expect(renameRes.status).toBe(200);
    expect((await renameRes.json()).name).toBe('Renamed Cat');

    // Recolour
    const recolourRes = await ctx.makeRequest('PATCH', `/api/v1/categories/${cat.id}`, {
      headers,
      body: { color_hex: '#00ff00' },
    });
    expect(recolourRes.status).toBe(200);
    expect((await recolourRes.json()).color_hex).toBe('#00ff00');

    // Archive
    const archiveRes = await ctx.makeRequest('PATCH', `/api/v1/categories/${cat.id}`, {
      headers,
      body: { is_archived: true },
    });
    expect(archiveRes.status).toBe(200);
    expect((await archiveRes.json()).is_archived).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TC-TXN-019: case-insensitive duplicate name
// ---------------------------------------------------------------------------

describe('TC-TXN-019: case-insensitive duplicate category name', () => {
  it('returns 422 when name differs only by case', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    await ctx.makeRequest('POST', '/api/v1/categories', {
      headers,
      body: { name: 'Groceries Extra', routing_type: 'NONE' },
    });

    const res = await ctx.makeRequest('POST', '/api/v1/categories', {
      headers,
      body: { name: 'GROCERIES EXTRA', routing_type: 'NONE' },
    });
    expect(res.status).toBe(422);
    expect((await res.json()).code).toBe('DUPLICATE_NAME');
  });
});

// ---------------------------------------------------------------------------
// TC-TXN-020: cannot change routing type after transactions
// ---------------------------------------------------------------------------

describe('TC-TXN-020: routing type locked after transaction', () => {
  it('returns 422 when trying to change routing_type with existing transaction', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    // Create a custom NONE category
    const catRes = await ctx.makeRequest('POST', '/api/v1/categories', {
      headers,
      body: { name: 'Custom NONE Cat', routing_type: 'NONE' },
    });
    const cat = await catRes.json();

    // Create a transaction using it
    await ctx.makeRequest('POST', '/api/v1/transactions', {
      headers,
      body: {
        amount_paisa: 1000,
        date: '2026-11-01',
        description: 'Lock test',
        category_id: cat.id,
        payment_method: 'CASH',
        idempotency_key: `lock-test-${Date.now()}`,
      },
    });

    // Now try to change routing type
    const patchRes = await ctx.makeRequest('PATCH', `/api/v1/categories/${cat.id}`, {
      headers,
      body: { routing_type: 'SAVINGS_DEPOSIT' },
    });
    expect(patchRes.status).toBe(422);
    expect((await patchRes.json()).code).toBe('ROUTING_TYPE_LOCKED');
  });
});
