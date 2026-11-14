import { prisma } from '@/lib/prisma';
import { getAuthUser, AuthError } from '@/lib/auth';
import { toDbDate, fromDbDate } from '@fintrack/shared';
import type { PaymentMethod } from '@prisma/client';

const VALID_METHODS: PaymentMethod[] = ['CASH', 'BKASH', 'BANK', 'CARD'];

function walletToJson(w: {
  id: string;
  method: PaymentMethod;
  name: string;
  openingBalancePaisa: bigint;
  openingBalanceDate: Date;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: w.id,
    method: w.method,
    name: w.name,
    opening_balance_paisa: Number(w.openingBalancePaisa),
    opening_balance_date: fromDbDate(w.openingBalanceDate),
    is_enabled: w.isEnabled,
    created_at: w.createdAt.toISOString(),
    updated_at: w.updatedAt.toISOString(),
  };
}

export async function PUT(req: Request, { params }: { params: { method: string } }) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try {
    user = await getAuthUser(req);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const method = params.method.toUpperCase() as PaymentMethod;
  if (!VALID_METHODS.includes(method)) {
    return Response.json({ error: 'Invalid payment method', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  if (method === 'BANK') {
    return Response.json(
      { error: 'Bank wallet is auto-derived from your savings accounts. Manage individual bank accounts on the Savings page.', code: 'NOT_SUPPORTED' },
      { status: 400 },
    );
  }

  const body = await req.json();
  const { name, opening_balance_paisa, opening_balance_date } = body;

  if (!name || opening_balance_paisa == null || !opening_balance_date) {
    return Response.json({ error: 'Missing required fields', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  if (opening_balance_paisa < 0) {
    return Response.json({ error: 'opening_balance_paisa must not be negative', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  const wallet = await prisma.wallet.upsert({
    where: { userId_method: { userId: user.id, method } },
    update: {
      name,
      openingBalancePaisa: BigInt(opening_balance_paisa),
      openingBalanceDate: toDbDate(opening_balance_date),
    },
    create: {
      userId: user.id,
      method,
      name,
      openingBalancePaisa: BigInt(opening_balance_paisa),
      openingBalanceDate: toDbDate(opening_balance_date),
    },
  });

  return Response.json(walletToJson(wallet));
}
