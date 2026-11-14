import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser, AuthError } from '@/lib/auth';
import { todayInDhaka } from '@fintrack/shared';
import { accountBalance } from '@/lib/services/accounts';

function deriveStatus(currentBalance: number, targetAmountPaisa: bigint, targetDate: Date): string {
  const target = Number(targetAmountPaisa);
  if (currentBalance >= target) return 'ACHIEVED';
  const today = new Date(todayInDhaka());
  if (targetDate < today) return 'MISSED';
  // On-track: current_balance >= target * (days_elapsed / total_days)
  const createdDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30); // approximate
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

export async function GET(req: Request) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try {
    user = await getAuthUser(req);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const goals = await prisma.savingsGoal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
  });

  const result = await Promise.all(goals.map((g) => goalToJson(g, user.id)));
  return Response.json(result);
}

const createSchema = z.object({
  name: z.string().min(1),
  target_amount_paisa: z.number().int().positive(),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  linked_account_id: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try {
    user = await getAuthUser(req);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const body = await req.json().catch(() => null);
  const r = createSchema.safeParse(body);
  if (!r.success) {
    return Response.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', fields: r.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const goal = await prisma.savingsGoal.create({
    data: {
      userId: user.id,
      name: r.data.name,
      targetAmountPaisa: BigInt(r.data.target_amount_paisa),
      targetDate: new Date(r.data.target_date),
      linkedAccountId: r.data.linked_account_id ?? null,
    },
  });

  return Response.json(await goalToJson(goal, user.id), { status: 201 });
}
