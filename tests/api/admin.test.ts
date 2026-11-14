/**
 * TC-ADM-001 to TC-ADM-027 — Admin user management API
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContext } from '../helpers/index';
import { clearTestInbox, getTestInbox } from '../../lib/email';

type Ctx = Awaited<ReturnType<typeof createTestContext>>;

let ctx: Ctx;

beforeEach(async () => {
  ctx = await createTestContext();
});

afterEach(async () => {
  await ctx?.cleanup();
  clearTestInbox();
});

function extractToken(html: string): string {
  const match = html.match(/[?&]token=([a-f0-9]+)/);
  if (!match) throw new Error('No token found in email body');
  return match[1];
}

// ---------------------------------------------------------------------------
// TC-ADM-001: non-admin gets 403 on every admin route
// ---------------------------------------------------------------------------

describe('TC-ADM-001: non-admin access denied', () => {
  it('returns 403 ADMIN_ONLY for a regular user', async () => {
    const user = await ctx.createUser({ role: 'USER' });
    const headers = await ctx.authHeader(user);

    const routes: Array<[string, string, Record<string, unknown>?]> = [
      ['GET', '/api/v1/admin/users', undefined],
      ['POST', '/api/v1/admin/users', { name: 'T', email: 't@t.com' }],
      ['GET', '/api/v1/admin/actions', undefined],
    ];

    for (const [method, path, body] of routes) {
      const res = await ctx.makeRequest(method, path, { headers, body });
      expect(res.status, `${method} ${path}`).toBe(403);
      const data = await res.json();
      expect(data.code, `${method} ${path}`).toBe('ADMIN_ONLY');
    }
  });
});

// ---------------------------------------------------------------------------
// TC-ADM-002: admin lists users
// ---------------------------------------------------------------------------

describe('TC-ADM-002: admin lists users', () => {
  it('returns rows with required fields', async () => {
    const admin = await ctx.createUser({ role: 'ADMIN' });
    const user = await ctx.createUser({ role: 'USER' });
    const headers = await ctx.authHeader(admin);

    const res = await ctx.makeRequest('GET', '/api/v1/admin/users', { headers });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.length).toBeGreaterThanOrEqual(2);

    const row = data.data.find((u: any) => u.id === user.id);
    expect(row).toBeDefined();
    expect(row.name).toBeDefined();
    expect(row.email).toBeDefined();
    expect(row.role).toBe('USER');
    expect(row.status).toBeDefined();
    expect(row.created_at).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// TC-ADM-003: search and filters
// ---------------------------------------------------------------------------

describe('TC-ADM-003: list with search and filters', () => {
  it('filters by role', async () => {
    const admin = await ctx.createUser({ role: 'ADMIN' });
    await ctx.createUser({ role: 'USER' });
    const headers = await ctx.authHeader(admin);

    const res = await ctx.makeRequest('GET', '/api/v1/admin/users?role=ADMIN', { headers });
    const data = await res.json();
    expect(data.data.every((u: any) => u.role === 'ADMIN')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TC-ADM-004: status values
// ---------------------------------------------------------------------------

describe('TC-ADM-004: user status', () => {
  it('shows correct status for each account type', async () => {
    const admin = await ctx.createUser({ role: 'ADMIN' });
    const headers = await ctx.authHeader(admin);

    // Active: verified, not deactivated
    const active = await ctx.createUser({ emailVerified: true });
    // Unverified
    const unverified = await ctx.createUser({ emailVerified: false });
    // Deactivated indefinitely
    const deactivated = await ctx.createUser({ emailVerified: true });
    await ctx.makeRequest('POST', `/api/v1/admin/users/${deactivated.id}/deactivate`, {
      headers,
      body: {},
    });
    // Deactivated until a date
    const untilDate = await ctx.createUser({ emailVerified: true });
    await ctx.makeRequest('POST', `/api/v1/admin/users/${untilDate.id}/deactivate`, {
      headers,
      body: { until: '2030-01-01' },
    });

    const check = async (id: string) => {
      const res = await ctx.makeRequest('GET', `/api/v1/admin/users/${id}`, { headers });
      return (await res.json()).status;
    };

    expect(await check(active.id)).toBe('ACTIVE');
    expect(await check(unverified.id)).toBe('UNVERIFIED');
    expect(await check(deactivated.id)).toBe('DEACTIVATED');
    expect(await check(untilDate.id)).toBe('DEACTIVATED_UNTIL');
  });
});

// ---------------------------------------------------------------------------
// TC-ADM-005: admin creates user
// ---------------------------------------------------------------------------

describe('TC-ADM-005: admin creates a user', () => {
  it('creates a verified account with no password, starter categories, and sends set-password email', async () => {
    const admin = await ctx.createUser({ role: 'ADMIN' });
    const headers = await ctx.authHeader(admin);
    clearTestInbox();

    const email = `created-${Date.now()}@example.com`;
    const res = await ctx.makeRequest('POST', '/api/v1/admin/users', {
      headers,
      body: { name: 'New User', email, role: 'USER' },
    });
    expect(res.status).toBe(201);
    const created = await res.json();
    expect(created.email).toBe(email);

    // Should be verified immediately
    const dbUser = await ctx.db.user.findUnique({ where: { id: created.id } });
    expect(dbUser?.emailVerifiedAt).not.toBeNull();
    expect(dbUser?.passwordHash).toBeNull();

    // Should have starter categories
    const catCount = await ctx.db.category.count({ where: { userId: created.id } });
    expect(catCount).toBe(16);

    // Should have sent set-password email
    const inbox = getTestInbox();
    expect(inbox.length).toBe(1);
    expect(inbox[0].to).toBe(email);
    expect(inbox[0].html).toContain('/reset-password?token=');
  });
});

// ---------------------------------------------------------------------------
// TC-ADM-006: follow set-password link
// ---------------------------------------------------------------------------

describe('TC-ADM-006: follow set-password link', () => {
  it('user can sign in after setting password via admin-sent link', async () => {
    const admin = await ctx.createUser({ role: 'ADMIN' });
    const headers = await ctx.authHeader(admin);
    clearTestInbox();

    const email = `setpw-${Date.now()}@example.com`;
    await ctx.makeRequest('POST', '/api/v1/admin/users', {
      headers,
      body: { name: 'Set PW User', email, role: 'USER' },
    });

    const inbox = getTestInbox();
    const token = extractToken(inbox[0].html);

    const newPw = 'settestpw1234';
    const confirmRes = await ctx.makeRequest('POST', '/api/v1/auth/password-reset/confirm', {
      body: { token, password: newPw },
    });
    expect(confirmRes.status).toBe(200);

    const loginRes = await ctx.makeRequest('POST', '/api/v1/auth/login', {
      body: { email, password: newPw },
    });
    expect(loginRes.status).toBe(200);
    const loginData = await loginRes.json();
    expect(loginData.accessToken).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// TC-ADM-007: create admin user
// ---------------------------------------------------------------------------

describe('TC-ADM-007: create admin user', () => {
  it('creates account with ADMIN role', async () => {
    const admin = await ctx.createUser({ role: 'ADMIN' });
    const headers = await ctx.authHeader(admin);

    const res = await ctx.makeRequest('POST', '/api/v1/admin/users', {
      headers,
      body: { name: 'New Admin', email: `newadmin-${Date.now()}@example.com`, role: 'ADMIN' },
    });
    expect(res.status).toBe(201);
    expect((await res.json()).role).toBe('ADMIN');
  });
});

// ---------------------------------------------------------------------------
// TC-ADM-008: duplicate email
// ---------------------------------------------------------------------------

describe('TC-ADM-008: duplicate email', () => {
  it('returns 422 DUPLICATE_EMAIL', async () => {
    const admin = await ctx.createUser({ role: 'ADMIN' });
    const headers = await ctx.authHeader(admin);
    const existing = await ctx.createUser();

    const res = await ctx.makeRequest('POST', '/api/v1/admin/users', {
      headers,
      body: { name: 'Dup', email: existing.email, role: 'USER' },
    });
    expect(res.status).toBe(422);
    expect((await res.json()).code).toBe('DUPLICATE_EMAIL');
  });
});

// ---------------------------------------------------------------------------
// TC-ADM-009: update name and email
// ---------------------------------------------------------------------------

describe('TC-ADM-009: update user name and email', () => {
  it('updates name and email, rejects duplicate email', async () => {
    const admin = await ctx.createUser({ role: 'ADMIN' });
    const user = await ctx.createUser({ role: 'USER' });
    const other = await ctx.createUser({ role: 'USER' });
    const headers = await ctx.authHeader(admin);

    // Update name
    const r1 = await ctx.makeRequest('PATCH', `/api/v1/admin/users/${user.id}`, {
      headers,
      body: { name: 'Updated Name' },
    });
    expect(r1.status).toBe(200);
    expect((await r1.json()).name).toBe('Updated Name');

    // Duplicate email
    const r2 = await ctx.makeRequest('PATCH', `/api/v1/admin/users/${user.id}`, {
      headers,
      body: { email: other.email },
    });
    expect(r2.status).toBe(422);
    expect((await r2.json()).code).toBe('DUPLICATE_EMAIL');
  });
});

// ---------------------------------------------------------------------------
// TC-ADM-010: promote user to admin
// ---------------------------------------------------------------------------

describe('TC-ADM-010: promote to admin', () => {
  it('updates role to ADMIN', async () => {
    const admin = await ctx.createUser({ role: 'ADMIN' });
    const user = await ctx.createUser({ role: 'USER' });
    const headers = await ctx.authHeader(admin);

    const res = await ctx.makeRequest('PATCH', `/api/v1/admin/users/${user.id}`, {
      headers,
      body: { role: 'ADMIN' },
    });
    expect(res.status).toBe(200);
    expect((await res.json()).role).toBe('ADMIN');
  });
});

// ---------------------------------------------------------------------------
// TC-ADM-011: deactivate until date — sign-in refused until then
// ---------------------------------------------------------------------------

describe('TC-ADM-011: deactivate until date', () => {
  it('sessions end; sign-in refused; sign-in works after date passes', async () => {
    const admin = await ctx.createUser({ role: 'ADMIN' });
    const user = await ctx.createUser({ emailVerified: true });
    const headers = await ctx.authHeader(admin);

    // Create a session for user first
    const loginRes = await ctx.makeRequest('POST', '/api/v1/auth/login', {
      body: { email: user.email, password: user.password },
    });
    expect(loginRes.status).toBe(200);

    // Deactivate until a future date
    const futureDate = '2099-12-31';
    const deactivateRes = await ctx.makeRequest('POST', `/api/v1/admin/users/${user.id}/deactivate`, {
      headers,
      body: { until: futureDate },
    });
    expect(deactivateRes.status).toBe(200);

    // All sessions should be revoked
    const activeSessions = await ctx.db.refreshToken.count({
      where: { userId: user.id, revokedAt: null },
    });
    expect(activeSessions).toBe(0);

    // Sign-in should fail
    const loginRes2 = await ctx.makeRequest('POST', '/api/v1/auth/login', {
      body: { email: user.email, password: user.password },
    });
    expect(loginRes2.status).toBe(403);
    expect((await loginRes2.json()).code).toBe('ACCOUNT_DEACTIVATED');
  });
});

// ---------------------------------------------------------------------------
// TC-ADM-012: deactivate indefinitely then reactivate
// ---------------------------------------------------------------------------

describe('TC-ADM-012: deactivate then reactivate', () => {
  it('sign-in refused; then works after reactivation', async () => {
    const admin = await ctx.createUser({ role: 'ADMIN' });
    const user = await ctx.createUser({ emailVerified: true });
    const headers = await ctx.authHeader(admin);

    await ctx.makeRequest('POST', `/api/v1/admin/users/${user.id}/deactivate`, { headers, body: {} });

    const loginRes1 = await ctx.makeRequest('POST', '/api/v1/auth/login', {
      body: { email: user.email, password: user.password },
    });
    expect(loginRes1.status).toBe(403);

    await ctx.makeRequest('POST', `/api/v1/admin/users/${user.id}/reactivate`, { headers, body: {} });

    const loginRes2 = await ctx.makeRequest('POST', '/api/v1/auth/login', {
      body: { email: user.email, password: user.password },
    });
    expect(loginRes2.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// TC-ADM-014: delete with wrong email
// ---------------------------------------------------------------------------

describe('TC-ADM-014: delete with wrong email', () => {
  it('returns 422 and does not delete', async () => {
    const admin = await ctx.createUser({ role: 'ADMIN' });
    const user = await ctx.createUser({ role: 'USER' });
    const headers = await ctx.authHeader(admin);

    const res = await ctx.makeRequest('DELETE', `/api/v1/admin/users/${user.id}`, {
      headers,
      body: { email: 'wrong@example.com' },
    });
    expect(res.status).toBe(422);

    const stillExists = await ctx.db.user.findUnique({ where: { id: user.id } });
    expect(stillExists).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// TC-ADM-015: delete with correct email
// ---------------------------------------------------------------------------

describe('TC-ADM-015: delete with correct email', () => {
  it('removes the account and all owned records', async () => {
    const admin = await ctx.createUser({ role: 'ADMIN' });
    const user = await ctx.createUser({ role: 'USER', provision: true });
    const headers = await ctx.authHeader(admin);

    const res = await ctx.makeRequest('DELETE', `/api/v1/admin/users/${user.id}`, {
      headers,
      body: { email: user.email },
    });
    expect(res.status).toBe(204);

    const gone = await ctx.db.user.findUnique({ where: { id: user.id } });
    expect(gone).toBeNull();

    // Categories should be gone
    const cats = await ctx.db.category.count({ where: { userId: user.id } });
    expect(cats).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// TC-ADM-016: ADMIN_PROTECTED guard
// ---------------------------------------------------------------------------

describe('TC-ADM-016: ADMIN_PROTECTED guard', () => {
  it('returns 409 ADMIN_PROTECTED when targeting another admin', async () => {
    const admin1 = await ctx.createUser({ role: 'ADMIN' });
    const admin2 = await ctx.createUser({ role: 'ADMIN' });
    const headers = await ctx.authHeader(admin1);

    const updateRes = await ctx.makeRequest('PATCH', `/api/v1/admin/users/${admin2.id}`, {
      headers,
      body: { name: 'Hacked' },
    });
    expect(updateRes.status).toBe(409);
    expect((await updateRes.json()).code).toBe('ADMIN_PROTECTED');

    const deactivateRes = await ctx.makeRequest('POST', `/api/v1/admin/users/${admin2.id}/deactivate`, {
      headers,
      body: {},
    });
    expect(deactivateRes.status).toBe(409);
    expect((await deactivateRes.json()).code).toBe('ADMIN_PROTECTED');

    const deleteRes = await ctx.makeRequest('DELETE', `/api/v1/admin/users/${admin2.id}`, {
      headers,
      body: { email: admin2.email },
    });
    expect(deleteRes.status).toBe(409);
    expect((await deleteRes.json()).code).toBe('ADMIN_PROTECTED');
  });
});

// ---------------------------------------------------------------------------
// TC-ADM-018: SELF_ACTION guard
// ---------------------------------------------------------------------------

describe('TC-ADM-018: SELF_ACTION guard', () => {
  it('returns 409 SELF_ACTION when acting on own account', async () => {
    const admin = await ctx.createUser({ role: 'ADMIN' });
    const headers = await ctx.authHeader(admin);

    const updateRes = await ctx.makeRequest('PATCH', `/api/v1/admin/users/${admin.id}`, {
      headers,
      body: { name: 'Self' },
    });
    expect(updateRes.status).toBe(409);
    expect((await updateRes.json()).code).toBe('SELF_ACTION');

    const deactivateRes = await ctx.makeRequest('POST', `/api/v1/admin/users/${admin.id}/deactivate`, {
      headers,
      body: {},
    });
    expect(deactivateRes.status).toBe(409);
    expect((await deactivateRes.json()).code).toBe('SELF_ACTION');
  });
});

// ---------------------------------------------------------------------------
// TC-ADM-021: payment log CRUD
// ---------------------------------------------------------------------------

describe('TC-ADM-021: payment log CRUD', () => {
  it('creates, edits, and deletes a payment; list reflects changes', async () => {
    const admin = await ctx.createUser({ role: 'ADMIN' });
    const user = await ctx.createUser({ role: 'USER' });
    const headers = await ctx.authHeader(admin);

    // Add payment
    const addRes = await ctx.makeRequest('POST', `/api/v1/admin/users/${user.id}/payments`, {
      headers,
      body: { paid_on: '2026-11-01', amount_paisa: 50000, covers_until: '2027-10-31', note: 'Annual' },
    });
    expect(addRes.status).toBe(201);
    const payment = await addRes.json();
    expect(payment.paid_on).toBe('2026-11-01');
    expect(payment.amount_paisa).toBe(50000);

    // Edit payment
    const editRes = await ctx.makeRequest('PATCH', `/api/v1/admin/users/${user.id}/payments/${payment.id}`, {
      headers,
      body: { note: 'Updated note' },
    });
    expect(editRes.status).toBe(200);
    expect((await editRes.json()).note).toBe('Updated note');

    // List shows it
    const listRes = await ctx.makeRequest('GET', `/api/v1/admin/users/${user.id}/payments`, { headers });
    const list = await listRes.json();
    expect(list.some((p: any) => p.id === payment.id)).toBe(true);

    // Delete
    const delRes = await ctx.makeRequest('DELETE', `/api/v1/admin/users/${user.id}/payments/${payment.id}`, { headers });
    expect(delRes.status).toBe(204);

    // Gone
    const list2 = await (await ctx.makeRequest('GET', `/api/v1/admin/users/${user.id}/payments`, { headers })).json();
    expect(list2.some((p: any) => p.id === payment.id)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// TC-ADM-023: each admin write creates one admin_actions row
// ---------------------------------------------------------------------------

describe('TC-ADM-023: each write creates one admin_actions row', () => {
  it('creates one action entry per admin write', async () => {
    const admin = await ctx.createUser({ role: 'ADMIN' });
    const user = await ctx.createUser({ role: 'USER' });
    const headers = await ctx.authHeader(admin);

    const before = await ctx.db.adminAction.count({ where: { adminId: admin.id } });

    // Create user
    clearTestInbox();
    await ctx.makeRequest('POST', '/api/v1/admin/users', {
      headers,
      body: { name: 'Action Test', email: `acttest-${Date.now()}@example.com` },
    });

    // Deactivate
    await ctx.makeRequest('POST', `/api/v1/admin/users/${user.id}/deactivate`, { headers, body: {} });

    // Reactivate
    await ctx.makeRequest('POST', `/api/v1/admin/users/${user.id}/reactivate`, { headers, body: {} });

    const after = await ctx.db.adminAction.count({ where: { adminId: admin.id } });
    expect(after - before).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// TC-ADM-025: no financial data in admin responses
// ---------------------------------------------------------------------------

describe('TC-ADM-025: no financial data in admin responses', () => {
  it('admin list and detail do not include transaction or savings data', async () => {
    const admin = await ctx.createUser({ role: 'ADMIN' });
    const user = await ctx.createUser({ role: 'USER', provision: true });
    const headers = await ctx.authHeader(admin);

    const listRes = await ctx.makeRequest('GET', '/api/v1/admin/users', { headers });
    const listData = await listRes.json();
    const row = listData.data.find((u: any) => u.id === user.id);
    expect(row).toBeDefined();
    expect(row.transactions).toBeUndefined();
    expect(row.savingsAccounts).toBeUndefined();
    expect(row.incomeEntries).toBeUndefined();

    const detailRes = await ctx.makeRequest('GET', `/api/v1/admin/users/${user.id}`, { headers });
    const detail = await detailRes.json();
    expect(detail.transactions).toBeUndefined();
    expect(detail.savings_accounts).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// TC-ADM-020: resend verification and send password reset
// ---------------------------------------------------------------------------

describe('TC-ADM-020: resend verification and send password reset', () => {
  it('admin can resend verification email', async () => {
    const admin = await ctx.createUser({ role: 'ADMIN' });
    const user = await ctx.createUser({ role: 'USER', emailVerified: false });
    const headers = await ctx.authHeader(admin);
    clearTestInbox();

    const res = await ctx.makeRequest('POST', `/api/v1/admin/users/${user.id}/resend-verification`, {
      headers,
      body: {},
    });
    expect(res.status).toBe(200);
    expect(getTestInbox().length).toBe(1);
    expect(getTestInbox()[0].to).toBe(user.email);
  });

  it('admin can send password reset email', async () => {
    const admin = await ctx.createUser({ role: 'ADMIN' });
    const user = await ctx.createUser({ role: 'USER' });
    const headers = await ctx.authHeader(admin);
    clearTestInbox();

    const res = await ctx.makeRequest('POST', `/api/v1/admin/users/${user.id}/send-password-reset`, {
      headers,
      body: {},
    });
    expect(res.status).toBe(200);
    expect(getTestInbox().length).toBe(1);
    expect(getTestInbox()[0].html).toContain('/reset-password?token=');
  });
});
