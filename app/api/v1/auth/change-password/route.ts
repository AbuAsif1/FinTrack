import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { changePasswordSchema } from '@fintrack/shared';
import { prisma } from '@/lib/prisma';
import { getAuthUser, AuthError } from '@/lib/auth';

const BCRYPT_COST = 12;

export async function POST(req: Request) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try {
    user = await getAuthUser(req);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    throw err;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'INVALID_JSON' }, { status: 422 });
  }

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', code: 'VALIDATION_ERROR', fields: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { currentPassword, newPassword } = parsed.data;

  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

  if (!dbUser.passwordHash) {
    return NextResponse.json({ error: 'No password set', code: 'NO_PASSWORD' }, { status: 422 });
  }

  const match = await bcrypt.compare(currentPassword, dbUser.passwordHash);
  if (!match) {
    return NextResponse.json({ error: 'Wrong current password', code: 'WRONG_PASSWORD' }, { status: 422 });
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_COST);

  // Update password and revoke all OTHER sessions (not the current one — no access token stored)
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } }),
    prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true }, { status: 200 });
}
