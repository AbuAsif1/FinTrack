import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { toDbDate, fromDbDate } from '@fintrack/shared';
import type { PaymentMethod } from '@prisma/client';

export async function PATCH(req: Request, { params }: { params: { id: string; entryId: string } }) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const entry = await prisma.loanEntry.findFirst({
    where: { id: params.entryId, loanPersonId: params.id, userId: user.id },
    include: { transaction: true },
  });
  if (!entry || entry.transaction.isDeleted) {
    return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  const body = await req.json();
  const { amount_paisa, date, description, payment_method, reason, return_due_date } = body;

  await prisma.$transaction(async (tx) => {
    await tx.transaction.update({
      where: { id: entry.transactionId },
      data: {
        ...(amount_paisa != null && { amountPaisa: BigInt(amount_paisa) }),
        ...(date != null && { date: toDbDate(date) }),
        ...(description != null && { description }),
        ...(payment_method != null && { paymentMethod: payment_method as PaymentMethod }),
      },
    });
    await tx.loanEntry.update({
      where: { id: params.entryId },
      data: {
        ...(reason !== undefined && { reason: reason ?? null }),
        ...(return_due_date !== undefined && { returnDueDate: return_due_date ? toDbDate(return_due_date) : null }),
      },
    });
  });

  const updated = await prisma.loanEntry.findUnique({
    where: { id: params.entryId },
    include: { transaction: true },
  });

  return Response.json({
    id: updated!.id,
    loan_person_id: updated!.loanPersonId,
    transaction_id: updated!.transactionId,
    direction: updated!.direction,
    reason: updated!.reason,
    return_due_date: updated!.returnDueDate ? fromDbDate(updated!.returnDueDate) : null,
    is_settlement: updated!.isSettlement,
    amount_paisa: Number(updated!.transaction.amountPaisa),
    date: fromDbDate(updated!.transaction.date),
    description: updated!.transaction.description,
    payment_method: updated!.transaction.paymentMethod,
    created_at: updated!.createdAt.toISOString(),
  });
}

export async function DELETE(req: Request, { params }: { params: { id: string; entryId: string } }) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const entry = await prisma.loanEntry.findFirst({
    where: { id: params.entryId, loanPersonId: params.id, userId: user.id },
    include: { transaction: true },
  });
  if (!entry || entry.transaction.isDeleted) {
    return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  await prisma.transaction.update({
    where: { id: entry.transactionId },
    data: { isDeleted: true, deletedAt: new Date() },
  });

  return new Response(null, { status: 204 });
}
