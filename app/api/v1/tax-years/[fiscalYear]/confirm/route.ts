import { prisma } from '@/lib/prisma';
import { authenticate } from '@/lib/auth';
import { ensureTaxYear, serializeTaxYear } from '@/lib/services/tax';

export async function POST(req: Request, { params }: { params: { fiscalYear: string } }) {
  const user = await authenticate(req);
  if (user instanceof Response) return user;

  const fy = params.fiscalYear;
  await ensureTaxYear(user.id, fy);

  const taxYear = await prisma.taxYear.update({
    where: { userId_fiscalYear: { userId: user.id, fiscalYear: fy } },
    data: { configConfirmedAt: new Date() },
  });

  return Response.json(serializeTaxYear(taxYear));
}
