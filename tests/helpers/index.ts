import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { buildRouter, routeRequest } from './router';
import { provisionNewUser } from '../../lib/provision';
import { prisma as globalPrisma } from '../../lib/prisma';

// Use the test database URL
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? '';

// Emails that must never be deleted by test cleanup (seed/admin accounts)
const SEED_EMAILS = (process.env.SEED_USER_EMAIL ? [process.env.SEED_USER_EMAIL] : []).concat(['owner@example.com']);

let testDb: PrismaClient;

function getTestDb(): PrismaClient {
  if (!testDb) {
    testDb = new PrismaClient({ datasources: { db: { url: TEST_DATABASE_URL } } });
  }
  return testDb;
}

async function cleanupTestData() {
  // Use the global prisma (same connection path as route handlers) so deletes are
  // immediately visible across the entire test run.
  await globalPrisma.user.deleteMany({ where: { email: { notIn: SEED_EMAILS } } });
  await globalPrisma.authRateLimit.deleteMany({});
}

export type TestUser = {
  id: string;
  email: string;
  password: string;
  role: 'USER' | 'ADMIN';
};

export type TestContext = {
  db: PrismaClient;
  createUser: (opts?: { role?: 'USER' | 'ADMIN'; emailVerified?: boolean; provision?: boolean }) => Promise<TestUser>;
  authHeader: (user: TestUser) => Promise<{ Authorization: string }>;
  makeRequest: (method: string, path: string, opts?: { body?: unknown; headers?: Record<string, string> }) => Promise<Response>;
  cleanup: () => Promise<void>;
};

export async function createTestContext(): Promise<TestContext> {
  const db = getTestDb();

  // Clean up any test data left from a previous test (crash recovery)
  await cleanupTestData();
  await buildRouter();

  const jwtSecret = new TextEncoder().encode(
    process.env.JWT_SECRET ?? 'test-jwt-secret-at-least-32-chars-long'
  );

  async function createUser(opts: { role?: 'USER' | 'ADMIN'; emailVerified?: boolean; provision?: boolean } = {}): Promise<TestUser> {
    const { role = 'USER', emailVerified = true, provision = false } = opts;
    const password = `testpassword-${Date.now()}`;
    const email = `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const hash = await bcrypt.hash(password, 4); // low cost for tests
    // Use the same global prisma that route handlers use (Neon HTTP adapter) so user creation
    // and provisioning are on the same connection path and see each other immediately.
    const user = await globalPrisma.user.create({
      data: {
        email,
        passwordHash: hash,
        name: 'Test User',
        role,
        emailVerifiedAt: emailVerified ? new Date() : null,
      },
    });
    if (provision) {
      await provisionNewUser(user.id);
    }
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

  async function cleanup() {
    await cleanupTestData();
  }

  return { db, createUser, authHeader, makeRequest, cleanup };
}
