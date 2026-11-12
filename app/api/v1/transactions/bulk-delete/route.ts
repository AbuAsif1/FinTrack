import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  const body = await req.json().catch(() => null);
  const r = z.object({ ids: z.array(z.string()).min(1).max(100) }).safeParse(body);
  if (!r.success) {
    return Response.json({ error: 'Validation failed', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  await prisma.transaction.updateMany({
    where: { id: { in: r.data.ids }, userId: user.id, isDeleted: false },
    data: { isDeleted: true, deletedAt: new Date() },
  });
  return new Response(null, { status: 204 });
}
