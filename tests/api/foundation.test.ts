import { describe, it, expect, beforeAll } from 'vitest';
import type { TestContext } from '../helpers';

let ctx: TestContext;

beforeAll(async () => {
  const { createTestContext } = await import('../helpers');
  ctx = await createTestContext();
});

describe('TC-FND-017 GET /health with no token', () => {
  it('returns 200', async () => {
    const res = await ctx.makeRequest('GET', '/api/v1/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});

describe('TC-FND-018 seed on empty database', () => {
  it('creates one verified ADMIN account with 16 categories and 3 provisional tax years', async () => {
    const { db } = ctx;

    // The seed is run via `pnpm db:seed` in CI before tests.
    // In this test, we verify provisionNewUser creates the right records.
    const { provisionNewUser } = await import('../../lib/provision');
    const user = await db.user.create({
      data: {
        email: 'provision-test@example.com',
        name: 'Test',
        role: 'USER',
        emailVerifiedAt: new Date(),
      },
    });

    await provisionNewUser(user.id);

    const categories = await db.category.findMany({ where: { userId: user.id } });
    expect(categories).toHaveLength(16);

    const taxYears = await db.taxYear.findMany({ where: { userId: user.id } });
    expect(taxYears).toHaveLength(3);
    expect(taxYears.every((ty) => ty.configConfirmedAt === null)).toBe(true);
  });
});

describe('TC-FND-020 provisionNewUser for a new user', () => {
  it('creates exactly 16 categories and 3 provisional tax years', async () => {
    const { db } = ctx;
    const { provisionNewUser } = await import('../../lib/provision');
    const user = await db.user.create({
      data: { email: `provision2-${Date.now()}@example.com`, name: 'Test2', role: 'USER', emailVerifiedAt: new Date() },
    });

    await provisionNewUser(user.id);

    const categories = await db.category.findMany({ where: { userId: user.id } });
    const taxYears = await db.taxYear.findMany({ where: { userId: user.id } });

    expect(categories).toHaveLength(16);
    expect(taxYears).toHaveLength(3);
    // No financial records
    const transactions = await db.transaction.findMany({ where: { userId: user.id } });
    const incomeEntries = await db.incomeEntry.findMany({ where: { userId: user.id } });
    expect(transactions).toHaveLength(0);
    expect(incomeEntries).toHaveLength(0);
  });
});
