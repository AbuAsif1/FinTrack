import { prisma } from '@/lib/prisma';
import { authenticate } from '@/lib/auth';
import { serializeTaxYear } from '@/lib/services/tax';

export async function GET(req: Request) {
  const user = await authenticate(req);
  if (user instanceof Response) return user;

  const years = await prisma.taxYear.findMany({
    where: { userId: user.id },
    orderBy: { fiscalYear: 'desc' },
  });

  return Response.json(years.map(serializeTaxYear));
}
