import { describe, it, expect } from 'vitest';
import { calculateTax } from './calculate-tax';
import { forecastTax } from './forecast-tax';
import { IncomeType } from '@fintrack/shared';
import type { TaxYearConfig } from '@fintrack/shared';
import type { TaxInput } from './calculate-tax';

// ---- FY tax configs (from brd.md §6 FR-TAX-03) ----

const FY2025_26: TaxYearConfig = {
  slabs: [
    { width_paisa: 37500000, rate_bps: 0 },
    { width_paisa: 30000000, rate_bps: 1000 },
    { width_paisa: 40000000, rate_bps: 1500 },
    { width_paisa: 50000000, rate_bps: 2000 },
    { width_paisa: 200000000, rate_bps: 2500 },
    { width_paisa: null, rate_bps: 3000 },
  ],
  salary_exemption: { numerator: 1, denominator: 3, cap_paisa: 50000000 },
  rebate: { income_rate_bps: 300, investment_rate_bps: 1000, max_paisa: 100000000 },
  investment_caps_paisa: { dps: 12000000, sanchaypatra: 50000000, stocks: 50000000, insurance: null, others: null },
  minimum_tax_paisa: 500000,
  early_filing: { rate_bps: 500, max_paisa: 2500000, deadline_mmdd: '09-30' },
};

const FY2024_25: TaxYearConfig = {
  slabs: [
    { width_paisa: 35000000, rate_bps: 0 },
    { width_paisa: 10000000, rate_bps: 500 },
    { width_paisa: 40000000, rate_bps: 1000 },
    { width_paisa: 50000000, rate_bps: 1500 },
    { width_paisa: 50000000, rate_bps: 2000 },
    { width_paisa: 200000000, rate_bps: 2500 },
    { width_paisa: null, rate_bps: 3000 },
  ],
  salary_exemption: { numerator: 1, denominator: 3, cap_paisa: 45000000 },
  rebate: { income_rate_bps: 300, investment_rate_bps: 1500, max_paisa: 100000000 },
  investment_caps_paisa: { dps: 12000000, sanchaypatra: 50000000, stocks: 50000000, insurance: null, others: null },
  minimum_tax_paisa: 500000,
  early_filing: null,
};

// Helper to build a full-year salary input
function salaryEntries(grossMonthly: number, tdsMonthly: number, months: string[]): TaxInput['incomeEntries'] {
  return months.map((m) => ({
    month: `${m}-01`,
    income_type: IncomeType.SALARY,
    gross_paisa: grossMonthly,
    tds_paisa: tdsMonthly,
    is_taxable: true,
  }));
}

// AC-TAX-1 base input (without filedOn)
const AC_TAX_1_ENTRIES: TaxInput['incomeEntries'] = [
  // Gross Income ৳20,06,846 from taxable entries
  // Single entry for simplicity; the tax engine sums them
  { month: '2025-07-01', income_type: IncomeType.SALARY, gross_paisa: 200684600, tds_paisa: 13248800, is_taxable: true },
];

const AC_TAX_1_INPUT: TaxInput = {
  fiscalYear: '2025-26',
  config: FY2025_26,
  incomeEntries: AC_TAX_1_ENTRIES,
  investments: { dps: 80000000, sanchaypatra: 10000000, stocks: 0, insurance: 0, others: 19000000 },
  taxPaymentsPaisa: 0,
  filedOn: null,
  asOf: '2026-11-01',
};

describe('TC-TAXE-001 AC-TAX-1 full figure check', () => {
  it('exemption, taxable income, gross tax, rebate, net tax, remaining', () => {
    const r = calculateTax(AC_TAX_1_INPUT);
    expect(r.exemption_paisa).toBe(50000000);         // ৳5,00,000
    expect(r.taxable_income_paisa).toBe(150684600);    // ৳15,06,846
    expect(r.gross_tax_paisa).toBe(17636920);          // ৳1,76,369.20
    expect(r.eligible_investment_paisa).toBe(41000000); // ৳4,10,000
    expect(r.tax_rebate_paisa).toBe(4100000);          // ৳41,000
    expect(r.net_tax_payable_paisa).toBe(13536920);    // ৳1,35,369.20
    expect(r.tax_paid_paisa).toBe(13248800);           // ৳1,32,488
    expect(r.remaining_tax_paisa).toBe(288120);        // ৳2,881.20
  });
});

