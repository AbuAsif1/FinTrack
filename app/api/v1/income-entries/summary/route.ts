import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { toDbDate, fromDbDate } from '@fintrack/shared';

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const url = new URL(req.url);
  const fy = url.searchParams.get('fiscal_year');
  if (!fy) return Response.json({ error: 'fiscal_year is required', code: 'VALIDATION_ERROR' }, { status: 422 });

  // FY months: July YYYY to June YYYY+1
  const [startYearStr] = fy.split('-');
  const startYear = Number(startYearStr);
  const months: string[] = [];
  for (let m = 7; m <= 12; m++) {
    months.push(`${startYear}-${String(m).padStart(2, '0')}`);
  }
  for (let m = 1; m <= 6; m++) {
    months.push(`${startYear + 1}-${String(m).padStart(2, '0')}`);
  }

  const fyStart = toDbDate(`${startYear}-07-01`);
  const fyEnd = toDbDate(`${startYear + 1}-06-30`);

  const entries = await prisma.incomeEntry.findMany({
    where: { userId: user.id, isDeleted: false, month: { gte: fyStart, lte: fyEnd } },
    orderBy: { month: 'asc' },
  });

  // Build month rows
  const rows = months.map((m) => {
    const monthEntries = entries.filter((e) => fromDbDate(e.month).slice(0, 7) === m);
    const byType: Record<string, number> = {};
    let totalGross = 0;
    let totalTds = 0;
    for (const e of monthEntries) {
      const g = Number(e.grossPaisa);
      const t = Number(e.tdsPaisa);
      byType[e.incomeType] = (byType[e.incomeType] ?? 0) + g;
      totalGross += g;
      totalTds += t;
    }
    return {
      month: m,
      status: monthEntries.length > 0 ? 'ENTERED' : 'PENDING',
      by_type: byType,
      gross_paisa: totalGross,
      tds_paisa: totalTds,
      in_hand_paisa: totalGross - totalTds,
    };
  });

  // Year totals
  const yearGross = entries.reduce((sum, e) => sum + Number(e.grossPaisa), 0);
  const yearTds = entries.reduce((sum, e) => sum + Number(e.tdsPaisa), 0);

  // Salary history timeline: unique gross amounts, keyed by first month they appear
  const salaryEntries = entries.filter((e) => e.incomeType === 'SALARY').sort(
    (a, b) => a.month.getTime() - b.month.getTime(),
  );
  const salaryHistory: Array<{ month: string; gross_paisa: number }> = [];
  let lastSalary: number | null = null;
  for (const e of salaryEntries) {
    const g = Number(e.grossPaisa);
    if (g !== lastSalary) {
      salaryHistory.push({ month: fromDbDate(e.month).slice(0, 7), gross_paisa: g });
      lastSalary = g;
    }
  }

  // Latest salary entry for pre-fill
  const latestSalary = salaryEntries[salaryEntries.length - 1] ?? null;

  return Response.json({
    fiscal_year: fy,
    months: rows,
    totals: {
      gross_paisa: yearGross,
      tds_paisa: yearTds,
      in_hand_paisa: yearGross - yearTds,
    },
    salary_history: salaryHistory,
    latest_salary: latestSalary
      ? {
          month: fromDbDate(latestSalary.month).slice(0, 7),
          gross_paisa: Number(latestSalary.grossPaisa),
          tds_paisa: Number(latestSalary.tdsPaisa),
          employer_name: latestSalary.employerName ?? null,
        }
      : null,
  });
}
