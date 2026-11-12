// All amounts in Paisa (1 BDT = 100 Paisa). Rate in basis points (1000 bps = 10%).
export const taxYearConfigs: Record<string, TaxYearConfigData> = {
  '2024-25': {
    slabs: [
      { width_paisa: 35000000, rate_bps: 0 },     // 0%  first ৳3,50,000
      { width_paisa: 10000000, rate_bps: 500 },   // 5%  next  ৳1,00,000
      { width_paisa: 40000000, rate_bps: 1000 },  // 10% next  ৳4,00,000
      { width_paisa: 50000000, rate_bps: 1500 },  // 15% next  ৳5,00,000
      { width_paisa: 50000000, rate_bps: 2000 },  // 20% next  ৳5,00,000
      { width_paisa: 200000000, rate_bps: 2500 }, // 25% next ৳20,00,000
      { width_paisa: null, rate_bps: 3000 },      // 30% remainder
    ],
    salary_exemption: { numerator: 1, denominator: 3, cap_paisa: 45000000 },
    rebate: { income_rate_bps: 300, investment_rate_bps: 1500, max_paisa: 100000000 },
    investment_caps_paisa: {
      dps: 12000000,
      sanchaypatra: 50000000,
      stocks: 50000000,
      insurance: null,
      others: null,
    },
    minimum_tax_paisa: 500000,
    early_filing: null,
  },

  '2025-26': {
    slabs: [
      { width_paisa: 37500000, rate_bps: 0 },     // 0%  first ৳3,75,000
      { width_paisa: 30000000, rate_bps: 1000 },  // 10% next  ৳3,00,000
      { width_paisa: 40000000, rate_bps: 1500 },  // 15% next  ৳4,00,000
      { width_paisa: 50000000, rate_bps: 2000 },  // 20% next  ৳5,00,000
      { width_paisa: 200000000, rate_bps: 2500 }, // 25% next ৳20,00,000
      { width_paisa: null, rate_bps: 3000 },      // 30% remainder
    ],
    salary_exemption: { numerator: 1, denominator: 3, cap_paisa: 50000000 },
    rebate: { income_rate_bps: 300, investment_rate_bps: 1000, max_paisa: 100000000 },
    investment_caps_paisa: {
      dps: 12000000,
      sanchaypatra: 50000000,
      stocks: 50000000,
      insurance: null,
      others: null,
    },
    minimum_tax_paisa: 500000,
    early_filing: { rate_bps: 500, max_paisa: 2500000, deadline_mmdd: '09-30' },
  },

  '2026-27': {
    // Same as FY2025-26
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
    investment_caps_paisa: {
      dps: 12000000,
      sanchaypatra: 50000000,
      stocks: 50000000,
      insurance: null,
      others: null,
    },
    minimum_tax_paisa: 500000,
    early_filing: { rate_bps: 500, max_paisa: 2500000, deadline_mmdd: '09-30' },
  },
};

export interface TaxYearConfigData {
  slabs: { width_paisa: number | null; rate_bps: number }[];
  salary_exemption: { numerator: number; denominator: number; cap_paisa: number };
  rebate: { income_rate_bps: number; investment_rate_bps: number; max_paisa: number };
  investment_caps_paisa: Record<'dps' | 'sanchaypatra' | 'stocks' | 'insurance' | 'others', number | null>;
  minimum_tax_paisa: number;
  early_filing: { rate_bps: number; max_paisa: number; deadline_mmdd: string } | null;
}
