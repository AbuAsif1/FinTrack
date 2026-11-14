import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getAuthUser } from '@/lib/auth';
import { serializeTaxYear } from '@/lib/services/tax';

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

  const taxYear = await prisma.taxYear.update({
    where: { userId_fiscalYear: { userId: user.id, fiscalYear: fy } },
    data: {
      isLocked: false,
      filedOn: null,
      filedResultJson: Prisma.JsonNull,
    },
  });

  return Response.json(serializeTaxYear(taxYear));
}
