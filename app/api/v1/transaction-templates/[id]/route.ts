import { z } from 'zod';
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

async function getOwnedTemplate(userId: string, id: string) {
  const t = await prisma.transactionTemplate.findFirst({ where: { id, userId } });
  return t;
}

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  amount_paisa: z.number().int().positive().optional(),
  category_id: z.string().min(1).optional(),
  payment_method: z.enum(['CASH', 'BKASH', 'BANK', 'CARD']).optional(),
});

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try {
    user = await getAuthUser(req);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const template = await getOwnedTemplate(user.id, ctx.params.id);
  if (!template) {
    return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const r = patchSchema.safeParse(body);
  if (!r.success) {
    return Response.json({ error: 'Validation failed', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  if (r.data.category_id) {
    const cat = await prisma.category.findFirst({ where: { id: r.data.category_id, userId: user.id } });
    if (!cat) return Response.json({ error: 'Category not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  const updated = await prisma.transactionTemplate.update({
    where: { id: template.id },
    data: {
      ...(r.data.name !== undefined && { name: r.data.name }),
      ...(r.data.description !== undefined && { description: r.data.description }),
      ...(r.data.amount_paisa !== undefined && { amountPaisa: BigInt(r.data.amount_paisa) }),
      ...(r.data.category_id !== undefined && { categoryId: r.data.category_id }),
      ...(r.data.payment_method !== undefined && { paymentMethod: r.data.payment_method as PaymentMethod }),
    },
  });

  return Response.json(templateToJson(updated));
}

export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try {
    user = await getAuthUser(req);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const template = await getOwnedTemplate(user.id, ctx.params.id);
  if (!template) {
    return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  await prisma.transactionTemplate.delete({ where: { id: template.id } });
  return new Response(null, { status: 204 });
}
