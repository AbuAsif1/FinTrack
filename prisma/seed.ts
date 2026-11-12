import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { starterCategories } from './defaults/categories';
import { taxYearConfigs } from './defaults/tax-years';

const prisma = new PrismaClient();

export async function provisionNewUser(userId: string): Promise<void> {
  for (const cat of starterCategories) {
    await prisma.category.upsert({
      where: { userId_name: { userId, name: cat.name } },
      update: {},
      create: { userId, ...cat },
    });
  }

  for (const [fy, config] of Object.entries(taxYearConfigs)) {
    await prisma.taxYear.upsert({
      where: { userId_fiscalYear: { userId, fiscalYear: fy } },
      update: {},
      create: { userId, fiscalYear: fy, configJson: config as object },
    });
  }
}

async function main() {
  const email = process.env.SEED_USER_EMAIL;
  const password = process.env.SEED_USER_PASSWORD;
  const name = process.env.SEED_USER_NAME;

  if (!email || !password || !name) {
    throw new Error('SEED_USER_EMAIL, SEED_USER_PASSWORD, and SEED_USER_NAME must be set');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {},
    create: {
      email: email.toLowerCase(),
      passwordHash,
      name,
      role: 'ADMIN',
      emailVerifiedAt: new Date(),
    },
  });

  await provisionNewUser(user.id);
  console.log(`Seed complete. Owner: ${user.email} (${user.id})`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
