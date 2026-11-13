import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { toDbDate, fromDbDate, todayInDhaka } from '@fintrack/shared';

async function computeBalance(accountId: string, userId: string): Promise<number> {
  const acct = await prisma.savingsAccount.findFirst({
    where: { id: accountId, userId },
  });
  if (!acct) return 0;

  const txSums = await prisma.transaction.groupBy({
    by: ['type'],
    where: { savingsAccountId: accountId, userId, isDeleted: false },
    _sum: { amountPaisa: true },
  });

  let deposit = 0n;
  let interest = 0n;
  let withdrawal = 0n;
  for (const row of txSums) {
    const amount = row._sum.amountPaisa ?? 0n;
    if (row.type === 'SAVINGS_DEPOSIT') deposit = amount;
    else if (row.type === 'SAVINGS_INTEREST') interest = amount;
    else if (row.type === 'SAVINGS_WITHDRAWAL') withdrawal = amount;
  }

  const funded = await prisma.transaction.aggregate({
    where: { bankSourceId: accountId, userId, isDeleted: false },
    _sum: { amountPaisa: true },
  });
  return Number(acct.openingBalancePaisa) + Number(deposit) + Number(interest) - Number(withdrawal) - Number(funded._sum.amountPaisa ?? 0n);
}

function dpsProjectedPrincipal(
  balancePaisa: number,
  monthlyInstallmentPaisa: bigint | null,
  maturityDate: Date | null,
): number | null {
  if (!monthlyInstallmentPaisa || !maturityDate) return null;

  const today = new Date(todayInDhaka());
  // Next month: advance to first of next month
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const maturity = new Date(maturityDate.getFullYear(), maturityDate.getMonth(), 1);

  if (maturity < nextMonth) return balancePaisa; // maturity in past or this month

  // Count months from nextMonth through maturityMonth (inclusive)
  const months =
    (maturity.getFullYear() - nextMonth.getFullYear()) * 12 +
    (maturity.getMonth() - nextMonth.getMonth()) +
    1;

  return balancePaisa + Number(monthlyInstallmentPaisa) * months;
}

function acctToJson(
  acct: {
    id: string;
    name: string;
    type: string;
    bankName: string;
    lastFour: string | null;
    openingBalancePaisa: bigint;
    openingDate: Date;
    monthlyInstallmentPaisa: bigint | null;
    maturityDate: Date | null;
    interestRateBps: number | null;
    closedOn: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
  balancePaisa: number,
  includeProjection = false,
) {
  const base = {
    id: acct.id,
    name: acct.name,
    type: acct.type,
    bank_name: acct.bankName,
    last_four: acct.lastFour ?? null,
    opening_balance_paisa: Number(acct.openingBalancePaisa),
    opening_date: fromDbDate(acct.openingDate),
    monthly_installment_paisa: acct.monthlyInstallmentPaisa != null ? Number(acct.monthlyInstallmentPaisa) : null,
    maturity_date: acct.maturityDate ? fromDbDate(acct.maturityDate) : null,
    interest_rate_bps: acct.interestRateBps ?? null,
    closed_on: acct.closedOn ? fromDbDate(acct.closedOn) : null,
    balance_paisa: balancePaisa,
    created_at: acct.createdAt.toISOString(),
    updated_at: acct.updatedAt.toISOString(),
  };

  if (includeProjection && acct.type === 'DPS') {
    return {
      ...base,
      projected_principal_paisa: dpsProjectedPrincipal(balancePaisa, acct.monthlyInstallmentPaisa, acct.maturityDate),
    };
  }

  return base;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const acct = await prisma.savingsAccount.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!acct) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  const balance = await computeBalance(acct.id, user.id);
  return Response.json(acctToJson(acct, balance, true));
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const acct = await prisma.savingsAccount.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!acct) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  const body = await req.json();
  const { name, bank_name, last_four, monthly_installment_paisa, maturity_date, interest_rate_bps, closed_on } = body;

  // Validate last_four if provided
  if (last_four != null) {
    if (!/^\d{4}$/.test(String(last_four))) {
      return Response.json({ error: 'last_four must be exactly 4 digits', code: 'VALIDATION_ERROR' }, { status: 422 });
    }
  }

  // closed_on only allowed when balance is zero
  if (closed_on != null) {
    const balance = await computeBalance(acct.id, user.id);
    if (balance !== 0) {
      return Response.json(
        { error: 'Account must have zero balance to close', code: 'BALANCE_NOT_ZERO' },
        { status: 422 },
      );
    }
  }

  const updated = await prisma.savingsAccount.update({
    where: { id: params.id },
    data: {
      ...(name != null && { name }),
      ...(bank_name != null && { bankName: bank_name }),
      ...(last_four !== undefined && { lastFour: last_four ?? null }),
      ...(monthly_installment_paisa != null && { monthlyInstallmentPaisa: BigInt(monthly_installment_paisa) }),
      ...(maturity_date !== undefined && { maturityDate: maturity_date ? toDbDate(maturity_date) : null }),
      ...(interest_rate_bps !== undefined && { interestRateBps: interest_rate_bps ?? null }),
      ...(closed_on !== undefined && { closedOn: closed_on ? toDbDate(closed_on) : null }),
    },
  });

  const balance = await computeBalance(updated.id, user.id);
  return Response.json(acctToJson(updated, balance, true));
}
