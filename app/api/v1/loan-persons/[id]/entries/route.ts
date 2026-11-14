import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { fromDbDate } from '@fintrack/shared';
import { CategoryRoutingService, RoutingError } from '@/lib/services/category-routing';
import type { PaymentMethod } from '@prisma/client';

type LoanEntryWithTx = {
  id: string;
  loanPersonId: string;
  transactionId: string;
  direction: string;
  reason: string | null;
  returnDueDate: Date | null;
  isSettlement: boolean;
  createdAt: Date;
  transaction: {
    amountPaisa: bigint;
    date: Date;
    description: string;
    paymentMethod: string;
  };
};

function entryToJson(e: LoanEntryWithTx, runningBalancePaisa?: number) {
  const base = {
    id: e.id,
    loan_person_id: e.loanPersonId,
    transaction_id: e.transactionId,
    direction: e.direction,
    reason: e.reason,
    return_due_date: e.returnDueDate ? fromDbDate(e.returnDueDate) : null,
    is_settlement: e.isSettlement,
    amount_paisa: Number(e.transaction.amountPaisa),
    date: fromDbDate(e.transaction.date),
    description: e.transaction.description,
    payment_method: e.transaction.paymentMethod,
    created_at: e.createdAt.toISOString(),
  };
  if (runningBalancePaisa !== undefined) {
    return { ...base, running_balance_paisa: runningBalancePaisa };
  }
  return base;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const person = await prisma.loanPerson.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!person) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  const entries = await prisma.loanEntry.findMany({
    where: {
      loanPersonId: params.id,
      userId: user.id,
      transaction: { isDeleted: false },
    },
    include: { transaction: true },
    orderBy: [{ transaction: { date: 'asc' } }, { createdAt: 'asc' }],
  });

  // Compute running balance after each entry
  let runningBalance = 0;
  const entriesWithBalance = entries.map((e) => {
    const amount = Number(e.transaction.amountPaisa);
    if (e.direction === 'GIVEN') runningBalance += amount;
    else runningBalance -= amount;
    return entryToJson(e as LoanEntryWithTx, runningBalance);
  });

  return Response.json(entriesWithBalance);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const person = await prisma.loanPerson.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!person) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  const body = await req.json();
  const { direction, amount_paisa, date, description, payment_method, reason, return_due_date, idempotency_key, is_settlement } = body;

  if (!direction || !amount_paisa || !date || !description || !payment_method || !idempotency_key) {
    return Response.json({ error: 'Missing required fields', code: 'VALIDATION_ERROR' }, { status: 422 });
  }
  if (direction !== 'GIVEN' && direction !== 'RECEIVED') {
    return Response.json({ error: 'direction must be GIVEN or RECEIVED', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  const routingType = direction === 'GIVEN' ? 'LOAN_GIVEN' : 'LOAN_RECEIVED';
  const category = await prisma.category.findFirst({
    where: { userId: user.id, routingType, isArchived: false },
  });
  if (!category) {
    return Response.json(
      { error: `No ${routingType} category found`, code: 'VALIDATION_ERROR' },
      { status: 422 },
    );
  }

  const service = new CategoryRoutingService(user.id);
  try {
    const result = await service.create({
      amount_paisa,
      date,
      description,
      category_id: category.id,
      payment_method: payment_method as PaymentMethod,
      idempotency_key,
      loan_person_id: params.id,
      reason: reason ?? null,
      return_due_date: return_due_date ?? null,
      is_settlement: is_settlement ?? false,
    });

    if (result.duplicate) {
      return Response.json(
        { error: 'Duplicate entry', code: 'DUPLICATE', transaction: result.transaction },
        { status: 409 },
      );
    }

    // Fetch the created loan entry for response
    const loanEntry = await prisma.loanEntry.findUnique({
      where: { transactionId: result.transaction.id },
      include: { transaction: true },
    });

    return Response.json(entryToJson(loanEntry as LoanEntryWithTx), { status: 201 });
  } catch (err) {
    if (err instanceof RoutingError) {
      return Response.json({ error: err.message, code: err.code }, { status: err.status });
    }
    throw err;
  }
}
