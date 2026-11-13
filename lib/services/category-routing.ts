import { prisma } from '../prisma';
import { toDbDate, fromDbDate, fiscalYear, todayInDhaka } from '@fintrack/shared';
import type { PaymentMethod, Prisma } from '@prisma/client';
import { ensureInstances } from './fixed-expenses';

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
  // Savings routing
  savings_account_id?: string;
  // Loan routing
  loan_person_id?: string;
  loan_person_name?: string;
  return_due_date?: string;
  reason?: string;
  is_settlement?: boolean;
  // Tax routing
  tax_fiscal_year?: string;
  // Import
  import_batch_id?: string;
}

export interface UpdateTxInput {
  amount_paisa?: number;
  date?: string;
  description?: string;
  payment_method?: PaymentMethod;
  category_id?: string;
  // Savings routing
  savings_account_id?: string;
  // Loan routing
  loan_person_id?: string;
  loan_person_name?: string;
  return_due_date?: string;
  reason?: string;
  // Tax routing
  tax_fiscal_year?: string;
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

async function computeSavingsBalance(accountId: string, userId: string): Promise<number> {
  const acct = await prisma.savingsAccount.findFirst({ where: { id: accountId, userId } });
  if (!acct) return 0;
  const txSums = await prisma.transaction.groupBy({
    by: ['type'],
    where: { savingsAccountId: accountId, userId, isDeleted: false },
    _sum: { amountPaisa: true },
  });
  let deposit = 0n, interest = 0n, withdrawal = 0n, spending = 0n;
  for (const r of txSums) {
    const a = r._sum.amountPaisa ?? 0n;
    if (r.type === 'SAVINGS_DEPOSIT') deposit = a;
    else if (r.type === 'SAVINGS_INTEREST') interest = a;
    else if (r.type === 'SAVINGS_WITHDRAWAL') withdrawal = a;
    else if (r.type === 'NONE') spending = a;
  }
  return Number(acct.openingBalancePaisa) + Number(deposit) + Number(interest) - Number(withdrawal) - Number(spending);
}

async function computeRunningBalance(loanPersonId: string, userId: string): Promise<number> {
  const given = await prisma.transaction.aggregate({
    where: { userId, isDeleted: false, type: 'LOAN_GIVEN', loanEntry: { loanPersonId } },
    _sum: { amountPaisa: true },
  });
  const received = await prisma.transaction.aggregate({
    where: { userId, isDeleted: false, type: 'LOAN_RECEIVED', loanEntry: { loanPersonId } },
    _sum: { amountPaisa: true },
  });
  return Number(given._sum.amountPaisa ?? 0n) - Number(received._sum.amountPaisa ?? 0n);
}

async function validateSavingsAccount(
  savingsAccountId: string,
  userId: string,
  txDate: string,
): Promise<Prisma.SavingsAccountGetPayload<Record<string, never>>> {
  const acct = await prisma.savingsAccount.findFirst({ where: { id: savingsAccountId, userId } });
  if (!acct) throw new RoutingError(422, 'VALIDATION_ERROR', 'Savings account not found');
  if (acct.closedOn) throw new RoutingError(422, 'ACCOUNT_CLOSED', 'Savings account is closed');
  if (txDate < fromDbDate(acct.openingDate)) {
    throw new RoutingError(422, 'DATE_BEFORE_OPENING', 'Transaction date is before account opening date');
  }
  return acct;
}

async function resolveLoanPerson(
  userId: string,
  loanPersonId?: string,
  loanPersonName?: string,
  tx?: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
): Promise<{ id: string; name: string }> {
  const db = tx ?? prisma;
  if (loanPersonId) {
    const person = await db.loanPerson.findFirst({ where: { id: loanPersonId, userId } });
    if (!person) throw new RoutingError(422, 'VALIDATION_ERROR', 'Loan person not found');
    return person;
  }
  if (loanPersonName) {
    // Case-insensitive match or create
    const existing = await db.loanPerson.findFirst({
      where: { userId, name: { equals: loanPersonName, mode: 'insensitive' } },
    });
    if (existing) return existing;
    return db.loanPerson.create({ data: { userId, name: loanPersonName } });
  }
  throw new RoutingError(422, 'VALIDATION_ERROR', 'loan_person_id or loan_person_name is required');
}

function validateTaxFiscalYear(txDate: string, givenFY?: string): string {
  const dateFY = fiscalYear(txDate);
  const today = todayInDhaka();
  const currentFY = fiscalYear(today);
  // Derive previous FY from current
  const [startYear] = currentFY.split('-');
  const prevFYEnd = Number(startYear);
  const prevFYStart = prevFYEnd - 1;
  const previousFY = `${prevFYStart}-${String(prevFYEnd).slice(-2)}`;

  const chosenFY = givenFY ?? dateFY;
  if (chosenFY !== currentFY && chosenFY !== previousFY) {
    throw new RoutingError(422, 'INVALID_FISCAL_YEAR', 'Tax Payment must be for the current or previous Fiscal Year');
  }
  return chosenFY;
}

export class CategoryRoutingService {
  constructor(private userId: string) {}

