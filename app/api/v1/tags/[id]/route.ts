import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { AuthError } from '@/lib/auth';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try { user = await getAuthUser(req); } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const tag = await prisma.tag.findFirst({ where: { id: params.id, userId: user.id } });
  if (!tag) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  const { name } = await req.json();
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return Response.json({ error: 'name is required', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  const updated = await prisma.tag.update({
    where: { id: params.id },
    data: { name: name.trim() },
  });

  return Response.json({ id: updated.id, name: updated.name });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try { user = await getAuthUser(req); } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const tag = await prisma.tag.findFirst({ where: { id: params.id, userId: user.id } });
  if (!tag) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  await prisma.transactionTag.deleteMany({ where: { tagId: params.id } });
  await prisma.tag.delete({ where: { id: params.id } });

  return new Response(null, { status: 204 });
}
