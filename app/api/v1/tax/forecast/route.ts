import { authenticate } from '@/lib/auth';
import { buildTaxInput, currentFY } from '@/lib/services/tax';
import { forecastTax } from '@fintrack/tax-engine';

export async function GET(req: Request) {
  const user = await authenticate(req);
  if (user instanceof Response) return user;

  const url = new URL(req.url);
  const fy = url.searchParams.get('fiscal_year') ?? currentFY();

  const input = await buildTaxInput(user.id, fy);
  const result = forecastTax(input);

  return Response.json({ ...result, is_projection: true });
}
