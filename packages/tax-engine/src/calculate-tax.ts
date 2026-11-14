import { IncomeType } from '@fintrack/shared';
import { roundHalfUp } from '@fintrack/shared';
import type { TaxYearConfig } from '@fintrack/shared';

export type TaxIncomeEntry = {
  month: string;
  income_type: IncomeType;
  gross_paisa: number;
  tds_paisa: number;
  is_taxable: boolean;
};

export type TaxInput = {
  fiscalYear: string;
  config: TaxYearConfig;
  incomeEntries: TaxIncomeEntry[];
  investments: Record<'dps' | 'sanchaypatra' | 'stocks' | 'insurance' | 'others' | 'universal_pension', number>;
  taxPaymentsPaisa: number;
  filedOn: string | null;
  asOf: string;
};

export type SlabBreakdown = {
  rate_bps: number;
  taxable_in_slab: number;
  tax: number;
};

export type InvestmentBreakdown = {
  category: 'dps' | 'sanchaypatra' | 'stocks' | 'insurance' | 'others' | 'universal_pension';
  invested: number;
  cap: number | null;
  eligible: number;
};

export type TaxResult = {
  fiscal_year: string;
  is_projection: boolean;
  months_entered: number;

  // Income
  gross_income_paisa: number;
  exemption_paisa: number;
  taxable_income_paisa: number;

  // Slabs
  slab_breakdown: SlabBreakdown[];
  gross_tax_paisa: number;

  // Investments & Rebate
  investment_breakdown: InvestmentBreakdown[];
  eligible_investment_paisa: number;
  rebate_candidate_income_paisa: number;
  rebate_candidate_investment_paisa: number;
  rebate_candidate_max_paisa: number;
  tax_rebate_paisa: number;
  minimum_tax_applied: boolean;

  // After rebate
  tax_after_rebate_paisa: number;

  // Early filing
  early_filing_rebate_applied_paisa: number;
  early_filing_rebate_potential_paisa: number;

  // Net tax
  net_tax_payable_paisa: number;

  // Payments
  tds_paisa: number;
  tax_payments_paisa: number;
  tax_paid_paisa: number;

  // Remaining
  remaining_tax_paisa: number;
  remaining_salary_months: number;
  suggested_monthly_tds_paisa: number | null;

  // Further investment
  further_investment_for_max_rebate_paisa: number;
};

function countRemainingMonths(
  fiscalYear: string,
  asOf: string,
  incomeEntries: TaxIncomeEntry[]
): number {
  const fyStartYear = parseInt(fiscalYear.split('-')[0], 10);
  const asOfMonth = asOf.slice(0, 7); // "YYYY-MM"
  const asOfYear = parseInt(asOfMonth.split('-')[0], 10);
  const asOfMonthNum = parseInt(asOfMonth.split('-')[1], 10);

  // All months in the FY from asOf month to June (inclusive)
  const allFyMonths: string[] = [];
  for (let m = 7; m <= 12; m++) {
    allFyMonths.push(`${fyStartYear}-${String(m).padStart(2, '0')}`);
  }
  for (let m = 1; m <= 6; m++) {
    allFyMonths.push(`${fyStartYear + 1}-${String(m).padStart(2, '0')}`);
  }

  const salaryMonths = new Set(
    incomeEntries
      .filter((e) => e.income_type === IncomeType.SALARY)
      .map((e) => e.month.slice(0, 7))
  );

  // Count months from asOf (inclusive) to end of FY that have no salary entry
  const fyEnd = `${fyStartYear + 1}-06`;
  if (asOfMonth > fyEnd) return 0;

  let count = 0;
  for (const month of allFyMonths) {
    if (month < asOfMonth) continue;
    if (!salaryMonths.has(month)) count++;
  }
  return count;
}

