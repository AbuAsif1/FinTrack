/**
 * Creates and removes the throw-away users the money-flow tests run as.
 *
 * Each test gets its own verified, provisioned user (starter categories + tax years, exactly as
 * real registration does via lib/provision), so tests never share data and can run in parallel.
 * Users are created directly in the database to skip email verification and the registration
 * rate limit (5 per hour per IP).
 */
import './env';
import bcrypt from 'bcryptjs';

export const TEST_EMAIL_DOMAIN = 'mf-e2e.test';
export const TEST_PASSWORD = 'MoneyFlow-E2E-2026!';

export type FreshUser = { id: string; email: string; password: string };

async function prisma() {
  return (await import('../../../../../lib/prisma')).prisma;
}

export async function createFreshUser(): Promise<FreshUser> {
  const db = await prisma();
  const { provisionNewUser } = await import('../../../../../lib/provision');
  const email = `mf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@${TEST_EMAIL_DOMAIN}`;
  // Low bcrypt cost: these accounts live for one test; login only needs bcrypt.compare to succeed.
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 4);
  const user = await db.user.create({
    data: { email, passwordHash, name: 'Money Flow E2E', role: 'USER', emailVerifiedAt: new Date() },
  });
  await provisionNewUser(user.id);
  return { id: user.id, email, password: TEST_PASSWORD };
}

/** Deletes a user and (by cascade) everything they own. */
export async function deleteUser(id: string): Promise<void> {
  const db = await prisma();
  await db.user.delete({ where: { id } }).catch(() => undefined);
}

/** Removes test users left behind by an interrupted run (older than `olderThanMinutes`). */
export async function deleteStaleTestUsers(olderThanMinutes = 60): Promise<number> {
  const db = await prisma();
  const { count } = await db.user.deleteMany({
    where: {
      email: { endsWith: `@${TEST_EMAIL_DOMAIN}` },
      createdAt: { lt: new Date(Date.now() - olderThanMinutes * 60_000) },
    },
  });
  return count;
}
