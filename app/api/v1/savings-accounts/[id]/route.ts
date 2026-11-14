import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { toDbDate, todayInDhaka } from '@fintrack/shared';
import type { SavingsAccount } from '@prisma/client';
import { accountBalance, accountToJson, validateParentAccount, AccountRuleError } from '@/lib/services/accounts';

function computeBalance(accountId: string, userId: string): Promise<number> {
  return accountBalance(userId, accountId);
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

function acctToJson(acct: SavingsAccount, balancePaisa: number, includeProjection = false) {
  const base = accountToJson(acct, balancePaisa);

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
  const { name, bank_name, last_four, monthly_installment_paisa, maturity_date, interest_rate_bps, closed_on, parent_account_id } = body;

  // Validate last_four if provided
  if (last_four != null) {
    if (!/^\d{4}$/.test(String(last_four))) {
      return Response.json({ error: 'last_four must be exactly 4 digits', code: 'VALIDATION_ERROR' }, { status: 422 });
    }
  }

  if (parent_account_id !== undefined) {
    if (parent_account_id === acct.id) {
      return Response.json({ error: 'An account cannot be its own parent', code: 'INVALID_PARENT' }, { status: 422 });
    }
    try {
      await validateParentAccount(user.id, acct.type, parent_account_id);
    } catch (err) {
      if (err instanceof AccountRuleError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
      throw err;
    }
  }

  // closed_on only allowed when balance is zero and no open DPS/FDR sits under the account
  if (closed_on != null) {
    const balance = await computeBalance(acct.id, user.id);
    if (balance !== 0) {
      return Response.json(
        { error: 'Account must have zero balance to close', code: 'BALANCE_NOT_ZERO' },
        { status: 422 },
      );
    }
    const openChildren = await prisma.savingsAccount.count({ where: { userId: user.id, parentAccountId: acct.id, closedOn: null } });
    if (openChildren > 0) {
      return Response.json(
        { error: 'Close the DPS/FDR accounts under this account first', code: 'HAS_CHILD_ACCOUNTS' },
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
      ...(parent_account_id !== undefined && { parentAccountId: parent_account_id ?? null }),
    },
  });

  const balance = await computeBalance(updated.id, user.id);
  return Response.json(acctToJson(updated, balance, true));
}
