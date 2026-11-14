import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAdminUser } from '@/lib/auth';
import { adminGuards, AdminGuardError, logAdminAction } from '@/lib/admin-helpers';
import { toDbDate } from '@fintrack/shared';

function paymentToJson(p: {
  id: string;
  paidOn: Date;
  amountPaisa: bigint;
  coversUntil: Date;
  note: string | null;
  recordedBy: string;
  createdAt: Date;
}) {
  return {
    id: p.id,
    paid_on: p.paidOn.toISOString().slice(0, 10),
    amount_paisa: Number(p.amountPaisa),
    covers_until: p.coversUntil.toISOString().slice(0, 10),
    note: p.note,
    recorded_by: p.recordedBy,
    created_at: p.createdAt.toISOString(),
  };
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminUser(req);
  void admin;
  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  const payments = await prisma.userPayment.findMany({
    where: { userId: params.id },
    orderBy: { paidOn: 'desc' },
  });
  return Response.json(payments.map(paymentToJson));
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminUser(req);
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  try {
    adminGuards(admin.id, target);
  } catch (err) {
    if (err instanceof AdminGuardError) return Response.json({ error: err.code, code: err.code }, { status: err.status });
    throw err;
  }

  const body = await req.json().catch(() => null);
  const r = z
    .object({
      paid_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      amount_paisa: z.number().int().positive(),
      covers_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      note: z.string().optional(),
    })
    .safeParse(body);
  if (!r.success) {
    return Response.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', fields: r.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const payment = await prisma.userPayment.create({
    data: {
      userId: params.id,
      paidOn: toDbDate(r.data.paid_on),
      amountPaisa: BigInt(r.data.amount_paisa),
      coversUntil: toDbDate(r.data.covers_until),
      note: r.data.note,
      recordedBy: admin.id,
    },
  });

  await logAdminAction(admin.id, target.id, target.email, 'ADD_PAYMENT', `covers_until=${r.data.covers_until}`);
  return Response.json(paymentToJson(payment), { status: 201 });
}
