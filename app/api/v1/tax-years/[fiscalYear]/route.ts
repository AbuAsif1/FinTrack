import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ensureTaxYear, serializeTaxYear } from '@/lib/services/tax';
import { taxYearConfigSchema } from '@fintrack/shared';

export async function GET(req: Request, { params }: { params: { fiscalYear: string } }) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const fy = params.fiscalYear;
  const taxYear = await ensureTaxYear(user.id, fy);
  return Response.json(serializeTaxYear(taxYear));
}

export async function PUT(req: Request, { params }: { params: { fiscalYear: string } }) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const fy = params.fiscalYear;
  const existing = await prisma.taxYear.findUnique({
    where: { userId_fiscalYear: { userId: user.id, fiscalYear: fy } },
  });
  if (existing?.isLocked) {
    return Response.json({ error: 'Fiscal year is locked', code: 'TAX_YEAR_LOCKED' }, { status: 409 });
  }

  const body = await req.json();
  const parsed = taxYearConfigSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid config', code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 422 });
  }

  const taxYear = await prisma.taxYear.upsert({
    where: { userId_fiscalYear: { userId: user.id, fiscalYear: fy } },
    create: {
      userId: user.id,
      fiscalYear: fy,
      configJson: parsed.data as object,
      configConfirmedAt: null,
    },
    update: {
      configJson: parsed.data as object,
      configConfirmedAt: null, // any change clears confirmation
    },
  });

  return Response.json(serializeTaxYear(taxYear));
}
