import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { buildTaxInput, serializeTaxYear } from '@/lib/services/tax';
import { calculateTax } from '@fintrack/tax-engine';

export async function POST(req: Request, { params }: { params: { fiscalYear: string } }) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const fy = params.fiscalYear;

  const existing = await prisma.taxYear.findUnique({
    where: { userId_fiscalYear: { userId: user.id, fiscalYear: fy } },
  });
  if (!existing) {
    return Response.json({ error: 'Tax year not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const filedOn = body.filed_on ?? new Date().toISOString().slice(0, 10);

  // Snapshot the current result
  const input = await buildTaxInput(user.id, fy);
  const snapshot = calculateTax(input);

  const taxYear = await prisma.taxYear.update({
    where: { userId_fiscalYear: { userId: user.id, fiscalYear: fy } },
    data: {
      filedOn: new Date(filedOn),
      filedResultJson: snapshot as object,
      isLocked: true,
    },
  });

  return Response.json(serializeTaxYear(taxYear));
}
