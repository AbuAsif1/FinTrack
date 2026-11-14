/**
 * TC-DEL-001 to TC-DEL-004 — Account self-deletion (p3-07, ADR-0013)
 *
 * Verifies:
 *   - Email-mismatch guard
 *   - Unauthenticated guard
 *   - Hard-delete via CASCADE removes every owned row across all tables
 *   - Cross-user isolation: a bystander user's data survives the deletion
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContext } from '../helpers/index';

type Ctx = Awaited<ReturnType<typeof createTestContext>>;

let ctx: Ctx;

beforeEach(async () => {
  ctx = await createTestContext();
});

afterEach(async () => {
  await ctx?.cleanup();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function login(ctx: Ctx, user: { email: string; password: string }) {
  const res = await ctx.makeRequest('POST', '/api/v1/auth/login', {
    body: { email: user.email, password: user.password },
  });
  const data = (await res.json()) as { accessToken: string };
  return data.accessToken;
}

async function getCategories(ctx: Ctx, token: string) {
  const res = await ctx.makeRequest('GET', '/api/v1/categories', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json() as Promise<Array<{ id: string; name: string; routing_type: string }>>;
}

/**
 * Creates one record in every user-owned table so that the CASCADE delete
 * test has something to verify.  Returns the userId so the caller can query
 * counts after deletion.
 */
