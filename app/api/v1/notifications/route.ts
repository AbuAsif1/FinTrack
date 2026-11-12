import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { refreshNotifications } from '@/lib/services/notifications';

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  await refreshNotifications(user.id);

  // Return unread first, then resolved within last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const notifications = await prisma.notification.findMany({
    where: {
      userId: user.id,
      OR: [
        { resolvedAt: null },
        { resolvedAt: { gte: sevenDaysAgo } },
      ],
    },
    orderBy: [
      { isRead: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  return Response.json(notifications.map((n) => ({
    id: n.id,
    type: n.type,
    message: n.message,
    entity_type: n.entityType,
    entity_id: n.entityId,
    is_read: n.isRead,
    resolved_at: n.resolvedAt?.toISOString() ?? null,
    created_at: n.createdAt.toISOString(),
  })));
}
