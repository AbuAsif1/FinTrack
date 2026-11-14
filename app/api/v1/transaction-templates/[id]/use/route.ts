import { prisma } from '@/lib/prisma';
import { getAuthUser, AuthError } from '@/lib/auth';
import type { PaymentMethod } from '@prisma/client';

function templateToJson(t: {
  id: string; name: string; description: string | null;
  amountPaisa: bigint; categoryId: string; paymentMethod: PaymentMethod;
  lastUsedAt: Date | null; createdAt: Date; updatedAt: Date;
}) {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    amount_paisa: Number(t.amountPaisa),
    category_id: t.categoryId,
    payment_method: t.paymentMethod,
    last_used_at: t.lastUsedAt?.toISOString() ?? null,
    created_at: t.createdAt.toISOString(),
    updated_at: t.updatedAt.toISOString(),
  };
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try {
    user = await getAuthUser(req);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const template = await prisma.transactionTemplate.findFirst({
    where: { id: ctx.params.id, userId: user.id },
  });
  if (!template) {
    return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  const updated = await prisma.transactionTemplate.update({
    where: { id: template.id },
    data: { lastUsedAt: new Date() },
  });

  return Response.json(templateToJson(updated));
}
