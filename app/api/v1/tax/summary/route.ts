import { getAuthUser } from '@/lib/auth';
import { buildTaxInput, currentFY } from '@/lib/services/tax';
import { calculateTax } from '@fintrack/tax-engine';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const url = new URL(req.url);
  const fy = url.searchParams.get('fiscal_year') ?? currentFY();

  // A filed year returns its stored snapshot
  const taxYear = await prisma.taxYear.findUnique({
    where: { userId_fiscalYear: { userId: user.id, fiscalYear: fy } },
  });
  if (taxYear?.isLocked && taxYear.filedResultJson) {
    const snapshot = taxYear.filedResultJson as Record<string, unknown>;
    return Response.json({
      ...snapshot,
      is_provisional: false,
      is_locked: true,
      filed_on: taxYear.filedOn?.toISOString().slice(0, 10) ?? null,
    });
  }

  const input = await buildTaxInput(user.id, fy);
  const result = calculateTax(input);

  const tyRow = await prisma.taxYear.findUnique({
    where: { userId_fiscalYear: { userId: user.id, fiscalYear: fy } },
  });

  return Response.json({
    ...result,
    is_provisional: !tyRow?.configConfirmedAt,
    is_locked: tyRow?.isLocked ?? false,
    filed_on: tyRow?.filedOn?.toISOString().slice(0, 10) ?? null,
  });
}
