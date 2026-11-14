/**
 * Resets a user's password directly in the database.
 * Usage: pnpm user:reset-password --email foo@example.com --password newsecret123
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const BCRYPT_COST = 12;

async function main() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };

  const email = get('--email');
  const password = get('--password');

  if (!email || !password) {
    console.error('Usage: pnpm user:reset-password --email <email> --password <new-password>');
    process.exit(1);
  }

  if (password.length < 10) {
    console.error('Password must be at least 10 characters');
    process.exit(1);
  }

  const db = new PrismaClient();
  try {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      console.error(`No user found with email: ${email}`);
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { passwordHash } }),
      db.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    console.log(`Password reset for: ${email}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
