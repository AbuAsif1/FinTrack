import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { toDbDate, fromDbDate, fiscalYear } from '@fintrack/shared';
import type { IncomeType } from '@prisma/client';

const NOT_TAXABLE_BY_DEFAULT: IncomeType[] = ['CERTIFICATION'];

function entryToJson(entry: {
  id: string;
  month: Date;
  fiscalYear: string;
  incomeType: string;
  grossPaisa: bigint;
  tdsPaisa: bigint;
  isTaxable: boolean;
  employerName: string | null;
  payerName: string | null;
  earnedPeriod: string | null;
  comment: string | null;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
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
    comment: entry.comment ?? null,
    idempotency_key: entry.idempotencyKey,
    created_at: entry.createdAt.toISOString(),
    updated_at: entry.updatedAt.toISOString(),
  };
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const url = new URL(req.url);
  const fy = url.searchParams.get('fiscal_year');
  const month = url.searchParams.get('month');

  const where: { userId: string; isDeleted: boolean; fiscalYear?: string; month?: { gte: Date; lte: Date } } = {
    userId: user.id,
    isDeleted: false,
  };
  if (fy) where.fiscalYear = fy;
  if (month) {
    const monthStart = toDbDate(`${month}-01`);
    const monthEnd = toDbDate(`${month}-31`); // Prisma handles this fine for lte
    where.month = { gte: monthStart, lte: monthEnd };
  }

  const entries = await prisma.incomeEntry.findMany({
    where,
    orderBy: [{ month: 'desc' }, { createdAt: 'desc' }],
  });

  return Response.json(entries.map(entryToJson));
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const body = await req.json();
  const {
    month, income_type, gross_paisa, tds_paisa = 0,
    is_taxable, employer_name, payer_name, earned_period,
    comment, idempotency_key,
  } = body;

  if (!month || !income_type || gross_paisa == null || !idempotency_key) {
    return Response.json({ error: 'Missing required fields', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  if (tds_paisa < 0 || tds_paisa > gross_paisa) {
    return Response.json({ error: 'TDS must be between 0 and gross', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  const fy = fiscalYear(`${month}-01`);

  // Check if FY is locked
  const taxYear = await prisma.taxYear.findUnique({
    where: { userId_fiscalYear: { userId: user.id, fiscalYear: fy } },
  });
  if (taxYear?.isLocked) {
    return Response.json({ error: 'Fiscal year is locked', code: 'TAX_YEAR_LOCKED' }, { status: 409 });
  }

  // Idempotency check
  const dup = await prisma.incomeEntry.findUnique({
    where: { userId_idempotencyKey: { userId: user.id, idempotencyKey: idempotency_key } },
  });
  if (dup) {
    return Response.json({ code: 'DUPLICATE', entry: entryToJson(dup) }, { status: 409 });
  }

  const taxable = is_taxable !== undefined ? is_taxable : !NOT_TAXABLE_BY_DEFAULT.includes(income_type as IncomeType);

  const entry = await prisma.incomeEntry.create({
    data: {
      userId: user.id,
      month: toDbDate(`${month}-01`),
      fiscalYear: fy,
      incomeType: income_type as IncomeType,
      grossPaisa: BigInt(gross_paisa),
      tdsPaisa: BigInt(tds_paisa),
      isTaxable: taxable,
      employerName: employer_name ?? null,
      payerName: payer_name ?? null,
      earnedPeriod: earned_period ?? null,
      comment: comment ?? null,
      idempotencyKey: idempotency_key,
    },
  });

  return Response.json(entryToJson(entry), { status: 201 });
}
