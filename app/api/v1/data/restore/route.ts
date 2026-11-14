import { getAuthUser, AuthError } from '@/lib/auth';
import { restoreFromExport, countExportRecords } from '@/lib/services/restore-service';

export async function POST(req: Request) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try {
    user = await getAuthUser(req);
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message, code: err.code }, { status: err.status });
    }
    throw err;
  }

  let payload: unknown;
  const contentType = req.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData().catch(() => null);
    if (!form) return Response.json({ error: 'Invalid form data', code: 'INVALID_BODY' }, { status: 422 });
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return Response.json({ error: 'No file uploaded', code: 'MISSING_FILE' }, { status: 422 });
    }
    const text = await (file as File).text().catch(() => null);
    if (!text) return Response.json({ error: 'Could not read file', code: 'INVALID_FILE' }, { status: 422 });
    try {
      payload = JSON.parse(text);
    } catch {
      return Response.json({ error: 'File is not valid JSON', code: 'INVALID_JSON' }, { status: 422 });
    }
  } else {
    payload = await req.json().catch(() => null);
    if (!payload) return Response.json({ error: 'Invalid JSON body', code: 'INVALID_JSON' }, { status: 422 });
  }

  if (
    !payload ||
    typeof payload !== 'object' ||
    !(payload as Record<string, unknown>).schema_version
  ) {
    return Response.json(
      { error: 'Invalid export file: missing schema_version', code: 'INVALID_EXPORT' },
      { status: 422 },
    );
  }

  const totalInFile = countExportRecords(payload as Record<string, unknown>);

  let summary;
  try {
    summary = await restoreFromExport(user.id, payload);
  } catch (err) {
    return Response.json(
      { error: (err as Error).message, code: 'RESTORE_ERROR' },
      { status: 422 },
    );
  }

  return Response.json({
    ok: true,
    total_in_file: totalInFile,
    restored: summary.total,
    summary: {
      categories: summary.categories,
      savings_accounts: summary.savingsAccounts,
      loan_persons: summary.loanPersons,
      transactions: summary.transactions,
      loan_entries: summary.loanEntries,
      income_entries: summary.incomeEntries,
      holiday_support_entries: summary.holidaySupportEntries,
      tax_years: summary.taxYears,
      tax_investments: summary.taxInvestments,
    },
    errors: summary.errors,
  });
}
