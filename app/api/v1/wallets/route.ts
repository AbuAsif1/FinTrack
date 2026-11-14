import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { fromDbDate } from '@fintrack/shared';
import type { PaymentMethod } from '@prisma/client';

const VALID_METHODS: PaymentMethod[] = ['CASH', 'BKASH', 'BANK', 'CARD'];

/** Spending-side outflow routing types reduce the wallet balance. */
const OUTFLOW_TYPES = ['NONE', 'SAVINGS_DEPOSIT', 'LOAN_GIVEN', 'TAX_PAYMENT'];

/** Inflow types add to the wallet balance. */
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
    created_at: w.createdAt.toISOString(),
    updated_at: w.updatedAt.toISOString(),
  };
}

async function computeBalance(userId: string, method: PaymentMethod, openingPaisa: bigint, openingDate: Date): Promise<number> {
  // Transactions from opening date onward with this payment method
  const [outflows, inflows, transfersOut, transfersIn] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        userId,
        isDeleted: false,
        paymentMethod: method,
        type: { in: OUTFLOW_TYPES as never[] },
        date: { gte: openingDate },
      },
      _sum: { amountPaisa: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        isDeleted: false,
        paymentMethod: method,
        type: { in: INFLOW_TYPES as never[] },
        date: { gte: openingDate },
      },
      _sum: { amountPaisa: true },
    }),
    // Wallet transfers going OUT of this method
    prisma.walletTransfer.aggregate({
      where: {
        userId,
        fromWallet: { method },
        date: { gte: openingDate },
      },
      _sum: { amountPaisa: true },
    }),
    // Wallet transfers coming IN to this method
    prisma.walletTransfer.aggregate({
      where: {
        userId,
        toWallet: { method },
        date: { gte: openingDate },
      },
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

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const wallets = await prisma.wallet.findMany({
    where: { userId: user.id, isEnabled: true },
    orderBy: { createdAt: 'asc' },
  });

  const withBalances = await Promise.all(
    wallets.map(async (w) => {
      const balance = await computeBalance(user.id, w.method, w.openingBalancePaisa, w.openingBalanceDate);
      return walletToJson(w, balance);
    }),
  );

  // Net worth = sum of wallet balances + savings balances + net loans given - net loans received
  const totalWallets = withBalances.reduce((s, w) => s + w.balance_paisa, 0);

  const [savingsAccounts, loansGiven, loansBorrowed] = await Promise.all([
    prisma.savingsAccount.findMany({
      where: { userId: user.id, closedOn: null },
      select: { openingBalancePaisa: true, id: true },
    }),
    prisma.loanEntry.aggregate({
      where: { userId: user.id, direction: 'GIVEN', transaction: { isDeleted: false } },
      _sum: { transaction: { amountPaisa: true } } as never,
    }),
    prisma.loanEntry.aggregate({
      where: { userId: user.id, direction: 'RECEIVED', transaction: { isDeleted: false } },
      _sum: { transaction: { amountPaisa: true } } as never,
    }),
  ]);

  // Simple net worth: wallets + savings opening balances (actual balance needs full calc)
  const totalSavings = savingsAccounts.reduce((s, a) => s + Number(a.openingBalancePaisa), 0);

  const net_worth_paisa = totalWallets + totalSavings;

  return Response.json({
    wallets: withBalances,
    net_worth_paisa,
  });
}
