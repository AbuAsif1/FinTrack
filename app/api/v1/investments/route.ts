import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { fiscalYear, fiscalYearRange, toDbDate, fromDbDate, todayInDhaka } from '@fintrack/shared';

const INVESTMENT_TYPES = ['sanchaypatra', 'fixed_deposit', 'stocks', 'insurance', 'others'] as const;
type InvestmentType = (typeof INVESTMENT_TYPES)[number];

const schema = z.object({
  investment_type: z.enum(INVESTMENT_TYPES),
  custom_label: z.string().min(1).max(80).optional(),
  amount_paisa: z.number().int().positive(),
  payment_method: z.enum(['CASH', 'BKASH', 'BANK', 'CARD']),
  savings_account_id: z.string().optional(),   // destination for sanchaypatra / fixed_deposit
  bank_account_id: z.string().optional(),      // source bank when payment_method = BANK
  description: z.string().optional(),
  idempotency_key: z.string().min(1),
});

// ── POST /api/v1/investments ─────────────────────────────────────────────────

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const r = schema.safeParse(body);
  if (!r.success)
    return Response.json({ error: 'Validation failed', code: 'VALIDATION_ERROR', fields: r.error.flatten().fieldErrors }, { status: 422 });

  const { investment_type, custom_label, amount_paisa, payment_method, savings_account_id, bank_account_id, description } = r.data;
  const today = todayInDhaka();
  const fy = fiscalYear(today);
  const isSavingsType = investment_type === 'sanchaypatra' || investment_type === 'fixed_deposit';

  // ── Sanchaypatra / Fixed Deposit → SAVINGS_DEPOSIT ───────────────────────
  if (isSavingsType) {
    if (!savings_account_id)
      return Response.json({ error: 'savings_account_id is required for sanchaypatra / fixed_deposit', code: 'VALIDATION_ERROR' }, { status: 422 });

    const acct = await prisma.savingsAccount.findFirst({ where: { id: savings_account_id, userId: user.id } });
    if (!acct) return Response.json({ error: 'Savings account not found', code: 'NOT_FOUND' }, { status: 404 });
    if (acct.closedOn) return Response.json({ error: 'Account is closed', code: 'ACCOUNT_CLOSED' }, { status: 422 });

    // Find best-matching SAVINGS_DEPOSIT category
    const depositCats = await prisma.category.findMany({
      where: { userId: user.id, isArchived: false, routingType: 'SAVINGS_DEPOSIT' },
    });
    const cat = investment_type === 'sanchaypatra'
      ? (depositCats.find((c) => c.name.toLowerCase().includes('sanch') || c.name.toLowerCase().includes('invest'))
        ?? depositCats[0])
      : (depositCats.find((c) => c.name.toLowerCase().includes('dps') || c.name.toLowerCase().includes('deposit'))
        ?? depositCats[0]);

    if (!cat)
      return Response.json({ error: 'No SAVINGS_DEPOSIT category found', code: 'MISSING_CATEGORY' }, { status: 422 });

    // If paying by bank, validate and set bankSourceId
    let bankSourceId: string | undefined;
    if (payment_method === 'BANK') {
      if (!bank_account_id)
        return Response.json({ error: 'bank_account_id is required for BANK payment', code: 'VALIDATION_ERROR' }, { status: 422 });
      if (bank_account_id === savings_account_id)
        return Response.json({ error: 'Bank account and destination account must be different', code: 'VALIDATION_ERROR' }, { status: 422 });
      const bankAcct = await prisma.savingsAccount.findFirst({ where: { id: bank_account_id, userId: user.id } });
      if (!bankAcct) return Response.json({ error: 'Bank account not found', code: 'NOT_FOUND' }, { status: 404 });
      bankSourceId = bank_account_id;
    }

    const desc = description
      ?? (investment_type === 'sanchaypatra' ? `Sanchaypatra Purchase` : `Fixed Deposit — ${acct.name}`);

    const tx = await prisma.transaction.create({
      data: {
        userId: user.id,
        date: toDbDate(today),
        amountPaisa: BigInt(amount_paisa),
        description: desc,
        categoryId: cat.id,
        type: 'SAVINGS_DEPOSIT',
        paymentMethod: payment_method,
        savingsAccountId: savings_account_id,
        ...(bankSourceId ? { bankSourceId } : {}),
        idempotencyKey: r.data.idempotency_key,
      },
      include: { category: true },
    });

    return Response.json({
      transaction: { id: tx.id, description: tx.description, amount_paisa, type: 'SAVINGS_DEPOSIT', created_at: tx.createdAt.toISOString() },
      investment_type,
      fiscal_year: fy,
    }, { status: 201 });
  }

  // ── Stocks / Insurance / Others → NONE transaction + TaxInvestment ────────
  const labelMap: Record<string, string> = {
    stocks: 'Stocks',
    insurance: 'Insurance',
    others: custom_label ?? 'Other',
  };
  const descLabel = `Investment — ${labelMap[investment_type]}`;
  const desc = description ?? descLabel;

  // Find or auto-create an "Investment" NONE category
  let investCat = await prisma.category.findFirst({
    where: { userId: user.id, isArchived: false, routingType: 'NONE', name: { equals: 'Investment', mode: 'insensitive' } },
  });
  if (!investCat) {
    investCat = await prisma.category.upsert({
      where: { userId_name: { userId: user.id, name: 'Investment' } },
      create: { userId: user.id, name: 'Investment', routingType: 'NONE', colorHex: '#0EA5E9' },
      update: { isArchived: false },
    });
  }

  // Validate bank account if BANK payment
  if (payment_method === 'BANK') {
    if (!bank_account_id)
      return Response.json({ error: 'bank_account_id is required for BANK payment', code: 'VALIDATION_ERROR' }, { status: 422 });
    const bankAcct = await prisma.savingsAccount.findFirst({ where: { id: bank_account_id, userId: user.id } });
    if (!bankAcct) return Response.json({ error: 'Bank account not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  // Create transaction + increment TaxInvestment atomically
  const [tx] = await prisma.$transaction(async (tx_) => {
    const transaction = await tx_.transaction.create({
      data: {
        userId: user.id,
        date: toDbDate(today),
        amountPaisa: BigInt(amount_paisa),
        description: desc,
        categoryId: investCat!.id,
        type: 'NONE',
        paymentMethod: payment_method,
        ...(payment_method === 'BANK' && bank_account_id ? { bankSourceId: bank_account_id } : {}),
        taxFiscalYear: fy,
        idempotencyKey: r.data.idempotency_key,
      },
    });

    // Atomically increment the right TaxInvestment field (+0 to other fields is harmless)
    const stocksDelta  = investment_type === 'stocks'    ? BigInt(amount_paisa) : 0n;
    const insDelta     = investment_type === 'insurance' ? BigInt(amount_paisa) : 0n;
    const othersDelta  = investment_type === 'others'    ? BigInt(amount_paisa) : 0n;

    await tx_.taxInvestment.upsert({
      where: { userId_fiscalYear: { userId: user.id, fiscalYear: fy } },
      create: {
        userId: user.id,
        fiscalYear: fy,
        stocksPaisa: stocksDelta,
        insurancePaisa: insDelta,
        othersPaisa: othersDelta,
        universalPensionPaisa: 0n,
      },
      update: {
        stocksPaisa:   { increment: stocksDelta },
        insurancePaisa: { increment: insDelta },
        othersPaisa:   { increment: othersDelta },
      },
    });

    return [transaction];
  });

  return Response.json({
    transaction: { id: tx.id, description: tx.description, amount_paisa, type: 'NONE', created_at: tx.createdAt.toISOString() },
    investment_type,
    custom_label: investment_type === 'others' ? (custom_label ?? null) : null,
    fiscal_year: fy,
  }, { status: 201 });
}

// ── GET /api/v1/investments?fiscal_year=2025-26 ──────────────────────────────
// Returns investment transactions recorded via this endpoint for a given FY.

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const url = new URL(req.url);
  const fy = url.searchParams.get('fiscal_year') ?? fiscalYear(todayInDhaka());
  const { from, to } = fiscalYearRange(fy);

  const fyStart = toDbDate(from);
  const fyEnd   = toDbDate(to);

  // Find the Investment (NONE) category for this user
  const investCat = await prisma.category.findFirst({
    where: { userId: user.id, routingType: 'NONE', name: { equals: 'Investment', mode: 'insensitive' } },
  });

  if (!investCat) return Response.json({ transactions: [] });

  const rows = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      categoryId: investCat.id,
      isDeleted: false,
      date: { gte: fyStart, lt: fyEnd },
    },
    orderBy: [{ createdAt: 'desc' }],
    select: { id: true, description: true, amountPaisa: true, date: true, createdAt: true, paymentMethod: true },
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
    })),
  });
}
