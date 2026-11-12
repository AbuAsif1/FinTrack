import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { toDbDate, fromDbDate, fiscalYear, todayInDhaka } from '@fintrack/shared';

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
) {
  return {
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
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const accounts = await prisma.savingsAccount.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
  });

  // Fetch all transaction sums grouped by savingsAccountId and type
  const txSums = await prisma.transaction.groupBy({
    by: ['savingsAccountId', 'type'],
    where: { userId: user.id, isDeleted: false, savingsAccountId: { not: null } },
    _sum: { amountPaisa: true },
  });

  // Build a map: accountId → { SAVINGS_DEPOSIT: n, SAVINGS_INTEREST: n, SAVINGS_WITHDRAWAL: n }
  const sumMap = new Map<string, { DEPOSIT: bigint; INTEREST: bigint; WITHDRAWAL: bigint }>();
  for (const row of txSums) {
    if (!row.savingsAccountId) continue;
    if (!sumMap.has(row.savingsAccountId)) {
      sumMap.set(row.savingsAccountId, { DEPOSIT: 0n, INTEREST: 0n, WITHDRAWAL: 0n });
    }
    const entry = sumMap.get(row.savingsAccountId)!;
    const amount = row._sum.amountPaisa ?? 0n;
    if (row.type === 'SAVINGS_DEPOSIT') entry.DEPOSIT = amount;
    else if (row.type === 'SAVINGS_INTEREST') entry.INTEREST = amount;
    else if (row.type === 'SAVINGS_WITHDRAWAL') entry.WITHDRAWAL = amount;
  }

  const balances = new Map<string, number>();
  for (const acct of accounts) {
    const sums = sumMap.get(acct.id) ?? { DEPOSIT: 0n, INTEREST: 0n, WITHDRAWAL: 0n };
    const balance = Number(acct.openingBalancePaisa) + Number(sums.DEPOSIT) + Number(sums.INTEREST) - Number(sums.WITHDRAWAL);
    balances.set(acct.id, balance);
  }

  // Totals
  const today = todayInDhaka();
  const currentFY = fiscalYear(today);
  const [fyStart] = currentFY.split('-');
  const fyStartDate = `${fyStart}-07-01`;
  const monthStart = today.slice(0, 7) + '-01';

  // Total saved = sum of all account balances
  const totalSavedPaisa = Array.from(balances.values()).reduce((sum, b) => sum + b, 0);

  // This month's deposits
  const thisMonthDeposits = await prisma.transaction.aggregate({
    where: {
      userId: user.id,
      isDeleted: false,
      type: 'SAVINGS_DEPOSIT',
      date: { gte: toDbDate(monthStart), lte: toDbDate(`${today.slice(0, 7)}-31`) },
    },
    _sum: { amountPaisa: true },
  });

  // This FY's deposits
  const thisFYDeposits = await prisma.transaction.aggregate({
    where: {
      userId: user.id,
      isDeleted: false,
      type: 'SAVINGS_DEPOSIT',
      date: { gte: toDbDate(fyStartDate) },
    },
    _sum: { amountPaisa: true },
  });

  // DPS accounts this FY
  const dpsAccountIds = accounts.filter((a) => a.type === 'DPS').map((a) => a.id);
  let dpsFYPaisa = 0;
  if (dpsAccountIds.length > 0) {
    const dpsFYDeposits = await prisma.transaction.aggregate({
      where: {
        userId: user.id,
        isDeleted: false,
        type: 'SAVINGS_DEPOSIT',
        savingsAccountId: { in: dpsAccountIds },
        date: { gte: toDbDate(fyStartDate) },
      },
      _sum: { amountPaisa: true },
    });
    dpsFYPaisa = Number(dpsFYDeposits._sum.amountPaisa ?? 0n);
  }

  // DPS cap from current FY tax settings
  let dpsCapPaisa: number | null = null;
  const taxYear = await prisma.taxYear.findUnique({
    where: { userId_fiscalYear: { userId: user.id, fiscalYear: currentFY } },
  });
  if (taxYear) {
    const config = taxYear.configJson as { investment_caps_paisa?: { dps?: number | null } };
    dpsCapPaisa = config.investment_caps_paisa?.dps ?? null;
  }

  return Response.json({
    accounts: accounts.map((a) => acctToJson(a, balances.get(a.id) ?? Number(a.openingBalancePaisa))),
    totals: {
      total_saved_paisa: totalSavedPaisa,
      this_month_deposits_paisa: Number(thisMonthDeposits._sum.amountPaisa ?? 0n),
      this_fy_deposits_paisa: Number(thisFYDeposits._sum.amountPaisa ?? 0n),
      dps_this_fy_paisa: dpsFYPaisa,
      dps_cap_paisa: dpsCapPaisa,
    },
  });
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const body = await req.json();
  const { name, type, bank_name, last_four, opening_balance_paisa, opening_date,
    monthly_installment_paisa, maturity_date, interest_rate_bps } = body;

  if (!name || !type || !bank_name || opening_balance_paisa == null || !opening_date) {
    return Response.json({ error: 'Missing required fields', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  const validTypes = ['SAVINGS', 'DPS', 'SANCHAYPATRA', 'INVESTMENT', 'CASH'];
  if (!validTypes.includes(type)) {
    return Response.json({ error: 'Invalid type', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  // last_four must be exactly 4 digits if provided
  if (last_four != null) {
    if (!/^\d{4}$/.test(String(last_four))) {
      return Response.json({ error: 'last_four must be exactly 4 digits', code: 'VALIDATION_ERROR' }, { status: 422 });
    }
  }

  const acct = await prisma.savingsAccount.create({
    data: {
      userId: user.id,
      name,
      type,
      bankName: bank_name,
      lastFour: last_four ?? null,
      openingBalancePaisa: BigInt(opening_balance_paisa),
      openingDate: toDbDate(opening_date),
      monthlyInstallmentPaisa: monthly_installment_paisa != null ? BigInt(monthly_installment_paisa) : null,
      maturityDate: maturity_date ? toDbDate(maturity_date) : null,
      interestRateBps: interest_rate_bps ?? null,
    },
  });

  return Response.json(acctToJson(acct, Number(acct.openingBalancePaisa)), { status: 201 });
}
