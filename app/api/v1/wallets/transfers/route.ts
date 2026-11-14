import { prisma } from '@/lib/prisma';
import { getAuthUser, AuthError } from '@/lib/auth';
import { toDbDate, fromDbDate } from '@fintrack/shared';
import type { PaymentMethod } from '@prisma/client';

const VALID_METHODS: PaymentMethod[] = ['CASH', 'BKASH', 'BANK', 'CARD'];

export async function POST(req: Request) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try {
    user = await getAuthUser(req);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const body = await req.json();
  const { from_method, to_method, amount_paisa, date, note, idempotency_key } = body;

  if (!from_method || !to_method || amount_paisa == null || !date || !idempotency_key) {
    return Response.json({ error: 'Missing required fields', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  const fromMethod = String(from_method).toUpperCase() as PaymentMethod;
  const toMethod = String(to_method).toUpperCase() as PaymentMethod;

  if (!VALID_METHODS.includes(fromMethod) || !VALID_METHODS.includes(toMethod)) {
    return Response.json({ error: 'Invalid payment method', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  if (fromMethod === toMethod) {
    return Response.json({ error: 'Cannot transfer to the same wallet', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  if (amount_paisa <= 0) {
    return Response.json({ error: 'amount_paisa must be positive', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  // Idempotency check
  const existing = await prisma.walletTransfer.findUnique({
    where: { userId_idempotencyKey: { userId: user.id, idempotencyKey: idempotency_key } },
  });
  if (existing) {
    return Response.json(transferToJson(existing), { status: 200 });
  }

  // Both wallets must exist for the user
  const [fromWallet, toWallet] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId_method: { userId: user.id, method: fromMethod } } }),
    prisma.wallet.findUnique({ where: { userId_method: { userId: user.id, method: toMethod } } }),
  ]);

  if (!fromWallet) {
    return Response.json({ error: `Wallet ${fromMethod} not set up`, code: 'VALIDATION_ERROR' }, { status: 422 });
  }
  if (!toWallet) {
    return Response.json({ error: `Wallet ${toMethod} not set up`, code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  const transfer = await prisma.walletTransfer.create({
    data: {
      userId: user.id,
      fromWalletId: fromWallet.id,
      toWalletId: toWallet.id,
      amountPaisa: BigInt(amount_paisa),
      date: toDbDate(date),
      note: note ?? null,
      idempotencyKey: idempotency_key,
    },
  });

  return Response.json(transferToJson(transfer), { status: 201 });
}

function transferToJson(t: {
  id: string;
  fromWalletId: string;
  toWalletId: string;
  amountPaisa: bigint;
  date: Date;
  note: string | null;
  idempotencyKey: string;
  createdAt: Date;
}) {
  return {
    id: t.id,
    from_wallet_id: t.fromWalletId,
    to_wallet_id: t.toWalletId,
    amount_paisa: Number(t.amountPaisa),
    date: fromDbDate(t.date),
    note: t.note,
    idempotency_key: t.idempotencyKey,
    created_at: t.createdAt.toISOString(),
  };
}
