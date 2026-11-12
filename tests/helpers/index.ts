import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

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
  role: 'USER' | 'ADMIN';
};

export type TestContext = {
  db: PrismaClient;
  createUser: (opts?: { role?: 'USER' | 'ADMIN'; verified?: boolean }) => Promise<TestUser>;
  authHeader: (user: TestUser) => Promise<{ Authorization: string }>;
  makeRequest: (method: string, path: string, opts?: { body?: unknown; headers?: Record<string, string> }) => Promise<Response>;
};

export async function createTestContext(): Promise<TestContext> {
  const db = getTestDb();

  await truncateAll(db);

  const jwtSecret = new TextEncoder().encode(
    process.env.JWT_SECRET ?? 'test-jwt-secret-at-least-32-chars-long'
  );

  async function createUser(opts: { role?: 'USER' | 'ADMIN'; verified?: boolean } = {}): Promise<TestUser> {
    const { role = 'USER', verified = true } = opts;
    const email = `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const hash = await bcrypt.hash('testpassword123', 12);
    const user = await db.user.create({
      data: {
        email,
        passwordHash: hash,
        name: 'Test User',
        role,
        emailVerifiedAt: verified ? new Date() : null,
      },
    });
    return { id: user.id, email: user.email, role: user.role as 'USER' | 'ADMIN' };
  }

  async function authHeader(user: TestUser): Promise<{ Authorization: string }> {
    const token = await new SignJWT({ sub: user.id, role: user.role })
      .setProtectedHeader({ alg: 'HS256' })
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
    const baseUrl = process.env.APP_URL ?? 'http://localhost:3000';
    const url = `${baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...opts.headers,
    };
    return fetch(url, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  }

  return { db, createUser, authHeader, makeRequest };
}
