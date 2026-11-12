import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  hashToken,
  clearRefreshCookie,
  getRefreshTokenFromCookie,
  checkOrigin,
  AuthError,
} from '@/lib/auth';

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
  const responseHeaders = new Headers();
  clearRefreshCookie(responseHeaders);

  if (rawToken) {
    const tokenHash = hashToken(rawToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true }, { status: 200, headers: responseHeaders });
}
