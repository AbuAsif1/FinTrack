import { prisma } from '@/lib/prisma';
import { getAuthUser, AuthError } from '@/lib/auth';

export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try {
    user = await getAuthUser(req);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const sub = await prisma.pushSubscription.findFirst({
    where: { id: ctx.params.id, userId: user.id },
  });
  if (!sub) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  await prisma.pushSubscription.delete({ where: { id: sub.id } });
  return new Response(null, { status: 204 });
}
