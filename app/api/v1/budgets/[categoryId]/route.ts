import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { toDbDate, todayInDhaka } from '@fintrack/shared';

export async function PUT(req: Request, { params }: { params: { categoryId: string } }) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const category = await prisma.category.findFirst({
    where: { id: params.categoryId, userId: user.id },
  });
  if (!category) return Response.json({ error: 'Category not found', code: 'NOT_FOUND' }, { status: 404 });

  if (category.routingType !== 'NONE') {
    return Response.json({ error: 'Budgets can only be set on spending (NONE routing) categories', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  const body = await req.json();
  const { monthly_limit_paisa } = body;

  if (!monthly_limit_paisa || monthly_limit_paisa <= 0) {
    return Response.json({ error: 'monthly_limit_paisa must be a positive integer', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  const currentMonth = todayInDhaka().slice(0, 7);

  const budget = await prisma.budget.upsert({
    where: {
      userId_categoryId_effectiveFromMonth: {
        userId: user.id,
        categoryId: params.categoryId,
        effectiveFromMonth: toDbDate(currentMonth + '-01'),
      },
    },
    create: {
      userId: user.id,
      categoryId: params.categoryId,
      effectiveFromMonth: toDbDate(currentMonth + '-01'),
      monthlyLimitPaisa: BigInt(monthly_limit_paisa),
    },
    update: { monthlyLimitPaisa: BigInt(monthly_limit_paisa) },
  });

  return Response.json({
    category_id: budget.categoryId,
    monthly_limit_paisa: Number(budget.monthlyLimitPaisa),
    effective_from_month: currentMonth,
  });
}

export async function DELETE(req: Request, { params }: { params: { categoryId: string } }) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const currentMonth = todayInDhaka().slice(0, 7);

  // Write null limit effective from current month
  await prisma.budget.upsert({
    where: {
      userId_categoryId_effectiveFromMonth: {
        userId: user.id,
        categoryId: params.categoryId,
        effectiveFromMonth: toDbDate(currentMonth + '-01'),
      },
    },
    create: {
      userId: user.id,
      categoryId: params.categoryId,
      effectiveFromMonth: toDbDate(currentMonth + '-01'),
      monthlyLimitPaisa: null,
    },
    update: { monthlyLimitPaisa: null },
  });

  return new Response(null, { status: 204 });
}
