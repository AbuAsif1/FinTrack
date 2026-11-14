import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { AuthError } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try { user = await getAuthUser(req); } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const { into_tag_id } = await req.json();
  if (!into_tag_id) return Response.json({ error: 'into_tag_id is required', code: 'VALIDATION_ERROR' }, { status: 422 });

  const [sourceTag, targetTag] = await Promise.all([
    prisma.tag.findFirst({ where: { id: params.id, userId: user.id } }),
    prisma.tag.findFirst({ where: { id: into_tag_id, userId: user.id } }),
  ]);
  if (!sourceTag) return Response.json({ error: 'Source tag not found', code: 'NOT_FOUND' }, { status: 404 });
  if (!targetTag) return Response.json({ error: 'Target tag not found', code: 'NOT_FOUND' }, { status: 404 });

  // Move all transaction_tags from source to target (skip duplicates)
  const sourceLinks = await prisma.transactionTag.findMany({ where: { tagId: params.id } });
  for (const link of sourceLinks) {
    await prisma.transactionTag.upsert({
      where: { transactionId_tagId: { transactionId: link.transactionId, tagId: into_tag_id } },
      create: { transactionId: link.transactionId, tagId: into_tag_id },
      update: {},
    });
  }

  // Delete source tag (cascades remaining transaction_tags)
  await prisma.transactionTag.deleteMany({ where: { tagId: params.id } });
  await prisma.tag.delete({ where: { id: params.id } });

  const updated = await prisma.tag.findFirst({
    where: { id: into_tag_id },
    include: { _count: { select: { transactions: true } } },
  });

  return Response.json({ id: updated!.id, name: updated!.name, transaction_count: updated!._count.transactions });
}