describe('TC-TAXE-002 slab breakdown for AC-TAX-1', () => {
  it('slab tax amounts: ৳0 · ৳30,000 · ৳60,000 · ৳86,369.20', () => {
    const r = calculateTax(AC_TAX_1_INPUT);
    const taxedSlabs = r.slab_breakdown.filter((s) => s.taxable_in_slab > 0);
    // 0% slab: ৳3,75,000 → ৳0 tax
    expect(taxedSlabs[0].tax).toBe(0);
    // 10% slab: ৳3,00,000 → ৳30,000
    expect(taxedSlabs[1].tax).toBe(3000000);
    // 15% slab: ৳4,00,000 → ৳60,000
    expect(taxedSlabs[2].tax).toBe(6000000);
    // 20% slab: ৳4,31,846 → ৳86,369.20
    expect(taxedSlabs[3].tax).toBe(8636920);
  });
});

describe('TC-TAXE-003 DPS cap', () => {
  it('DPS ৳8,00,000 against ৳1,20,000 cap → eligible ৳1,20,000', () => {
    const r = calculateTax(AC_TAX_1_INPUT);
    const dps = r.investment_breakdown.find((b) => b.category === 'dps')!;
    expect(dps.invested).toBe(80000000);
    expect(dps.cap).toBe(12000000);
    expect(dps.eligible).toBe(12000000);
  });
});

describe('TC-TAXE-004 rebate limited by income rate', () => {
  it('eligible ৳10,00,000 gives rebate ৳45,205.38, limited by income rate', () => {
    const input: TaxInput = {
      ...AC_TAX_1_INPUT,
      investments: { dps: 12000000, sanchaypatra: 50000000, stocks: 50000000, insurance: 0, others: 50000000 },
    };
    const r = calculateTax(input);
    // income rate candidate = 150684600 × 3% = 4520538
    expect(r.rebate_candidate_income_paisa).toBe(4520538);
    expect(r.tax_rebate_paisa).toBe(4520538); // limited by income rate
  });
});

describe('TC-TAXE-005 rebate limited by maximum', () => {
  it('rebate max ৳10,000 → rebate ৳10,000', () => {
    const input: TaxInput = {
      ...AC_TAX_1_INPUT,
      config: { ...FY2025_26, rebate: { ...FY2025_26.rebate, max_paisa: 1000000 } },
    };
    const r = calculateTax(input);
    expect(r.tax_rebate_paisa).toBe(1000000);
  });
});

describe('TC-TAXE-006 rebate cannot exceed gross tax', () => {
  it('small gross tax → rebate equals gross tax; net tax not negative', () => {
    const input: TaxInput = {
      ...AC_TAX_1_INPUT,
      incomeEntries: [{ month: '2025-07-01', income_type: IncomeType.SALARY, gross_paisa: 40000000, tds_paisa: 0, is_taxable: true }],
      investments: { dps: 12000000, sanchaypatra: 50000000, stocks: 50000000, insurance: 0, others: 10000000 },
    };
    const r = calculateTax(input);
    expect(r.tax_rebate_paisa).toBeLessThanOrEqual(r.gross_tax_paisa);
    expect(r.tax_after_rebate_paisa).toBeGreaterThanOrEqual(0);
  });
});

