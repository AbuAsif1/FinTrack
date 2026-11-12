import { prisma } from '@/lib/prisma';
import { getAdminUser, AuthError } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await getAdminUser(req);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }
  const url = new URL(req.url);
  const user_id = url.searchParams.get('user_id');

  const actions = await prisma.adminAction.findMany({
    where: user_id ? { targetUserId: user_id } : {},
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return Response.json(
    actions.map((a) => ({
      id: a.id,
      admin_id: a.adminId,
      target_user_id: a.targetUserId,
      target_email: a.targetEmail,
      action: a.action,
      detail: a.detail,
      created_at: a.createdAt.toISOString(),
    })),
  );
}
