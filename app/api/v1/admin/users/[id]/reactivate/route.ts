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

  await prisma.user.update({
    where: { id: params.id },
    data: { deactivatedAt: null, deactivatedUntil: null, deactivationReason: null },
  });

  await logAdminAction(admin.id, target.id, target.email, 'REACTIVATE_USER');
  return Response.json({ status: 'active' });
}
