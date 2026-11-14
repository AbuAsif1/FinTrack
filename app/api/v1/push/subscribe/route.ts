import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser, AuthError } from '@/lib/auth';

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    auth: z.string().min(1),
    p256dh: z.string().min(1),
  }),
  device_label: z.string().max(100).optional().nullable(),
});

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

export async function POST(req: Request) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try {
    user = await getAuthUser(req);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const body = await req.json().catch(() => null);
  const r = subscribeSchema.safeParse(body);
  if (!r.success) {
    return Response.json({ error: 'Validation failed', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  // Upsert by endpoint (same endpoint = same device re-subscribing after expiry)
  const sub = await prisma.pushSubscription.upsert({
    where: { userId_endpoint: { userId: user.id, endpoint: r.data.endpoint } },
    create: {
      userId: user.id,
      endpoint: r.data.endpoint,
      authKey: r.data.keys.auth,
      p256dhKey: r.data.keys.p256dh,
      deviceLabel: r.data.device_label ?? null,
      lastActiveAt: new Date(),
    },
    update: {
      authKey: r.data.keys.auth,
      p256dhKey: r.data.keys.p256dh,
      deviceLabel: r.data.device_label ?? null,
      lastActiveAt: new Date(),
    },
  });

  return Response.json(subToJson(sub), { status: 201 });
}
