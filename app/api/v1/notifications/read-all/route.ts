import { prisma } from '@/lib/prisma';
import { authenticate } from '@/lib/auth';

export async function POST(req: Request) {
  const user = await authenticate(req);
  if (user instanceof Response) return user;

  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });

  return Response.json({ ok: true });
}