describe('TC-TAXE-007 AC-TAX-2 mid-year salary change', () => {
  it('9 months ৳1,22,700 + 3 months ৳1,53,383 = ৳15,64,449', () => {
    const julyToMarch = salaryEntries(12270000, 0, [
      '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12',
      '2026-01', '2026-02', '2026-03',
    ]);
    const aprilToJune = salaryEntries(15338300, 0, ['2026-04', '2026-05', '2026-06']);
    const input: TaxInput = {
      ...AC_TAX_1_INPUT,
      incomeEntries: [...julyToMarch, ...aprilToJune],
      investments: { dps: 0, sanchaypatra: 0, stocks: 0, insurance: 0, others: 0 },
    };
    const r = calculateTax(input);
    expect(r.gross_income_paisa).toBe(156444900); // ৳15,64,449.00
  });
});

describe('TC-TAXE-008 AC-TAX-3 overpaid with 3 salary months remaining', () => {
  it('TDS ৳1,40,000 → remaining −৳4,630.80; suggested TDS ৳0', () => {
    const input: TaxInput = {
      ...AC_TAX_1_INPUT,
      incomeEntries: [{ month: '2025-07-01', income_type: IncomeType.SALARY, gross_paisa: 200684600, tds_paisa: 14000000, is_taxable: true }],
      asOf: '2026-04-01', // 3 remaining months: Apr, May, Jun
    };
    const r = calculateTax(input);
    expect(r.remaining_tax_paisa).toBe(-463080); // −৳4,630.80
    expect(r.suggested_monthly_tds_paisa).toBe(0);
  });
});

describe('TC-TAXE-009 AC-TAX-4 FY2024-25 settings', () => {
  it('exemption ৳4,50,000; taxable ৳15,56,846; gross tax ৳1,61,369.20', () => {
    const input: TaxInput = {
      fiscalYear: '2024-25',
      config: FY2024_25,
      incomeEntries: [{ month: '2024-07-01', income_type: IncomeType.SALARY, gross_paisa: 200684600, tds_paisa: 0, is_taxable: true }],
      investments: { dps: 0, sanchaypatra: 0, stocks: 0, insurance: 0, others: 0 },
      taxPaymentsPaisa: 0,
      filedOn: null,
      asOf: '2025-11-01',
    };
    const r = calculateTax(input);
    expect(r.exemption_paisa).toBe(45000000);       // ৳4,50,000
    expect(r.taxable_income_paisa).toBe(155684600);  // ৳15,56,846
    expect(r.gross_tax_paisa).toBe(16136920);        // ৳1,61,369.20
  });
});

describe('TC-TAXE-010 AC-TAX-5 minimum tax', () => {
  it('taxable ৳4,00,000; gross tax ৳2,500; net ৳5,000 (minimum tax applied)', () => {
    const input: TaxInput = {
      fiscalYear: '2025-26',
      config: FY2025_26,
      incomeEntries: [{ month: '2025-07-01', income_type: IncomeType.SALARY, gross_paisa: 60000000, tds_paisa: 0, is_taxable: true }],
      investments: { dps: 0, sanchaypatra: 0, stocks: 0, insurance: 0, others: 0 },
      taxPaymentsPaisa: 0,
      filedOn: null,
      asOf: '2026-11-01',
    };
    const r = calculateTax(input);
    expect(r.taxable_income_paisa).toBe(40000000);  // ৳4,00,000
    expect(r.gross_tax_paisa).toBe(250000);         // ৳2,500
    expect(r.net_tax_payable_paisa).toBe(500000);   // ৳5,000
    expect(r.minimum_tax_applied).toBe(true);
  });
});

describe('TC-TAXE-011 taxable income at threshold — no minimum tax', () => {
  it('taxable exactly ৳3,75,000 → gross tax ৳0; minimum tax NOT applied', () => {
    // Taxable = ৳3,75,000 exactly (threshold)
    // Gross = ৳3,75,000 + exemption; since exemption = MIN(gross/3, 5L), gross × 2/3 = 3,75,000 → gross = 5,62,500
    const input: TaxInput = {
      fiscalYear: '2025-26',
      config: FY2025_26,
      incomeEntries: [{ month: '2025-07-01', income_type: IncomeType.SALARY, gross_paisa: 56250000, tds_paisa: 0, is_taxable: true }],
      investments: { dps: 0, sanchaypatra: 0, stocks: 0, insurance: 0, others: 0 },
      taxPaymentsPaisa: 0,
      filedOn: null,
      asOf: '2026-11-01',
    };
    const r = calculateTax(input);
    expect(r.gross_tax_paisa).toBe(0);
    expect(r.net_tax_payable_paisa).toBe(0);
    expect(r.minimum_tax_applied).toBe(false);
  });
});

