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

export async function GET(req: Request) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try {
    user = await getAuthUser(req);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const templates = await prisma.transactionTemplate.findMany({
    where: { userId: user.id },
    orderBy: [
      { lastUsedAt: { sort: 'desc', nulls: 'last' } },
      { createdAt: 'desc' },
    ],
  });

  return Response.json(templates.map(templateToJson));
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  amount_paisa: z.number().int().positive(),
  category_id: z.string().min(1),
  payment_method: z.enum(['CASH', 'BKASH', 'BANK', 'CARD']),
});

export async function POST(req: Request) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try {
    user = await getAuthUser(req);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const body = await req.json().catch(() => null);
  const r = createSchema.safeParse(body);
  if (!r.success) {
    return Response.json({ error: 'Validation failed', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  // Verify category belongs to this user
  const category = await prisma.category.findFirst({
    where: { id: r.data.category_id, userId: user.id },
  });
  if (!category) {
    return Response.json({ error: 'Category not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  const template = await prisma.transactionTemplate.create({
    data: {
      userId: user.id,
      name: r.data.name,
      description: r.data.description ?? null,
      amountPaisa: BigInt(r.data.amount_paisa),
      categoryId: r.data.category_id,
      paymentMethod: r.data.payment_method as PaymentMethod,
    },
  });

  return Response.json(templateToJson(template), { status: 201 });
}
