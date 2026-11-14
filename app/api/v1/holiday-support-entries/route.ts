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

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const url = new URL(req.url);
  const month = url.searchParams.get('month');

  const where: { userId: string; date?: { gte: Date; lte: Date } } = { userId: user.id };
  if (month) {
    where.date = { gte: toDbDate(`${month}-01`), lte: toDbDate(`${month}-31`) };
  }

  const entries = await prisma.holidaySupportEntry.findMany({
    where,
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });

  // Compute month total if month filter
  const monthTotal = month ? entries.reduce((sum, e) => sum + Number(e.amountPaisa), 0) : null;

  return Response.json({
    entries: entries.map(entryToJson),
    ...(month != null && { month_total_paisa: monthTotal }),
  });
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const body = await req.json();
  const { date, days, rate_type, rate_paisa: inputRate, note } = body;

  if (!date || !days || !rate_type) {
    return Response.json({ error: 'Missing required fields', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  // Pre-fill rate from latest entry of same type if not provided
  let ratePaisa: bigint;
  if (inputRate != null) {
    ratePaisa = BigInt(inputRate);
  } else {
    const latest = await prisma.holidaySupportEntry.findFirst({
      where: { userId: user.id, rateType: rate_type },
      orderBy: { date: 'desc' },
    });
    if (!latest) {
      return Response.json({ error: 'rate_paisa is required for a new rate type', code: 'VALIDATION_ERROR' }, { status: 422 });
    }
    ratePaisa = latest.ratePaisa;
  }

  const amountPaisa = BigInt(days) * ratePaisa;

  const entry = await prisma.holidaySupportEntry.create({
    data: {
      userId: user.id,
      date: toDbDate(date),
      days,
      rateType: rate_type,
      ratePaisa,
      amountPaisa,
      note: note ?? null,
    },
  });

  return Response.json(entryToJson(entry), { status: 201 });
}
