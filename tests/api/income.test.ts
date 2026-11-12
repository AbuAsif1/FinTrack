/**
 * TC-INC-001 to TC-INC-019 — Income Management and Holiday Support
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestContext } from '../helpers/index';

type Ctx = Awaited<ReturnType<typeof createTestContext>>;
type TestUser = { id: string; email: string; password: string; role: 'USER' | 'ADMIN' };

let ctx: Ctx;

beforeEach(async () => {
  ctx = await createTestContext();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createEntry(ctx: Ctx, user: TestUser, overrides: Record<string, unknown> = {}) {
  const headers = await ctx.authHeader(user);
  return ctx.makeRequest('POST', '/api/v1/income-entries', {
    headers,
    body: {
      month: '2026-11',
      income_type: 'SALARY',
      gross_paisa: 15338300,
      tds_paisa: 1200000,
      idempotency_key: `ikey-${Date.now()}-${Math.random()}`,
      ...overrides,
    },
  });
}

// ---------------------------------------------------------------------------
// TC-INC-001: Create salary entry — in_hand_paisa computed
// ---------------------------------------------------------------------------

describe('TC-INC-001: create salary entry', () => {
  it('saves entry and computes in_hand_paisa', async () => {
    const user = await ctx.createUser({ provision: true });
    const res = await createEntry(ctx, user, { gross_paisa: 15338300, tds_paisa: 1200000 });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.in_hand_paisa).toBe(14138300); // 15338300 - 1200000 = 14138300
    expect(body.fiscal_year).toBe('2026-27');
  });
});

// ---------------------------------------------------------------------------
// TC-INC-002: TDS greater than gross and negative TDS — 422
// ---------------------------------------------------------------------------

describe('TC-INC-002: TDS validation', () => {
  it('rejects TDS > gross and negative TDS', async () => {
    const user = await ctx.createUser({ provision: true });

    const r1 = await createEntry(ctx, user, { gross_paisa: 1000000, tds_paisa: 2000000 });
    expect(r1.status).toBe(422);

    const r2 = await createEntry(ctx, user, { gross_paisa: 1000000, tds_paisa: -1 });
    expect(r2.status).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// TC-INC-003: June and July in different Fiscal Years
// ---------------------------------------------------------------------------

describe('TC-INC-003: fiscal year assigned from month', () => {
  it('June 2026 → 2025-26; July 2026 → 2026-27', async () => {
    const user = await ctx.createUser({ provision: true });

    const june = await createEntry(ctx, user, { month: '2026-06' });
    const juneBody = await june.json();
    expect(juneBody.fiscal_year).toBe('2025-26');

    const july = await createEntry(ctx, user, { month: '2026-07' });
    const julyBody = await july.json();
    expect(julyBody.fiscal_year).toBe('2026-27');
  });
});

// ---------------------------------------------------------------------------
// TC-INC-004: Default taxable flag per income type
// ---------------------------------------------------------------------------

describe('TC-INC-004: default taxable flag per income type', () => {
  it('CERTIFICATION defaults to not taxable; all others default to taxable', async () => {
    const user = await ctx.createUser({ provision: true });
    const types = [
      { type: 'SALARY', expectedTaxable: true },
      { type: 'CHEER', expectedTaxable: true },
      { type: 'PROFIT_SHARE', expectedTaxable: true },
      { type: 'EID_BONUS', expectedTaxable: true },
      { type: 'LEAVE_ENCASHMENT', expectedTaxable: true },
      { type: 'CERTIFICATION', expectedTaxable: false },
      { type: 'HOLIDAY_SUPPORT', expectedTaxable: true },
      { type: 'OTHER', expectedTaxable: true },
    ];
    for (const { type, expectedTaxable } of types) {
      const res = await createEntry(ctx, user, { income_type: type, month: '2026-08' });
      expect(res.status, `type ${type} should be 201`).toBe(201);
      const body = await res.json();
      expect(body.is_taxable, `${type} taxable`).toBe(expectedTaxable);
    }
  });
});

// ---------------------------------------------------------------------------
// TC-INC-005: Salary flagged not taxable — flag is kept
// ---------------------------------------------------------------------------

describe('TC-INC-005: not taxable flag kept', () => {
  it('salary with is_taxable=false is saved as not taxable', async () => {
    const user = await ctx.createUser({ provision: true });
    const res = await createEntry(ctx, user, { is_taxable: false });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.is_taxable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// TC-INC-006: Cheer entry with payer and period earned
// ---------------------------------------------------------------------------

describe('TC-INC-006: Cheer entry with payer and earned_period', () => {
  it('both fields are returned', async () => {
    const user = await ctx.createUser({ provision: true });
    const res = await createEntry(ctx, user, {
      income_type: 'CHEER', payer_name: 'ABC Corp', earned_period: '2026-Q3',
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.payer_name).toBe('ABC Corp');
    expect(body.earned_period).toBe('2026-Q3');
  });
});

// ---------------------------------------------------------------------------
// TC-INC-007: Salary and Profit Share same month — in_hand is sum
// ---------------------------------------------------------------------------

describe('TC-INC-007: two entries in same month', () => {
  it('list shows both; in_hand is per-entry', async () => {
    const user = await ctx.createUser({ provision: true });
    await createEntry(ctx, user, { income_type: 'SALARY', gross_paisa: 10000000, tds_paisa: 500000, month: '2026-11' });
    await createEntry(ctx, user, { income_type: 'PROFIT_SHARE', gross_paisa: 5000000, tds_paisa: 0, month: '2026-11' });

    const headers = await ctx.authHeader(user);
    const list = await (await ctx.makeRequest('GET', '/api/v1/income-entries?fiscal_year=2026-27', { headers })).json();
    expect(list.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// TC-INC-008: Filter by fiscal_year and by month
// ---------------------------------------------------------------------------

describe('TC-INC-008: filter by fiscal_year and month', () => {
  it('returns only matching entries', async () => {
    const user = await ctx.createUser({ provision: true });
    await createEntry(ctx, user, { month: '2026-07' }); // FY 2026-27
    await createEntry(ctx, user, { month: '2026-06' }); // FY 2025-26

    const headers = await ctx.authHeader(user);
    const fy = await (await ctx.makeRequest('GET', '/api/v1/income-entries?fiscal_year=2026-27', { headers })).json();
    expect(fy.length).toBe(1);
    expect(fy[0].month).toBe('2026-07-01');

    const monthFilter = await (await ctx.makeRequest('GET', '/api/v1/income-entries?month=2026-06', { headers })).json();
    expect(monthFilter.length).toBe(1);
    expect(monthFilter[0].fiscal_year).toBe('2025-26');
  });
});

// ---------------------------------------------------------------------------
// TC-INC-009: Update and delete an entry
// ---------------------------------------------------------------------------

describe('TC-INC-009: update and delete', () => {
  it('update saves change; delete removes from list', async () => {
    const user = await ctx.createUser({ provision: true });
    const entry = await (await createEntry(ctx, user, { gross_paisa: 10000000 })).json();

    const headers = await ctx.authHeader(user);
    const patch = await ctx.makeRequest('PATCH', `/api/v1/income-entries/${entry.id}`, {
      headers,
      body: { gross_paisa: 15000000 },
    });
    expect(patch.status).toBe(200);
    const patchBody = await patch.json();
    expect(patchBody.gross_paisa).toBe(15000000);

    const del = await ctx.makeRequest('DELETE', `/api/v1/income-entries/${entry.id}`, { headers });
    expect(del.status).toBe(204);

    const list = await (await ctx.makeRequest('GET', '/api/v1/income-entries', { headers })).json();
    expect(list.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// TC-INC-010: Write to locked Fiscal Year — 409 TAX_YEAR_LOCKED
// ---------------------------------------------------------------------------

describe('TC-INC-010: locked fiscal year rejects writes', () => {
  it('POST, PATCH and DELETE return 409 for locked FY', async () => {
    const user = await ctx.createUser({ provision: true });

    const entry = await (await createEntry(ctx, user, { month: '2026-07' })).json();

    // Lock the FY
    await ctx.db.taxYear.update({
      where: { userId_fiscalYear: { userId: user.id, fiscalYear: '2026-27' } },
      data: { isLocked: true },
    });

    // POST fails
    const postFail = await createEntry(ctx, user, { month: '2026-08' });
    expect(postFail.status).toBe(409);
    expect((await postFail.json()).code).toBe('TAX_YEAR_LOCKED');

    // PATCH fails
    const headers = await ctx.authHeader(user);
    const patchFail = await ctx.makeRequest('PATCH', `/api/v1/income-entries/${entry.id}`, {
      headers, body: { gross_paisa: 999 },
    });
    expect(patchFail.status).toBe(409);

    // DELETE fails
    const delFail = await ctx.makeRequest('DELETE', `/api/v1/income-entries/${entry.id}`, { headers });
    expect(delFail.status).toBe(409);
  });
});

// ---------------------------------------------------------------------------
// TC-INC-011: Summary — 12 rows, 7 entered
// ---------------------------------------------------------------------------

describe('TC-INC-011: summary has 12 rows with correct entered/pending', () => {
  it('shows 12 month rows; entered months = number of months with entries', async () => {
    const user = await ctx.createUser({ provision: true });

    // Enter 7 months
    const months = ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01'];
    for (const m of months) {
      await createEntry(ctx, user, { month: m, gross_paisa: 10000000 });
    }

    const headers = await ctx.authHeader(user);
    const summary = await (await ctx.makeRequest('GET', '/api/v1/income-entries/summary?fiscal_year=2026-27', { headers })).json();
    expect(summary.months.length).toBe(12);
    const entered = summary.months.filter((r: any) => r.status === 'ENTERED').length;
    expect(entered).toBe(7);
    const pending = summary.months.filter((r: any) => r.status === 'PENDING').length;
    expect(pending).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// TC-INC-012: AC-TAX-2 — salary total ৳15,64,449
// ---------------------------------------------------------------------------

describe('TC-INC-012: AC-TAX-2 salary total', () => {
  it('9 months at 1,22,700 + 3 months at 1,53,383 = 15,64,449 BDT', async () => {
    const user = await ctx.createUser({ provision: true });

    // July 2025 to March 2026 at 122700 (9 months)
    for (let m = 7; m <= 12; m++) {
      await createEntry(ctx, user, { month: `2025-${String(m).padStart(2, '0')}`, gross_paisa: 12270000, tds_paisa: 0 });
    }
    for (let m = 1; m <= 3; m++) {
      await createEntry(ctx, user, { month: `2026-${String(m).padStart(2, '0')}`, gross_paisa: 12270000, tds_paisa: 0 });
    }
    // April to June 2026 at 153383 (3 months)
    for (let m = 4; m <= 6; m++) {
      await createEntry(ctx, user, { month: `2026-${String(m).padStart(2, '0')}`, gross_paisa: 15338300, tds_paisa: 0 });
    }

    const headers = await ctx.authHeader(user);
    const summary = await (await ctx.makeRequest('GET', '/api/v1/income-entries/summary?fiscal_year=2025-26', { headers })).json();
    // 9 × 12270000 + 3 × 15338300 = 110430000 + 46014900 = 156444900
    expect(summary.totals.gross_paisa).toBe(156444900);
  });
});

// ---------------------------------------------------------------------------
// TC-INC-015: Duplicate idempotency key — 409 DUPLICATE
// ---------------------------------------------------------------------------

describe('TC-INC-015: duplicate idempotency key', () => {
  it('returns 409 DUPLICATE with original; only one entry exists', async () => {
    const user = await ctx.createUser({ provision: true });
    const ikey = `fixed-ikey-${Date.now()}`;

    const r1 = await createEntry(ctx, user, { idempotency_key: ikey, gross_paisa: 10000000 });
    expect(r1.status).toBe(201);

    const r2 = await createEntry(ctx, user, { idempotency_key: ikey, gross_paisa: 20000000 });
    expect(r2.status).toBe(409);
    const body = await r2.json();
    expect(body.code).toBe('DUPLICATE');
    expect(body.entry.gross_paisa).toBe(10000000);
  });
});

// ---------------------------------------------------------------------------
// TC-INC-016: Holiday Support entry — 2 days × ৳3,200 = ৳6,400
// ---------------------------------------------------------------------------

describe('TC-INC-016: holiday support — days × rate', () => {
  it('amount = 2 × 320000 = 640000 paisa', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);
    const res = await ctx.makeRequest('POST', '/api/v1/holiday-support-entries', {
      headers,
      body: { date: '2026-11-01', days: 2, rate_type: 'DAILY', rate_paisa: 320000 },
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.amount_paisa).toBe(640000);
    expect(body.rate_paisa).toBe(320000);
  });
});

// ---------------------------------------------------------------------------
// TC-INC-017: Rate pre-filled from latest entry of same type
// ---------------------------------------------------------------------------

describe('TC-INC-017: holiday support rate pre-fill', () => {
  it('new entry with same rate_type uses latest rate', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    // First entry with explicit rate
    await ctx.makeRequest('POST', '/api/v1/holiday-support-entries', {
      headers,
      body: { date: '2026-11-01', days: 1, rate_type: 'DAILY', rate_paisa: 320000 },
    });

    // Second entry without rate — should use 320000
    const res = await ctx.makeRequest('POST', '/api/v1/holiday-support-entries', {
      headers,
      body: { date: '2026-11-02', days: 3, rate_type: 'DAILY' }, // no rate_paisa
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.rate_paisa).toBe(320000);
    expect(body.amount_paisa).toBe(960000); // 3 × 320000
  });
});

// ---------------------------------------------------------------------------
// TC-INC-018: Later entry at higher rate — earlier unchanged
// ---------------------------------------------------------------------------

describe('TC-INC-018: later higher rate does not change earlier entries', () => {
  it('earlier entries keep their original rate and amount', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    const e1 = await (await ctx.makeRequest('POST', '/api/v1/holiday-support-entries', {
      headers,
      body: { date: '2026-11-01', days: 2, rate_type: 'DAILY', rate_paisa: 320000 },
    })).json();

    // New entry at higher rate
    await ctx.makeRequest('POST', '/api/v1/holiday-support-entries', {
      headers,
      body: { date: '2026-11-10', days: 1, rate_type: 'DAILY', rate_paisa: 400000 },
    });

    // First entry unchanged
    const list = await (await ctx.makeRequest('GET', '/api/v1/holiday-support-entries', { headers })).json();
    const original = list.entries.find((e: any) => e.id === e1.id);
    expect(original.rate_paisa).toBe(320000);
    expect(original.amount_paisa).toBe(640000);
  });
});

// ---------------------------------------------------------------------------
// TC-INC-019: Month's Holiday Support total
// ---------------------------------------------------------------------------

describe('TC-INC-019: month total', () => {
  it('month_total_paisa is sum of that month\'s entries', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    await ctx.makeRequest('POST', '/api/v1/holiday-support-entries', {
      headers,
      body: { date: '2026-11-01', days: 2, rate_type: 'DAILY', rate_paisa: 320000 },
    });
    await ctx.makeRequest('POST', '/api/v1/holiday-support-entries', {
      headers,
      body: { date: '2026-11-15', days: 1, rate_type: 'DAILY', rate_paisa: 320000 },
    });

    const list = await (await ctx.makeRequest('GET', '/api/v1/holiday-support-entries?month=2026-11', { headers })).json();
    expect(list.month_total_paisa).toBe(960000); // (2 + 1) × 320000
  });
});
