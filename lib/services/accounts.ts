import { prisma } from '../prisma';
import {
  fromDbDate,
  PAYMENT_ACCOUNT_TYPES,
  CHILD_ACCOUNT_TYPES,
  PARENT_ACCOUNT_TYPES,
  INVESTMENT_ACCOUNT_TYPES,
} from '@fintrack/shared';
import type { SavingsAccount } from '@prisma/client';

export class AccountRuleError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

// A transaction names up to two accounts. `savingsAccountId` is the account the routing acts on;
// `bankSourceId` is the Funding Account on the other side. Each sign says which way the money moves.
const TARGET_SIGN: Record<string, bigint> = {
  SAVINGS_DEPOSIT: 1n,
  SAVINGS_INTEREST: 1n,
  SAVINGS_WITHDRAWAL: -1n,
  NONE: -1n,
};
const FUNDING_SIGN: Record<string, bigint> = {
  SAVINGS_DEPOSIT: -1n,
  NONE: -1n,
  LOAN_GIVEN: -1n,
  TAX_PAYMENT: -1n,
  SAVINGS_WITHDRAWAL: 1n,
  LOAN_RECEIVED: 1n,
};

/** Balance of every account the user owns: opening balance ± transactions + income received (gross − TDS). */
export async function loadAccountsWithBalances(userId: string) {
  const [accounts, targetSums, fundingSums, incomeSums] = await Promise.all([
    prisma.savingsAccount.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
    prisma.transaction.groupBy({
      by: ['savingsAccountId', 'type'],
      where: { userId, isDeleted: false, savingsAccountId: { not: null } },
      _sum: { amountPaisa: true },
    }),
    prisma.transaction.groupBy({
      by: ['bankSourceId', 'type'],
      where: { userId, isDeleted: false, bankSourceId: { not: null } },
      _sum: { amountPaisa: true },
    }),
    prisma.incomeEntry.groupBy({
      by: ['savingsAccountId'],
      where: { userId, isDeleted: false, savingsAccountId: { not: null } },
      _sum: { grossPaisa: true, tdsPaisa: true },
    }),
  ]);

  const raw = new Map<string, bigint>(accounts.map((a) => [a.id, a.openingBalancePaisa]));
  const add = (id: string | null, amount: bigint) => {
    if (id && raw.has(id)) raw.set(id, raw.get(id)! + amount);
  };
  for (const row of targetSums) add(row.savingsAccountId, (TARGET_SIGN[row.type] ?? 0n) * (row._sum.amountPaisa ?? 0n));
  for (const row of fundingSums) add(row.bankSourceId, (FUNDING_SIGN[row.type] ?? 0n) * (row._sum.amountPaisa ?? 0n));
  for (const row of incomeSums) add(row.savingsAccountId, (row._sum.grossPaisa ?? 0n) - (row._sum.tdsPaisa ?? 0n));

  const balances = new Map<string, number>();
  for (const [id, b] of raw) balances.set(id, Number(b));
  return { accounts, balances };
}

export function accountToJson(acct: SavingsAccount, balancePaisa: number) {
  return {
    id: acct.id,
    name: acct.name,
    type: acct.type,
    bank_name: acct.bankName,
    last_four: acct.lastFour ?? null,
    parent_account_id: acct.parentAccountId ?? null,
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

export async function accountBalance(userId: string, accountId: string): Promise<number> {
  const { balances } = await loadAccountsWithBalances(userId);
  return balances.get(accountId) ?? 0;
}

/** Bank & Wallet totals. A DPS/FDR counts toward its parent's total; a parentless one counts only in Net Worth. */
export function accountTotals(accounts: SavingsAccount[], balances: Map<string, number>) {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const totals = { bank_paisa: 0, mfs_paisa: 0, cash_paisa: 0, investment_paisa: 0, net_worth_paisa: 0 };
  for (const a of accounts) {
    const b = balances.get(a.id) ?? 0;
    totals.net_worth_paisa += b;
    const home = CHILD_ACCOUNT_TYPES.includes(a.type)
      ? (a.parentAccountId ? byId.get(a.parentAccountId) : undefined)
      : a;
    if (!home) continue;
    if (home.type === 'SAVINGS') totals.bank_paisa += b;
    else if (home.type === 'MFS') totals.mfs_paisa += b;
    else if (home.type === 'CASH') totals.cash_paisa += b;
    else if (INVESTMENT_ACCOUNT_TYPES.includes(home.type)) totals.investment_paisa += b;
  }
  return totals;
}

export async function netWorthPaisa(userId: string): Promise<number> {
  const { accounts, balances } = await loadAccountsWithBalances(userId);
  return accountTotals(accounts, balances).net_worth_paisa;
}

/** DPS and FDR need an open Savings or MFS parent; every other type takes none. */
export async function validateParentAccount(userId: string, type: string, parentId: string | null | undefined) {
  if (!CHILD_ACCOUNT_TYPES.includes(type)) {
    if (parentId) throw new AccountRuleError(422, 'PARENT_NOT_ALLOWED', 'Only DPS and FDR accounts have a parent account');
    return;
  }
  if (!parentId) throw new AccountRuleError(422, 'PARENT_REQUIRED', 'Choose the bank or MFS account this account sits under');
  const parent = await prisma.savingsAccount.findFirst({ where: { id: parentId, userId } });
  if (!parent) throw new AccountRuleError(422, 'VALIDATION_ERROR', 'Parent account not found');
  if (!PARENT_ACCOUNT_TYPES.includes(parent.type)) {
    throw new AccountRuleError(422, 'INVALID_PARENT', 'A parent account must be a Savings or MFS account');
  }
  if (parent.closedOn) throw new AccountRuleError(422, 'ACCOUNT_CLOSED', 'Parent account is closed');
}

export function assertPaymentAccount(acct: { type: string; name: string }) {
  if (!PAYMENT_ACCOUNT_TYPES.includes(acct.type)) {
    throw new AccountRuleError(422, 'ACCOUNT_NOT_PAYABLE', `${acct.name} cannot pay or receive money directly`);
  }
}

/** An account that receives income must be an open Payment Account the user owns. */
export async function validateReceivingAccount(userId: string, accountId: string) {
  const acct = await prisma.savingsAccount.findFirst({ where: { id: accountId, userId } });
  if (!acct) throw new AccountRuleError(422, 'VALIDATION_ERROR', 'Account not found');
  if (acct.closedOn) throw new AccountRuleError(422, 'ACCOUNT_CLOSED', `${acct.name} is closed`);
  assertPaymentAccount(acct);
}

export async function findCashAccount(userId: string) {
  return prisma.savingsAccount.findFirst({ where: { userId, type: 'CASH', closedOn: null } });
}
