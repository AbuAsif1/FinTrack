import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { toDbDate, fromDbDate, fiscalYear } from '@fintrack/shared';
import type { IncomeType } from '@prisma/client';

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
  savingsAccountId: string | null;
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
    notes: entry.comment ?? null,
    savings_account_id: entry.savingsAccountId ?? null,
    idempotency_key: entry.idempotencyKey,
    created_at: entry.createdAt.toISOString(),
    updated_at: entry.updatedAt.toISOString(),
  };
}

async function checkFYLocked(userId: string, fy: string) {
  const taxYear = await prisma.taxYear.findUnique({
    where: { userId_fiscalYear: { userId, fiscalYear: fy } },
  });
  return taxYear?.isLocked ?? false;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const entry = await prisma.incomeEntry.findFirst({
    where: { id: params.id, userId: user.id, isDeleted: false },
  });
  if (!entry) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  if (await checkFYLocked(user.id, entry.fiscalYear)) {
    return Response.json({ error: 'Fiscal year is locked', code: 'TAX_YEAR_LOCKED' }, { status: 409 });
  }

  const body = await req.json();
  const {
    month, income_type, gross_paisa, tds_paisa,
    is_taxable, employer_name, payer_name, earned_period, comment, notes,
    savings_account_id,
  } = body;

  const newGross = gross_paisa != null ? Number(gross_paisa) : Number(entry.grossPaisa);
  const newTds = tds_paisa != null ? Number(tds_paisa) : Number(entry.tdsPaisa);
  if (newTds < 0 || newTds > newGross) {
    return Response.json({ error: 'TDS must be between 0 and gross', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  let newFY = entry.fiscalYear;
  if (month) {
    newFY = fiscalYear(`${month}-01`);
    if (await checkFYLocked(user.id, newFY)) {
      return Response.json({ error: 'Target fiscal year is locked', code: 'TAX_YEAR_LOCKED' }, { status: 409 });
    }
  }

  const updated = await prisma.incomeEntry.update({
    where: { id: params.id },
    data: {
      ...(month && { month: toDbDate(`${month}-01`), fiscalYear: newFY }),
      ...(income_type && { incomeType: income_type as IncomeType }),
      ...(gross_paisa != null && { grossPaisa: BigInt(gross_paisa) }),
      ...(tds_paisa != null && { tdsPaisa: BigInt(tds_paisa) }),
      ...(is_taxable !== undefined && { isTaxable: is_taxable }),
      ...(employer_name !== undefined && { employerName: employer_name ?? null }),
      ...(payer_name !== undefined && { payerName: payer_name ?? null }),
      ...(earned_period !== undefined && { earnedPeriod: earned_period ?? null }),
      ...((comment !== undefined || notes !== undefined) && { comment: notes ?? comment ?? null }),
      ...(savings_account_id !== undefined && { savingsAccountId: savings_account_id ?? null }),
    },
  });

  return Response.json(entryToJson(updated));
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const entry = await prisma.incomeEntry.findFirst({
    where: { id: params.id, userId: user.id, isDeleted: false },
  });
  if (!entry) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  if (await checkFYLocked(user.id, entry.fiscalYear)) {
    return Response.json({ error: 'Fiscal year is locked', code: 'TAX_YEAR_LOCKED' }, { status: 409 });
  }

  await prisma.incomeEntry.update({
    where: { id: params.id },
    data: { isDeleted: true, deletedAt: new Date() },
  });

  return new Response(null, { status: 204 });
}
