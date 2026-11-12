import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const notif = await prisma.notification.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!notif) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  const updated = await prisma.notification.update({
    where: { id: params.id },
    data: { isRead: true },
  });

  return Response.json({ id: updated.id, is_read: updated.isRead });
}