async function populateAllTables(
  ctx: Ctx,
  user: { id: string; email: string; password: string; role: 'USER' | 'ADMIN' },
  token: string,
  seed: string,
): Promise<string> {
  const userId = user.id;

  // Categories come from provisioning; get them
  const cats = await getCategories(ctx, token);
  const noneCat = cats.find((c) => c.routing_type === 'NONE')!;
  const loanGivenCat = cats.find((c) => c.routing_type === 'LOAN_GIVEN');
  const savingsDepositCat = cats.find((c) => c.routing_type === 'SAVINGS_DEPOSIT');

  // ── Savings account ───────────────────────────────────────────────────────
  const savRes = await ctx.makeRequest('POST', '/api/v1/savings-accounts', {
    headers: { Authorization: `Bearer ${token}` },
    body: {
      name: `My Savings ${seed}`,
      type: 'SAVINGS',
      bank_name: 'BRAC Bank',
      opening_balance_paisa: 5000000,
      opening_date: '2024-01-01',
    },
  });
  expect(savRes.status).toBe(201);
  const savAcct = (await savRes.json()) as { id: string };

  // ── Plain transaction ─────────────────────────────────────────────────────
  const txRes = await ctx.makeRequest('POST', '/api/v1/transactions', {
    headers: { Authorization: `Bearer ${token}` },
    body: {
      amount_paisa: 10000,
      date: '2026-11-01',
      description: `Groceries ${seed}`,
      category_id: noneCat.id,
      payment_method: 'CASH',
      idempotency_key: `del-tx-${seed}`,
    },
  });
  expect(txRes.status).toBe(201);
  const tx = (await txRes.json()) as { id: string };

  // ── Tag and TransactionTag ────────────────────────────────────────────────
  const tagRes = await ctx.makeRequest('POST', '/api/v1/tags', {
    headers: { Authorization: `Bearer ${token}` },
    body: { name: `food-${seed}` },
  });
  if (tagRes.status === 201 || tagRes.status === 200) {
    const tag = (await tagRes.json()) as { id: string };
    await ctx.makeRequest('POST', `/api/v1/transactions/${tx.id}/tags`, {
      headers: { Authorization: `Bearer ${token}` },
      body: { tag_id: tag.id },
    });
  }

  // ── Loan person + loan entry ──────────────────────────────────────────────
  const personRes = await ctx.makeRequest('POST', '/api/v1/loan-persons', {
    headers: { Authorization: `Bearer ${token}` },
    body: { name: `Reza ${seed}` },
  });
  expect(personRes.status).toBe(201);
  const person = (await personRes.json()) as { id: string };

  const loanCatId = loanGivenCat?.id ?? noneCat.id;
  await ctx.makeRequest('POST', `/api/v1/loan-persons/${person.id}/entries`, {
    headers: { Authorization: `Bearer ${token}` },
    body: {
      direction: 'GIVEN',
      amount_paisa: 50000,
      date: '2026-11-01',
      description: 'Lent to Reza',
      payment_method: 'CASH',
      idempotency_key: `del-loan-${seed}`,
    },
  });

  // ── Income entry ──────────────────────────────────────────────────────────
  await ctx.makeRequest('POST', '/api/v1/income-entries', {
    headers: { Authorization: `Bearer ${token}` },
    body: {
      month: '2026-11',
      income_type: 'SALARY',
      gross_paisa: 14000000,
      tds_paisa: 0,
      idempotency_key: `del-inc-${seed}`,
    },
  });

  // ── Fixed expense ─────────────────────────────────────────────────────────
  const feRes = await ctx.makeRequest('POST', '/api/v1/fixed-expenses', {
    headers: { Authorization: `Bearer ${token}` },
    body: {
      name: `Rent ${seed}`,
      standard_amount_paisa: 2000000,
      due_day: 5,
      category_id: noneCat.id,
      start_month: '2026-11',
    },
  });
  expect(feRes.status).toBe(201);

  // ── Budget ────────────────────────────────────────────────────────────────
  await ctx.makeRequest('POST', '/api/v1/budgets', {
    headers: { Authorization: `Bearer ${token}` },
    body: {
      category_id: noneCat.id,
      effective_from_month: '2026-11',
      monthly_limit_paisa: 300000,
    },
  });

  // ── Savings goal ──────────────────────────────────────────────────────────
  await ctx.makeRequest('POST', '/api/v1/savings-goals', {
    headers: { Authorization: `Bearer ${token}` },
    body: {
      name: `Emergency Fund ${seed}`,
      target_amount_paisa: 10000000,
      target_date: '2027-06-01',
      linked_account_id: savAcct.id,
    },
  });

  // ── Transaction template ──────────────────────────────────────────────────
  await ctx.makeRequest('POST', '/api/v1/transaction-templates', {
    headers: { Authorization: `Bearer ${token}` },
    body: {
      name: `Rickshaw ${seed}`,
      amount_paisa: 3000,
      category_id: noneCat.id,
      payment_method: 'CASH',
    },
  });

  // ── Wallet ────────────────────────────────────────────────────────────────
  const walletRes = await ctx.makeRequest('POST', '/api/v1/wallets', {
    headers: { Authorization: `Bearer ${token}` },
    body: {
      method: 'BKASH',
      name: `bKash ${seed}`,
      opening_balance_paisa: 100000,
      opening_balance_date: '2026-11-01',
    },
  });
  if (walletRes.status === 201 || walletRes.status === 200) {
    // Create a second wallet to have a transfer pair
    const wallet2Res = await ctx.makeRequest('POST', '/api/v1/wallets', {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        method: 'CASH',
        name: `Cash ${seed}`,
        opening_balance_paisa: 50000,
        opening_balance_date: '2026-11-01',
      },
    });
    if (wallet2Res.status === 201 || wallet2Res.status === 200) {
      const w1 = (await walletRes.json()) as { id: string };
      const w2 = (await wallet2Res.json()) as { id: string };
      await ctx.makeRequest('POST', '/api/v1/wallet-transfers', {
        headers: { Authorization: `Bearer ${token}` },
        body: {
          from_wallet_id: w1.id,
          to_wallet_id: w2.id,
          amount_paisa: 10000,
          date: '2026-11-01',
          idempotency_key: `del-wt-${seed}`,
        },
      });
    }
  }

  // ── BackupRun (direct DB insert — no public API) ──────────────────────────
  await ctx.db.backupRun.create({
    data: {
      userId,
      deliveryMethod: 'EMAIL',
      status: 'COMPLETED',
      recordCount: 5,
    },
  });

  // ── TaxInvestment (direct DB insert — API may require existing TaxYear) ───
  const taxYear = await ctx.db.taxYear.findFirst({ where: { userId } });
  if (taxYear) {
    await ctx.db.taxInvestment.upsert({
      where: { userId_fiscalYear: { userId, fiscalYear: taxYear.fiscalYear } },
      update: { stocksPaisa: BigInt(100000) },
      create: { userId, fiscalYear: taxYear.fiscalYear, stocksPaisa: BigInt(100000) },
    });
  }

  return userId;
}

// ---------------------------------------------------------------------------
// TC-DEL-001: Wrong email returns 422 EMAIL_MISMATCH
// ---------------------------------------------------------------------------

