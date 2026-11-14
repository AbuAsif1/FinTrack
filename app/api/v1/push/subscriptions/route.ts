import { prisma } from '@/lib/prisma';
import { getAuthUser, AuthError } from '@/lib/auth';

function subToJson(s: {
  id: string; endpoint: string; deviceLabel: string | null;
  lastActiveAt: Date | null; createdAt: Date;
}) {
  return {
    id: s.id,
    endpoint: s.endpoint,
    device_label: s.deviceLabel,
    last_active_at: s.lastActiveAt?.toISOString() ?? null,
    created_at: s.createdAt.toISOString(),
  };
}

export async function GET(req: Request) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try {
    user = await getAuthUser(req);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: user.id },
    orderBy: { lastActiveAt: { sort: 'desc', nulls: 'last' } },
  });

  return Response.json(subs.map(subToJson));
}
