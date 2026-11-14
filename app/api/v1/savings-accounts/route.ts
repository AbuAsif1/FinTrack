import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { toDbDate, fiscalYear, todayInDhaka } from '@fintrack/shared';
import {
  loadAccountsWithBalances,
  accountTotals,
  accountToJson as acctToJson,
  validateParentAccount,
  AccountRuleError,
} from '@/lib/services/accounts';

const VALID_TYPES = ['SAVINGS', 'MFS', 'DPS', 'FDR', 'SANCHAYPATRA', 'UNIVERSAL_PENSION', 'STOCKS', 'INSURANCE', 'INVESTMENT', 'CASH'];

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const { accounts, balances } = await loadAccountsWithBalances(user.id);

  const today = todayInDhaka();
  const currentFY = fiscalYear(today);
  const [fyStart] = currentFY.split('-');
  const fyStartDate = `${fyStart}-07-01`;
  const monthStart = today.slice(0, 7) + '-01';

  const thisMonthDeposits = await prisma.transaction.aggregate({
    where: {
      userId: user.id,
      isDeleted: false,
      type: 'SAVINGS_DEPOSIT',
      date: { gte: toDbDate(monthStart), lte: toDbDate(`${today.slice(0, 7)}-31`) },
    },
    _sum: { amountPaisa: true },
  });

  const thisFYDeposits = await prisma.transaction.aggregate({
    where: { userId: user.id, isDeleted: false, type: 'SAVINGS_DEPOSIT', date: { gte: toDbDate(fyStartDate) } },
    _sum: { amountPaisa: true },
  });

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

  let dpsCapPaisa: number | null = null;
  const taxYear = await prisma.taxYear.findUnique({
    where: { userId_fiscalYear: { userId: user.id, fiscalYear: currentFY } },
  });
  if (taxYear) {
    const config = taxYear.configJson as { investment_caps_paisa?: { dps?: number | null } };
    dpsCapPaisa = config.investment_caps_paisa?.dps ?? null;
  }

  const groupTotals = accountTotals(accounts, balances);

  return Response.json({
    accounts: accounts.map((a) => acctToJson(a, balances.get(a.id) ?? Number(a.openingBalancePaisa))),
    totals: {
      ...groupTotals,
      total_saved_paisa: groupTotals.net_worth_paisa,
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
  const { name, type, last_four, opening_balance_paisa, opening_date,
    monthly_installment_paisa, maturity_date, interest_rate_bps, parent_account_id } = body;
  const bank_name = type === 'CASH' ? (body.bank_name || 'In-Hand') : body.bank_name;

  if (!name || !type || !bank_name || opening_balance_paisa == null || !opening_date) {
    return Response.json({ error: 'Missing required fields', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  if (!VALID_TYPES.includes(type)) {
    return Response.json({ error: 'Invalid type', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  if (last_four != null) {
    if (!/^\d{4}$/.test(String(last_four))) {
      return Response.json({ error: 'last_four must be exactly 4 digits', code: 'VALIDATION_ERROR' }, { status: 422 });
    }
  }

  try {
    await validateParentAccount(user.id, type, parent_account_id);
  } catch (err) {
    if (err instanceof AccountRuleError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  if (type === 'CASH') {
    const existingCash = await prisma.savingsAccount.findFirst({ where: { userId: user.id, type: 'CASH', closedOn: null } });
    if (existingCash) {
      return Response.json({ error: 'You already have an In-Hand Cash account', code: 'CASH_ACCOUNT_EXISTS' }, { status: 409 });
    }
  }

  const acct = await prisma.savingsAccount.create({
    data: {
      userId: user.id,
      name,
      type,
      bankName: bank_name,
      lastFour: last_four ?? null,
      parentAccountId: parent_account_id ?? null,
      openingBalancePaisa: BigInt(opening_balance_paisa),
      openingDate: toDbDate(opening_date),
      monthlyInstallmentPaisa: monthly_installment_paisa != null ? BigInt(monthly_installment_paisa) : null,
      maturityDate: maturity_date ? toDbDate(maturity_date) : null,
      interestRateBps: interest_rate_bps ?? null,
    },
  });

  return Response.json(acctToJson(acct, Number(acct.openingBalancePaisa)), { status: 201 });
}
