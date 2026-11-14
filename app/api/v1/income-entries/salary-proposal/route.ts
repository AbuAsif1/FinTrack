import { prisma } from '@/lib/prisma';
import { getAuthUser, AuthError } from '@/lib/auth';
import { fromDbDate } from '@fintrack/shared';

// Bangladesh is UTC+6; use that offset to determine "current month"
function currentMonthBD(): { year: number; month: number } {
  const now = new Date(Date.now() + 6 * 60 * 60 * 1000);
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

export async function GET(req: Request) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try {
    user = await getAuthUser(req);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const { year, month } = currentMonthBD();
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));

  // Check if current month already has a SALARY entry
  const currentMonthSalary = await prisma.incomeEntry.findFirst({
    where: {
      userId: user.id,
      incomeType: 'SALARY',
      isDeleted: false,
      month: { gte: monthStart, lt: monthEnd },
    },
  });

  if (currentMonthSalary) {
    return Response.json({ has_proposal: false, this_month_has_salary: true });
  }

  // Find most recent SALARY entry from a prior month
  const lastSalary = await prisma.incomeEntry.findFirst({
    where: {
      userId: user.id,
      incomeType: 'SALARY',
      isDeleted: false,
      month: { lt: monthStart },
    },
    orderBy: { month: 'desc' },
  });

  if (!lastSalary) {
    return Response.json({ has_proposal: false, this_month_has_salary: false });
  }

  return Response.json({
    has_proposal: true,
    this_month_has_salary: false,
    last_salary: {
      gross_paisa: Number(lastSalary.grossPaisa),
      tds_paisa: Number(lastSalary.tdsPaisa),
      employer_name: lastSalary.employerName ?? null,
      savings_account_id: lastSalary.savingsAccountId ?? null,
      month: fromDbDate(lastSalary.month),
    },
  });
}