  async create(input: CreateTxInput): Promise<{
    duplicate: boolean;
    transaction: ReturnType<typeof txToJson>;
    loanEntry?: object;
    routing?: object;
  }> {
    // Idempotency check
    const dup = await prisma.transaction.findUnique({
      where: { userId_idempotencyKey: { userId: this.userId, idempotencyKey: input.idempotency_key } },
      include: { category: true },
    });
    if (dup) return { duplicate: true, transaction: txToJson(dup) };

    const category = await prisma.category.findFirst({
      where: { id: input.category_id, userId: this.userId },
    });
    if (!category) throw new RoutingError(422, 'VALIDATION_ERROR', 'Category not found');
    if (category.isArchived) throw new RoutingError(422, 'VALIDATION_ERROR', 'Category is archived');

    // ── Savings routing ──────────────────────────────────────────────────────
    if (
      category.routingType === 'SAVINGS_DEPOSIT' ||
      category.routingType === 'SAVINGS_WITHDRAWAL' ||
      category.routingType === 'SAVINGS_INTEREST'
    ) {
      if (!input.savings_account_id) {
        throw new RoutingError(422, 'VALIDATION_ERROR', 'savings_account_id is required');
      }
      const acct = await validateSavingsAccount(input.savings_account_id, this.userId, input.date);

      if (category.routingType === 'SAVINGS_WITHDRAWAL') {
        // Balance check: current balance must cover the withdrawal
        const currentBalance = await computeSavingsBalance(input.savings_account_id, this.userId);
        if (input.amount_paisa > currentBalance) {
          throw new RoutingError(422, 'INSUFFICIENT_BALANCE', 'Withdrawal exceeds the account balance');
        }
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
          savingsAccountId: input.savings_account_id,
          idempotencyKey: input.idempotency_key,
          importBatchId: input.import_batch_id ?? null,
        },
        include: { category: true },
      });

      const newBalance = await computeSavingsBalance(input.savings_account_id, this.userId);
      await this.autoLinkFixedExpense(tx.id, input.category_id, input.date, input.amount_paisa);
      return {
        duplicate: false,
        transaction: txToJson(tx),
        routing: { account: { id: acct.id, name: acct.name, balance_paisa: newBalance } },
      };
    }

    // ── Loan routing ─────────────────────────────────────────────────────────
    if (category.routingType === 'LOAN_GIVEN' || category.routingType === 'LOAN_RECEIVED') {
      const result = await prisma.$transaction(async (tx) => {
        const person = await resolveLoanPerson(this.userId, input.loan_person_id, input.loan_person_name, tx);

        const transaction = await tx.transaction.create({
          data: {
            userId: this.userId,
            amountPaisa: BigInt(input.amount_paisa),
            date: toDbDate(input.date),
            description: input.description,
            categoryId: input.category_id,
            type: category.routingType,
            paymentMethod: input.payment_method,
            idempotencyKey: input.idempotency_key,
            importBatchId: input.import_batch_id ?? null,
          },
          include: { category: true },
        });
        const loanEntry = await tx.loanEntry.create({
          data: {
            userId: this.userId,
            loanPersonId: person.id,
            transactionId: transaction.id,
            direction: category.routingType === 'LOAN_GIVEN' ? 'GIVEN' : 'RECEIVED',
            reason: input.reason ?? null,
            returnDueDate: input.return_due_date ? toDbDate(input.return_due_date) : null,
            isSettlement: input.is_settlement ?? false,
          },
        });
        return { transaction, loanEntry, person };
      });

      const newBalance = await computeRunningBalance(result.person.id, this.userId);
      await this.autoLinkFixedExpense(result.transaction.id, input.category_id, input.date, input.amount_paisa);
      return {
        duplicate: false,
        transaction: txToJson(result.transaction),
        loanEntry: result.loanEntry,
        routing: { person: { id: result.person.id, name: result.person.name, running_balance_paisa: newBalance } },
      };
    }

