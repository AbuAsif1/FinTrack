import { prisma } from '@/lib/prisma';
import { getAuthUser, AuthError } from '@/lib/auth';
import { fromDbDate } from '@fintrack/shared';
import type { PaymentMethod } from '@prisma/client';

const VALID_METHODS: PaymentMethod[] = ['CASH', 'BKASH', 'BANK', 'CARD'];

export async function GET(req: Request, { params }: { params: { method: string } }) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try {
    user = await getAuthUser(req);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const method = params.method.toUpperCase() as PaymentMethod;
  if (!VALID_METHODS.includes(method)) {
    return Response.json({ error: 'Invalid payment method', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  const url = new URL(req.url);
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 50;

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id, paymentMethod: method, isDeleted: false },
    include: { category: { select: { id: true, name: true, colorHex: true } } },
    orderBy: { date: 'desc' },
    take: limit,
  });

  return Response.json({
    transactions: transactions.map((t) => ({
      id: t.id,
      date: fromDbDate(t.date),
      amount_paisa: Number(t.amountPaisa),
      description: t.description,
      type: t.type,
      category: { id: t.category.id, name: t.category.name, color: t.category.colorHex },
    })),
  });
}
