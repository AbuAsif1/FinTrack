import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { fromDbDate } from '@fintrack/shared';
import { toCsv, paisaToBdt, csvResponse } from '@/lib/csv';

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const url = new URL(req.url);
  const fy = url.searchParams.get('fiscal_year');

  const where: { userId: string; isDeleted: boolean; fiscalYear?: string } = {
    userId: user.id,
    isDeleted: false,
  };
  if (fy) where.fiscalYear = fy;

  const entries = await prisma.incomeEntry.findMany({
    where,
    orderBy: { month: 'asc' },
  });

  const headers = ['month', 'income_type', 'gross_bdt', 'tds_bdt', 'is_taxable', 'employer_name', 'payer_name', 'earned_period', 'comment'];
  const rows = entries.map((e) => {
    const monthStr = fromDbDate(e.month).slice(0, 7); // YYYY-MM
    return [
      monthStr,
      e.incomeType,
      paisaToBdt(e.grossPaisa),
      paisaToBdt(e.tdsPaisa),
      String(e.isTaxable),
      e.employerName ?? '',
      e.payerName ?? '',
      e.earnedPeriod ?? '',
      e.comment ?? '',
    ];
  });

  const filename = fy ? `income_${fy}.csv` : `income_${new Date().toISOString().slice(0, 10)}.csv`;
  return csvResponse(toCsv(headers, rows), filename);
}
