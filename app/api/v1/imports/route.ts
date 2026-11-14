import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const batches = await prisma.importBatch.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      dataset: true,
      filename: true,
      status: true,
      rowCount: true,
      createdAt: true,
      committedAt: true,
      undoneAt: true,
    },
  });

  return Response.json(
    batches.map((b) => ({
      id: b.id,
      dataset: b.dataset,
      filename: b.filename,
      status: b.status,
      row_count: b.rowCount,
      created_at: b.createdAt.toISOString(),
      committed_at: b.committedAt?.toISOString() ?? null,
      undone_at: b.undoneAt?.toISOString() ?? null,
    })),
  );
}
