import { prisma } from '../prisma';
import { toDbDate, fromDbDate } from '@fintrack/shared';
import type { PaymentMethod, Prisma } from '@prisma/client';

export class RoutingError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export interface CreateTxInput {
  amount_paisa: number;
  date: string;
  description: string;
  category_id: string;
  payment_method: PaymentMethod;
  idempotency_key: string;
}

export interface UpdateTxInput {
  amount_paisa?: number;
  date?: string;
  description?: string;
  payment_method?: PaymentMethod;
  category_id?: string;
}

type TxWithCategory = Prisma.TransactionGetPayload<{ include: { category: true } }>;

function txToJson(tx: TxWithCategory) {
  return {
    id: tx.id,
    amount_paisa: Number(tx.amountPaisa),
    date: fromDbDate(tx.date),
    description: tx.description,
    category_id: tx.categoryId,
    category_name: tx.category.name,
    type: tx.type,
    payment_method: tx.paymentMethod,
    savings_account_id: tx.savingsAccountId ?? null,
    tax_fiscal_year: tx.taxFiscalYear ?? null,
    idempotency_key: tx.idempotencyKey,
    is_deleted: tx.isDeleted,
    created_at: tx.createdAt.toISOString(),
    updated_at: tx.updatedAt.toISOString(),
  };
}

export class CategoryRoutingService {
  constructor(private userId: string) {}

  async create(input: CreateTxInput) {
    // Idempotency check
    const dup = await prisma.transaction.findUnique({
      where: {
        userId_idempotencyKey: {
          userId: this.userId,
          idempotencyKey: input.idempotency_key,
        },
      },
      include: { category: true },
    });
    if (dup) return { duplicate: true, transaction: txToJson(dup) };

    const category = await prisma.category.findFirst({
      where: { id: input.category_id, userId: this.userId },
    });
    if (!category) throw new RoutingError(422, 'VALIDATION_ERROR', 'Category not found');
    if (category.isArchived) throw new RoutingError(422, 'VALIDATION_ERROR', 'Category is archived');
    if (category.routingType !== 'NONE') {
      throw new RoutingError(422, 'ROUTING_NOT_IMPLEMENTED', 'This routing type is not yet supported');
    }

    const tx = await prisma.transaction.create({
      data: {
        userId: this.userId,
        amountPaisa: BigInt(input.amount_paisa),
        date: toDbDate(input.date),
        description: input.description,
        categoryId: input.category_id,
        type: category.routingType,
        paymentMethod: input.payment_method,
        idempotencyKey: input.idempotency_key,
      },
      include: { category: true },
    });
    return { duplicate: false, transaction: txToJson(tx) };
  }

  async update(txId: string, input: UpdateTxInput) {
    const existing = await prisma.transaction.findFirst({
      where: { id: txId, userId: this.userId, isDeleted: false },
    });
    if (!existing) throw new RoutingError(404, 'NOT_FOUND');

    if (input.category_id) {
      const newCat = await prisma.category.findFirst({
        where: { id: input.category_id, userId: this.userId },
      });
      if (!newCat) throw new RoutingError(422, 'VALIDATION_ERROR', 'Category not found');
      if (newCat.routingType !== existing.type) {
        throw new RoutingError(422, 'ROUTING_TYPE_MISMATCH', 'Cannot change to a different routing type');
      }
    }

    const updated = await prisma.transaction.update({
      where: { id: txId },
      data: {
        ...(input.amount_paisa != null && { amountPaisa: BigInt(input.amount_paisa) }),
        ...(input.date && { date: toDbDate(input.date) }),
        ...(input.description != null && { description: input.description }),
        ...(input.payment_method && { paymentMethod: input.payment_method }),
        ...(input.category_id && { categoryId: input.category_id }),
      },
      include: { category: true },
    });
    return txToJson(updated);
  }

  async softDelete(txId: string) {
    const existing = await prisma.transaction.findFirst({
      where: { id: txId, userId: this.userId, isDeleted: false },
    });
    if (!existing) throw new RoutingError(404, 'NOT_FOUND');
    await prisma.transaction.update({
      where: { id: txId },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }
}
