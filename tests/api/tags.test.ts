/**
 * p2-08 — Tags on Transactions
 * Seams:
 *   GET  /api/v1/tags              — list user's tags with transaction counts
 *   POST /api/v1/tags              — create a tag
 *   PATCH /api/v1/tags/:id         — rename a tag
 *   DELETE /api/v1/tags/:id        — delete an unused tag
 *   POST /api/v1/tags/:id/merge    — merge one tag into another
 *   POST /api/v1/transactions      — accept tag_ids array
 *   GET  /api/v1/transactions      — filter by tag_ids
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

// ── helpers ───────────────────────────────────────────────────────────────────

async function getCategory(ctx: Ctx, user: TestUser) {
  const headers = await ctx.authHeader(user);
  const catRes = await ctx.makeRequest('POST', '/api/v1/categories', {
    headers,
    body: { name: `Cat-${Math.random().toString(36).slice(2)}`, routing_type: 'NONE', color_hex: '#aabbcc' },
  });
  return (await catRes.json()).id as string;
}

async function createTag(ctx: Ctx, user: TestUser, name: string) {
  const headers = await ctx.authHeader(user);
  const res = await ctx.makeRequest('POST', '/api/v1/tags', {
    headers,
    body: { name },
  });
  return { res, id: res.status === 201 ? (await res.json()).id as string : null };
}

async function createTx(ctx: Ctx, user: TestUser, tagIds: string[] = []) {
  const headers = await ctx.authHeader(user);
  const categoryId = await getCategory(ctx, user);
  return ctx.makeRequest('POST', '/api/v1/transactions', {
    headers,
    body: {
      date: '2026-11-01',
      amount_paisa: 100000,
      description: 'Test tx',
      category_id: categoryId,
      payment_method: 'CASH',
      idempotency_key: `ikey-${Date.now()}-${Math.random()}`,
      tag_ids: tagIds,
    },
  });
}

// ── Tag CRUD ──────────────────────────────────────────────────────────────────

describe('Tags API', () => {
  it('creates a tag', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);
    const res = await ctx.makeRequest('POST', '/api/v1/tags', { headers, body: { name: 'Eid' } });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe('Eid');
    expect(body.id).toBeDefined();
  });

  it('lists tags with transaction counts', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);
    const { id: tagId } = await createTag(ctx, user, 'Eid');

    // Create a transaction using the tag
    await createTx(ctx, user, [tagId!]);

    const listRes = await ctx.makeRequest('GET', '/api/v1/tags', { headers });
    expect(listRes.status).toBe(200);
    const list = await listRes.json();
    expect(list.length).toBeGreaterThanOrEqual(1);
    const eid = list.find((t: { name: string }) => t.name === 'Eid');
    expect(eid).toBeDefined();
    expect(eid.transaction_count).toBe(1);
  });

  it('renames a tag', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);
    const { id: tagId } = await createTag(ctx, user, 'Old Name');

    const patchRes = await ctx.makeRequest('PATCH', `/api/v1/tags/${tagId}`, {
      headers,
      body: { name: 'New Name' },
    });
    expect(patchRes.status).toBe(200);
    const body = await patchRes.json();
    expect(body.name).toBe('New Name');
  });

  it('deletes a tag', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);
    const { id: tagId } = await createTag(ctx, user, 'Temp');

    const delRes = await ctx.makeRequest('DELETE', `/api/v1/tags/${tagId}`, { headers });
    expect(delRes.status).toBe(204);

    // Should not appear in list
    const listRes = await ctx.makeRequest('GET', '/api/v1/tags', { headers });
    const list = await listRes.json();
    const temp = list.find((t: { id: string }) => t.id === tagId);
    expect(temp).toBeUndefined();
  });

  it('merges one tag into another', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);
    const { id: tag1 } = await createTag(ctx, user, 'Eid 2024');
    const { id: tag2 } = await createTag(ctx, user, 'Eid 2025');

    // Create transactions with each tag
    const tx1Res = await createTx(ctx, user, [tag1!]);
    expect(tx1Res.status).toBe(201);
    const tx2Res = await createTx(ctx, user, [tag2!]);
    expect(tx2Res.status).toBe(201);

    const mergeRes = await ctx.makeRequest('POST', `/api/v1/tags/${tag1}/merge`, {
      headers,
      body: { into_tag_id: tag2 },
    });
    expect(mergeRes.status).toBe(200);

    // tag1 should be gone, tag2 should have 2 transactions
    const listRes = await ctx.makeRequest('GET', '/api/v1/tags', { headers });
    const list = await listRes.json();
    const gone = list.find((t: { id: string }) => t.id === tag1);
    expect(gone).toBeUndefined();
    const target = list.find((t: { id: string }) => t.id === tag2);
    expect(target?.transaction_count).toBe(2);
  });
});

// ── Transactions with tags ────────────────────────────────────────────────────

describe('Transaction tags', () => {
  it('creates a transaction with tags and returns them', async () => {
    const user = await ctx.createUser({ provision: true });
    const { id: tagId } = await createTag(ctx, user, 'Renovation');

    const res = await createTx(ctx, user, [tagId!]);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.tag_ids).toContain(tagId);
  });

  it('filters transactions by tag', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);
    const { id: tagId } = await createTag(ctx, user, 'Eid');

    // Create two transactions: one tagged, one not
    await createTx(ctx, user, [tagId!]);
    await createTx(ctx, user, []);

    const listRes = await ctx.makeRequest('GET', `/api/v1/transactions?tag_ids=${tagId}`, { headers });
    expect(listRes.status).toBe(200);
    const list = await listRes.json();
    // All returned transactions should have the Eid tag
    expect(list.data.length).toBeGreaterThanOrEqual(1);
    for (const tx of list.data) {
      expect(tx.tag_ids).toContain(tagId);
    }
  });
});
