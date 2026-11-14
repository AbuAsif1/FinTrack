/**
 * E2E seed script — creates a dedicated test user with all data needed for
 * the happy-path scenarios in e2e/happy-path.spec.ts.
 *
 * Run:  pnpm seed:e2e
 *
 * Safe to re-run: wipes and rebuilds the E2E user's data each time.
 */

import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { starterCategories } from '../prisma/defaults/categories';
import { taxYearConfigs } from '../prisma/defaults/tax-years';

export const E2E_EMAIL    = 'e2euser@test.local';
export const E2E_PASSWORD = 'E2ETest1234!';
export const E2E_NAME     = 'Asif E2E';

const prisma = new PrismaClient();

// ── Provision helper (mirrors seed.ts, avoids importing it and auto-running main) ──

async function provisionUser(userId: string) {
  for (const cat of starterCategories) {
    await prisma.category.upsert({
      where: { userId_name: { userId, name: cat.name } },
      update: {},
      create: { userId, ...cat },
    });
  }
  for (const [fy, cfg] of Object.entries(taxYearConfigs)) {
    await prisma.taxYear.upsert({
      where: { userId_fiscalYear: { userId, fiscalYear: fy } },
      update: {},
      create: { userId, fiscalYear: fy, configJson: cfg as object },
    });
  }
}

// ── Clean slate — delete in FK-safe order ────────────────────────────────────

async function wipeUserData(userId: string) {
  await prisma.fixedExpenseInstance.deleteMany({ where: { userId } });
  await prisma.loanEntry.deleteMany({ where: { userId } });
  await prisma.transaction.deleteMany({ where: { userId } });
  await prisma.incomeEntry.deleteMany({ where: { userId } });
  await prisma.holidaySupportEntry.deleteMany({ where: { userId } });
  await prisma.fixedExpense.deleteMany({ where: { userId } });
  await prisma.savingsAccount.deleteMany({ where: { userId } });
  await prisma.loanPerson.deleteMany({ where: { userId } });
  await prisma.budget.deleteMany({ where: { userId } });
  await prisma.notification.deleteMany({ where: { userId } });
  await prisma.taxInvestment.deleteMany({ where: { userId } });
  await prisma.taxYear.deleteMany({ where: { userId } });
  await prisma.category.deleteMany({ where: { userId } });
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('▶  E2E seed starting…');

  // 1. Create / reset user
  const passwordHash = await bcrypt.hash(E2E_PASSWORD, 12);
  const user = await prisma.user.upsert({
    where: { email: E2E_EMAIL },
    update: { passwordHash, name: E2E_NAME },
    create: {
      email:          E2E_EMAIL,
      passwordHash,
      name:           E2E_NAME,
      role:           'USER',
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`   User: ${user.email} (${user.id})`);

  // 2. Wipe previous E2E data for a clean run
  await wipeUserData(user.id);
  console.log('   Previous E2E data wiped.');

  // 3. Provision starter categories + all three tax years
  await provisionUser(user.id);
  console.log('   Categories + tax years provisioned.');

  // 4. Savings account: "City Bank DPS 10k"
  const dpsAccount = await prisma.savingsAccount.create({
    data: {
      userId:                 user.id,
      name:                   'City Bank DPS 10k',
      type:                   'DPS',
      bankName:               'City Bank',
      lastFour:               '1234',
      openingBalancePaisa:    0n,
      openingDate:            new Date('2025-07-01'),
      monthlyInstallmentPaisa: 1_000_000n,  // ৳10,000
      maturityDate:           new Date('2028-07-01'),
    },
  });
  console.log(`   DPS account: ${dpsAccount.name} (${dpsAccount.id})`);

  // 5. Resolve category IDs we'll need
  const cat = async (name: string) => {
    const c = await prisma.category.findFirst({ where: { userId: user.id, name } });
    if (!c) throw new Error(`Category not found: "${name}"`);
    return c;
  };

  const rentCat   = await cat('Rent');
  const diningCat = await cat('Dining');
  const dpsCat    = await cat('DPS / Savings');

  // 6. Current month date helpers
  const now         = new Date();
  const startMonth  = new Date(now.getFullYear(), now.getMonth(), 1);  // 1st of this month

  // 7. Fixed Expense template: Mess Rent (due day 15, Rent)
  await prisma.fixedExpense.create({
    data: {
      userId:              user.id,
      name:                'Mess Rent',
      standardAmountPaisa: 872_200n,   // ৳8,722
      dueDay:              15,
      categoryId:          rentCat.id,
      startMonth,
    },
  });

  // 8. Fixed Expense template: City Bank DPS 10k (due day 14, DPS / Savings)
  await prisma.fixedExpense.create({
    data: {
      userId:              user.id,
      name:                'City Bank DPS 10k',
      standardAmountPaisa: 1_000_000n,  // ৳10,000
      dueDay:              14,
      categoryId:          dpsCat.id,
      savingsAccountId:    dpsAccount.id,
      startMonth,
    },
  });
  console.log('   Fixed expense templates: Mess Rent + City Bank DPS 10k.');

  // 9. Budget: Dining ৳5,000 for this month
  await prisma.budget.create({
    data: {
      userId:             user.id,
      categoryId:         diningCat.id,
      effectiveFromMonth: startMonth,
      monthlyLimitPaisa:  500_000n,   // ৳5,000
    },
  });
  console.log('   Budget: Dining ৳5,000.');

  // 10. Loan person: Sohel (zero balance)
  await prisma.loanPerson.create({
    data: { userId: user.id, name: 'Sohel' },
  });
  console.log('   Loan person: Sohel.');

  console.log('\n✅  E2E seed complete.');
  console.log(`   Login: ${E2E_EMAIL}  /  ${E2E_PASSWORD}`);
  console.log(`   App URL: ${process.env.APP_URL ?? 'http://localhost:3000'}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
