/**
 * Creates a verified, provisioned user.
 * Usage: pnpm user:create --email foo@example.com --name "Full Name" --password secretpass
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { provisionNewUser } from '../lib/provision';

const BCRYPT_COST = 12;

async function main() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };

  const email = get('--email') ?? process.env.SEED_USER_EMAIL;
  const name = get('--name') ?? process.env.SEED_USER_NAME;
  const password = get('--password') ?? process.env.SEED_USER_PASSWORD;
  const roleArg = get('--role') ?? 'USER';

  if (!email || !name || !password) {
    console.error('Usage: pnpm user:create --email <email> --name <name> --password <password> [--role ADMIN]');
    process.exit(1);
  }

  if (password.length < 10) {
    console.error('Password must be at least 10 characters');
    process.exit(1);
  }

  const role = roleArg === 'ADMIN' ? 'ADMIN' as const : 'USER' as const;

  const db = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const user = await db.user.upsert({
      where: { email },
      create: { email, name, passwordHash, role, emailVerifiedAt: new Date() },
      update: { name, passwordHash, role, emailVerifiedAt: new Date() },
    });
    await provisionNewUser(user.id);
    console.log(`Created user: ${user.email} (${user.role})`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
