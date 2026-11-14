import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { hashToken } from '@/lib/auth';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const result = z.object({
    token: z.string(),
    password: z.string().min(10, 'Password must be at least 10 characters'),
  }).safeParse(body);

  if (!result.success) {
    return Response.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', fields: result.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { token, password } = result.data;
  const tokenHash = hashToken(token);
  const record = await prisma.emailToken.findUnique({ where: { tokenHash } });

  if (!record || record.purpose !== 'PASSWORD_RESET') {
    return Response.json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' }, { status: 422 });
  }

  if (record.usedAt) {
    return Response.json({ error: 'Token already used', code: 'TOKEN_USED' }, { status: 422 });
  }

  if (record.expiresAt < new Date()) {
    return Response.json({ error: 'Token expired', code: 'TOKEN_EXPIRED' }, { status: 422 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.emailToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  return Response.json({ message: 'Password has been reset.' });
}
