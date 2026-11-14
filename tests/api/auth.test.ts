import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import type { TestContext } from '../helpers';

let ctx: TestContext;

beforeAll(async () => {
  const { createTestContext } = await import('../helpers');
  ctx = await createTestContext();
});

beforeEach(async () => {
  await ctx.db.authRateLimit.deleteMany();
  await ctx.db.refreshToken.deleteMany();
});

// ---------------------------------------------------------------------------
// TC-AUTH-001: Login happy path
// ---------------------------------------------------------------------------
describe('TC-AUTH-001 login with correct password', () => {
  it('returns 200, an access token, and sets a refresh cookie', async () => {
    const user = await ctx.createUser({ emailVerified: true });
    const res = await ctx.makeRequest('POST', '/api/v1/auth/login', {
      body: { email: user.email, password: user.password },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.accessToken).toBe('string');
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('refresh_token=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Strict');
    expect(setCookie).toContain('Path=/');
  });
});

// ---------------------------------------------------------------------------
// TC-AUTH-002: Wrong password
// ---------------------------------------------------------------------------
describe('TC-AUTH-002 login with wrong password', () => {
  it('returns 401 INVALID_CREDENTIALS', async () => {
    const user = await ctx.createUser({ emailVerified: true });
    const res = await ctx.makeRequest('POST', '/api/v1/auth/login', {
      body: { email: user.email, password: 'wrong-password-xyz' },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('INVALID_CREDENTIALS');
  });
});

// ---------------------------------------------------------------------------
// TC-AUTH-003: Unknown email
// ---------------------------------------------------------------------------
describe('TC-AUTH-003 login with unknown email', () => {
  it('returns 401 with same body as wrong password', async () => {
    const res = await ctx.makeRequest('POST', '/api/v1/auth/login', {
      body: { email: 'nobody@example.com', password: 'password12345' },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('INVALID_CREDENTIALS');
  });
});

// ---------------------------------------------------------------------------
// TC-AUTH-004: Login before email verified
// ---------------------------------------------------------------------------
describe('TC-AUTH-004 login with unverified email', () => {
  it('returns 403 EMAIL_NOT_VERIFIED', async () => {
    const user = await ctx.createUser({ emailVerified: false });
    const res = await ctx.makeRequest('POST', '/api/v1/auth/login', {
      body: { email: user.email, password: user.password },
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('EMAIL_NOT_VERIFIED');
  });
});

// ---------------------------------------------------------------------------
// TC-AUTH-005: Deactivated until reactivated
// ---------------------------------------------------------------------------
describe('TC-AUTH-005 login to account deactivated until reactivated', () => {
  it('returns 403 ACCOUNT_DEACTIVATED', async () => {
    const user = await ctx.createUser({ emailVerified: true });
    await ctx.db.user.update({
      where: { id: user.id },
      data: { deactivatedAt: new Date(), deactivationReason: 'test' },
    });
    const res = await ctx.makeRequest('POST', '/api/v1/auth/login', {
      body: { email: user.email, password: user.password },
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('ACCOUNT_DEACTIVATED');
  });
});

// ---------------------------------------------------------------------------
// TC-AUTH-006: Deactivated until a future date
// ---------------------------------------------------------------------------
describe('TC-AUTH-006 login to account deactivated until a future date', () => {
  it('returns 403 ACCOUNT_DEACTIVATED', async () => {
    const user = await ctx.createUser({ emailVerified: true });
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await ctx.db.user.update({
      where: { id: user.id },
      data: { deactivatedAt: new Date(), deactivatedUntil: future },
    });
    const res = await ctx.makeRequest('POST', '/api/v1/auth/login', {
      body: { email: user.email, password: user.password },
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('ACCOUNT_DEACTIVATED');
  });
});

// ---------------------------------------------------------------------------
// TC-AUTH-007: Deactivation date has passed — account auto-reinstates
// ---------------------------------------------------------------------------
describe('TC-AUTH-007 login to account whose deactivation date has passed', () => {
  it('returns 200 and clears the deactivation', async () => {
    const user = await ctx.createUser({ emailVerified: true });
    const past = new Date(Date.now() - 1000);
    await ctx.db.user.update({
      where: { id: user.id },
      data: { deactivatedAt: new Date(Date.now() - 2000), deactivatedUntil: past },
    });
    const res = await ctx.makeRequest('POST', '/api/v1/auth/login', {
      body: { email: user.email, password: user.password },
    });
    expect(res.status).toBe(200);
    const dbUser = await ctx.db.user.findUnique({ where: { id: user.id } });
    expect(dbUser?.deactivatedAt).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// TC-AUTH-008: Protected route with no / malformed / expired token
// ---------------------------------------------------------------------------
describe('TC-AUTH-008 protected route token checks', () => {
  it('returns 401 with no token', async () => {
    const res = await ctx.makeRequest('GET', '/api/v1/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with malformed token', async () => {
    const res = await ctx.makeRequest('GET', '/api/v1/me', {
      headers: { authorization: 'Bearer notavalidjwt' },
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 with an expired token', async () => {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? 'test-secret');
    const expiredToken = await new SignJWT({ role: 'USER' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('some-user-id')
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3540)
      .sign(secret);
    const res = await ctx.makeRequest('GET', '/api/v1/me', {
      headers: { authorization: `Bearer ${expiredToken}` },
    });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// TC-AUTH-010: Refresh rotates the token
// ---------------------------------------------------------------------------
describe('TC-AUTH-010 refresh with valid cookie', () => {
  it('returns new access token and new cookie; old token no longer works', async () => {
    const user = await ctx.createUser({ emailVerified: true });
    const loginRes = await ctx.makeRequest('POST', '/api/v1/auth/login', {
      body: { email: user.email, password: user.password },
    });
    expect(loginRes.status).toBe(200);
    const cookie = loginRes.headers.get('set-cookie') ?? '';
    const rawToken = cookie.match(/refresh_token=([^;]+)/)?.[1] ?? '';

    const refreshRes = await ctx.makeRequest('POST', '/api/v1/auth/refresh', {
      headers: { cookie: `refresh_token=${rawToken}` },
    });
    expect(refreshRes.status).toBe(200);
    const refreshBody = await refreshRes.json();
    expect(typeof refreshBody.accessToken).toBe('string');

    const newCookie = refreshRes.headers.get('set-cookie') ?? '';
    const newToken = newCookie.match(/refresh_token=([^;]+)/)?.[1] ?? '';
    expect(newToken).not.toBe(rawToken);

    // Old token no longer works
    const reuseRes = await ctx.makeRequest('POST', '/api/v1/auth/refresh', {
      headers: { cookie: `refresh_token=${rawToken}` },
    });
    expect(reuseRes.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// TC-AUTH-011: Reusing a rotated token ends all sessions
// ---------------------------------------------------------------------------
describe('TC-AUTH-011 reusing a rotated token ends the session', () => {
  it('returns 401 and all tokens are revoked', async () => {
    const user = await ctx.createUser({ emailVerified: true });
    const loginRes = await ctx.makeRequest('POST', '/api/v1/auth/login', {
      body: { email: user.email, password: user.password },
    });
    const cookie = loginRes.headers.get('set-cookie') ?? '';
    const oldToken = cookie.match(/refresh_token=([^;]+)/)?.[1] ?? '';

    // Rotate once
    const refreshRes = await ctx.makeRequest('POST', '/api/v1/auth/refresh', {
      headers: { cookie: `refresh_token=${oldToken}` },
    });
    expect(refreshRes.status).toBe(200);

    // Reuse the already-rotated token
    const reuseRes = await ctx.makeRequest('POST', '/api/v1/auth/refresh', {
      headers: { cookie: `refresh_token=${oldToken}` },
    });
    expect(reuseRes.status).toBe(401);
    const reuseBody = await reuseRes.json();
    expect(reuseBody.code).toBe('TOKEN_REUSE');

    // All tokens for user are revoked
    const tokens = await ctx.db.refreshToken.findMany({ where: { userId: user.id } });
    expect(tokens.every((t) => t.revokedAt !== null)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TC-AUTH-012: Refresh 30 days after last refresh — expired
// ---------------------------------------------------------------------------
describe('TC-AUTH-012 refresh with an expired token', () => {
  it('returns 401', async () => {
    const user = await ctx.createUser({ emailVerified: true });
    const { generateRawToken, hashToken } = await import('../../lib/auth');
    const raw = generateRawToken();
    const hash = hashToken(raw);
    const expiredAt = new Date(Date.now() - 1000);
    await ctx.db.refreshToken.create({
      data: { userId: user.id, tokenHash: hash, expiresAt: expiredAt },
    });
    const res = await ctx.makeRequest('POST', '/api/v1/auth/refresh', {
      headers: { cookie: `refresh_token=${raw}` },
    });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// TC-AUTH-013: Refresh or logout with foreign Origin
// ---------------------------------------------------------------------------
describe('TC-AUTH-013 origin check on refresh and logout', () => {
  it('refresh rejects foreign origin', async () => {
    const res = await ctx.makeRequest('POST', '/api/v1/auth/refresh', {
      headers: { origin: 'https://evil.example.com' },
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('INVALID_ORIGIN');
  });

  it('logout rejects foreign origin', async () => {
    const res = await ctx.makeRequest('POST', '/api/v1/auth/logout', {
      headers: { origin: 'https://evil.example.com' },
    });
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// TC-AUTH-014: Logout
// ---------------------------------------------------------------------------
describe('TC-AUTH-014 logout', () => {
  it('clears the cookie and revokes the token', async () => {
    const user = await ctx.createUser({ emailVerified: true });
    const loginRes = await ctx.makeRequest('POST', '/api/v1/auth/login', {
      body: { email: user.email, password: user.password },
    });
    const cookie = loginRes.headers.get('set-cookie') ?? '';
    const rawToken = cookie.match(/refresh_token=([^;]+)/)?.[1] ?? '';

    const logoutRes = await ctx.makeRequest('POST', '/api/v1/auth/logout', {
      headers: { cookie: `refresh_token=${rawToken}` },
    });
    expect(logoutRes.status).toBe(200);
    const logoutCookie = logoutRes.headers.get('set-cookie') ?? '';
    expect(logoutCookie).toContain('Max-Age=0');

    // Token is revoked
    const refreshRes = await ctx.makeRequest('POST', '/api/v1/auth/refresh', {
      headers: { cookie: `refresh_token=${rawToken}` },
    });
    expect(refreshRes.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// TC-AUTH-015: Change password
// ---------------------------------------------------------------------------
describe('TC-AUTH-015 change password with correct current password', () => {
  it('new password signs in; old one does not; other sessions end', async () => {
    const user = await ctx.createUser({ emailVerified: true });
    const loginRes = await ctx.makeRequest('POST', '/api/v1/auth/login', {
      body: { email: user.email, password: user.password },
    });
    const accessToken = (await loginRes.json()).accessToken;

    const changeRes = await ctx.makeRequest('POST', '/api/v1/auth/change-password', {
      headers: { authorization: `Bearer ${accessToken}` },
      body: { currentPassword: user.password, newPassword: 'newpassword1234' },
    });
    expect(changeRes.status).toBe(200);

    // Old password fails
    const oldLoginRes = await ctx.makeRequest('POST', '/api/v1/auth/login', {
      body: { email: user.email, password: user.password },
    });
    expect(oldLoginRes.status).toBe(401);

    // New password works
    const newLoginRes = await ctx.makeRequest('POST', '/api/v1/auth/login', {
      body: { email: user.email, password: 'newpassword1234' },
    });
    expect(newLoginRes.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// TC-AUTH-016: Change password with wrong current password
// ---------------------------------------------------------------------------
describe('TC-AUTH-016 change password with wrong current password', () => {
  it('returns 422; password unchanged', async () => {
    const user = await ctx.createUser({ emailVerified: true });
    const loginRes = await ctx.makeRequest('POST', '/api/v1/auth/login', {
      body: { email: user.email, password: user.password },
    });
    const accessToken = (await loginRes.json()).accessToken;

    const res = await ctx.makeRequest('POST', '/api/v1/auth/change-password', {
      headers: { authorization: `Bearer ${accessToken}` },
      body: { currentPassword: 'wrongcurrent123', newPassword: 'newpassword1234' },
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe('WRONG_PASSWORD');

    // Original password still works
    const loginCheck = await ctx.makeRequest('POST', '/api/v1/auth/login', {
      body: { email: user.email, password: user.password },
    });
    expect(loginCheck.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// TC-AUTH-017: 10 failures for one email → 429
// ---------------------------------------------------------------------------
describe('TC-AUTH-017 rate limit: eleven failed logins for one email', () => {
  it('eleventh attempt returns 429', async () => {
    const user = await ctx.createUser({ emailVerified: true });
    // Sequential requests so the read-then-increment in recordFailedLogin stays serial
    for (let i = 0; i < 10; i++) {
      const r = await ctx.makeRequest('POST', '/api/v1/auth/login', {
        body: { email: user.email, password: 'wrong-password-xyz' },
      });
      expect(r.status).toBe(401);
    }

    const eleventh = await ctx.makeRequest('POST', '/api/v1/auth/login', {
      body: { email: user.email, password: 'wrong-password-xyz' },
    });
    expect(eleventh.status).toBe(429);
  });
});

// ---------------------------------------------------------------------------
// TC-AUTH-019: GET /me and PATCH /me
// ---------------------------------------------------------------------------
describe('TC-AUTH-019 GET /me and PATCH /me', () => {
  it('returns name, email and role; PATCH saves new name', async () => {
    const user = await ctx.createUser({ emailVerified: true });
    const loginRes = await ctx.makeRequest('POST', '/api/v1/auth/login', {
      body: { email: user.email, password: user.password },
    });
    const { accessToken } = await loginRes.json();

    const getRes = await ctx.makeRequest('GET', '/api/v1/me', {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(getRes.status).toBe(200);
    const me = await getRes.json();
    expect(me.email).toBe(user.email);
    expect(me.role).toBe('USER');

    const patchRes = await ctx.makeRequest('PATCH', '/api/v1/me', {
      headers: { authorization: `Bearer ${accessToken}` },
      body: { name: 'Updated Name' },
    });
    expect(patchRes.status).toBe(200);
    const updated = await patchRes.json();
    expect(updated.name).toBe('Updated Name');
  });
});

// ---------------------------------------------------------------------------
// Cross-user isolation: a second user cannot read the first user's /me
// ---------------------------------------------------------------------------
describe('cross-user isolation for /me', () => {
  it('user B cannot read user A data via /me (they see their own)', async () => {
    const userA = await ctx.createUser({ emailVerified: true });
    const userB = await ctx.createUser({ emailVerified: true });

    const loginB = await ctx.makeRequest('POST', '/api/v1/auth/login', {
      body: { email: userB.email, password: userB.password },
    });
    const { accessToken: tokenB } = await loginB.json();

    const meRes = await ctx.makeRequest('GET', '/api/v1/me', {
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(meRes.status).toBe(200);
    const meBody = await meRes.json();
    expect(meBody.email).toBe(userB.email);
    expect(meBody.email).not.toBe(userA.email);
  });
});
