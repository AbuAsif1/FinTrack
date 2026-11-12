import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { inHandIncome, totalSpending, taxPayments as taxPaymentsFn } from '@/lib/queries/derived';
import { todayInDhaka } from '@fintrack/shared';

function monthRange(month: string): { gte: Date; lt: Date } {
  const start = new Date(`${month}-01`);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  return { gte: start, lt: end };
}

function monthsInRange(from: string, to: string): string[] {
  const months: string[] = [];
  let cur = new Date(`${from}-01`);
  const end = new Date(`${to}-01`);
  while (cur <= end) {
    months.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
  return months;
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const url = new URL(req.url);
  const cm = todayInDhaka().slice(0, 7);
  const from = url.searchParams.get('from') ?? cm;
  const to = url.searchParams.get('to') ?? cm;

  const months = monthsInRange(from, to);

  const rows = await Promise.all(months.map(async (m) => {
    const { gte, lt } = monthRange(m);

    const [income, spending, tax] = await Promise.all([
      inHandIncome(user.id, gte, lt),
      totalSpending(user.id, gte, lt),
      taxPaymentsFn(user.id, gte, lt),
    ]);
    const netSavings = income - spending - tax;
    const savingsRate = income > 0 ? Math.round((netSavings / income) * 10000) : null;

    // TDS: sum of tds_paisa from income entries this month
    const tdsAgg = await prisma.incomeEntry.aggregate({
      where: { userId: user.id, isDeleted: false, month: { gte, lt } },
      _sum: { tdsPaisa: true },
    });
    const tds = Number(tdsAgg._sum.tdsPaisa ?? 0);

    // Fixed expense compliance
    const instances = await prisma.fixedExpenseInstance.findMany({
      where: { userId: user.id, month: new Date(`${m}-01`) },
      select: { status: true },
    });
    const compliance = {
      paid: instances.filter((i) => i.status === 'PAID').length,
      skipped: instances.filter((i) => i.status === 'SKIPPED').length,
      pending: instances.filter((i) => i.status === 'PENDING').length,
    };

    return {
      month: m,
      in_hand_income_paisa: income,
      total_spending_paisa: spending,
      net_savings_paisa: netSavings,
      tds_paisa: tds,
      savings_rate_bps: savingsRate,
      fixed_expense_compliance: compliance,
    };
  }));

  return Response.json({ months: rows });
}
