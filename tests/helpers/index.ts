import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { buildRouter, routeRequest } from './router';

// Use the test database URL
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? '';

let prisma: PrismaClient;

function getTestDb(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({ datasources: { db: { url: TEST_DATABASE_URL } } });
  }
  return prisma;
}

async function truncateAll(db: PrismaClient) {
  // Truncate in dependency order to avoid FK violations
  await db.$executeRawUnsafe(`
    TRUNCATE TABLE
      import_batches,
      notifications,
      budgets,
      tax_investments,
      tax_years,
      fixed_expense_instances,
      fixed_expenses,
      holiday_support_entries,
      income_entries,
      loan_entries,
      loan_persons,
      savings_accounts,
      transactions,
      categories,
      auth_rate_limits,
      admin_actions,
      user_payments,
      email_tokens,
      refresh_tokens,
      users
    RESTART IDENTITY CASCADE
  `);
}

export type TestUser = {
  id: string;
  email: string;
  password: string;
  role: 'USER' | 'ADMIN';
};

export type TestContext = {
  db: PrismaClient;
  createUser: (opts?: { role?: 'USER' | 'ADMIN'; emailVerified?: boolean }) => Promise<TestUser>;
  authHeader: (user: TestUser) => Promise<{ Authorization: string }>;
  makeRequest: (method: string, path: string, opts?: { body?: unknown; headers?: Record<string, string> }) => Promise<Response>;
};

export async function createTestContext(): Promise<TestContext> {
  const db = getTestDb();

  await truncateAll(db);
  await buildRouter();

  const jwtSecret = new TextEncoder().encode(
    process.env.JWT_SECRET ?? 'test-jwt-secret-at-least-32-chars-long'
  );

  async function createUser(opts: { role?: 'USER' | 'ADMIN'; emailVerified?: boolean } = {}): Promise<TestUser> {
    const { role = 'USER', emailVerified = true } = opts;
    const password = `testpassword-${Date.now()}`;
    const email = `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const hash = await bcrypt.hash(password, 4); // low cost for tests
    const user = await db.user.create({
      data: {
        email,
        passwordHash: hash,
        name: 'Test User',
        role,
        emailVerifiedAt: emailVerified ? new Date() : null,
      },
    });
    return { id: user.id, email: user.email, password, role: user.role as 'USER' | 'ADMIN' };
  }

  async function authHeader(user: TestUser): Promise<{ Authorization: string }> {
    const token = await new SignJWT({ role: user.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(jwtSecret);
    return { Authorization: `Bearer ${token}` };
  }

  async function makeRequest(
    method: string,
    path: string,
    opts: { body?: unknown; headers?: Record<string, string> } = {}
  ): Promise<Response> {
    const url = `http://localhost${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...opts.headers,
    };
    const req = new Request(url, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    return routeRequest(req);
  }

  return { db, createUser, authHeader, makeRequest };
}