describe('TC-TAXE-012 taxable just above threshold — minimum tax applied', () => {
  it('minimum tax applied, net = ৳5,000', () => {
    const input: TaxInput = {
      fiscalYear: '2025-26',
      config: FY2025_26,
      incomeEntries: [{ month: '2025-07-01', income_type: IncomeType.SALARY, gross_paisa: 56350000, tds_paisa: 0, is_taxable: true }],
      investments: { dps: 0, sanchaypatra: 0, stocks: 0, insurance: 0, others: 0 },
      taxPaymentsPaisa: 0,
      filedOn: null,
      asOf: '2026-11-01',
    };
    const r = calculateTax(input);
    expect(r.minimum_tax_applied).toBe(true);
    expect(r.net_tax_payable_paisa).toBe(500000); // ৳5,000
  });
});

describe('TC-TAXE-013 AC-TAX-6 early filing rebate applied', () => {
  it('filed 2026-09-15 → rebate ৳6,768.46; net ৳1,28,600.74; remaining −৳3,887.26', () => {
    const input: TaxInput = { ...AC_TAX_1_INPUT, filedOn: '2026-09-15' };
    const r = calculateTax(input);
    expect(r.early_filing_rebate_applied_paisa).toBe(676846);  // ৳6,768.46
    expect(r.net_tax_payable_paisa).toBe(12860074);             // ৳1,28,600.74
    expect(r.remaining_tax_paisa).toBe(-388726);                // −৳3,887.26
  });
});

describe('TC-TAXE-014 AC-TAX-6 filed after deadline — no rebate', () => {
  it('filed 2026-10-01 → no early filing rebate; figures as AC-TAX-1', () => {
    const input: TaxInput = { ...AC_TAX_1_INPUT, filedOn: '2026-10-01' };
    const r = calculateTax(input);
    expect(r.early_filing_rebate_applied_paisa).toBe(0);
    expect(r.net_tax_payable_paisa).toBe(13536920);
  });
});

describe('TC-TAXE-015 early filing rebate capped at ৳25,000', () => {
  it('large tax after rebate → early filing rebate = ৳25,000 (maximum)', () => {
    const input: TaxInput = {
      fiscalYear: '2025-26',
      config: FY2025_26,
      incomeEntries: [{ month: '2025-07-01', income_type: IncomeType.SALARY, gross_paisa: 600000000, tds_paisa: 0, is_taxable: true }],
      investments: { dps: 0, sanchaypatra: 0, stocks: 0, insurance: 0, others: 0 },
      taxPaymentsPaisa: 0,
      filedOn: '2026-09-15',
      asOf: '2026-11-01',
    };
    const r = calculateTax(input);
    expect(r.early_filing_rebate_applied_paisa).toBe(2500000); // ৳25,000
  });
});

describe('TC-TAXE-016 FY2024-25 has no early filing rule', () => {
  it('filed in September → early filing rebate ৳0', () => {
    const input: TaxInput = {
      fiscalYear: '2024-25',
      config: FY2024_25,
      incomeEntries: [{ month: '2024-07-01', income_type: IncomeType.SALARY, gross_paisa: 200684600, tds_paisa: 0, is_taxable: true }],
      investments: { dps: 0, sanchaypatra: 0, stocks: 0, insurance: 0, others: 0 },
      taxPaymentsPaisa: 0,
      filedOn: '2025-09-15',
      asOf: '2025-11-01',
    };
    const r = calculateTax(input);
    expect(r.early_filing_rebate_applied_paisa).toBe(0);
  });
});

