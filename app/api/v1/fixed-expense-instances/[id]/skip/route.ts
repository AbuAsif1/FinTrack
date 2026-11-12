import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const instance = await prisma.fixedExpenseInstance.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!instance) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  if (instance.status !== 'PENDING') {
    return Response.json({ error: 'Only PENDING instances can be skipped', code: 'INVALID_STATUS' }, { status: 422 });
  }

  const body = await req.json().catch(() => ({}));
  const { note } = body as { note?: string };

  const updated = await prisma.fixedExpenseInstance.update({
    where: { id: params.id },
    data: { status: 'SKIPPED', note: note ?? null },
  });

  return Response.json({ id: updated.id, status: 'SKIPPED', note: updated.note });
}
