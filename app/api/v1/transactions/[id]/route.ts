import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { CategoryRoutingService, RoutingError } from '@/lib/services/category-routing';

const patchSchema = z.object({
  amount_paisa: z.number().int().positive().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  description: z.string().min(1).optional(),
  payment_method: z.enum(['CASH', 'BKASH', 'BANK', 'CARD']).optional(),
  category_id: z.string().optional(),
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  const tx = await prisma.transaction.findFirst({
    where: { id: params.id, userId: user.id, isDeleted: false },
    include: { category: true },
  });
  if (!tx) {
    return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });
  }
  return Response.json({
    id: tx.id,
    amount_paisa: Number(tx.amountPaisa),
    date: tx.date.toISOString().slice(0, 10),
    description: tx.description,
    category_id: tx.categoryId,
    category_name: tx.category.name,
    type: tx.type,
    payment_method: tx.paymentMethod,
    savings_account_id: tx.savingsAccountId,
    tax_fiscal_year: tx.taxFiscalYear,
    idempotency_key: tx.idempotencyKey,
    created_at: tx.createdAt.toISOString(),
    updated_at: tx.updatedAt.toISOString(),
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  const body = await req.json().catch(() => null);
  const r = patchSchema.safeParse(body);
  if (!r.success) {
    return Response.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', fields: r.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  try {
    const svc = new CategoryRoutingService(user.id);
    const updated = await svc.update(params.id, r.data);
    return Response.json(updated);
  } catch (err) {
    if (err instanceof RoutingError) {
      return Response.json({ error: err.message, code: err.code }, { status: err.status });
    }
    throw err;
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  try {
    const svc = new CategoryRoutingService(user.id);
    await svc.softDelete(params.id);
    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof RoutingError) {
      return Response.json({ error: err.message, code: err.code }, { status: err.status });
    }
    throw err;
  }
}
