import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { loginSchema } from '@fintrack/shared';
import { prisma } from '@/lib/prisma';
import {
  signAccessToken,
  generateRawToken,
  hashToken,
  setRefreshCookie,
  checkRateLimit,
  recordFailedLogin,
  resetRateLimit,
} from '@/lib/auth';

const REFRESH_TTL_DAYS = 30;

function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'INVALID_JSON' }, { status: 422 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', code: 'VALIDATION_ERROR', fields: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { email, password } = parsed.data;
  const ip = getClientIp(req);
  const ipKey = `ip:${ip}`;
  const emailKey = `email:${email.toLowerCase()}`;

  // Check rate limits before looking up the user
  try {
    await checkRateLimit(ipKey);
    await checkRateLimit(emailKey);
  } catch {
    return NextResponse.json({ error: 'Too many attempts', code: 'RATE_LIMITED' }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Always run bcrypt compare to avoid timing attacks; use a dummy hash when user not found
  const dummyHash = '$2b$12$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  const passwordHash = user?.passwordHash ?? dummyHash;
  const passwordMatch = await bcrypt.compare(password, passwordHash);

  if (!user || !passwordMatch) {
    await recordFailedLogin(ipKey);
    await recordFailedLogin(emailKey);
    return NextResponse.json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }, { status: 401 });
  }

  // Check email verified
  if (!user.emailVerifiedAt) {
    return NextResponse.json({ error: 'Email not verified', code: 'EMAIL_NOT_VERIFIED' }, { status: 403 });
  }

  // Check deactivation
  if (user.deactivatedAt) {
    const now = new Date();
    if (!user.deactivatedUntil || user.deactivatedUntil > now) {
      return NextResponse.json({ error: 'Account deactivated', code: 'ACCOUNT_DEACTIVATED' }, { status: 403 });
    }
    // Deactivation period has passed — clear it
    await prisma.user.update({
      where: { id: user.id },
      data: { deactivatedAt: null, deactivatedUntil: null, deactivationReason: null },
    });
  }

  // Issue tokens
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.refreshToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
  ]);

  await resetRateLimit(ipKey);
  await resetRateLimit(emailKey);

  const accessToken = await signAccessToken(user.id, user.role);

  const responseHeaders = new Headers();
  setRefreshCookie(responseHeaders, rawToken);

  return NextResponse.json(
    { accessToken },
    { status: 200, headers: responseHeaders }
  );
}
