import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  signAccessToken,
  generateRawToken,
  hashToken,
  setRefreshCookie,
  clearRefreshCookie,
  getRefreshTokenFromCookie,
  checkOrigin,
  AuthError,
} from '@/lib/auth';

const REFRESH_TTL_DAYS = 30;

export async function POST(req: Request) {
  try {
    checkOrigin(req);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    throw err;
  }

  const rawToken = getRefreshTokenFromCookie(req);
  if (!rawToken) {
    return NextResponse.json({ error: 'No refresh token', code: 'MISSING_TOKEN' }, { status: 401 });
  }

  const tokenHash = hashToken(rawToken);
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Invalid token', code: 'INVALID_TOKEN' }, { status: 401 });
  }

  // Revoked token: revoke all sessions for this user
  if (existing.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    const responseHeaders = new Headers();
    clearRefreshCookie(responseHeaders);
    return NextResponse.json({ error: 'Token reuse detected', code: 'TOKEN_REUSE' }, { status: 401, headers: responseHeaders });
  }

  // Expired token
  if (existing.expiresAt < new Date()) {
    await prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });
    const responseHeaders = new Headers();
    clearRefreshCookie(responseHeaders);
    return NextResponse.json({ error: 'Token expired', code: 'TOKEN_EXPIRED' }, { status: 401, headers: responseHeaders });
  }

  const user = existing.user;

  // Check deactivation
  if (user.deactivatedAt) {
    const now = new Date();
    if (!user.deactivatedUntil || user.deactivatedUntil > now) {
      return NextResponse.json({ error: 'Account deactivated', code: 'ACCOUNT_DEACTIVATED' }, { status: 403 });
    }
  }

  // Rotate: revoke old, issue new
  const newRawToken = generateRawToken();
  const newTokenHash = hashToken(newRawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    }),
    prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: newTokenHash, expiresAt },
    }),
  ]);

  const accessToken = await signAccessToken(user.id, user.role);

  const responseHeaders = new Headers();
  setRefreshCookie(responseHeaders, newRawToken);

  return NextResponse.json({ accessToken }, { status: 200, headers: responseHeaders });
}
