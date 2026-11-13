import { IncomeType } from '@fintrack/shared';
import { calculateTax } from './calculate-tax';
import type { TaxInput, TaxResult, TaxIncomeEntry } from './calculate-tax';

export function forecastTax(input: TaxInput): TaxResult {
  const { fiscalYear, incomeEntries } = input;

  const fyStartYear = parseInt(fiscalYear.split('-')[0], 10);

  // All 12 FY months (Jul–Jun)
  const allFyMonths: string[] = [];
  for (let m = 7; m <= 12; m++) {
    allFyMonths.push(`${fyStartYear}-${String(m).padStart(2, '0')}`);
  }
  for (let m = 1; m <= 6; m++) {
    allFyMonths.push(`${fyStartYear + 1}-${String(m).padStart(2, '0')}`);
  }

  const salaryEntries = incomeEntries.filter((e) => e.income_type === IncomeType.SALARY);
  const nonSalaryEntries = incomeEntries.filter((e) => e.income_type !== IncomeType.SALARY);

  // If no salary entered yet, return actual data as-is (nothing to project)
  if (salaryEntries.length === 0) {
    return { ...calculateTax(input), is_projection: true };
  }

  // Average salary across all entered months (1 entry → use that; 2+ → average)
  const avgGross = Math.round(
    salaryEntries.reduce((s, e) => s + e.gross_paisa, 0) / salaryEntries.length,
  );
  const avgTds = Math.round(
    salaryEntries.reduce((s, e) => s + e.tds_paisa, 0) / salaryEntries.length,
  );

  // Project the avg salary across all 12 FY months
  const projectedSalary: TaxIncomeEntry[] = allFyMonths.map((month) => ({
    month: `${month}-01`,
    income_type: IncomeType.SALARY,
    gross_paisa: avgGross,
    tds_paisa: avgTds,
    is_taxable: true,
  }));

  // Keep actual non-salary entries (bonuses, etc.) — don't project one-off income
  const result = calculateTax({
    ...input,
    incomeEntries: [...projectedSalary, ...nonSalaryEntries],
  });

  return { ...result, is_projection: true };
}
