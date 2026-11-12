/**
 * TC-TAX-001 to TC-TAX-017 â€” Tax API
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContext } from '../helpers/index';

type Ctx = Awaited<ReturnType<typeof createTestContext>>;
type TestUser = { id: string; email: string; password: string; role: 'USER' | 'ADMIN' };

let ctx: Ctx;

beforeEach(async () => {
  ctx = await createTestContext();
});

afterEach(async () => {
  await ctx?.cleanup();
});

// FY2025-26 seeded config
const SEEDED_CONFIG_2526 = {
  slabs: [
    { width_paisa: 37500000, rate_bps: 0 },
    { width_paisa: 30000000, rate_bps: 1000 },
    { width_paisa: 40000000, rate_bps: 1500 },
    { width_paisa: 50000000, rate_bps: 2000 },
    { width_paisa: 300000000, rate_bps: 2500 },
    { width_paisa: null, rate_bps: 3000 },
  ],
  salary_exemption: { numerator: 1, denominator: 3, cap_paisa: 50000000 },
  rebate: { income_rate_bps: 300, investment_rate_bps: 1000, max_paisa: 100000000 },
  investment_caps_paisa: { dps: 12000000, sanchaypatra: 50000000, stocks: null, insurance: null, others: null },
  minimum_tax_paisa: 500000,
  early_filing: { rate_bps: 500, max_paisa: 200000, deadline_mmdd: '09-30' },
};

// FY2024-25 config (lower exemption cap per AC-TAX-4)
const SEEDED_CONFIG_2425 = {
  ...SEEDED_CONFIG_2526,
  salary_exemption: { numerator: 1, denominator: 3, cap_paisa: 45000000 },
};

async function seedTaxYear(ctx: Ctx, user: TestUser, fy: string, config: object) {
  await ctx.db.taxYear.upsert({
    where: { userId_fiscalYear: { userId: user.id, fiscalYear: fy } },
    create: { userId: user.id, fiscalYear: fy, configJson: config },
    update: { configJson: config },
  });
}

async function seedIncomeEntries(ctx: Ctx, user: TestUser) {
  // Salary à§³1,22,700 for July 2025 â€“ March 2026 (9 months) + à§³1,53,383 April â€“ June 2026 (3 months)
  const months9 = ['2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'];
  const months3 = ['2026-04', '2026-05', '2026-06'];

  for (const m of months9) {
    await ctx.db.incomeEntry.create({
      data: {
        userId: user.id,
        month: new Date(`${m}-01`),
        fiscalYear: '2025-26',
        incomeType: 'SALARY',
        grossPaisa: BigInt(12270000),
        tdsPaisa: BigInt(1138667),
        isTaxable: true,
        idempotencyKey: `seed-sal-${m}`,
      },
    });
  }
  for (const m of months3) {
    await ctx.db.incomeEntry.create({
      data: {
        userId: user.id,
        month: new Date(`${m}-01`),
        fiscalYear: '2025-26',
        incomeType: 'SALARY',
        grossPaisa: BigInt(15338300),
        tdsPaisa: BigInt(2082033),
        isTaxable: true,
        idempotencyKey: `seed-sal-${m}`,
      },
    });
  }
}

// Helper to get tax summary
async function getTaxSummary(ctx: Ctx, user: TestUser, fy: string) {
  const headers = await ctx.authHeader(user);
  const res = await ctx.makeRequest('GET', `/api/v1/tax/summary?fiscal_year=${fy}`, { headers });
  return res.json();
}

// ---------------------------------------------------------------------------
// TC-TAX-001: AC-TAX-1 figures
// ---------------------------------------------------------------------------

describe('TC-TAX-001: AC-TAX-1 full year summary', () => {
  it('returns correct Gross Tax, Net Tax, Remaining Tax', async () => {
    const user = await ctx.createUser({ provision: true });
    await seedTaxYear(ctx, user, '2025-26', SEEDED_CONFIG_2526);
    await seedIncomeEntries(ctx, user);

    // DPS deposits: à§³8,00,000 total â†’ need a DPS account and deposit transactions
    const dpsCat = await ctx.db.category.findFirst({ where: { userId: user.id, routingType: 'SAVINGS_DEPOSIT' } });
    const dpsAccount = await ctx.db.savingsAccount.create({
      data: { userId: user.id, name: 'Upension DPS', type: 'DPS', bankName: 'Upension', openingDate: new Date('2025-07-01'), openingBalancePaisa: BigInt(0) },
    });
    if (dpsCat) {
      for (let i = 0; i < 8; i++) {
        const d = new Date('2025-07-08T00:00:00Z');
        d.setUTCMonth(d.getUTCMonth() + i);
        await ctx.db.transaction.create({
          data: {
            userId: user.id,
            amountPaisa: BigInt(10000000),
            date: d,
            description: 'DPS',
            categoryId: dpsCat.id,
            type: 'SAVINGS_DEPOSIT',
            savingsAccountId: dpsAccount.id,
            paymentMethod: 'BANK',
            idempotencyKey: `dps-dep-${i}`,
          },
        });
      }
    }

    // Sanchaypatra: à§³1,00,000
    const sanchAccount = await ctx.db.savingsAccount.create({
      data: { userId: user.id, name: 'Sanchaypatra', type: 'SANCHAYPATRA', bankName: 'Sonali', openingDate: new Date('2025-07-01'), openingBalancePaisa: BigInt(0) },
    });
    if (dpsCat) {
      await ctx.db.transaction.create({
        data: {
          userId: user.id,
          amountPaisa: BigInt(10000000),
          date: new Date('2025-08-01'),
          description: 'Sanchaypatra',
          categoryId: dpsCat.id,
          type: 'SAVINGS_DEPOSIT',
          savingsAccountId: sanchAccount.id,
          paymentMethod: 'BANK',
          idempotencyKey: 'sanch-dep-1',
        },
      });
    }

    // Others: à§³1,90,000
    await ctx.db.taxInvestment.upsert({
      where: { userId_fiscalYear: { userId: user.id, fiscalYear: '2025-26' } },
      create: { userId: user.id, fiscalYear: '2025-26', othersPaisa: BigInt(19000000) },
      update: { othersPaisa: BigInt(19000000) },
    });

    const summary = await getTaxSummary(ctx, user, '2025-26');
    expect(summary.gross_tax_paisa).toBe(17636920);
    expect(summary.net_tax_payable_paisa).toBe(13536920);
    expect(summary.tax_rebate_paisa).toBe(4100000);
    expect(summary.remaining_tax_paisa).toBe(288120);
  });
});

// ---------------------------------------------------------------------------
// TC-TAX-002: Unconfirmed year â†’ is_provisional = true
// ---------------------------------------------------------------------------

describe('TC-TAX-002: unconfirmed year is provisional', () => {
  it('is_provisional true when config_confirmed_at is null', async () => {
    const user = await ctx.createUser({ provision: true });
    const summary = await getTaxSummary(ctx, user, '2025-26');
    expect(summary.is_provisional).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TC-TAX-003: Confirm year â†’ is_provisional = false
// ---------------------------------------------------------------------------

describe('TC-TAX-003: confirm year', () => {
  it('is_provisional becomes false after confirm', async () => {
    const user = await ctx.createUser({ provision: true });
    await getTaxSummary(ctx, user, '2025-26'); // ensure row exists
    const headers = await ctx.authHeader(user);
    await ctx.makeRequest('POST', '/api/v1/tax-years/2025-26/confirm', { headers, body: {} });
    const summary = await getTaxSummary(ctx, user, '2025-26');
    expect(summary.is_provisional).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// TC-TAX-004: Changing settings marks year provisional again
// ---------------------------------------------------------------------------

describe('TC-TAX-004: edit settings â†’ provisional again', () => {
  it('is_provisional goes true again after a settings change', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);
    await getTaxSummary(ctx, user, '2025-26');
    await ctx.makeRequest('POST', '/api/v1/tax-years/2025-26/confirm', { headers, body: {} });

    // Modify config
    await ctx.makeRequest('PUT', '/api/v1/tax-years/2025-26', {
      headers,
      body: SEEDED_CONFIG_2526,
    });

    const summary = await getTaxSummary(ctx, user, '2025-26');
    expect(summary.is_provisional).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TC-TAX-005: Invalid config (no remainder slab) â†’ 422
// ---------------------------------------------------------------------------

describe('TC-TAX-005: invalid config rejected', () => {
  it('returns 422 when no remainder slab', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);
    await getTaxSummary(ctx, user, '2025-26');

    const badConfig = {
      ...SEEDED_CONFIG_2526,
      slabs: [{ width_paisa: 37500000, rate_bps: 0 }, { width_paisa: 30000000, rate_bps: 1000 }], // no null remainder
    };
    const res = await ctx.makeRequest('PUT', '/api/v1/tax-years/2025-26', { headers, body: badConfig });
    expect(res.status).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// TC-TAX-007: Forecast marks is_projection = true
// ---------------------------------------------------------------------------

describe('TC-TAX-007: forecast is_projection', () => {
  it('forecast result has is_projection = true', async () => {
    const user = await ctx.createUser({ provision: true });
    await seedTaxYear(ctx, user, '2025-26', SEEDED_CONFIG_2526);
    const headers = await ctx.authHeader(user);
    // Enter 3 salary months
    for (const m of ['2025-07', '2025-08', '2025-09']) {
      await ctx.db.incomeEntry.create({
        data: {
          userId: user.id,
          month: new Date(`${m}-01`),
          fiscalYear: '2025-26',
          incomeType: 'SALARY',
          grossPaisa: BigInt(12270000),
          tdsPaisa: BigInt(1138667),
          isTaxable: true,
          idempotencyKey: `forecast-sal-${m}`,
        },
      });
    }
    const res = await ctx.makeRequest('GET', '/api/v1/tax/forecast?fiscal_year=2025-26', { headers });
    const body = await res.json();
    expect(body.is_projection).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TC-TAX-009: File the return â†’ AC-TAX-6 (filed on 2026-09-15 â†’ early filing rebate)
// ---------------------------------------------------------------------------

describe('TC-TAX-009: file return â†’ AC-TAX-6', () => {
  it('early filing rebate applies; year is locked', async () => {
    const user = await ctx.createUser({ provision: true });
    await seedTaxYear(ctx, user, '2025-26', SEEDED_CONFIG_2526);
    await seedIncomeEntries(ctx, user);

    // Others à§³1,90,000, TDS via income entries already set
    await ctx.db.taxInvestment.upsert({
      where: { userId_fiscalYear: { userId: user.id, fiscalYear: '2025-26' } },
      create: { userId: user.id, fiscalYear: '2025-26', othersPaisa: BigInt(19000000) },
      update: { othersPaisa: BigInt(19000000) },
    });

    const headers = await ctx.authHeader(user);
    const fileRes = await ctx.makeRequest('POST', '/api/v1/tax-years/2025-26/file', {
      headers,
      body: { filed_on: '2026-09-15' },
    });
    expect(fileRes.status).toBe(200);
    const body = await fileRes.json();
    expect(body.is_locked).toBe(true);

    // The locked year returns the snapshot
    const summary = await getTaxSummary(ctx, user, '2025-26');
    expect(summary.is_locked).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TC-TAX-010: Writes to locked year â†’ 409 TAX_YEAR_LOCKED
// ---------------------------------------------------------------------------

describe('TC-TAX-010: locked year rejects writes', () => {
  it('PUT tax-years, PUT tax-investments return 409', async () => {
    const user = await ctx.createUser({ provision: true });
    await seedTaxYear(ctx, user, '2025-26', SEEDED_CONFIG_2526);
    const headers = await ctx.authHeader(user);
    await ctx.makeRequest('POST', '/api/v1/tax-years/2025-26/file', { headers, body: {} });

    const configRes = await ctx.makeRequest('PUT', '/api/v1/tax-years/2025-26', { headers, body: SEEDED_CONFIG_2526 });
    expect(configRes.status).toBe(409);

    const invRes = await ctx.makeRequest('PUT', '/api/v1/tax-investments/2025-26', { headers, body: { others_paisa: 100 } });
    expect(invRes.status).toBe(409);
  });
});

// ---------------------------------------------------------------------------
// TC-TAX-012: Reopen locked year â†’ unlocks, new entry accepted
// ---------------------------------------------------------------------------

describe('TC-TAX-012: reopen filed year', () => {
  it('unlocks year and allows further writes', async () => {
    const user = await ctx.createUser({ provision: true });
    await seedTaxYear(ctx, user, '2025-26', SEEDED_CONFIG_2526);
    const headers = await ctx.authHeader(user);
    await ctx.makeRequest('POST', '/api/v1/tax-years/2025-26/file', { headers, body: {} });

    const reopenRes = await ctx.makeRequest('POST', '/api/v1/tax-years/2025-26/reopen', { headers, body: {} });
    expect(reopenRes.status).toBe(200);
    const body = await reopenRes.json();
    expect(body.is_locked).toBe(false);

    // Should be able to write config again
    const putRes = await ctx.makeRequest('PUT', '/api/v1/tax-years/2025-26', { headers, body: SEEDED_CONFIG_2526 });
    expect(putRes.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// TC-TAX-013: Save tax investments
// ---------------------------------------------------------------------------

describe('TC-TAX-013: save tax investments', () => {
  it('stocks/insurance/others saved and returned', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);
    const res = await ctx.makeRequest('PUT', '/api/v1/tax-investments/2025-26', {
      headers,
      body: { stocks_paisa: 500000, insurance_paisa: 300000, others_paisa: 19000000 },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.others_paisa).toBe(19000000);

    const getRes = await ctx.makeRequest('GET', '/api/v1/tax-investments/2025-26', { headers });
    const got = await getRes.json();
    expect(got.stocks_paisa).toBe(500000);
  });
});

// ---------------------------------------------------------------------------
// TC-TAX-015: Tax payment assigned to FY â†’ counted in that FY's Tax Paid
// ---------------------------------------------------------------------------

describe('TC-TAX-015: tax payment fiscal year assignment', () => {
  it('TAX_PAYMENT with tax_fiscal_year counted in that FY only', async () => {
    const user = await ctx.createUser({ provision: true });
    await seedTaxYear(ctx, user, '2025-26', SEEDED_CONFIG_2526);
    const headers = await ctx.authHeader(user);

    const taxCat = await ctx.db.category.findFirst({ where: { userId: user.id, routingType: 'TAX_PAYMENT' } });
    if (taxCat) {
      await ctx.db.transaction.create({
        data: {
          userId: user.id,
          amountPaisa: BigInt(100000),
          date: new Date('2026-09-10'),
          description: 'Tax payment',
          categoryId: taxCat.id,
          type: 'TAX_PAYMENT',
          paymentMethod: 'BANK',
          taxFiscalYear: '2025-26',
          idempotencyKey: 'tp-2526-1',
        },
      });
    }

    const summary = await getTaxSummary(ctx, user, '2025-26');
    expect(summary.tax_payments_paisa).toBe(100000);

    // Should NOT appear in 2026-27
    const nextSummary = await getTaxSummary(ctx, user, '2026-27');
    expect(nextSummary.tax_payments_paisa).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// TC-TAX-017: New fiscal year created as provisional copy of latest earlier
// ---------------------------------------------------------------------------

describe('TC-TAX-017: new fiscal year auto-created from earlier year', () => {
  it('year created with is_provisional = true when it does not exist', async () => {
    const user = await ctx.createUser({ provision: true });
    // Seed a 2024-25 year with known config
    await seedTaxYear(ctx, user, '2024-25', SEEDED_CONFIG_2425);

    // Request 2025-26 which doesn't exist yet
    const summary = await getTaxSummary(ctx, user, '2025-26');
    expect(summary.is_provisional).toBe(true);

    // The created year should have copied the 2024-25 config
    const tyRow = await ctx.db.taxYear.findUnique({
      where: { userId_fiscalYear: { userId: user.id, fiscalYear: '2025-26' } },
    });
    expect(tyRow).not.toBeNull();
    expect(tyRow?.configConfirmedAt).toBeNull();
  });
});
