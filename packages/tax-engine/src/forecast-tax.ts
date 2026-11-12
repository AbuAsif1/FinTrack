import { IncomeType } from '@fintrack/shared';
import { calculateTax } from './calculate-tax';
import type { TaxInput, TaxResult, TaxIncomeEntry } from './calculate-tax';

export function forecastTax(input: TaxInput): TaxResult {
  const { fiscalYear, incomeEntries, asOf } = input;

  const fyStartYear = parseInt(fiscalYear.split('-')[0], 10);
  const asOfMonth = asOf.slice(0, 7);

  // All FY months
  const allFyMonths: string[] = [];
  for (let m = 7; m <= 12; m++) {
    allFyMonths.push(`${fyStartYear}-${String(m).padStart(2, '0')}`);
  }
  for (let m = 1; m <= 6; m++) {
    allFyMonths.push(`${fyStartYear + 1}-${String(m).padStart(2, '0')}`);
  }

  // Find the latest Salary entry
  const salaryEntries = incomeEntries.filter((e) => e.income_type === IncomeType.SALARY);
  const latestSalary = salaryEntries.length > 0
    ? salaryEntries.reduce((latest, e) => (e.month > latest.month ? e : latest))
    : null;

  // Months already covered by a Salary entry
  const salaryMonthSet = new Set(salaryEntries.map((e) => e.month.slice(0, 7)));

  // Project one Salary entry for each remaining month in the FY from asOf onwards
  const projected: TaxIncomeEntry[] = [];
  if (latestSalary) {
    for (const month of allFyMonths) {
      if (month < asOfMonth) continue;
      if (!salaryMonthSet.has(month)) {
        projected.push({
          month: `${month}-01`,
          income_type: IncomeType.SALARY,
          gross_paisa: latestSalary.gross_paisa,
          tds_paisa: latestSalary.tds_paisa,
          is_taxable: latestSalary.is_taxable,
        });
      }
    }
  }

  const result = calculateTax({
    ...input,
    incomeEntries: [...incomeEntries, ...projected],
  });

  return { ...result, is_projection: true };
}
