import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: { fiscalYear: string } }) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const fy = params.fiscalYear;
  const inv = await prisma.taxInvestment.findUnique({
    where: { userId_fiscalYear: { userId: user.id, fiscalYear: fy } },
  });

  return Response.json({
    fiscal_year: fy,
    stocks_paisa: Number(inv?.stocksPaisa ?? 0),
    insurance_paisa: Number(inv?.insurancePaisa ?? 0),
    others_paisa: Number(inv?.othersPaisa ?? 0),
  });
}

export async function PUT(req: Request, { params }: { params: { fiscalYear: string } }) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const fy = params.fiscalYear;

  // Check FY lock
  const taxYear = await prisma.taxYear.findUnique({
    where: { userId_fiscalYear: { userId: user.id, fiscalYear: fy } },
  });
  if (taxYear?.isLocked) {
    return Response.json({ error: 'Fiscal year is locked', code: 'TAX_YEAR_LOCKED' }, { status: 409 });
  }

  const body = await req.json();
  const { stocks_paisa = 0, insurance_paisa = 0, others_paisa = 0 } = body;

  for (const val of [stocks_paisa, insurance_paisa, others_paisa]) {
    if (typeof val !== 'number' || val < 0 || !Number.isInteger(val)) {
      return Response.json({ error: 'All amounts must be non-negative integers', code: 'VALIDATION_ERROR' }, { status: 422 });
    }
  }

  const inv = await prisma.taxInvestment.upsert({
    where: { userId_fiscalYear: { userId: user.id, fiscalYear: fy } },
    create: {
      userId: user.id,
      fiscalYear: fy,
      stocksPaisa: BigInt(stocks_paisa),
      insurancePaisa: BigInt(insurance_paisa),
      othersPaisa: BigInt(others_paisa),
    },
    update: {
      stocksPaisa: BigInt(stocks_paisa),
      insurancePaisa: BigInt(insurance_paisa),
      othersPaisa: BigInt(others_paisa),
    },
  });

  return Response.json({
    fiscal_year: fy,
    stocks_paisa: Number(inv.stocksPaisa),
    insurance_paisa: Number(inv.insurancePaisa),
    others_paisa: Number(inv.othersPaisa),
  });
}
