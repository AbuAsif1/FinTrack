import { SignJWT, jwtVerify } from 'jose';
import { createHash, randomBytes } from 'crypto';
import { prisma } from './prisma';
import type { UserRole } from '@prisma/client';

export class AuthError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message?: string
  ) {
    super(message ?? code);
  }
}

export const REFRESH_COOKIE = 'refresh_token';
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds
const ACCESS_TTL = 15 * 60; // 15 minutes in seconds

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export interface AuthUser {
  id: string;
  role: UserRole;
}

export async function signAccessToken(userId: string, role: UserRole): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL}s`)
    .sign(getJwtSecret());
}

export async function verifyAccessToken(token: string): Promise<AuthUser> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (!payload.sub) throw new AuthError(401, 'INVALID_TOKEN');
    return { id: payload.sub, role: (payload.role as UserRole) ?? 'USER' };
  } catch (err) {
    if (err instanceof AuthError) throw err;
    throw new AuthError(401, 'INVALID_TOKEN');
  }
}

export async function getAuthUser(req: Request): Promise<AuthUser> {
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ')) throw new AuthError(401, 'MISSING_TOKEN');
  return verifyAccessToken(auth.slice(7));
}

export async function getAdminUser(req: Request): Promise<AuthUser> {
  const user = await getAuthUser(req);
  if (user.role !== 'ADMIN') throw new AuthError(403, 'ADMIN_ONLY');
  return user;
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function generateRawToken(): string {
  return randomBytes(32).toString('hex');
}

export function setRefreshCookie(headers: Headers, rawToken: string): void {
  // Omit Secure in development so the cookie works on HTTP localhost in E2E tests.
  // Playwright Chromium does not reliably send Secure cookies on HTTP even with
  // the localhost exception when cookies are set via client-side XHR.
  const parts = [
    `${REFRESH_COOKIE}=${rawToken}`,
    `HttpOnly`,
    ...(process.env.NODE_ENV === 'production' ? [`Secure`] : []),
    `SameSite=Strict`,
    `Path=/`,
    `Max-Age=${REFRESH_MAX_AGE}`,
  ];
  headers.append('Set-Cookie', parts.join('; '));
}

export function clearRefreshCookie(headers: Headers): void {
  const parts = [
    `${REFRESH_COOKIE}=`,
    `HttpOnly`,
    ...(process.env.NODE_ENV === 'production' ? [`Secure`] : []),
    `SameSite=Strict`,
    `Path=/`,
    `Max-Age=0`,
  ];
  headers.append('Set-Cookie', parts.join('; '));
}

export function getRefreshTokenFromCookie(req: Request): string | null {
  const cookieHeader = req.headers.get('cookie') ?? '';
  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === REFRESH_COOKIE) return rest.join('=');
  }
  return null;
}

export function checkOrigin(req: Request): void {
  const origin = req.headers.get('origin');
  if (!origin) return; // absent = same-origin browser request; allow
  // In development allow any localhost origin regardless of port so E2E tests
  // work when the dev server starts on a different port than APP_URL.
  if (process.env.NODE_ENV !== 'production') {
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) return;
  }
  const appOrigin = process.env.APP_URL ?? '';
  if (appOrigin && origin !== appOrigin) {
    throw new AuthError(403, 'INVALID_ORIGIN');
  }
}

// ---------------------------------------------------------------------------
// Rate limiting helpers (auth_rate_limits)
// ---------------------------------------------------------------------------

const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10;

export async function checkRateLimit(key: string): Promise<void> {
  const now = new Date();
  const record = await prisma.authRateLimit.findUnique({ where: { key } });

  if (record) {
    const windowAge = now.getTime() - record.windowStart.getTime();
    if (windowAge < RATE_WINDOW_MS && record.attempts >= MAX_ATTEMPTS) {
      throw new AuthError(429, 'RATE_LIMITED');
    }
  }
}

export async function recordFailedLogin(key: string): Promise<void> {
  const now = new Date();
  const record = await prisma.authRateLimit.findUnique({ where: { key } });

  if (!record || now.getTime() - record.windowStart.getTime() >= RATE_WINDOW_MS) {
    await prisma.authRateLimit.upsert({
      where: { key },
      create: { key, windowStart: now, attempts: 1 },
      update: { windowStart: now, attempts: 1 },
    });
  } else {
    await prisma.authRateLimit.update({
      where: { key },
      data: { attempts: { increment: 1 } },
    });
  }
}

export async function resetRateLimit(key: string): Promise<void> {
  await prisma.authRateLimit.deleteMany({ where: { key } }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Registration/resend/reset rate limiting — 5 per IP and per email per hour
// ---------------------------------------------------------------------------

const REG_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const REG_MAX = 5;

export async function checkRegRateLimit(key: string): Promise<void> {
  const now = new Date();
  const record = await prisma.authRateLimit.findUnique({ where: { key } });
  if (record) {
    const age = now.getTime() - record.windowStart.getTime();
    if (age < REG_WINDOW_MS && record.attempts >= REG_MAX) {
      throw new AuthError(429, 'RATE_LIMITED');
    }
  }
}

export async function recordRegAttempt(key: string): Promise<void> {
  const now = new Date();
  const record = await prisma.authRateLimit.findUnique({ where: { key } });
  if (!record || now.getTime() - record.windowStart.getTime() >= REG_WINDOW_MS) {
    await prisma.authRateLimit.upsert({
      where: { key },
      create: { key, windowStart: now, attempts: 1 },
      update: { windowStart: now, attempts: 1 },
    });
  } else {
    await prisma.authRateLimit.update({
      where: { key },
      data: { attempts: { increment: 1 } },
    });
  }
}
