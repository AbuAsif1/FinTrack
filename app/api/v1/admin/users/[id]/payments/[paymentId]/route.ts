import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAdminUser } from '@/lib/auth';
import { adminGuards, AdminGuardError, logAdminAction } from '@/lib/admin-helpers';
import { toDbDate } from '@fintrack/shared';

export async function PATCH(req: Request, { params }: { params: { id: string; paymentId: string } }) {
  const admin = await getAdminUser(req);
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  try {
    adminGuards(admin.id, target);
  } catch (err) {
    if (err instanceof AdminGuardError) return Response.json({ error: err.code, code: err.code }, { status: err.status });
    throw err;
  }

  const payment = await prisma.userPayment.findFirst({
    where: { id: params.paymentId, userId: params.id },
  });
  if (!payment) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const r = z
    .object({
      paid_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      amount_paisa: z.number().int().positive().optional(),
      covers_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      note: z.string().nullable().optional(),
    })
    .safeParse(body);
  if (!r.success) {
    return Response.json({ error: 'Validation failed', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  const updated = await prisma.userPayment.update({
    where: { id: params.paymentId },
    data: {
      ...(r.data.paid_on && { paidOn: toDbDate(r.data.paid_on) }),
      ...(r.data.amount_paisa != null && { amountPaisa: BigInt(r.data.amount_paisa) }),
      ...(r.data.covers_until && { coversUntil: toDbDate(r.data.covers_until) }),
      ...(r.data.note !== undefined && { note: r.data.note }),
    },
  });

  await logAdminAction(admin.id, target.id, target.email, 'UPDATE_PAYMENT', `payment=${params.paymentId}`);
  return Response.json({
    id: updated.id,
    paid_on: updated.paidOn.toISOString().slice(0, 10),
    amount_paisa: Number(updated.amountPaisa),
    covers_until: updated.coversUntil.toISOString().slice(0, 10),
    note: updated.note,
    recorded_by: updated.recordedBy,
  });
}

export async function DELETE(req: Request, { params }: { params: { id: string; paymentId: string } }) {
  const admin = await getAdminUser(req);
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  try {
    adminGuards(admin.id, target);
  } catch (err) {
    if (err instanceof AdminGuardError) return Response.json({ error: err.code, code: err.code }, { status: err.status });
    throw err;
  }

  const payment = await prisma.userPayment.findFirst({
    where: { id: params.paymentId, userId: params.id },
  });
  if (!payment) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  await prisma.userPayment.delete({ where: { id: params.paymentId } });
  await logAdminAction(admin.id, target.id, target.email, 'DELETE_PAYMENT', `payment=${params.paymentId}`);
  return new Response(null, { status: 204 });
}
