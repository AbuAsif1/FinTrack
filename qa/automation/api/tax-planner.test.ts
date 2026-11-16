/**
 * p2-09 — What-If Tax Planner + Filing Checklist
 * Seams:
 *   GET  /api/v1/tax/planner?year=&additional_investment=   — what-if calc (read-only)
 *   GET  /api/v1/tax/filing-checklist?year=                 — get checklist state
 *   PATCH /api/v1/tax/filing-checklist?year=                — toggle checked items
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

describe('Tax Planner (What-If)', () => {
  it('returns planner response with no additional investment', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    const res = await ctx.makeRequest('GET', '/api/v1/tax/planner?year=2025-26&additional_investment=0', { headers });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.current_net_tax_paisa).toBeDefined();
    expect(body.hypothetical_net_tax_paisa).toBeDefined();
    expect(body.tax_saved_paisa).toBeDefined();
    expect(body.remaining_ceiling_paisa).toBeDefined();
    expect(body.tax_saved_paisa).toBe(0);
  });

  it('shows tax savings when additional investment is provided', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    // Add income so there's actual tax to calculate against
    // Add 12 months of salary above the tax-free threshold (500,000 Tk/month)
    for (const month of ['2025-07','2025-08','2025-09','2025-10','2025-11','2025-12',
                          '2026-01','2026-02','2026-03','2026-04','2026-05','2026-06']) {
      const r = await ctx.makeRequest('POST', '/api/v1/income-entries', {
        headers,
        body: {
          month,
          income_type: 'SALARY',
          gross_paisa: 50000000,
          tds_paisa: 0,
          is_taxable: true,
          employer_name: 'Employer',
          idempotency_key: `ikey-plan-${month}-${Math.random().toString(36).slice(2)}`,
        },
      });
      expect(r.status).toBe(201);
    }
    const res = await ctx.makeRequest('GET', '/api/v1/tax/planner?year=2025-26&additional_investment=5000000', { headers });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.current_net_tax_paisa).toBeGreaterThan(0);
    expect(body.hypothetical_net_tax_paisa).toBeLessThanOrEqual(body.current_net_tax_paisa);
    expect(body.tax_saved_paisa).toBeGreaterThanOrEqual(0);
  });
});

describe('Filing Checklist', () => {
  it('returns empty checklist for new user', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    const res = await ctx.makeRequest('GET', '/api/v1/tax/filing-checklist?year=2025-26', { headers });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toBeDefined();
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeGreaterThan(0);
    // All items should start unchecked
    expect(body.checked_ids).toEqual([]);
  });

  it('can check and uncheck checklist items', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);

    // Get checklist items
    const listRes = await ctx.makeRequest('GET', '/api/v1/tax/filing-checklist?year=2025-26', { headers });
    const { items } = await listRes.json();
    const firstId = items[0].id;

    // Check the first item
    const patchRes = await ctx.makeRequest('PATCH', '/api/v1/tax/filing-checklist', {
      headers,
      body: { year: '2025-26', checked_ids: [firstId] },
    });
    expect(patchRes.status).toBe(200);
    const patchBody = await patchRes.json();
    expect(patchBody.checked_ids).toContain(firstId);

    // Verify persistence
    const getRes = await ctx.makeRequest('GET', '/api/v1/tax/filing-checklist?year=2025-26', { headers });
    const getBody = await getRes.json();
    expect(getBody.checked_ids).toContain(firstId);
  });
});