export function calculateTax(input: TaxInput): TaxResult {
  const { fiscalYear, config, incomeEntries, investments, taxPaymentsPaisa, filedOn, asOf } = input;

  // --- Step 1: Gross Income (sum of taxable entries) ---
  const taxableEntries = incomeEntries.filter((e) => e.is_taxable);
  const grossIncomePaisa = taxableEntries.reduce((sum, e) => sum + e.gross_paisa, 0);

  // Count distinct months entered
  const monthsEntered = new Set(incomeEntries.map((e) => e.month.slice(0, 7))).size;

  // --- Step 2: Exemption ---
  const { numerator, denominator, cap_paisa } = config.salary_exemption;
  const rawExemption = roundHalfUp((grossIncomePaisa * numerator) / denominator);
  const exemptionPaisa = Math.min(rawExemption, cap_paisa);

  // --- Step 3: Taxable Income ---
  const taxableIncomePaisa = grossIncomePaisa - exemptionPaisa;

  // --- Step 4: Gross Tax (slab breakdown) ---
  const slabBreakdown: SlabBreakdown[] = [];
  let remaining = taxableIncomePaisa;
  let grossTaxPaisa = 0;

  for (const slab of config.slabs) {
    const width = slab.width_paisa ?? Infinity;
    const inSlab = Math.min(remaining, width);
    if (inSlab <= 0) {
      slabBreakdown.push({ rate_bps: slab.rate_bps, taxable_in_slab: 0, tax: 0 });
      continue;
    }
    const tax = roundHalfUp((inSlab * slab.rate_bps) / 10000);
    slabBreakdown.push({ rate_bps: slab.rate_bps, taxable_in_slab: inSlab, tax });
    grossTaxPaisa += tax;
    remaining -= inSlab;
    if (remaining <= 0) break;
  }

  // --- Step 5: Eligible Investment ---
  const categories = ['dps', 'sanchaypatra', 'stocks', 'insurance', 'others', 'universal_pension'] as const;
  const investmentBreakdown: InvestmentBreakdown[] = [];
  let eligibleInvestmentPaisa = 0;

  for (const cat of categories) {
    const invested = investments[cat] ?? 0;
    const cap = (config.investment_caps_paisa as Record<string, number | null | undefined>)[cat] ?? null;
    const eligible = cap !== null ? Math.min(invested, cap) : invested;
    investmentBreakdown.push({ category: cat, invested, cap, eligible });
    eligibleInvestmentPaisa += eligible;
  }

  // --- Step 6: Tax Rebate ---
  const candidateIncome = roundHalfUp((taxableIncomePaisa * config.rebate.income_rate_bps) / 10000);
  const candidateInvestment = roundHalfUp((eligibleInvestmentPaisa * config.rebate.investment_rate_bps) / 10000);
  const candidateMax = config.rebate.max_paisa;
  const taxRebatePaisa = Math.min(candidateIncome, candidateInvestment, candidateMax, grossTaxPaisa);

  // --- Step 7: Tax after rebate (with minimum tax) ---
  const taxAfterRebateRaw = grossTaxPaisa - taxRebatePaisa;

  // Minimum tax applies only when taxable income EXCEEDS the tax-free threshold (first slab width)
  const taxFreeThreshold = config.slabs[0]?.width_paisa ?? 0;
  const minimumTaxApplied =
    taxableIncomePaisa > taxFreeThreshold && taxAfterRebateRaw < config.minimum_tax_paisa;
  const taxAfterRebatePaisa = minimumTaxApplied ? config.minimum_tax_paisa : taxAfterRebateRaw;

  // --- Step 8: Early Filing Rebate ---
  let earlyFilingApplied = 0;
  let earlyFilingPotential = 0;

  if (config.early_filing) {
    const { rate_bps, max_paisa, deadline_mmdd } = config.early_filing;
    const fyEndYear = parseInt(fiscalYear.split('-')[0], 10) + 1;
    const deadline = `${fyEndYear}-${deadline_mmdd}`;
    const windowStart = `${fyEndYear}-07-01`;
    const potentialRebate = Math.min(
      roundHalfUp((taxAfterRebatePaisa * rate_bps) / 10000),
      max_paisa
    );

    if (filedOn !== null && filedOn >= windowStart && filedOn <= deadline) {
      earlyFilingApplied = potentialRebate;
    } else if (filedOn === null && asOf >= windowStart && asOf <= deadline) {
      earlyFilingPotential = potentialRebate;
    }
  }

  // --- Step 9: Net Tax Payable ---
  const netTaxPayablePaisa = taxAfterRebatePaisa - earlyFilingApplied;

  // --- Step 10: Tax Paid ---
  const tdsPaisa = incomeEntries.reduce((sum, e) => sum + e.tds_paisa, 0);
  const taxPaidPaisa = tdsPaisa + taxPaymentsPaisa;

  // --- Step 11: Remaining Tax ---
  const remainingTaxPaisa = netTaxPayablePaisa - taxPaidPaisa;

  // --- Step 12: Suggested Monthly TDS ---
  const remainingSalaryMonths = countRemainingMonths(fiscalYear, asOf, incomeEntries);
  let suggestedMonthlyTdsPaisa: number | null = null;
  if (remainingSalaryMonths > 0) {
    suggestedMonthlyTdsPaisa = roundHalfUp(Math.max(0, remainingTaxPaisa) / remainingSalaryMonths);
  }

  // --- Step 13: Further investment for maximum rebate ---
  const maxRebateNumerator = Math.min(
    roundHalfUp((taxableIncomePaisa * config.rebate.income_rate_bps) / 10000),
    config.rebate.max_paisa
  );
  const rawFurtherInvestment = maxRebateNumerator / (config.rebate.investment_rate_bps / 10000) - eligibleInvestmentPaisa;
  const furtherInvestmentForMaxRebate = Math.ceil(Math.max(0, rawFurtherInvestment));

  return {
    fiscal_year: fiscalYear,
    is_projection: false,
    months_entered: monthsEntered,
    gross_income_paisa: grossIncomePaisa,
    exemption_paisa: exemptionPaisa,
    taxable_income_paisa: taxableIncomePaisa,
    slab_breakdown: slabBreakdown,
    gross_tax_paisa: grossTaxPaisa,
    investment_breakdown: investmentBreakdown,
    eligible_investment_paisa: eligibleInvestmentPaisa,
    rebate_candidate_income_paisa: candidateIncome,
    rebate_candidate_investment_paisa: candidateInvestment,
    rebate_candidate_max_paisa: candidateMax,
    tax_rebate_paisa: taxRebatePaisa,
    minimum_tax_applied: minimumTaxApplied,
    tax_after_rebate_paisa: taxAfterRebatePaisa,
    early_filing_rebate_applied_paisa: earlyFilingApplied,
    early_filing_rebate_potential_paisa: earlyFilingPotential,
    net_tax_payable_paisa: netTaxPayablePaisa,
    tds_paisa: tdsPaisa,
    tax_payments_paisa: taxPaymentsPaisa,
    tax_paid_paisa: taxPaidPaisa,
    remaining_tax_paisa: remainingTaxPaisa,
    remaining_salary_months: remainingSalaryMonths,
    suggested_monthly_tds_paisa: suggestedMonthlyTdsPaisa,
    further_investment_for_max_rebate_paisa: furtherInvestmentForMaxRebate,
  };
}
