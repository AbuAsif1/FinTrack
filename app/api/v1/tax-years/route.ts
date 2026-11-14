import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { serializeTaxYear } from '@/lib/services/tax';

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const years = await prisma.taxYear.findMany({
    where: { userId: user.id },
    orderBy: { fiscalYear: 'desc' },
  });

  return Response.json(years.map(serializeTaxYear));
}