describe('TC-TAXE-017 not yet filed, inside filing window', () => {
  it('applied rebate = 0; potential rebate reported separately', () => {
    // asOf inside the window (after FY ends, before deadline)
    const input: TaxInput = { ...AC_TAX_1_INPUT, filedOn: null, asOf: '2026-08-01' };
    const r = calculateTax(input);
    expect(r.early_filing_rebate_applied_paisa).toBe(0);
    expect(r.early_filing_rebate_potential_paisa).toBeGreaterThan(0);
  });
});

describe('TC-TAXE-018 non-taxable entry excluded from gross income', () => {
  it('one entry flagged not taxable is excluded', () => {
    const input: TaxInput = {
      ...AC_TAX_1_INPUT,
      incomeEntries: [
        { month: '2025-07-01', income_type: IncomeType.SALARY, gross_paisa: 100000000, tds_paisa: 0, is_taxable: true },
        { month: '2025-08-01', income_type: IncomeType.CERTIFICATION, gross_paisa: 50000000, tds_paisa: 0, is_taxable: false },
      ],
    };
    const r = calculateTax(input);
    expect(r.gross_income_paisa).toBe(100000000); // only the taxable entry
  });
});

describe('TC-TAXE-019 TDS and Tax Payments combined', () => {
  it('TDS ৳1,00,000 + Tax Payments ৳20,000 = Tax Paid ৳1,20,000', () => {
    const input: TaxInput = {
      ...AC_TAX_1_INPUT,
      incomeEntries: [{ month: '2025-07-01', income_type: IncomeType.SALARY, gross_paisa: 200684600, tds_paisa: 10000000, is_taxable: true }],
      taxPaymentsPaisa: 2000000,
    };
    const r = calculateTax(input);
    expect(r.tds_paisa).toBe(10000000);
    expect(r.tax_payments_paisa).toBe(2000000);
    expect(r.tax_paid_paisa).toBe(12000000);
  });
});

describe('TC-TAXE-020 remaining salary months and suggested TDS', () => {
  it('asOf 2026-02-10 with July–January entered → 5 remaining; suggested = remaining ÷ 5', () => {
    const julyToJan = salaryEntries(12270000, 0, [
      '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01',
    ]);
    const input: TaxInput = {
      fiscalYear: '2025-26',
      config: FY2025_26,
      incomeEntries: julyToJan,
      investments: { dps: 0, sanchaypatra: 0, stocks: 0, insurance: 0, others: 0 },
      taxPaymentsPaisa: 0,
      filedOn: null,
      asOf: '2026-02-10',
    };
    const r = calculateTax(input);
    expect(r.remaining_salary_months).toBe(5); // Feb, Mar, Apr, May, Jun
    const expected = Math.floor(Math.max(0, r.remaining_tax_paisa) / 5 + 0.5);
    expect(r.suggested_monthly_tds_paisa).toBe(expected);
  });
});

describe('TC-TAXE-021 past FY — zero remaining months; suggested TDS null', () => {
  it('asOf after FY end → remaining = 0; suggested = null', () => {
    const input: TaxInput = {
      ...AC_TAX_1_INPUT,
      asOf: '2026-07-15', // after FY2025-26 ends
    };
    const r = calculateTax(input);
    expect(r.remaining_salary_months).toBe(0);
    expect(r.suggested_monthly_tds_paisa).toBeNull();
  });
});

describe('TC-TAXE-022 further investment for maximum rebate', () => {
  it('AC-TAX-1 → further investment ৳42,053.80', () => {
    const r = calculateTax(AC_TAX_1_INPUT);
    expect(r.further_investment_for_max_rebate_paisa).toBe(4205380);
  });
});

