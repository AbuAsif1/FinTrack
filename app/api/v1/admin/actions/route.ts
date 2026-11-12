import { prisma } from '@/lib/prisma';
import { getAdminUser } from '@/lib/auth';

export async function GET(req: Request) {
  await getAdminUser(req);
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
