import { prisma } from '@/lib/prisma';
import { getAuthUser, AuthError } from '@/lib/auth';
import { fromDbDate, fiscalYear } from '@fintrack/shared';

function currentMonthBD(): { year: number; month: number } {
  const now = new Date(Date.now() + 6 * 60 * 60 * 1000);
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

function entryToJson(entry: {
  id: string; month: Date; fiscalYear: string; incomeType: string;
  grossPaisa: bigint; tdsPaisa: bigint; isTaxable: boolean;
  employerName: string | null; payerName: string | null;
  earnedPeriod: string | null; comment: string | null;
  savingsAccountId: string | null; idempotencyKey: string;
  createdAt: Date; updatedAt: Date;
}) {
  const gross = Number(entry.grossPaisa);
  const tds = Number(entry.tdsPaisa);
  return {
    id: entry.id,
    month: fromDbDate(entry.month),
    fiscal_year: entry.fiscalYear,
    income_type: entry.incomeType,
    gross_paisa: gross,
    tds_paisa: tds,
    in_hand_paisa: gross - tds,
    is_taxable: entry.isTaxable,
    employer_name: entry.employerName ?? null,
    payer_name: entry.payerName ?? null,
    earned_period: entry.earnedPeriod ?? null,
    notes: entry.comment ?? null,
    savings_account_id: entry.savingsAccountId ?? null,
    idempotency_key: entry.idempotencyKey,
    created_at: entry.createdAt.toISOString(),
    updated_at: entry.updatedAt.toISOString(),
  };
}

export async function POST(req: Request) {
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

  // Verify no current-month salary exists
  const existing = await prisma.incomeEntry.findFirst({
    where: {
      userId: user.id,
      incomeType: 'SALARY',
      isDeleted: false,
      month: { gte: monthStart, lt: monthEnd },
    },
  });
  if (existing) {
    return Response.json({ error: 'Salary already recorded for this month', code: 'DUPLICATE' }, { status: 409 });
  }

  // Find last salary to copy from
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
    return Response.json({ error: 'No prior salary to base proposal on', code: 'NOT_FOUND' }, { status: 404 });
  }

  const fy = fiscalYear(`${year}-${String(month).padStart(2, '0')}-01`);

  const created = await prisma.incomeEntry.create({
    data: {
      userId: user.id,
      month: monthStart,
      fiscalYear: fy,
      incomeType: 'SALARY',
      grossPaisa: lastSalary.grossPaisa,
      tdsPaisa: lastSalary.tdsPaisa,
      isTaxable: lastSalary.isTaxable,
      employerName: lastSalary.employerName,
      savingsAccountId: lastSalary.savingsAccountId,
      idempotencyKey: `salary-proposal-${user.id}-${year}-${month}`,
    },
  });

  return Response.json(entryToJson(created), { status: 201 });
}
