import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { toDbDate, fromDbDate, todayInDhaka } from '@fintrack/shared';
import { updatePendingInstanceAmount } from '@/lib/services/fixed-expenses';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const template = await prisma.fixedExpense.findFirst({ where: { id: params.id, userId: user.id } });
  if (!template) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  // Delete all instances first (transactions are preserved; instance just stops existing)
  await prisma.fixedExpenseInstance.deleteMany({ where: { fixedExpenseId: params.id } });
  await prisma.fixedExpense.delete({ where: { id: params.id } });

  return new Response(null, { status: 204 });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const template = await prisma.fixedExpense.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      category: { select: { id: true, name: true, routingType: true } },
      savingsAccount: { select: { id: true, name: true } },
    },
  });
  if (!template) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  const body = await req.json();
  const { name, standard_amount_paisa, due_day, savings_account_id, deactivate } = body;

  const today = todayInDhaka();
  const currentMonth = today.slice(0, 7);

  // Handle deactivation
  if (deactivate === true) {
    const updated = await prisma.fixedExpense.update({
      where: { id: params.id },
      data: { endMonth: toDbDate(currentMonth + '-01') },
      include: {
        category: { select: { id: true, name: true, routingType: true } },
        savingsAccount: { select: { id: true, name: true } },
      },
    });
    return Response.json({
      id: updated.id,
      name: updated.name,
      standard_amount_paisa: Number(updated.standardAmountPaisa),
      due_day: updated.dueDay,
      category_id: updated.categoryId,
      savings_account_id: updated.savingsAccountId,
      start_month: fromDbDate(updated.startMonth).slice(0, 7),
      end_month: updated.endMonth ? fromDbDate(updated.endMonth).slice(0, 7) : null,
    });
  }

  const updateData: Record<string, unknown> = {};
  if (name != null) updateData.name = name;
  if (standard_amount_paisa != null) updateData.standardAmountPaisa = BigInt(standard_amount_paisa);
  if (due_day != null) {
    if (due_day < 1 || due_day > 31) return Response.json({ error: 'due_day must be 1–31', code: 'VALIDATION_ERROR' }, { status: 422 });
    updateData.dueDay = due_day;
  }
  if (savings_account_id !== undefined) {
    if (savings_account_id !== null) {
      const account = await prisma.savingsAccount.findFirst({ where: { id: savings_account_id, userId: user.id } });
      if (!account) return Response.json({ error: 'Savings account not found', code: 'NOT_FOUND' }, { status: 404 });
    }
    updateData.savingsAccountId = savings_account_id;
  }

  const updated = await prisma.fixedExpense.update({
    where: { id: params.id },
    data: updateData,
    include: {
      category: { select: { id: true, name: true, routingType: true } },
      savingsAccount: { select: { id: true, name: true } },
    },
  });

  // If standard amount changed, update pending current-month instance
  if (standard_amount_paisa != null) {
    await updatePendingInstanceAmount(params.id, currentMonth, BigInt(standard_amount_paisa));
  }

  return Response.json({
    id: updated.id,
    name: updated.name,
    standard_amount_paisa: Number(updated.standardAmountPaisa),
    due_day: updated.dueDay,
    category_id: updated.categoryId,
    savings_account_id: updated.savingsAccountId,
    start_month: fromDbDate(updated.startMonth).slice(0, 7),
    end_month: updated.endMonth ? fromDbDate(updated.endMonth).slice(0, 7) : null,
    category: { id: updated.category.id, name: updated.category.name, routing_type: updated.category.routingType },
    savings_account: updated.savingsAccount ? { id: updated.savingsAccount.id, name: updated.savingsAccount.name } : null,
  });
}
