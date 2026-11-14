import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { fiscalYear, fiscalYearRange, toDbDate, fromDbDate, todayInDhaka, INVESTMENT_ACCOUNT_TYPES } from '@fintrack/shared';
import { CategoryRoutingService, RoutingError } from '@/lib/services/category-routing';

const schema = z.object({
  savings_account_id: z.string().min(1),          // the Investment Account paid into
  amount_paisa: z.number().int().positive(),
  payment_method: z.enum(['CASH', 'BKASH', 'BANK', 'CARD']),
  bank_account_id: z.string().optional(),          // paying account when payment_method = BANK
  description: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  idempotency_key: z.string().min(1),
});

// ── POST /api/v1/investments ─────────────────────────────────────────────────
// A payment into an Investment Account: the paying account goes down, the investment goes up,
// and the amount counts toward the investment kind's Tax Rebate bucket.

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const r = schema.safeParse(body);
  if (!r.success)
    return Response.json({ error: 'Validation failed', code: 'VALIDATION_ERROR', fields: r.error.flatten().fieldErrors }, { status: 422 });

  const { savings_account_id, amount_paisa, payment_method, bank_account_id, description, date, idempotency_key } = r.data;

  const acct = await prisma.savingsAccount.findFirst({ where: { id: savings_account_id, userId: user.id } });
  if (!acct) return Response.json({ error: 'Investment account not found', code: 'NOT_FOUND' }, { status: 404 });
  if (!INVESTMENT_ACCOUNT_TYPES.includes(acct.type))
    return Response.json({ error: `${acct.name} is not an investment account`, code: 'VALIDATION_ERROR' }, { status: 422 });

  const depositCats = await prisma.category.findMany({
    where: { userId: user.id, isArchived: false, routingType: 'SAVINGS_DEPOSIT' },
  });
  const cat = depositCats.find((c) => c.name.toLowerCase().includes('invest')) ?? depositCats[0];
  if (!cat) return Response.json({ error: 'No savings deposit category found', code: 'MISSING_CATEGORY' }, { status: 422 });

  try {
    const result = await new CategoryRoutingService(user.id).create({
      amount_paisa,
      date: date ?? todayInDhaka(),
      description: description || acct.name,
      category_id: cat.id,
      payment_method,
      idempotency_key,
      savings_account_id,
      bank_account_id,
    });
    if (result.duplicate) return Response.json({ code: 'DUPLICATE', transaction: result.transaction }, { status: 409 });
    return Response.json({ transaction: result.transaction, routing: result.routing ?? null }, { status: 201 });
  } catch (err) {
    if (err instanceof RoutingError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }
}

// ── GET /api/v1/investments?fiscal_year=2025-26 ──────────────────────────────
// Payments into Investment Accounts in the Fiscal Year, newest first.

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const url = new URL(req.url);
  const fy = url.searchParams.get('fiscal_year') ?? fiscalYear(todayInDhaka());
  const { from, to } = fiscalYearRange(fy);

  const rows = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      isDeleted: false,
      type: 'SAVINGS_DEPOSIT',
      date: { gte: toDbDate(from), lte: toDbDate(to) },
      savingsAccount: { type: { in: INVESTMENT_ACCOUNT_TYPES as never[] } },
    },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true, description: true, amountPaisa: true, date: true, createdAt: true, paymentMethod: true,
      savingsAccount: { select: { id: true, name: true, type: true } },
    },
  });

  return Response.json({
    fiscal_year: fy,
    transactions: rows.map((r) => ({
      id: r.id,
      description: r.description,
      amount_paisa: Number(r.amountPaisa),
      date: fromDbDate(r.date),
      created_at: r.createdAt.toISOString(),
      payment_method: r.paymentMethod,
      account_id: r.savingsAccount?.id ?? null,
      account_name: r.savingsAccount?.name ?? null,
      account_type: r.savingsAccount?.type ?? null,
    })),
  });
}