describe('TC-DEL-001: wrong email confirmation returns 422', () => {
  it('returns 422 EMAIL_MISMATCH when the email does not match', async () => {
    const user = await ctx.createUser();
    const headers = await ctx.authHeader(user);

    const res = await ctx.makeRequest('DELETE', '/api/v1/me', {
      headers,
      body: { email: 'wrong@example.com' },
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe('EMAIL_MISMATCH');
  });
});

// ---------------------------------------------------------------------------
// TC-DEL-002: Unauthenticated request returns 401
// ---------------------------------------------------------------------------

describe('TC-DEL-002: unauthenticated delete returns 401', () => {
  it('returns 401 without an Authorization header', async () => {
    const res = await ctx.makeRequest('DELETE', '/api/v1/me', {
      body: { email: 'anyone@example.com' },
    });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// TC-DEL-003: Correct confirmation deletes user and all owned rows
// ---------------------------------------------------------------------------

describe('TC-DEL-003: correct email deletes user and all owned rows', () => {
  it('returns 200 and hard-deletes all rows in every user-owned table', async () => {
    const user = await ctx.createUser({ provision: true });
    const token = await login(ctx, user);
    const userId = await populateAllTables(ctx, user, token, 'del-003');

    // Confirm the user row exists before deletion
    const before = await ctx.db.user.findUnique({ where: { id: userId } });
    expect(before).not.toBeNull();

    // Delete
    const headers = await ctx.authHeader(user);
    const res = await ctx.makeRequest('DELETE', '/api/v1/me', {
      headers,
      body: { email: user.email },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    // User row is gone
    const afterUser = await ctx.db.user.findUnique({ where: { id: userId } });
    expect(afterUser).toBeNull();

    // Every owned table must have zero rows for this userId
    const counts = await Promise.all([
      ctx.db.category.count({ where: { userId } }),
      ctx.db.transaction.count({ where: { userId } }),
      ctx.db.savingsAccount.count({ where: { userId } }),
      ctx.db.loanPerson.count({ where: { userId } }),
      ctx.db.loanEntry.count({ where: { userId } }),
      ctx.db.incomeEntry.count({ where: { userId } }),
      ctx.db.fixedExpense.count({ where: { userId } }),
      ctx.db.fixedExpenseInstance.count({ where: { userId } }),
      ctx.db.taxYear.count({ where: { userId } }),
      ctx.db.taxInvestment.count({ where: { userId } }),
      ctx.db.budget.count({ where: { userId } }),
      ctx.db.savingsGoal.count({ where: { userId } }),
      ctx.db.transactionTemplate.count({ where: { userId } }),
      ctx.db.wallet.count({ where: { userId } }),
      ctx.db.walletTransfer.count({ where: { userId } }),
      ctx.db.backupRun.count({ where: { userId } }),
      ctx.db.refreshToken.count({ where: { userId } }),
      ctx.db.notification.count({ where: { userId } }),
      ctx.db.tag.count({ where: { userId } }),
    ]);

    const tableNames = [
      'categories', 'transactions', 'savings_accounts', 'loan_persons',
      'loan_entries', 'income_entries', 'fixed_expenses', 'fixed_expense_instances',
      'tax_years', 'tax_investments', 'budgets', 'savings_goals',
      'transaction_templates', 'wallets', 'wallet_transfers', 'backup_runs',
      'refresh_tokens', 'notifications', 'tags',
    ];

    counts.forEach((count, i) => {
      expect(count, `${tableNames[i]} should be empty after user deletion`).toBe(0);
    });
  }, 60000);
});

// ---------------------------------------------------------------------------
// TC-DEL-004: Cross-user isolation — bystander's data survives
// ---------------------------------------------------------------------------

describe('TC-DEL-004: bystander data survives deletion of another user', () => {
  it("user B's transaction and account remain intact after user A deletes their account", async () => {
    const userA = await ctx.createUser({ provision: true });
    const userB = await ctx.createUser({ provision: true });

    const tokenA = await login(ctx, userA);
    const tokenB = await login(ctx, userB);

    // Create data for A
    await populateAllTables(ctx, userA, tokenA, 'iso-a');

    // Create a transaction for B that must survive
    const catsB = await getCategories(ctx, tokenB);
    const noneCatB = catsB.find((c) => c.routing_type === 'NONE')!;
    const txBRes = await ctx.makeRequest('POST', '/api/v1/transactions', {
      headers: { Authorization: `Bearer ${tokenB}` },
      body: {
        amount_paisa: 25000,
        date: '2026-11-02',
        description: 'B private transaction',
        category_id: noneCatB.id,
        payment_method: 'CASH',
        idempotency_key: 'iso-b-tx',
      },
    });
    expect(txBRes.status).toBe(201);

    const txBBefore = await ctx.db.transaction.count({
      where: { userId: userB.id, description: 'B private transaction' },
    });
    expect(txBBefore).toBe(1);

    // Delete user A
    const headersA = await ctx.authHeader(userA);
    const delRes = await ctx.makeRequest('DELETE', '/api/v1/me', {
      headers: headersA,
      body: { email: userA.email },
    });
    expect(delRes.status).toBe(200);

    // User A is gone
    expect(await ctx.db.user.findUnique({ where: { id: userA.id } })).toBeNull();

    // User B still exists
    expect(await ctx.db.user.findUnique({ where: { id: userB.id } })).not.toBeNull();

    // B's transaction still exists
    const txBAfter = await ctx.db.transaction.count({
      where: { userId: userB.id, description: 'B private transaction' },
    });
    expect(txBAfter).toBe(1);

    // B's categories and tax years are intact
    expect(await ctx.db.category.count({ where: { userId: userB.id } })).toBeGreaterThan(0);
    expect(await ctx.db.taxYear.count({ where: { userId: userB.id } })).toBeGreaterThan(0);
  }, 90000);
});
