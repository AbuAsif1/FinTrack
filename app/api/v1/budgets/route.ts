import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { toDbDate, fromDbDate, todayInDhaka } from '@fintrack/shared';

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const url = new URL(req.url);
  const month = url.searchParams.get('month') ?? todayInDhaka().slice(0, 7);

  // Spending categories with active budgets effective for this month
  const monthDate = new Date(`${month}-01`);
  const nextMonthDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);

  // Get all budget rows up to this month, pick latest per category
  const budgetRows = await prisma.budget.findMany({
    where: { userId: user.id },
    orderBy: { effectiveFromMonth: 'desc' },
    include: { category: { select: { id: true, name: true, colorHex: true } } },
  });

  const latestByCategory: Record<string, typeof budgetRows[0]> = {};
  for (const b of budgetRows) {
    const bMonth = fromDbDate(b.effectiveFromMonth).slice(0, 7);
    if (bMonth <= month && !(b.categoryId in latestByCategory)) {
      latestByCategory[b.categoryId] = b;
    }
  }

  const result = [];
  for (const b of Object.values(latestByCategory)) {
    if (!b.monthlyLimitPaisa) continue; // deleted budget

    const spending = await prisma.transaction.aggregate({
      where: {
        userId: user.id,
        isDeleted: false,
        categoryId: b.categoryId,
        date: { gte: monthDate, lt: nextMonthDate },
      },
      _sum: { amountPaisa: true },
    });

    const spent = Number(spending._sum.amountPaisa ?? 0);
    const limit = Number(b.monthlyLimitPaisa);
    const remaining = limit - spent;
    const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
    const state = pct >= 100 ? 'over' : pct >= 70 ? 'warn' : 'ok';

    result.push({
      category_id: b.categoryId,
      category_name: b.category.name,
      category_color: b.category.colorHex,
      monthly_limit_paisa: limit,
      spent_paisa: spent,
      remaining_paisa: remaining,
      pct,
      state,
    });
  }

  return Response.json(result.sort((a, b) => b.pct - a.pct));
}
