import { getAuthUser, AuthError } from '@/lib/auth';
import { buildTaxInput, currentFY } from '@/lib/services/tax';
import { calculateTax } from '@fintrack/tax-engine';

export async function GET(req: Request) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try {
    user = await getAuthUser(req);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const url = new URL(req.url);
  const year = url.searchParams.get('year') ?? currentFY();
  const additionalInvestment = Math.max(0, parseInt(url.searchParams.get('additional_investment') ?? '0', 10));

  const baseInput = await buildTaxInput(user.id, year);
  const baseResult = calculateTax(baseInput);

  // Hypothetical: add additional investment to 'dps' (most common tax-exempt instrument)
  const hypotheticalInput = {
    ...baseInput,
    investments: {
      ...baseInput.investments,
      dps: (baseInput.investments.dps ?? 0) + additionalInvestment,
    },
  };
  const hypotheticalResult = calculateTax(hypotheticalInput);

  const taxSaved = Math.max(0, baseResult.net_tax_payable_paisa - hypotheticalResult.net_tax_payable_paisa);
  const remainingCeiling = Math.max(0, baseResult.further_investment_for_max_rebate_paisa);

  return Response.json({
    current_net_tax_paisa: baseResult.net_tax_payable_paisa,
    current_rebate_paisa: baseResult.tax_rebate_paisa,
    current_eligible_investment_paisa: baseResult.eligible_investment_paisa,
    hypothetical_net_tax_paisa: hypotheticalResult.net_tax_payable_paisa,
    hypothetical_rebate_paisa: hypotheticalResult.tax_rebate_paisa,
    tax_saved_paisa: taxSaved,
    remaining_ceiling_paisa: remainingCeiling,
    additional_investment_paisa: additionalInvestment,
    fiscal_year: year,
  });
}
