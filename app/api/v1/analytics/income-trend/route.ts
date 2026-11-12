import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { todayInDhaka, fiscalYear } from '@fintrack/shared';
import { fromDbDate } from '@fintrack/shared';

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const url = new URL(req.url);
  const fy = url.searchParams.get('fiscal_year') ?? fiscalYear(todayInDhaka());

  const fyStartYear = parseInt(fy.split('-')[0], 10);
  const fyStart = new Date(`${fyStartYear}-07-01`);
  const fyEnd = new Date(`${fyStartYear + 1}-07-01`);

  const entries = await prisma.incomeEntry.findMany({
    where: { userId: user.id, isDeleted: false, month: { gte: fyStart, lt: fyEnd } },
    select: { month: true, incomeType: true, grossPaisa: true, tdsPaisa: true },
    orderBy: { month: 'asc' },
  });

  // Group by month → incomeType
  type MonthData = { month: string; by_type: Record<string, { income_type: string; in_hand_paisa: number }> };
  const matrix: Record<string, MonthData> = {};

  for (const entry of entries) {
    const m = fromDbDate(entry.month).slice(0, 7);
    if (!matrix[m]) matrix[m] = { month: m, by_type: {} };
    const inHand = Number(entry.grossPaisa) - Number(entry.tdsPaisa);
    if (!matrix[m].by_type[entry.incomeType]) {
      matrix[m].by_type[entry.incomeType] = { income_type: entry.incomeType, in_hand_paisa: 0 };
    }
    matrix[m].by_type[entry.incomeType].in_hand_paisa += inHand;
  }

  const months = Object.values(matrix).map((md) => ({
    month: md.month,
    income_entries: Object.values(md.by_type),
  }));

  return Response.json({ fiscal_year: fy, months });
}
