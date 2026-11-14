import { prisma } from '@/lib/prisma';
import { getAuthUser, AuthError } from '@/lib/auth';
import { fromDbDate } from '@fintrack/shared';
import type { PaymentMethod } from '@prisma/client';

const OUTFLOW_TYPES = ['NONE', 'SAVINGS_DEPOSIT', 'LOAN_GIVEN', 'TAX_PAYMENT'];
const INFLOW_TYPES = ['SAVINGS_WITHDRAWAL', 'LOAN_RECEIVED'];

function walletToJson(
  w: {
    id: string;
    method: PaymentMethod;
    name: string;
    openingBalancePaisa: bigint;
    openingBalanceDate: Date;
    isEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
  },
  balancePaisa: number,
) {
  return {
    id: w.id,
    method: w.method,
    name: w.name,
    opening_balance_paisa: Number(w.openingBalancePaisa),
    opening_balance_date: fromDbDate(w.openingBalanceDate),
    is_enabled: w.isEnabled,
    balance_paisa: balancePaisa,
    has_opening_balance: Number(w.openingBalancePaisa) > 0,
    is_derived: false,
    created_at: w.createdAt.toISOString(),
    updated_at: w.updatedAt.toISOString(),
  };
}

async function computeWalletBalance(userId: string, method: PaymentMethod, openingPaisa: bigint, openingDate: Date): Promise<number> {
  const [outflows, inflows, transfersOut, transfersIn] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId, isDeleted: false, paymentMethod: method, type: { in: OUTFLOW_TYPES as never[] }, date: { gte: openingDate } },
      _sum: { amountPaisa: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, isDeleted: false, paymentMethod: method, type: { in: INFLOW_TYPES as never[] }, date: { gte: openingDate } },
      _sum: { amountPaisa: true },
    }),
    prisma.walletTransfer.aggregate({
      where: { userId, fromWallet: { method }, date: { gte: openingDate } },
      _sum: { amountPaisa: true },
    }),
    prisma.walletTransfer.aggregate({
      where: { userId, toWallet: { method }, date: { gte: openingDate } },
      _sum: { amountPaisa: true },
    }),
  ]);

  return (
    Number(openingPaisa) +
    Number(inflows._sum.amountPaisa ?? 0n) +
    Number(transfersIn._sum.amountPaisa ?? 0n) -
    Number(outflows._sum.amountPaisa ?? 0n) -
    Number(transfersOut._sum.amountPaisa ?? 0n)
  );
}

/**
 * Compute running balance for each savings account using the same formula as
 * the savings-accounts API. Returns a map of accountId → balancePaisa.
 */
async function computeSavingsBalances(userId: string) {
  const accounts = await prisma.savingsAccount.findMany({
    where: { userId, closedOn: null },
  });
  if (accounts.length === 0) return { balanceMap: new Map<string, number>(), accounts: [] as typeof accounts };

  const accountIds = accounts.map((a) => a.id);

  const [txSums, fundedSums] = await Promise.all([
    prisma.transaction.groupBy({
      by: ['savingsAccountId', 'type'],
      where: { userId, isDeleted: false, savingsAccountId: { in: accountIds } },
      _sum: { amountPaisa: true },
    }),
    prisma.transaction.groupBy({
      by: ['bankSourceId'],
      where: { userId, isDeleted: false, bankSourceId: { in: accountIds } },
      _sum: { amountPaisa: true },
    }),
  ]);

  const sumMap = new Map<string, { DEPOSIT: bigint; INTEREST: bigint; WITHDRAWAL: bigint; SPENDING: bigint }>();
  for (const row of txSums) {
    if (!row.savingsAccountId) continue;
    if (!sumMap.has(row.savingsAccountId))
      sumMap.set(row.savingsAccountId, { DEPOSIT: 0n, INTEREST: 0n, WITHDRAWAL: 0n, SPENDING: 0n });
    const entry = sumMap.get(row.savingsAccountId)!;
    const amount = row._sum.amountPaisa ?? 0n;
    if (row.type === 'SAVINGS_DEPOSIT') entry.DEPOSIT = amount;
    else if (row.type === 'SAVINGS_INTEREST') entry.INTEREST = amount;
    else if (row.type === 'SAVINGS_WITHDRAWAL') entry.WITHDRAWAL = amount;
    else if (row.type === 'NONE') entry.SPENDING = amount;
  }

  const fundedMap = new Map<string, bigint>();
  for (const row of fundedSums) {
    if (row.bankSourceId) fundedMap.set(row.bankSourceId, row._sum.amountPaisa ?? 0n);
  }

  const balanceMap = new Map<string, number>();
  for (const acct of accounts) {
    const sums = sumMap.get(acct.id) ?? { DEPOSIT: 0n, INTEREST: 0n, WITHDRAWAL: 0n, SPENDING: 0n };
    balanceMap.set(
      acct.id,
      Number(acct.openingBalancePaisa) +
        Number(sums.DEPOSIT) +
        Number(sums.INTEREST) -
        Number(sums.WITHDRAWAL) -
        Number(sums.SPENDING) -
        Number(fundedMap.get(acct.id) ?? 0n),
    );
  }

  return { balanceMap, accounts };
}

export async function GET(req: Request) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try {
    user = await getAuthUser(req);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  // BANK is excluded from the wallets table — it is auto-derived from SavingsAccount(SAVINGS) rows
  const wallets = await prisma.wallet.findMany({
    where: { userId: user.id, isEnabled: true, method: { not: 'BANK' } },
    orderBy: { createdAt: 'asc' },
  });

  const withBalances = await Promise.all(
    wallets.map(async (w) => {
      const balance = await computeWalletBalance(user.id, w.method, w.openingBalancePaisa, w.openingBalanceDate);
      return walletToJson(w, balance);
    }),
  );

  // Compute savings account balances (all types) for both BANK derived entry and net worth
  const { balanceMap, accounts: savingsAccounts } = await computeSavingsBalances(user.id);

  // BANK balance = sum of SAVINGS-type accounts only
  const bankBalancePaisa = savingsAccounts
    .filter((a) => a.type === 'SAVINGS')
    .reduce((sum, a) => sum + (balanceMap.get(a.id) ?? 0), 0);

  const bankDerivedEntry = {
    id: '__bank_derived__',
    method: 'BANK' as const,
    name: 'Bank Accounts',
    opening_balance_paisa: 0,
    opening_balance_date: new Date().toISOString().slice(0, 10),
    is_enabled: true,
    balance_paisa: bankBalancePaisa,
    has_opening_balance: false,
    is_derived: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const allWallets = [bankDerivedEntry, ...withBalances];

  // Net worth = derived BANK balance + non-BANK wallet balances
  //           + all savings account balances (DPS, FDR, Sanchaypatra, etc.)
  //           + net outstanding loans
  const totalNonBankWallets = withBalances.reduce((s, w) => s + w.balance_paisa, 0);
  const totalAllSavings = Array.from(balanceMap.values()).reduce((s, b) => s + b, 0);

  const [givenTx, receivedTx] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId: user.id, isDeleted: false, type: 'LOAN_GIVEN' },
      _sum: { amountPaisa: true },
    }),
    prisma.transaction.aggregate({
      where: { userId: user.id, isDeleted: false, type: 'LOAN_RECEIVED' },
      _sum: { amountPaisa: true },
    }),
  ]);
  const netLoans = Number(givenTx._sum.amountPaisa ?? 0n) - Number(receivedTx._sum.amountPaisa ?? 0n);

  const net_worth_paisa = totalNonBankWallets + totalAllSavings + netLoans;

  return Response.json({ wallets: allWallets, net_worth_paisa });
}
