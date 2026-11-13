import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { fromDbDate } from '@fintrack/shared';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const acct = await prisma.savingsAccount.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!acct) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('page_size') ?? '50')));

  const where = {
    userId: user.id,
    isDeleted: false,
    OR: [{ savingsAccountId: params.id }, { bankSourceId: params.id }],
  };
  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: [{ createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaction.count({ where }),
  ]);

  return Response.json({
    transactions: transactions.map((tx) => ({
      id: tx.id,
      amount_paisa: Number(tx.amountPaisa),
      date: fromDbDate(tx.date),
      description: tx.description,
      category_id: tx.categoryId,
      category_name: tx.category.name,
      type: tx.type,
      payment_method: tx.paymentMethod,
      savings_account_id: tx.savingsAccountId,
      idempotency_key: tx.idempotencyKey,
      created_at: tx.createdAt.toISOString(),
      updated_at: tx.updatedAt.toISOString(),
    })),
    total,
    page,
    page_size: pageSize,
  });
}
