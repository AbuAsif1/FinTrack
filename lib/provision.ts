import { prisma } from './prisma';
import { starterCategories } from '../prisma/defaults/categories';
import { taxYearConfigs } from '../prisma/defaults/tax-years';
import type { Prisma } from '@prisma/client';

type TransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export async function provisionNewUser(
  userId: string,
  tx?: TransactionClient,
): Promise<void> {
  const db = tx ?? prisma;

  for (const cat of starterCategories) {
    await db.category.upsert({
      where: { userId_name: { userId, name: cat.name } },
      update: {},
      create: { userId, ...cat },
    });
  }

  for (const [fy, config] of Object.entries(taxYearConfigs)) {
    await db.taxYear.upsert({
      where: { userId_fiscalYear: { userId, fiscalYear: fy } },
      update: {},
      create: { userId, fiscalYear: fy, configJson: config as unknown as Prisma.InputJsonValue },
    });
  }
}
