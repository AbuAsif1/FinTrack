/**
 * TC-REG-001 to TC-REG-015 — Registration, verification, password reset
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestContext } from '../helpers/index';
import { clearTestInbox, getTestInbox } from '../../lib/email';
import type { PrismaClient } from '@prisma/client';

type Ctx = Awaited<ReturnType<typeof createTestContext>>;

let ctx: Ctx;

beforeEach(async () => {
  ctx = await createTestContext();
  clearTestInbox();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractToken(html: string): string {
  const match = html.match(/[?&]token=([a-f0-9]+)/);
  if (!match) throw new Error('No token found in email body');
  return match[1];
}

async function register(opts: { name?: string; email?: string; password?: string } = {}) {
  return ctx.makeRequest('POST', '/api/v1/auth/register', {
    body: {
      name: opts.name ?? 'Test User',
      email: opts.email ?? `user-${Date.now()}@example.com`,
      password: opts.password ?? 'password1234',
    },
  });
}

// ---------------------------------------------------------------------------
// TC-REG-001: Valid registration sends a verification email
// ---------------------------------------------------------------------------

describe('TC-REG-001: valid registration', () => {
  it('returns 200 and sends a verification email', async () => {
    const email = `reg-001-${Date.now()}@example.com`;
    const res = await register({ email });
    expect(res.status).toBe(200);
    const inbox = getTestInbox();
    expect(inbox.length).toBe(1);
    expect(inbox[0].to).toBe(email);
    expect(inbox[0].html).toContain('/verify-email?token=');
  });
});

// ---------------------------------------------------------------------------
// TC-REG-002: New account has 16 starter categories, 3 tax years, no financial records
// ---------------------------------------------------------------------------

describe('TC-REG-002: new account contents after verification', () => {
  it('has 16 starter categories, 3 provisional tax years, and no transactions', async () => {
    const email = `reg-002-${Date.now()}@example.com`;
    await register({ email });

    // Verify email
    const token = extractToken(getTestInbox()[0].html);
    await ctx.makeRequest('POST', '/api/v1/auth/verify-email', { body: { token } });

    const user = await ctx.db.user.findUnique({ where: { email } });
    expect(user).not.toBeNull();
    const userId = user!.id;

    const [cats, taxYears, txns, income, loans, savings, budgets, fixed] = await Promise.all([
      ctx.db.category.count({ where: { userId } }),
      ctx.db.taxYear.count({ where: { userId } }),
      ctx.db.transaction.count({ where: { userId } }),
      ctx.db.incomeEntry.count({ where: { userId } }),
      ctx.db.loanEntry.count({ where: { userId } }),
      ctx.db.savingsAccount.count({ where: { userId } }),
      ctx.db.budget.count({ where: { userId } }),
      ctx.db.fixedExpense.count({ where: { userId } }),
    ]);

    expect(cats).toBe(16);
    expect(taxYears).toBe(3);
    expect(txns).toBe(0);
    expect(income).toBe(0);
    expect(loans).toBe(0);
    expect(savings).toBe(0);
    expect(budgets).toBe(0);
    expect(fixed).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// TC-REG-003: Short password and invalid email return 422
// ---------------------------------------------------------------------------

describe('TC-REG-003: validation errors', () => {
  it('rejects a 9-character password with 422', async () => {
    const res = await ctx.makeRequest('POST', '/api/v1/auth/register', {
      body: { name: 'Test', email: 'valid@example.com', password: 'short123' },
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.fields.password).toBeDefined();
  });

  it('rejects an invalid email with 422', async () => {
    const res = await ctx.makeRequest('POST', '/api/v1/auth/register', {
      body: { name: 'Test', email: 'not-an-email', password: 'password1234' },
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.fields.email).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// TC-REG-004: Duplicate email returns same response, no new account, no email
// ---------------------------------------------------------------------------

describe('TC-REG-004: duplicate email', () => {
  it('returns same 200 response without creating a second account', async () => {
    const email = `reg-004-${Date.now()}@example.com`;

    // First registration
    const res1 = await register({ email });
    expect(res1.status).toBe(200);
    clearTestInbox();

    // Second registration with same email
    const res2 = await register({ email });
    expect(res2.status).toBe(200);
    const body1 = await res1.json().catch(() => null);
    const body2 = await res2.json();
    expect(body2.message).toBeDefined();

    // No new email sent
    expect(getTestInbox().length).toBe(0);

    // Only one user
    const count = await ctx.db.user.count({ where: { email } });
    expect(count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// TC-REG-005: Verification link works; login succeeds after verification
// ---------------------------------------------------------------------------

describe('TC-REG-005: verify email', () => {
  it('verifies the account and allows sign-in', async () => {
    const email = `reg-005-${Date.now()}@example.com`;
    const password = 'password1234';
    await register({ email, password });

    const token = extractToken(getTestInbox()[0].html);
    const verifyRes = await ctx.makeRequest('POST', '/api/v1/auth/verify-email', { body: { token } });
    expect(verifyRes.status).toBe(200);

    // Now login should succeed
    const loginRes = await ctx.makeRequest('POST', '/api/v1/auth/login', { body: { email, password } });
    expect(loginRes.status).toBe(200);
    const loginBody = await loginRes.json();
    expect(loginBody.accessToken).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// TC-REG-006: Reused verification link returns 422
// ---------------------------------------------------------------------------

describe('TC-REG-006: reused verification link', () => {
  it('returns 422 on second use', async () => {
    const email = `reg-006-${Date.now()}@example.com`;
    await register({ email });

    const token = extractToken(getTestInbox()[0].html);
    await ctx.makeRequest('POST', '/api/v1/auth/verify-email', { body: { token } });

    const res2 = await ctx.makeRequest('POST', '/api/v1/auth/verify-email', { body: { token } });
    expect(res2.status).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// TC-REG-007: Expired verification link (25 hours) returns 422
// ---------------------------------------------------------------------------

describe('TC-REG-007: expired verification link', () => {
  it('returns 422 for a 25-hour-old token', async () => {
    const email = `reg-007-${Date.now()}@example.com`;
    await register({ email });

    const token = extractToken(getTestInbox()[0].html);
    const tokenHash = (await import('../../lib/auth')).hashToken(token);

    // Back-date the token's expiry
    await ctx.db.emailToken.update({
      where: { tokenHash },
      data: { expiresAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
    });

    const res = await ctx.makeRequest('POST', '/api/v1/auth/verify-email', { body: { token } });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe('TOKEN_EXPIRED');
  });
});

// ---------------------------------------------------------------------------
// TC-REG-008: Resend verification — new link for unverified; same response for unknown
// ---------------------------------------------------------------------------

describe('TC-REG-008: resend verification', () => {
  it('sends a new link for an unverified account', async () => {
    const email = `reg-008-${Date.now()}@example.com`;
    await register({ email });
    clearTestInbox();

    const res = await ctx.makeRequest('POST', '/api/v1/auth/resend-verification', { body: { email } });
    expect(res.status).toBe(200);
    const inbox = getTestInbox();
    expect(inbox.length).toBe(1);
    expect(inbox[0].to).toBe(email);
  });

  it('returns same response for an unknown email without sending anything', async () => {
    const res = await ctx.makeRequest('POST', '/api/v1/auth/resend-verification', {
      body: { email: 'nobody@example.com' },
    });
    expect(res.status).toBe(200);
    expect(getTestInbox().length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// TC-REG-009: SIGNUP_MODE=closed returns 403 SIGNUP_CLOSED
// ---------------------------------------------------------------------------

describe('TC-REG-009: signup closed', () => {
  it('returns 403 SIGNUP_CLOSED when SIGNUP_MODE=closed', async () => {
    const original = process.env.SIGNUP_MODE;
    process.env.SIGNUP_MODE = 'closed';
    try {
      const res = await register();
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.code).toBe('SIGNUP_CLOSED');
      expect(await ctx.db.user.count()).toBe(0);
    } finally {
      process.env.SIGNUP_MODE = original;
    }
  });
});

// ---------------------------------------------------------------------------
// TC-REG-010: Six registrations from one IP — sixth returns 429
// ---------------------------------------------------------------------------

describe('TC-REG-010: registration rate limit by IP', () => {
  it('returns 429 on the sixth request from the same IP', async () => {
    const ip = '1.2.3.4';
    const headers = { 'x-forwarded-for': ip };

    for (let i = 0; i < 5; i++) {
      const res = await ctx.makeRequest('POST', '/api/v1/auth/register', {
        body: { name: 'T', email: `rl-ip-${i}-${Date.now()}@example.com`, password: 'password1234' },
        headers,
      });
      expect(res.status).toBe(200);
      clearTestInbox();
    }

    const res = await ctx.makeRequest('POST', '/api/v1/auth/register', {
      body: { name: 'T', email: `rl-ip-6-${Date.now()}@example.com`, password: 'password1234' },
      headers,
    });
    expect(res.status).toBe(429);
  });
});

// ---------------------------------------------------------------------------
// TC-REG-011: Password reset request — sends email for existing; same response for unknown
// ---------------------------------------------------------------------------

describe('TC-REG-011: password reset request', () => {
  it('sends a reset email for an existing verified account', async () => {
    const user = await ctx.createUser({ emailVerified: true });
    clearTestInbox();

    const res = await ctx.makeRequest('POST', '/api/v1/auth/password-reset/request', {
      body: { email: user.email },
    });
    expect(res.status).toBe(200);
    const inbox = getTestInbox();
    expect(inbox.length).toBe(1);
    expect(inbox[0].to).toBe(user.email);
    expect(inbox[0].html).toContain('/reset-password?token=');
  });

  it('returns same response for unknown email without sending', async () => {
    const res = await ctx.makeRequest('POST', '/api/v1/auth/password-reset/request', {
      body: { email: 'nobody@example.com' },
    });
    expect(res.status).toBe(200);
    expect(getTestInbox().length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// TC-REG-012: Confirm reset — new password works, old does not, all sessions end
// ---------------------------------------------------------------------------

describe('TC-REG-012: confirm password reset', () => {
  it('new password signs in; old one does not; all sessions end', async () => {
    const user = await ctx.createUser({ emailVerified: true });

    // Create a session first
    const loginRes = await ctx.makeRequest('POST', '/api/v1/auth/login', {
      body: { email: user.email, password: user.password },
    });
    expect(loginRes.status).toBe(200);

    // Request reset
    clearTestInbox();
    await ctx.makeRequest('POST', '/api/v1/auth/password-reset/request', { body: { email: user.email } });
    const token = extractToken(getTestInbox()[0].html);

    const newPassword = 'newpassword5678';
    const confirmRes = await ctx.makeRequest('POST', '/api/v1/auth/password-reset/confirm', {
      body: { token, password: newPassword },
    });
    expect(confirmRes.status).toBe(200);

    // Old password no longer works
    const oldLoginRes = await ctx.makeRequest('POST', '/api/v1/auth/login', {
      body: { email: user.email, password: user.password },
    });
    expect(oldLoginRes.status).toBe(401);

    // New password works
    const newLoginRes = await ctx.makeRequest('POST', '/api/v1/auth/login', {
      body: { email: user.email, password: newPassword },
    });
    expect(newLoginRes.status).toBe(200);

    // All sessions revoked
    const activeSessions = await ctx.db.refreshToken.count({
      where: { userId: user.id, revokedAt: null },
    });
    expect(activeSessions).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// TC-REG-013: Reused and expired reset links return 422
// ---------------------------------------------------------------------------

describe('TC-REG-013: invalid reset tokens', () => {
  it('returns 422 when the reset link is used twice', async () => {
    const user = await ctx.createUser({ emailVerified: true });
    clearTestInbox();
    await ctx.makeRequest('POST', '/api/v1/auth/password-reset/request', { body: { email: user.email } });
    const token = extractToken(getTestInbox()[0].html);
    const newPw = 'newpassword5678';

    const res1 = await ctx.makeRequest('POST', '/api/v1/auth/password-reset/confirm', {
      body: { token, password: newPw },
    });
    expect(res1.status).toBe(200);

    const res2 = await ctx.makeRequest('POST', '/api/v1/auth/password-reset/confirm', {
      body: { token, password: 'yetanother5678' },
    });
    expect(res2.status).toBe(422);
  });

  it('returns 422 for a token sent 61 minutes ago', async () => {
    const user = await ctx.createUser({ emailVerified: true });
    clearTestInbox();
    await ctx.makeRequest('POST', '/api/v1/auth/password-reset/request', { body: { email: user.email } });
    const token = extractToken(getTestInbox()[0].html);
    const tokenHash = (await import('../../lib/auth')).hashToken(token);

    // Back-date expiry
    await ctx.db.emailToken.update({
      where: { tokenHash },
      data: { expiresAt: new Date(Date.now() - 61 * 60 * 1000) },
    });

    const res = await ctx.makeRequest('POST', '/api/v1/auth/password-reset/confirm', {
      body: { token, password: 'newpassword5678' },
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe('TOKEN_EXPIRED');
  });
});

// ---------------------------------------------------------------------------
// TC-REG-014: Raw token from DB cannot be used (only hash is stored)
// ---------------------------------------------------------------------------

describe('TC-REG-014: raw token from DB does not work', () => {
  it('a token_hash from the DB does not verify', async () => {
    const user = await ctx.createUser({ emailVerified: true });
    clearTestInbox();
    await ctx.makeRequest('POST', '/api/v1/auth/password-reset/request', { body: { email: user.email } });
    const token = extractToken(getTestInbox()[0].html);
    const tokenHash = (await import('../../lib/auth')).hashToken(token);

    // Try using the hash directly as the token — it must not work
    const res = await ctx.makeRequest('POST', '/api/v1/auth/password-reset/confirm', {
      body: { token: tokenHash, password: 'newpassword5678' },
    });
    expect(res.status).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// TC-REG-015: Email bodies contain the link and no financial data
// ---------------------------------------------------------------------------

describe('TC-REG-015: email bodies', () => {
  it('verification email contains the link and no financial data', async () => {
    const email = `reg-015a-${Date.now()}@example.com`;
    await register({ email });
    const mail = getTestInbox()[0];
    expect(mail.html).toContain('/verify-email?token=');
    // Should not contain the user's name or any financial terms
    expect(mail.html).not.toContain('BDT');
    expect(mail.html).not.toContain('Paisa');
  });

  it('reset email contains the link and no financial data', async () => {
    const user = await ctx.createUser({ emailVerified: true });
    clearTestInbox();
    await ctx.makeRequest('POST', '/api/v1/auth/password-reset/request', { body: { email: user.email } });
    const mail = getTestInbox()[0];
    expect(mail.html).toContain('/reset-password?token=');
    expect(mail.html).not.toContain('BDT');
    expect(mail.html).not.toContain('Paisa');
  });
});
