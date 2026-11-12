import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { CategoryRoutingService, RoutingError } from '@/lib/services/category-routing';
import { toDbDate } from '@fintrack/shared';

const PaymentMethodEnum = z.enum(['CASH', 'BKASH', 'BANK', 'CARD']);

const createSchema = z.object({
  amount_paisa: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1),
  category_id: z.string().min(1),
  payment_method: PaymentMethodEnum,
  idempotency_key: z.string().min(1),
  savings_account_id: z.string().optional(),
  loan_person_id: z.string().optional(),
  loan_person_name: z.string().optional(),
  return_due_date: z.string().optional(),
  reason: z.string().optional(),
  tax_fiscal_year: z.string().optional(),
});

function txRow(tx: {
  id: string;
  amountPaisa: bigint;
  date: Date;
  description: string;
  categoryId: string;
  category: { name: string };
  type: string;
  paymentMethod: string;
  savingsAccountId: string | null;
  taxFiscalYear: string | null;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
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
  };
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  const url = new URL(req.url);

  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const category_id = url.searchParams.get('category_id');
  const payment_method = url.searchParams.get('payment_method');
  const type = url.searchParams.get('type');
  const min_paisa = url.searchParams.get('min_paisa');
  const max_paisa = url.searchParams.get('max_paisa');
  const q = url.searchParams.get('q');
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const page_size = Math.min(100, Math.max(1, parseInt(url.searchParams.get('page_size') ?? '20', 10)));

  // Build amount filter
  const amountFilter: { gte?: bigint; lte?: bigint } = {};
  if (min_paisa) amountFilter.gte = BigInt(min_paisa);
  if (max_paisa) amountFilter.lte = BigInt(max_paisa);

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (from) dateFilter.gte = toDbDate(from);
  if (to) dateFilter.lte = toDbDate(to);

  const where = {
    userId: user.id,
    isDeleted: false,
    ...((from || to) && { date: dateFilter }),
    ...(category_id && { categoryId: category_id }),
    ...(payment_method && { paymentMethod: payment_method as any }),
    ...(type && { type: type as any }),
    ...((min_paisa || max_paisa) && { amountPaisa: amountFilter }),
    ...(q && { description: { contains: q, mode: 'insensitive' as const } }),
  };

  const [total, items] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * page_size,
      take: page_size,
    }),
  ]);

  return Response.json({ data: items.map(txRow), total, page, page_size });
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  const body = await req.json().catch(() => null);
  const r = createSchema.safeParse(body);
  if (!r.success) {
    return Response.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', fields: r.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  try {
    const svc = new CategoryRoutingService(user.id);
    const result = await svc.create(r.data);
    if (result.duplicate) {
      return Response.json({ code: 'DUPLICATE', transaction: result.transaction }, { status: 409 });
    }
    return Response.json({ ...result.transaction, routing: result.routing ?? null }, { status: 201 });
  } catch (err) {
    if (err instanceof RoutingError) {
      return Response.json({ error: err.message, code: err.code }, { status: err.status });
    }
    throw err;
  }
}
