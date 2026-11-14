import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { toDbDate, fromDbDate } from '@fintrack/shared';
import { toCsv, paisaToBdt, csvResponse } from '@/lib/csv';

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const where: { userId: string; isDeleted: boolean; date?: { gte?: Date; lte?: Date } } = {
    userId: user.id,
    isDeleted: false,
  };
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = toDbDate(from);
    if (to) where.date.lte = toDbDate(to);
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: true, savingsAccount: true },
    orderBy: { date: 'asc' },
  });

  const headers = ['date', 'amount_bdt', 'description', 'category', 'payment_method', 'savings_account', 'loan_person', 'tax_fiscal_year'];
  const rows = transactions.map((t) => [
    fromDbDate(t.date),
    paisaToBdt(t.amountPaisa),
    t.description,
    t.category.name,
    t.paymentMethod,
    t.savingsAccount?.name ?? '',
    '',
    t.taxFiscalYear ?? '',
  ]);

  return csvResponse(toCsv(headers, rows), `transactions_${new Date().toISOString().slice(0, 10)}.csv`);
}
