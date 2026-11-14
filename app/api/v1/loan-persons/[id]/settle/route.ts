import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { fromDbDate } from '@fintrack/shared';
import { CategoryRoutingService, RoutingError } from '@/lib/services/category-routing';
import type { PaymentMethod } from '@prisma/client';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const person = await prisma.loanPerson.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!person) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  // Compute current running balance
  const givenSum = await prisma.transaction.aggregate({
    where: { userId: user.id, isDeleted: false, type: 'LOAN_GIVEN', loanEntry: { loanPersonId: params.id } },
    _sum: { amountPaisa: true },
  });
  const receivedSum = await prisma.transaction.aggregate({
    where: { userId: user.id, isDeleted: false, type: 'LOAN_RECEIVED', loanEntry: { loanPersonId: params.id } },
    _sum: { amountPaisa: true },
  });
  const balance = Number(givenSum._sum.amountPaisa ?? 0n) - Number(receivedSum._sum.amountPaisa ?? 0n);

  if (balance === 0) {
    return Response.json({ error: 'Balance is already zero', code: 'BALANCE_ZERO' }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const payment_method: PaymentMethod = (body.payment_method as PaymentMethod) ?? 'CASH';
  const idempotency_key = body.idempotency_key ?? `settle-${params.id}-${Date.now()}`;

  // If balance > 0: person owes us → create RECEIVED entry
  // If balance < 0: we owe person → create GIVEN entry
  const direction = balance > 0 ? 'RECEIVED' : 'GIVEN';
  const amount = Math.abs(balance);
  const routingType = direction === 'GIVEN' ? 'LOAN_GIVEN' : 'LOAN_RECEIVED';

  const category = await prisma.category.findFirst({
    where: { userId: user.id, routingType, isArchived: false },
  });
  if (!category) {
    return Response.json({ error: `No ${routingType} category found`, code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  const today = new Date().toISOString().slice(0, 10);

  const service = new CategoryRoutingService(user.id);
  try {
    const result = await service.create({
      amount_paisa: amount,
      date: today,
      description: `Settle up with ${person.name}`,
      category_id: category.id,
      payment_method,
      idempotency_key,
      loan_person_id: params.id,
      is_settlement: true,
    });

    const loanEntry = await prisma.loanEntry.findUnique({
      where: { transactionId: result.transaction.id },
      include: { transaction: true },
    });

    return Response.json(
      {
        id: loanEntry!.id,
        loan_person_id: loanEntry!.loanPersonId,
        transaction_id: loanEntry!.transactionId,
        direction: loanEntry!.direction,
        is_settlement: loanEntry!.isSettlement,
        amount_paisa: Number(loanEntry!.transaction.amountPaisa),
        date: fromDbDate(loanEntry!.transaction.date),
        description: loanEntry!.transaction.description,
        payment_method: loanEntry!.transaction.paymentMethod,
        created_at: loanEntry!.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof RoutingError) {
      return Response.json({ error: err.message, code: err.code }, { status: err.status });
    }
    throw err;
  }
}
