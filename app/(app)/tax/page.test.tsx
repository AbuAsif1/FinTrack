/**
 * TC-UI-121, TC-UI-124, TC-P2ACC-021 — Tax page UI: overpaid, locked settings, read-only investments
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

vi.mock('@/lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

import api from '@/lib/api';
import TaxPage from './page';

// ── Shared fixtures ───────────────────────────────────────────────────────────

function makeResult(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    fiscal_year: '2026-27',
    is_projection: false,
    months_entered: 5,
    gross_income_paisa: 50000000,
    exemption_paisa: 16666667,
    taxable_income_paisa: 33333333,
    slab_breakdown: [],
    gross_tax_paisa: 2000000,
    investment_breakdown: [],
    eligible_investment_paisa: 0,
    tax_rebate_paisa: 0,
    minimum_tax_applied: false,
    tax_after_rebate_paisa: 2000000,
    early_filing_rebate_applied_paisa: 0,
    early_filing_rebate_potential_paisa: 0,
    net_tax_payable_paisa: 2000000,
    tds_paisa: 500000,
    tax_payments_paisa: 0,
    tax_paid_paisa: 500000,
    remaining_tax_paisa: 1500000,
    remaining_salary_months: 7,
    suggested_monthly_tds_paisa: 200000,
    further_investment_for_max_rebate_paisa: 0,
    is_provisional: false,
    is_locked: false,
    filed_on: null,
    ...overrides,
  };
}

function makeTaxYear(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'ty-1',
    fiscal_year: '2026-27',
    is_provisional: false,
    filed_on: null,
    is_locked: false,
    config: {
      slabs: [
        { width_paisa: 37500000, rate_bps: 0 },
        { width_paisa: null, rate_bps: 1000 },
      ],
      salary_exemption: { numerator: 1, denominator: 3, cap_paisa: 50000000 },
      rebate: { income_rate_bps: 300, investment_rate_bps: 1000, max_paisa: 100000000 },
      investment_caps_paisa: { dps: 12000000, sanchaypatra: 50000000, stocks: null, insurance: null, others: null },
      minimum_tax_paisa: 500000,
      early_filing: null,
    },
    ...overrides,
  };
}

function setupMocks(resultOverrides = {}, taxYearOverrides = {}) {
  const result = makeResult(resultOverrides);
  const taxYear = makeTaxYear(taxYearOverrides);
  vi.mocked(api.get).mockImplementation(async (path: string) => {
    if ((path as string).includes('/tax/summary'))       return { data: result };
    if ((path as string).includes('/tax-years/'))        return { data: taxYear };
    if ((path as string).includes('/forecast'))          return { data: { ...result, is_projection: true } };
    return { data: [] };
  });
}

// ── TC-UI-121 ─────────────────────────────────────────────────────────────────

describe('TC-UI-121: "Overpaid (refundable)" when tax paid > net tax', () => {
  it('shows Overpaid when remaining_tax_paisa is negative', async () => {
    setupMocks({ remaining_tax_paisa: -300000, tax_paid_paisa: 2300000 });
    render(<TaxPage />);
    await waitFor(() =>
      expect(screen.getByText(/Overpaid \(refundable\)/i)).toBeInTheDocument(),
    );
  });

  it('shows Remaining to Pay when remaining_tax_paisa is positive', async () => {
    setupMocks({ remaining_tax_paisa: 1500000 });
    render(<TaxPage />);
    await waitFor(() =>
      expect(screen.getByText(/Remaining to Pay/i)).toBeInTheDocument(),
    );
    expect(screen.queryByText(/Overpaid/i)).not.toBeInTheDocument();
  });
});

// ── TC-UI-124 ─────────────────────────────────────────────────────────────────

describe('TC-UI-124: Settings tab is read-only when year is locked/filed', () => {
  it('shows "Reopen" button and "Settings are locked" notice when is_locked', async () => {
    setupMocks(
      { is_locked: true, filed_on: '2026-09-25' },
      { is_locked: true, filed_on: '2026-09-25' },
    );
    render(<TaxPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: /reopen/i })).toBeInTheDocument());

    // Switch to Settings tab (tabs are <button> elements, not role="tab")
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    await waitFor(() =>
      expect(screen.getByText(/settings are locked/i)).toBeInTheDocument(),
    );

    // No "Edit" button in settings tab
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
  });
});

// ── TC-P2ACC-021 ──────────────────────────────────────────────────────────────

describe('TC-P2ACC-021: Overview investments are read-only and come from the tax result', () => {
  it('lists each investment kind with its amount and offers no Edit button', async () => {
    setupMocks({
      is_locked: false,
      investment_breakdown: [
        { category: 'universal_pension', invested: 500000, cap: null, eligible: 500000 },
        { category: 'insurance', invested: 300000, cap: null, eligible: 300000 },
      ],
    });
    render(<TaxPage />);
    await waitFor(() => expect(screen.getByText('Universal Pension Scheme')).toBeInTheDocument());
    expect(screen.getByText('Insurance')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });
});
