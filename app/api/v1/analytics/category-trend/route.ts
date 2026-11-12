import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { todayInDhaka } from '@fintrack/shared';

function monthRange(month: string): { gte: Date; lt: Date } {
  const start = new Date(`${month}-01`);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  return { gte: start, lt: end };
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const url = new URL(req.url);
  const months = Math.min(Math.max(parseInt(url.searchParams.get('months') ?? '12', 10), 1), 36);

  const cm = todayInDhaka().slice(0, 7);
  const monthList: string[] = [];
  let cur = new Date(`${cm}-01`);
  for (let i = 0; i < months; i++) {
    monthList.unshift(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
    cur = new Date(cur.getFullYear(), cur.getMonth() - 1, 1);
  }

  // Get all NONE-type transactions in range
  const rangeStart = new Date(`${monthList[0]}-01`);
  const rangeEnd = new Date(new Date(`${cm}-01`).getFullYear(), new Date(`${cm}-01`).getMonth() + 1, 1);

  const txs = await prisma.transaction.findMany({
    where: { userId: user.id, isDeleted: false, type: 'NONE', date: { gte: rangeStart, lt: rangeEnd } },
    select: { date: true, amountPaisa: true, categoryId: true, category: { select: { name: true } } },
  });

  // Build month × category matrix
  type MonthData = { month: string; categories: Record<string, { name: string; amount_paisa: number }> };
  const matrix: Record<string, MonthData> = {};
  for (const m of monthList) {
    matrix[m] = { month: m, categories: {} };
  }

  for (const tx of txs) {
    const d = tx.date;
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!matrix[m]) continue;
    const catId = tx.categoryId;
    if (!matrix[m].categories[catId]) {
      matrix[m].categories[catId] = { name: tx.category?.name ?? 'Unknown', amount_paisa: 0 };
    }
    matrix[m].categories[catId].amount_paisa += Number(tx.amountPaisa);
  }

  const result = monthList.map((m) => ({
    month: m,
    categories: Object.entries(matrix[m].categories).map(([id, v]) => ({
      category_id: id,
      category_name: v.name,
      amount_paisa: v.amount_paisa,
    })),
  }));

  return Response.json({ months: result });
}
