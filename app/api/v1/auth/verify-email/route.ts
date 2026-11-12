import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashToken } from '@/lib/auth';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const result = z.object({ token: z.string() }).safeParse(body);
  if (!result.success) {
    return Response.json({ error: 'Token is required', code: 'INVALID_TOKEN' }, { status: 422 });
  }

  const tokenHash = hashToken(result.data.token);
  const record = await prisma.emailToken.findUnique({ where: { tokenHash } });

  if (!record || record.purpose !== 'VERIFY_EMAIL') {
    return Response.json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' }, { status: 422 });
  }

  if (record.usedAt) {
    return Response.json({ error: 'Token already used', code: 'TOKEN_USED' }, { status: 422 });
  }

  if (record.expiresAt < new Date()) {
    return Response.json({ error: 'Token expired', code: 'TOKEN_EXPIRED' }, { status: 422 });
  }

  await prisma.$transaction([
    prisma.emailToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
  ]);

  return Response.json({ message: 'Email verified' });
}
