import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { toDbDate, fromDbDate } from '@fintrack/shared';
import { CategoryRoutingService } from '@/lib/services/category-routing';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const instance = await prisma.fixedExpenseInstance.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      fixedExpense: {
        include: {
          category: true,
          savingsAccount: true,
        },
      },
      transaction: { select: { id: true } },
    },
  });
  if (!instance) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  // Future instance
  if (instance.month > new Date()) {
    return Response.json({ error: 'Cannot pay a future instance', code: 'FUTURE_INSTANCE' }, { status: 422 });
  }

  // Already paid
  if (instance.status === 'PAID' && instance.transaction) {
    return Response.json({ error: 'Already paid', code: 'ALREADY_PAID', transaction_id: instance.transactionId }, { status: 409 });
  }

  const body = await req.json();
  const { actual_amount_paisa, paid_date, payment_method } = body;

  if (!actual_amount_paisa || actual_amount_paisa <= 0) {
    return Response.json({ error: 'actual_amount_paisa is required', code: 'VALIDATION_ERROR' }, { status: 422 });
  }
  if (!paid_date) {
    return Response.json({ error: 'paid_date is required', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  const tmpl = instance.fixedExpense;
  const idempotencyKey = `fix-pay-${instance.id}`;

  // Create Transaction through CategoryRoutingService
  const routing = new CategoryRoutingService(user.id);
  const txResult = await routing.create({
    amount_paisa: actual_amount_paisa,
    date: paid_date,
    description: tmpl.name,
    category_id: tmpl.categoryId,
    payment_method: payment_method ?? 'BANK',
    idempotency_key: idempotencyKey,
    savings_account_id: tmpl.savingsAccountId ?? undefined,
  });

  // Mark instance as PAID
  const updated = await prisma.fixedExpenseInstance.update({
    where: { id: params.id },
    data: {
      status: 'PAID',
      actualAmountPaisa: BigInt(actual_amount_paisa),
      paidDate: toDbDate(paid_date),
      transactionId: txResult.transaction.id,
    },
  });

  return Response.json({
    id: updated.id,
    status: 'PAID',
    actual_amount_paisa: Number(updated.actualAmountPaisa),
    paid_date: fromDbDate(updated.paidDate!).slice(0, 10),
    transaction_id: updated.transactionId,
  }, { status: 200 });
}
