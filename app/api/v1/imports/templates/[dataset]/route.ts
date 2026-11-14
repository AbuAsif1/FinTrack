import { getAuthUser } from '@/lib/auth';
import { getTemplate } from '@/lib/services/import-service';
import type { ImportDataset } from '@prisma/client';

const VALID_DATASETS: ImportDataset[] = ['INCOME', 'TRANSACTIONS', 'LOAN_ENTRIES'];

export async function GET(req: Request, { params }: { params: { dataset: string } }) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const { dataset } = params;
  if (!VALID_DATASETS.includes(dataset as ImportDataset)) {
    return Response.json({ error: 'Invalid dataset', code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const csv = getTemplate(dataset as ImportDataset);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${dataset.toLowerCase()}_template.csv"`,
    },
  });
}
