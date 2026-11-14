import { describe, it, expect } from 'vitest';
import { taxYearConfigSchema } from './schemas';

const validConfig = {
  slabs: [
    { width_paisa: 37500000, rate_bps: 0 },
    { width_paisa: 30000000, rate_bps: 1000 },
    { width_paisa: null, rate_bps: 3000 },
  ],
  salary_exemption: { numerator: 1, denominator: 3, cap_paisa: 50000000 },
  rebate: { income_rate_bps: 300, investment_rate_bps: 1000, max_paisa: 100000000 },
  investment_caps_paisa: { dps: 12000000, sanchaypatra: 50000000, stocks: 50000000, insurance: null, others: null },
  minimum_tax_paisa: 500000,
  early_filing: { rate_bps: 500, max_paisa: 2500000, deadline_mmdd: '09-30' },
};

describe('taxYearConfigSchema', () => {
  it('TC-FND-016 rejects config with no remainder slab', () => {
    const noRemainder = {
      ...validConfig,
      slabs: [
        { width_paisa: 37500000, rate_bps: 0 },
        { width_paisa: 30000000, rate_bps: 1000 }, // last slab has non-null width
      ],
    };
    expect(() => taxYearConfigSchema.parse(noRemainder)).toThrow();
  });

  it('TC-FND-016 rejects config with a negative rate slab', () => {
    const negRate = {
      ...validConfig,
      slabs: [
        { width_paisa: 37500000, rate_bps: -100 },
        { width_paisa: null, rate_bps: 3000 },
      ],
    };
    expect(() => taxYearConfigSchema.parse(negRate)).toThrow();
  });

  it('valid config parses successfully', () => {
    expect(() => taxYearConfigSchema.parse(validConfig)).not.toThrow();
  });
});
