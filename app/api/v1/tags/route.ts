import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { AuthError } from '@/lib/auth';

export async function GET(req: Request) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try { user = await getAuthUser(req); } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const tags = await prisma.tag.findMany({
    where: { userId: user.id },
    include: { _count: { select: { transactions: true } } },
    orderBy: { name: 'asc' },
  });

  return Response.json(tags.map((t) => ({
    id: t.id,
    name: t.name,
    transaction_count: t._count.transactions,
    created_at: t.createdAt.toISOString(),
  })));
}

export async function POST(req: Request) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try { user = await getAuthUser(req); } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const { name } = await req.json();
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return Response.json({ error: 'name is required', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  const tag = await prisma.tag.upsert({
    where: { userId_name: { userId: user.id, name: name.trim() } },
    create: { userId: user.id, name: name.trim() },
    update: {},
  });

  return Response.json({ id: tag.id, name: tag.name, created_at: tag.createdAt.toISOString() }, { status: 201 });
}
