import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { toDbDate, fromDbDate } from '@fintrack/shared';
import { todayInDhaka } from '@fintrack/shared';

function templateToJson(t: {
  id: string;
  name: string;
  standardAmountPaisa: bigint;
  dueDay: number;
  categoryId: string;
  savingsAccountId: string | null;
  startMonth: Date;
  endMonth: Date | null;
  category: { id: string; name: string; routingType: string };
  savingsAccount: { id: string; name: string } | null;
}) {
  return {
    id: t.id,
    name: t.name,
    standard_amount_paisa: Number(t.standardAmountPaisa),
    due_day: t.dueDay,
    category_id: t.categoryId,
    savings_account_id: t.savingsAccountId,
    start_month: fromDbDate(t.startMonth).slice(0, 7),
    end_month: t.endMonth ? fromDbDate(t.endMonth).slice(0, 7) : null,
    category: { id: t.category.id, name: t.category.name, routing_type: t.category.routingType },
    savings_account: t.savingsAccount ? { id: t.savingsAccount.id, name: t.savingsAccount.name } : null,
  };
}

function computeStartMonth(dueDay: number, today: string): string {
  void dueDay;
  const [y, m] = today.split('-').map(Number);
  return `${y}-${String(m).padStart(2, '0')}`;
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const templates = await prisma.fixedExpense.findMany({
    where: { userId: user.id },
    include: {
      category: { select: { id: true, name: true, routingType: true } },
      savingsAccount: { select: { id: true, name: true } },
    },
    orderBy: [{ dueDay: 'asc' }, { name: 'asc' }],
  });

  return Response.json(templates.map(templateToJson));
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const body = await req.json();
  const { name, standard_amount_paisa, due_day, category_id, savings_account_id, start_month } = body;

  if (!name || standard_amount_paisa == null || !due_day || !category_id) {
    return Response.json({ error: 'Missing required fields', code: 'VALIDATION_ERROR' }, { status: 422 });
  }
  if (due_day < 1 || due_day > 31) {
    return Response.json({ error: 'due_day must be 1–31', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  // Verify category belongs to user
  const category = await prisma.category.findFirst({
    where: { id: category_id, userId: user.id },
  });
  if (!category) return Response.json({ error: 'Category not found', code: 'NOT_FOUND' }, { status: 404 });

  // DPS/savings-deposit category requires savings_account_id
  if (category.routingType === 'SAVINGS_DEPOSIT' && !savings_account_id) {
    return Response.json({ error: 'savings_account_id is required for savings deposit category', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  // Verify savings account if provided
  if (savings_account_id) {
    const account = await prisma.savingsAccount.findFirst({ where: { id: savings_account_id, userId: user.id } });
    if (!account) return Response.json({ error: 'Savings account not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  const today = todayInDhaka();
  const startMonth = (typeof start_month === 'string' && /^\d{4}-\d{2}$/.test(start_month))
    ? start_month
    : computeStartMonth(due_day, today);

  const template = await prisma.fixedExpense.create({
    data: {
      userId: user.id,
      name,
      standardAmountPaisa: BigInt(standard_amount_paisa),
      dueDay: due_day,
      categoryId: category_id,
      savingsAccountId: savings_account_id ?? null,
      startMonth: toDbDate(startMonth + '-01'),
    },
    include: {
      category: { select: { id: true, name: true, routingType: true } },
      savingsAccount: { select: { id: true, name: true } },
    },
  });

  return Response.json(templateToJson(template), { status: 201 });
}
