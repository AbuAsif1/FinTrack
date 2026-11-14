import { getAuthUser } from '@/lib/auth';
import { buildTaxInput, currentFY } from '@/lib/services/tax';
import { calculateTax } from '@fintrack/tax-engine';

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const url = new URL(req.url);
  const fy = url.searchParams.get('fiscal_year') ?? currentFY();

  // Build this year with its own settings
  const thisYearInput = await buildTaxInput(user.id, fy);
  const thisYearResult = calculateTax(thisYearInput);

  // Build this year's income under last year's settings (if a previous year exists)
  const prevFyParts = fy.split('-');
  const prevFyStart = parseInt(prevFyParts[0], 10) - 1;
  const prevFy = `${prevFyStart}-${String(prevFyStart + 1).slice(2)}`;

  let thisIncomeLastYearConfig = null;
  let lastYearResult = null;

  try {
    const prevYearInput = await buildTaxInput(user.id, prevFy);
    lastYearResult = calculateTax(prevYearInput);

    // This year's income under last year's config
    thisIncomeLastYearConfig = calculateTax({
      ...thisYearInput,
      config: prevYearInput.config,
      fiscalYear: fy,
    });
  } catch {
    // No previous year — omit comparison columns
  }

  return Response.json({
    this_year: thisYearResult,
    this_year_under_last_year_config: thisIncomeLastYearConfig,
    last_year: lastYearResult,
  });
}
