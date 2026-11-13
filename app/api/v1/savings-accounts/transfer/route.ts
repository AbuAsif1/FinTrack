import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { toDbDate, fromDbDate } from '@fintrack/shared';

async function computeBalance(accountId: string, userId: string): Promise<number> {
  const acct = await prisma.savingsAccount.findFirst({ where: { id: accountId, userId } });
  if (!acct) return 0;
  const sums = await prisma.transaction.groupBy({
    by: ['type'],
    where: { savingsAccountId: accountId, userId, isDeleted: false },
    _sum: { amountPaisa: true },
  });
  let deposit = 0n, interest = 0n, withdrawal = 0n, spending = 0n;
  for (const r of sums) {
    const a = r._sum.amountPaisa ?? 0n;
    if (r.type === 'SAVINGS_DEPOSIT') deposit = a;
    else if (r.type === 'SAVINGS_INTEREST') interest = a;
    else if (r.type === 'SAVINGS_WITHDRAWAL') withdrawal = a;
    else if (r.type === 'NONE') spending = a;
  }
  return Number(acct.openingBalancePaisa) + Number(deposit) + Number(interest) - Number(withdrawal) - Number(spending);
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: 'Invalid body', code: 'VALIDATION_ERROR' }, { status: 422 });

  const { from_account_id, to_account_id, amount_paisa, date, description } = body;

  if (!from_account_id || !to_account_id || !amount_paisa || !date) {
    return Response.json({ error: 'from_account_id, to_account_id, amount_paisa and date are required', code: 'VALIDATION_ERROR' }, { status: 422 });
  }
  if (from_account_id === to_account_id) {
    return Response.json({ error: 'Source and destination accounts must be different', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  const [fromAcct, toAcct] = await Promise.all([
    prisma.savingsAccount.findFirst({ where: { id: from_account_id, userId: user.id } }),
    prisma.savingsAccount.findFirst({ where: { id: to_account_id, userId: user.id } }),
  ]);
  if (!fromAcct) return Response.json({ error: 'Source account not found', code: 'NOT_FOUND' }, { status: 404 });
  if (!toAcct)   return Response.json({ error: 'Destination account not found', code: 'NOT_FOUND' }, { status: 404 });
  if (fromAcct.closedOn) return Response.json({ error: 'Source account is closed', code: 'ACCOUNT_CLOSED' }, { status: 422 });
  if (toAcct.closedOn)   return Response.json({ error: 'Destination account is closed', code: 'ACCOUNT_CLOSED' }, { status: 422 });

  // Balance check on source
  const fromBalance = await computeBalance(from_account_id, user.id);
  if (amount_paisa > fromBalance) {
    return Response.json({ error: `Insufficient balance — only ৳${(fromBalance / 100).toFixed(2)} available`, code: 'INSUFFICIENT_BALANCE' }, { status: 422 });
  }

  // Find or create SAVINGS_WITHDRAWAL and SAVINGS_DEPOSIT categories for this user
  const [withdrawCat, depositCat] = await Promise.all([
    prisma.category.findFirst({ where: { userId: user.id, routingType: 'SAVINGS_WITHDRAWAL', isArchived: false } }),
    prisma.category.findFirst({ where: { userId: user.id, routingType: 'SAVINGS_DEPOSIT', isArchived: false } }),
  ]);
  if (!withdrawCat) return Response.json({ error: 'No SAVINGS_WITHDRAWAL category found', code: 'MISSING_CATEGORY' }, { status: 422 });
  if (!depositCat)  return Response.json({ error: 'No SAVINGS_DEPOSIT category found', code: 'MISSING_CATEGORY' }, { status: 422 });

  const txDate = toDbDate(date);
  const desc = description || `Transfer: ${fromAcct.name} → ${toAcct.name}`;
  const idempotencyBase = `transfer-${from_account_id}-${to_account_id}-${date}-${amount_paisa}`;

  const [withdrawal, deposit] = await prisma.$transaction(async (tx) => {
    const w = await tx.transaction.create({
      data: {
        userId: user.id,
        amountPaisa: BigInt(amount_paisa),
        date: txDate,
        description: desc,
        categoryId: withdrawCat.id,
        type: 'SAVINGS_WITHDRAWAL',
        paymentMethod: 'BANK',
        savingsAccountId: from_account_id,
        idempotencyKey: idempotencyBase + '-out',
      },
      include: { category: true },
    });
    const d = await tx.transaction.create({
      data: {
        userId: user.id,
        amountPaisa: BigInt(amount_paisa),
        date: txDate,
        description: desc,
        categoryId: depositCat.id,
        type: 'SAVINGS_DEPOSIT',
        paymentMethod: 'BANK',
        savingsAccountId: to_account_id,
        idempotencyKey: idempotencyBase + '-in',
      },
      include: { category: true },
    });
    return [w, d];
  });

  const [fromNew, toNew] = await Promise.all([
    computeBalance(from_account_id, user.id),
    computeBalance(to_account_id, user.id),
  ]);

  return Response.json({
    withdrawal: { id: withdrawal.id, date: fromDbDate(withdrawal.date), amount_paisa, description: desc },
    deposit:    { id: deposit.id,   date: fromDbDate(deposit.date),   amount_paisa, description: desc },
    from_account: { id: fromAcct.id, name: fromAcct.name, new_balance_paisa: fromNew },
    to_account:   { id: toAcct.id,   name: toAcct.name,   new_balance_paisa: toNew },
  }, { status: 201 });
}
