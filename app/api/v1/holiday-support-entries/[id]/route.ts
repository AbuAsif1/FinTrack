import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { toDbDate, fromDbDate } from '@fintrack/shared';

function entryToJson(entry: {
  id: string;
  date: Date;
  days: number;
  rateType: string;
  ratePaisa: bigint;
  amountPaisa: bigint;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: entry.id,
    date: fromDbDate(entry.date),
    days: entry.days,
    rate_type: entry.rateType,
    rate_paisa: Number(entry.ratePaisa),
    amount_paisa: Number(entry.amountPaisa),
    note: entry.note ?? null,
    created_at: entry.createdAt.toISOString(),
    updated_at: entry.updatedAt.toISOString(),
  };
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const entry = await prisma.holidaySupportEntry.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!entry) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  const body = await req.json();
  const { date, days, rate_paisa, note } = body;

  const newDays = days ?? entry.days;
  const newRate = rate_paisa != null ? BigInt(rate_paisa) : entry.ratePaisa;
  const newAmount = BigInt(newDays) * newRate;

  const updated = await prisma.holidaySupportEntry.update({
    where: { id: params.id },
    data: {
      ...(date && { date: toDbDate(date) }),
      ...(days != null && { days: newDays }),
      ...(rate_paisa != null && { ratePaisa: newRate }),
      amountPaisa: newAmount,
      ...(note !== undefined && { note: note ?? null }),
    },
  });

  return Response.json(entryToJson(updated));
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const entry = await prisma.holidaySupportEntry.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!entry) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  await prisma.holidaySupportEntry.delete({ where: { id: params.id } });
  return new Response(null, { status: 204 });
}
