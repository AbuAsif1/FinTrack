/**
 * p2-01 — More Admin Tools
 * Seams:
 *   GET  /api/v1/admin/settings/registration             — read toggle state
 *   PUT  /api/v1/admin/settings/registration             — set toggle
 *   POST /api/v1/auth/register (blocked when closed)     — sign-up gate
 *   GET  /api/v1/admin/settings/defaults/categories      — list defaults
 *   POST /api/v1/admin/settings/defaults/categories      — add default
 *   PATCH /api/v1/admin/settings/defaults/categories/:id — update default
 *   DELETE /api/v1/admin/settings/defaults/categories/:id — remove default
 *   GET  /api/v1/admin/health                            — aggregate stats
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContext } from '../helpers/index';
import { prisma } from '../../lib/prisma';

type Ctx = Awaited<ReturnType<typeof createTestContext>>;

let ctx: Ctx;

beforeEach(async () => {
  ctx = await createTestContext();
  // Reset registration toggle to open before each test so tests are order-independent
  await prisma.siteSettings.upsert({
    where: { key: 'registration_open' },
    create: { key: 'registration_open', valueJson: { enabled: true } },
    update: { valueJson: { enabled: true } },
  });
});

afterEach(async () => {
  await ctx?.cleanup();
});

describe('Registration Toggle', () => {
  it('admin can read registration state (open by default)', async () => {
    const admin = await ctx.createUser({ role: 'ADMIN' });
    const headers = await ctx.authHeader(admin);

    const res = await ctx.makeRequest('GET', '/api/v1/admin/settings/registration', { headers });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.registration_open).toBe(true);
  });

  it('admin can close registrations', async () => {
    const admin = await ctx.createUser({ role: 'ADMIN' });
    const headers = await ctx.authHeader(admin);

    const putRes = await ctx.makeRequest('PUT', '/api/v1/admin/settings/registration', {
      headers,
      body: { registration_open: false },
    });
    expect(putRes.status).toBe(200);
    const body = await putRes.json();
    expect(body.registration_open).toBe(false);
  });

  it('registration is blocked when toggle is closed', async () => {
    const admin = await ctx.createUser({ role: 'ADMIN' });
    const headers = await ctx.authHeader(admin);

    // Close registrations
    await ctx.makeRequest('PUT', '/api/v1/admin/settings/registration', {
      headers,
      body: { registration_open: false },
    });

    // Attempt to register
    const regRes = await ctx.makeRequest('POST', '/api/v1/auth/register', {
      body: {
        name: 'New User',
        email: `blocked-${Date.now()}@example.com`,
        password: 'SecurePass123',
      },
    });
    expect(regRes.status).toBe(403);
    const body = await regRes.json();
    expect(body.code).toBe('SIGNUP_CLOSED');
  });

  it('non-admin cannot change registration toggle', async () => {
    const user = await ctx.createUser({ role: 'USER' });
    const headers = await ctx.authHeader(user);

    const res = await ctx.makeRequest('PUT', '/api/v1/admin/settings/registration', {
      headers,
      body: { registration_open: false },
    });
    expect(res.status).toBe(403);
  });
});

describe('Default Categories', () => {
  it('admin can list default categories (seeded from hardcoded list)', async () => {
    const admin = await ctx.createUser({ role: 'ADMIN' });
    const headers = await ctx.authHeader(admin);

    const res = await ctx.makeRequest('GET', '/api/v1/admin/settings/defaults/categories', { headers });
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0]).toHaveProperty('name');
    expect(list[0]).toHaveProperty('routing_type');
    expect(list[0]).toHaveProperty('color_hex');
  });

  it('admin can add a default category', async () => {
    const admin = await ctx.createUser({ role: 'ADMIN' });
    const headers = await ctx.authHeader(admin);

    const res = await ctx.makeRequest('POST', '/api/v1/admin/settings/defaults/categories', {
      headers,
      body: {
        name: `Test Default ${Date.now()}`,
        routing_type: 'NONE',
        color_hex: '#FF0000',
      },
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBeDefined();
    expect(body.color_hex).toBe('#FF0000');
  });

  it('admin can update a default category', async () => {
    const admin = await ctx.createUser({ role: 'ADMIN' });
    const headers = await ctx.authHeader(admin);

    // List to get an id
    const listRes = await ctx.makeRequest('GET', '/api/v1/admin/settings/defaults/categories', { headers });
    const list = await listRes.json();
    const id = list[0].id;

    const patchRes = await ctx.makeRequest('PATCH', `/api/v1/admin/settings/defaults/categories/${id}`, {
      headers,
      body: { color_hex: '#123456' },
    });
    expect(patchRes.status).toBe(200);
    const patched = await patchRes.json();
    expect(patched.color_hex).toBe('#123456');
  });
});

describe('Site Health Panel', () => {
  it('admin can read health stats', async () => {
    const admin = await ctx.createUser({ role: 'ADMIN' });
    const headers = await ctx.authHeader(admin);

    const res = await ctx.makeRequest('GET', '/api/v1/admin/health', { headers });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.total_users).toBe('number');
    expect(typeof body.active_last_30_days).toBe('number');
    expect(typeof body.registered_this_month).toBe('number');
    expect(typeof body.registration_open).toBe('boolean');
  });

  it('non-admin cannot read health stats', async () => {
    const user = await ctx.createUser({ role: 'USER' });
    const headers = await ctx.authHeader(user);

    const res = await ctx.makeRequest('GET', '/api/v1/admin/health', { headers });
    expect(res.status).toBe(403);
  });
});
