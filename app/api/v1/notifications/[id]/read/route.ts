import { prisma } from '@/lib/prisma';
import { authenticate } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await authenticate(req);
  if (user instanceof Response) return user;

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
