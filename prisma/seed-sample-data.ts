import { PrismaClient, PaymentMethod } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

function ikey(userId: string, description: string, date: string): string {
  return createHash('sha256').update(`${userId}:${description}:${date}`).digest('hex').slice(0, 36);
}

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'owner@example.com' } });
  if (!user) throw new Error('Owner not found — run db:seed first');

  const cats = await prisma.category.findMany({ where: { userId: user.id, isArchived: false } });
  const cat = (name: string) => {
    const c = cats.find((c) => c.name === name);
    if (!c) throw new Error(`Category not found: ${name}`);
    return c.id;
  };

  type TxRow = {
    userId: string; date: Date; amountPaisa: bigint; description: string;
    categoryId: string; type: string; paymentMethod: PaymentMethod;
    isDeleted: boolean; idempotencyKey: string;
  };

  const row = (
    dateStr: string, amountPaisa: bigint, description: string,
    categoryName: string, paymentMethod: PaymentMethod,
  ): TxRow => ({
    userId: user.id,
    date: new Date(dateStr),
    amountPaisa,
    description,
    categoryId: cat(categoryName),
    type: 'NONE',
    paymentMethod,
    isDeleted: false,
    idempotencyKey: ikey(user.id, description, dateStr),
  });

  const txns: TxRow[] = [
    // October 2026
    row('2026-10-02', 320000n, 'Weekly groceries — Shwapno', 'Groceries', PaymentMethod.CASH),
    row('2026-10-04', 85000n, 'Lunch — Star Kabab', 'Dining', PaymentMethod.CASH),
    row('2026-10-05', 55000n, 'CNG fare', 'Transport', PaymentMethod.CASH),
    row('2026-10-07', 1200000n, 'Monthly rent', 'Rent', PaymentMethod.BANK),
    row('2026-10-09', 95000n, 'DESCO electricity bill', 'Utility', PaymentMethod.BKASH),
    row('2026-10-11', 170000n, 'Weekly groceries — Meena Bazar', 'Groceries', PaymentMethod.BKASH),
    row('2026-10-13', 450000n, 'New shirt and trousers — Aarong', 'Shopping', PaymentMethod.CARD),
    row('2026-10-15', 120000n, 'Doctor visit — Ibn Sina', 'Health', PaymentMethod.CASH),
    row('2026-10-17', 200000n, 'Cinema + dinner', 'Entertainment', PaymentMethod.CARD),
    row('2026-10-20', 310000n, 'Weekly groceries', 'Groceries', PaymentMethod.CASH),
    row('2026-10-22', 75000n, 'Uber rides', 'Transport', PaymentMethod.BKASH),
    row('2026-10-25', 60000n, 'Internet bill — Grameenphone', 'Utility', PaymentMethod.BKASH),
    row('2026-10-27', 90000n, 'Dinner — Chillox', 'Dining', PaymentMethod.CARD),
    row('2026-10-30', 280000n, 'Groceries — month end', 'Groceries', PaymentMethod.CASH),

    // November 2026
    row('2026-11-01', 1200000n, 'Monthly rent', 'Rent', PaymentMethod.BANK),
    row('2026-11-02', 350000n, 'Groceries — Shwapno', 'Groceries', PaymentMethod.BKASH),
    row('2026-11-03', 95000n, 'DESCO electricity bill', 'Utility', PaymentMethod.BKASH),
    row('2026-11-04', 110000n, 'Team lunch', 'Dining', PaymentMethod.CARD),
    row('2026-11-05', 65000n, 'Rickshaw + CNG', 'Transport', PaymentMethod.CASH),
    row('2026-11-07', 380000n, 'Books and stationery', 'Shopping', PaymentMethod.CARD),
    row('2026-11-08', 60000n, 'Internet bill', 'Utility', PaymentMethod.BKASH),
    row('2026-11-10', 155000n, 'Pharmacy — medicines', 'Health', PaymentMethod.CASH),
    row('2026-11-11', 300000n, 'Groceries', 'Groceries', PaymentMethod.CASH),
  ];

  await prisma.transaction.createMany({ data: txns as never, skipDuplicates: true });
  console.log(`Inserted ${txns.length} sample transactions for ${user.email}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
