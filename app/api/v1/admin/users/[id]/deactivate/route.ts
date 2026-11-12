import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAdminUser } from '@/lib/auth';
import { adminGuards, AdminGuardError, logAdminAction } from '@/lib/admin-helpers';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminUser(req);
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  try {
    adminGuards(admin.id, target);
  } catch (err) {
    if (err instanceof AdminGuardError) return Response.json({ error: err.code, code: err.code }, { status: err.status });
    throw err;
  }

  const body = await req.json().catch(() => ({}));
  const r = z
    .object({
      until: z.string().optional(),
      reason: z.string().optional(),
    })
    .safeParse(body);
  if (!r.success) {
    return Response.json({ error: 'Validation failed', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  // Revoke all active refresh tokens
  await prisma.refreshToken.updateMany({
    where: { userId: params.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  const deactivatedUntil = r.data.until ? new Date(r.data.until) : null;
  await prisma.user.update({
    where: { id: params.id },
    data: {
      deactivatedAt: new Date(),
      deactivatedUntil,
      deactivationReason: r.data.reason ?? null,
    },
  });

  await logAdminAction(
    admin.id,
    target.id,
    target.email,
    'DEACTIVATE_USER',
    r.data.until ? `until=${r.data.until}` : 'indefinite',
  );
  return Response.json({ status: 'deactivated' });
}