    // ── Tax Payment ──────────────────────────────────────────────────────────
    if (category.routingType === 'TAX_PAYMENT') {
      const taxFY = validateTaxFiscalYear(input.date, input.tax_fiscal_year);
      const tx = await prisma.transaction.create({
        data: {
          userId: this.userId,
          amountPaisa: BigInt(input.amount_paisa),
          date: toDbDate(input.date),
          description: input.description,
          categoryId: input.category_id,
          type: category.routingType,
          paymentMethod: input.payment_method,
          taxFiscalYear: taxFY,
          idempotencyKey: input.idempotency_key,
          importBatchId: input.import_batch_id ?? null,
        },
        include: { category: true },
      });
      await this.autoLinkFixedExpense(tx.id, input.category_id, input.date, input.amount_paisa);
      return {
        duplicate: false,
        transaction: txToJson(tx),
        routing: { fiscal_year: taxFY },
      };
    }

    // ── NONE (spending) ──────────────────────────────────────────────────────
    if (category.routingType !== 'NONE') {
      throw new RoutingError(422, 'ROUTING_NOT_IMPLEMENTED', 'This routing type is not yet supported');
    }

    // Bank account deduction: when payment_method=BANK and a savings_account_id is provided
    let bankAccountId: string | null = null;
    if (input.payment_method === 'BANK' && input.savings_account_id) {
      await validateSavingsAccount(input.savings_account_id, this.userId, input.date);
      const balance = await computeSavingsBalance(input.savings_account_id, this.userId);
      if (input.amount_paisa > balance) {
        throw new RoutingError(422, 'INSUFFICIENT_BALANCE', `Spending amount exceeds account balance (${balance} paisa available)`);
      }
      bankAccountId = input.savings_account_id;
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
        savingsAccountId: bankAccountId,
        idempotencyKey: input.idempotency_key,
        importBatchId: input.import_batch_id ?? null,
      },
      include: { category: true },
    });

    await this.autoLinkFixedExpense(tx.id, input.category_id, input.date, input.amount_paisa);

    if (bankAccountId) {
      const acct = await prisma.savingsAccount.findUnique({ where: { id: bankAccountId } });
      const newBalance = await computeSavingsBalance(bankAccountId, this.userId);
      return {
        duplicate: false,
        transaction: txToJson(tx),
        routing: { type: 'BANK_DEDUCT', account: { id: bankAccountId, name: acct?.name ?? '', balance_paisa: newBalance } },
      };
    }
    return { duplicate: false, transaction: txToJson(tx) };
  }

  private async autoLinkFixedExpense(
    txId: string,
    categoryId: string,
    txDate: string,
    actualAmountPaisa: number,
  ): Promise<void> {
    const month = txDate.slice(0, 7);
    await ensureInstances(this.userId, month);
    const instance = await prisma.fixedExpenseInstance.findFirst({
      where: {
        userId: this.userId,
        status: 'PENDING',
        transactionId: null,
        month: toDbDate(month + '-01'),
        fixedExpense: { categoryId },
      },
    });
    if (!instance) return;
    await prisma.fixedExpenseInstance.update({
      where: { id: instance.id },
      data: {
        status: 'PAID',
        transactionId: txId,
        actualAmountPaisa: BigInt(actualAmountPaisa),
        paidDate: toDbDate(txDate),
      },
    });
  }

  async update(txId: string, input: UpdateTxInput) {
    const existing = await prisma.transaction.findFirst({
      where: { id: txId, userId: this.userId, isDeleted: false },
      include: { category: true },
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

    const newDate = input.date ?? fromDbDate(existing.date);
    const newAmount = input.amount_paisa != null ? input.amount_paisa : Number(existing.amountPaisa);

    // Savings-specific re-validation
    if (
      existing.type === 'SAVINGS_DEPOSIT' ||
      existing.type === 'SAVINGS_WITHDRAWAL' ||
      existing.type === 'SAVINGS_INTEREST'
    ) {
      const accountId = input.savings_account_id ?? existing.savingsAccountId;
      if (accountId) {
        await validateSavingsAccount(accountId, this.userId, newDate);
        if (existing.type === 'SAVINGS_WITHDRAWAL') {
          // Balance excluding this transaction
          const balanceExcluding = await computeSavingsBalance(accountId, this.userId);
          const oldAmount = Number(existing.amountPaisa);
          // Add back the old withdrawal amount, subtract the new one
          const balanceAfter = balanceExcluding + oldAmount - newAmount;
          if (balanceAfter < 0) {
            throw new RoutingError(422, 'INSUFFICIENT_BALANCE', 'Updated withdrawal exceeds the account balance');
          }
        }
      }
    }

    // Tax-specific re-validation
    if (existing.type === 'TAX_PAYMENT' && input.tax_fiscal_year) {
      validateTaxFiscalYear(newDate, input.tax_fiscal_year);
    }

    // Loan-specific: update loan entry if loan_person_id changes
    if (
      (existing.type === 'LOAN_GIVEN' || existing.type === 'LOAN_RECEIVED') &&
      (input.loan_person_id || input.loan_person_name)
    ) {
      const person = await resolveLoanPerson(this.userId, input.loan_person_id, input.loan_person_name);
      await prisma.loanEntry.update({
        where: { transactionId: txId },
        data: {
          loanPersonId: person.id,
          ...(input.reason !== undefined && { reason: input.reason ?? null }),
          ...(input.return_due_date !== undefined && {
            returnDueDate: input.return_due_date ? toDbDate(input.return_due_date) : null,
          }),
        },
      });
    } else if (
      (existing.type === 'LOAN_GIVEN' || existing.type === 'LOAN_RECEIVED') &&
      (input.reason !== undefined || input.return_due_date !== undefined)
    ) {
      await prisma.loanEntry.update({
        where: { transactionId: txId },
        data: {
          ...(input.reason !== undefined && { reason: input.reason ?? null }),
          ...(input.return_due_date !== undefined && {
            returnDueDate: input.return_due_date ? toDbDate(input.return_due_date) : null,
          }),
        },
      });
    }

    const updated = await prisma.transaction.update({
      where: { id: txId },
      data: {
        ...(input.amount_paisa != null && { amountPaisa: BigInt(input.amount_paisa) }),
        ...(input.date && { date: toDbDate(input.date) }),
        ...(input.description != null && { description: input.description }),
        ...(input.payment_method && { paymentMethod: input.payment_method }),
        ...(input.category_id && { categoryId: input.category_id }),
        ...(input.savings_account_id !== undefined && { savingsAccountId: input.savings_account_id ?? null }),
        ...(input.tax_fiscal_year !== undefined && { taxFiscalYear: input.tax_fiscal_year ?? null }),
      },
      include: { category: true },
    });

    // Build routing summary
    let routing: object | undefined;
    if (updated.type === 'SAVINGS_DEPOSIT' || updated.type === 'SAVINGS_WITHDRAWAL' || updated.type === 'SAVINGS_INTEREST') {
      if (updated.savingsAccountId) {
        const acct = await prisma.savingsAccount.findUnique({ where: { id: updated.savingsAccountId } });
        const balance = await computeSavingsBalance(updated.savingsAccountId, this.userId);
        if (acct) routing = { account: { id: acct.id, name: acct.name, balance_paisa: balance } };
      }
    } else if (updated.type === 'LOAN_GIVEN' || updated.type === 'LOAN_RECEIVED') {
      const loanEntry = await prisma.loanEntry.findUnique({ where: { transactionId: txId } });
      if (loanEntry) {
        const person = await prisma.loanPerson.findUnique({ where: { id: loanEntry.loanPersonId } });
        const balance = await computeRunningBalance(loanEntry.loanPersonId, this.userId);
        if (person) routing = { person: { id: person.id, name: person.name, running_balance_paisa: balance } };
      }
    } else if (updated.type === 'TAX_PAYMENT') {
      routing = { fiscal_year: updated.taxFiscalYear };
    }

    return { ...txToJson(updated), routing };
  }

  async softDelete(txId: string) {
    const existing = await prisma.transaction.findFirst({
      where: { id: txId, userId: this.userId, isDeleted: false },
    });
    if (!existing) throw new RoutingError(404, 'NOT_FOUND');

    await prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id: txId },
        data: { isDeleted: true, deletedAt: new Date() },
      });

      // If this transaction paid a Fixed Expense instance, return it to PENDING
      await tx.fixedExpenseInstance.updateMany({
        where: { transactionId: txId },
        data: { status: 'PENDING', transactionId: null, actualAmountPaisa: null },
      });
    });
  }
}
