import { getAuthUser } from '@/lib/auth';
import { previewImport } from '@/lib/services/import-service';
import type { ImportDataset } from '@prisma/client';

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const MAX_ROWS = 5000;
const VALID_DATASETS: ImportDataset[] = ['INCOME', 'TRANSACTIONS', 'LOAN_ENTRIES'];

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    return Response.json({ error: 'Expected multipart/form-data', code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return Response.json({ error: 'Invalid form data', code: 'VALIDATION_ERROR' }, { status: 400 }); }

  const dataset = formData.get('dataset') as string;
  const file = formData.get('file') as File | null;

  if (!dataset || !VALID_DATASETS.includes(dataset as ImportDataset)) {
    return Response.json({ error: 'Invalid or missing dataset', code: 'VALIDATION_ERROR' }, { status: 400 });
  }
  if (!file) return Response.json({ error: 'No file uploaded', code: 'VALIDATION_ERROR' }, { status: 400 });

  if (file.size > MAX_SIZE) {
    return Response.json({ error: 'File exceeds 2 MB limit', code: 'FILE_TOO_LARGE' }, { status: 422 });
  }

  const csvText = await file.text();
  // Count data rows (lines minus header)
  const lineCount = csvText.replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim()).length - 1;
  if (lineCount > MAX_ROWS) {
    return Response.json({ error: `File exceeds ${MAX_ROWS} row limit`, code: 'TOO_MANY_ROWS' }, { status: 422 });
  }

  const result = await previewImport(user.id, dataset as ImportDataset, file.name, csvText);
  return Response.json(result, { status: 200 });
}