describe('TC-TAXE-023 already at max rebate — further investment ৳0', () => {
  it('eligible investment exceeds what max rebate needs → ৳0 further', () => {
    const input: TaxInput = {
      ...AC_TAX_1_INPUT,
      investments: { dps: 12000000, sanchaypatra: 50000000, stocks: 50000000, insurance: 0, others: 50000000 },
    };
    const r = calculateTax(input);
    expect(r.further_investment_for_max_rebate_paisa).toBe(0);
  });
});

describe('TC-TAXE-024 forecastTax projects remaining salary months', () => {
  it('3 months July–Sep; asOf October → projected gross ৳14,72,400', () => {
    const julySep = salaryEntries(12270000, 0, ['2025-07', '2025-08', '2025-09']);
    const input: TaxInput = {
      fiscalYear: '2025-26',
      config: FY2025_26,
      incomeEntries: julySep,
      investments: { dps: 0, sanchaypatra: 0, stocks: 0, insurance: 0, others: 0 },
      taxPaymentsPaisa: 0,
      filedOn: null,
      asOf: '2025-10-15',
    };
    const r = forecastTax(input);
    expect(r.gross_income_paisa).toBe(147240000); // 12 × 12270000
    expect(r.is_projection).toBe(true);
  });
});

describe('TC-TAXE-025 forecastTax does not project Profit Share', () => {
  it('profit share entry counted once, not projected', () => {
    const julyToSep = salaryEntries(12270000, 0, ['2025-07', '2025-08', '2025-09']);
    const profitShare: TaxInput['incomeEntries'][0] = {
      month: '2025-08-01',
      income_type: IncomeType.PROFIT_SHARE,
      gross_paisa: 10000000,
      tds_paisa: 0,
      is_taxable: true,
    };
    const input: TaxInput = {
      fiscalYear: '2025-26',
      config: FY2025_26,
      incomeEntries: [...julyToSep, profitShare],
      investments: { dps: 0, sanchaypatra: 0, stocks: 0, insurance: 0, others: 0 },
      taxPaymentsPaisa: 0,
      filedOn: null,
      asOf: '2025-10-15',
    };
    const r = forecastTax(input);
    // Profit share should appear once; salary projected for remaining 9 months
    const expected = 12 * 12270000 + 10000000;
    expect(r.gross_income_paisa).toBe(expected);
  });
});

describe('TC-TAXE-026 no income entries — all zeroes', () => {
  it('every figure is zero; minimum tax not applied', () => {
    const input: TaxInput = {
      fiscalYear: '2025-26',
      config: FY2025_26,
      incomeEntries: [],
      investments: { dps: 0, sanchaypatra: 0, stocks: 0, insurance: 0, others: 0 },
      taxPaymentsPaisa: 0,
      filedOn: null,
      asOf: '2026-11-01',
    };
    const r = calculateTax(input);
    expect(r.gross_income_paisa).toBe(0);
    expect(r.gross_tax_paisa).toBe(0);
    expect(r.net_tax_payable_paisa).toBe(0);
    expect(r.minimum_tax_applied).toBe(false);
  });
});

describe('TC-TAXE-027 deterministic — same input gives same result', () => {
  it('calling twice gives identical results', () => {
    const r1 = calculateTax(AC_TAX_1_INPUT);
    const r2 = calculateTax(AC_TAX_1_INPUT);
    expect(r1).toEqual(r2);
  });
});

describe('TC-TAXE-028 months_entered counted correctly', () => {
  it('entries in 7 distinct months → months_entered = 7', () => {
    const entries = salaryEntries(12270000, 0, [
      '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01',
    ]);
    const input: TaxInput = {
      fiscalYear: '2025-26',
      config: FY2025_26,
      incomeEntries: entries,
      investments: { dps: 0, sanchaypatra: 0, stocks: 0, insurance: 0, others: 0 },
      taxPaymentsPaisa: 0,
      filedOn: null,
      asOf: '2026-02-01',
    };
    const r = calculateTax(input);
    expect(r.months_entered).toBe(7);
  });
});
