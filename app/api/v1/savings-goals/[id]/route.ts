import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser, AuthError } from '@/lib/auth';
import { todayInDhaka } from '@fintrack/shared';

async function accountBalance(userId: string, accountId: string): Promise<number> {
  const [acct, txSums, fundedSums] = await Promise.all([
    prisma.savingsAccount.findFirst({ where: { id: accountId, userId }, select: { openingBalancePaisa: true } }),
    prisma.transaction.groupBy({
      by: ['type'],
      where: { userId, isDeleted: false, savingsAccountId: accountId },
      _sum: { amountPaisa: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, isDeleted: false, bankSourceId: accountId },
      _sum: { amountPaisa: true },
    }),
  ]);
  if (!acct) return 0;
  let deposit = 0n, interest = 0n, withdrawal = 0n, spending = 0n;
  for (const row of txSums) {
    const amt = row._sum.amountPaisa ?? 0n;
    if (row.type === 'SAVINGS_DEPOSIT') deposit = amt;
    else if (row.type === 'SAVINGS_INTEREST') interest = amt;
    else if (row.type === 'SAVINGS_WITHDRAWAL') withdrawal = amt;
    else if (row.type === 'NONE') spending = amt;
  }
  const funded = fundedSums._sum.amountPaisa ?? 0n;
  return Number(acct.openingBalancePaisa) + Number(deposit) + Number(interest) - Number(withdrawal) - Number(spending) - Number(funded);
}

function deriveStatus(currentBalance: number, targetAmountPaisa: bigint, targetDate: Date): string {
  const target = Number(targetAmountPaisa);
  if (currentBalance >= target) return 'ACHIEVED';
  const today = new Date(todayInDhaka());
  if (targetDate < today) return 'MISSED';
  const createdDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
  const totalMs = targetDate.getTime() - createdDate.getTime();
  const elapsedMs = today.getTime() - createdDate.getTime();
  const expectedBalance = totalMs > 0 ? target * (elapsedMs / totalMs) : 0;
  return currentBalance >= expectedBalance ? 'ON_TRACK' : 'BEHIND';
}

async function goalToJson(goal: {
  id: string;
  name: string;
  targetAmountPaisa: bigint;
  targetDate: Date;
  linkedAccountId: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}, userId: string) {
  const currentBalance = goal.linkedAccountId
    ? await accountBalance(userId, goal.linkedAccountId)
    : 0;
  const targetPaisa = Number(goal.targetAmountPaisa);
  const progressPct = targetPaisa > 0 ? Math.round((currentBalance / targetPaisa) * 10000) / 100 : 0;
  const progressStatus = goal.status === 'ARCHIVED'
    ? 'ARCHIVED'
    : deriveStatus(currentBalance, goal.targetAmountPaisa, goal.targetDate);

  return {
    id: goal.id,
    name: goal.name,
    target_amount_paisa: Number(goal.targetAmountPaisa),
    target_date: goal.targetDate.toISOString().slice(0, 10),
    linked_account_id: goal.linkedAccountId,
    status: goal.status,
    current_balance_paisa: currentBalance,
    progress_pct: progressPct,
    progress_status: progressStatus,
    created_at: goal.createdAt.toISOString(),
    updated_at: goal.updatedAt.toISOString(),
  };
}

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  target_amount_paisa: z.number().int().positive().optional(),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  linked_account_id: z.string().nullable().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try {
    user = await getAuthUser(req);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const goal = await prisma.savingsGoal.findFirst({ where: { id: params.id, userId: user.id } });
  if (!goal) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const r = patchSchema.safeParse(body);
  if (!r.success) {
    return Response.json({ error: 'Validation failed', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  const updated = await prisma.savingsGoal.update({
    where: { id: params.id },
    data: {
      ...(r.data.name && { name: r.data.name }),
      ...(r.data.target_amount_paisa && { targetAmountPaisa: BigInt(r.data.target_amount_paisa) }),
      ...(r.data.target_date && { targetDate: new Date(r.data.target_date) }),
      ...('linked_account_id' in r.data && { linkedAccountId: r.data.linked_account_id ?? null }),
      ...(r.data.status && { status: r.data.status }),
    },
  });

  return Response.json(await goalToJson(updated, user.id));
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try {
    user = await getAuthUser(req);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const goal = await prisma.savingsGoal.findFirst({ where: { id: params.id, userId: user.id } });
  if (!goal) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  await prisma.savingsGoal.delete({ where: { id: params.id } });
  return new Response(null, { status: 204 });
}
