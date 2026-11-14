import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser, AuthError } from '@/lib/auth';
import { currentFY } from '@/lib/services/tax';

// Static checklist items — these are the same for all users per fiscal year.
// Late-filing surcharge details are pending ticket 24 and shown as a placeholder.
const CHECKLIST_ITEMS = [
  { id: 'tin', label: 'Download TIN certificate', mandatory: true },
  { id: 'salary_cert', label: 'Collect salary certificate from employer', mandatory: true },
  { id: 'bank_statements', label: 'Collect bank statements for all accounts', mandatory: true },
  { id: 'tds_challans', label: 'Collect TDS challans (if any tax was deducted)', mandatory: false },
  { id: 'investment_proof', label: 'Collect investment proof (DPS passbook, Sanchaypatra certificate, insurance receipt)', mandatory: false },
  { id: 'file_by_sep30', label: 'File by 30 September for the early-filing rebate', deadline: true, deadline_date: null },
  { id: 'late_surcharge', label: 'Note: late-filing surcharge applies after 30 September (details pending — see ticket 24)', mandatory: false, pending_confirmation: true },
];

async function getOrCreateTaxYear(userId: string, year: string) {
  return prisma.taxYear.upsert({
    where: { userId_fiscalYear: { userId, fiscalYear: year } },
    create: {
      userId,
      fiscalYear: year,
      configJson: {},
      checklistItemsJson: [],
    },
    update: {},
  });
}

export async function GET(req: Request) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try {
    user = await getAuthUser(req);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const url = new URL(req.url);
  const year = url.searchParams.get('year') ?? currentFY();

  const taxYear = await prisma.taxYear.findUnique({
    where: { userId_fiscalYear: { userId: user.id, fiscalYear: year } },
    select: { checklistItemsJson: true },
  });

  const checkedIds = Array.isArray(taxYear?.checklistItemsJson) ? (taxYear.checklistItemsJson as string[]) : [];

  return Response.json({
    fiscal_year: year,
    items: CHECKLIST_ITEMS,
    checked_ids: checkedIds,
  });
}

const patchSchema = z.object({
  year: z.string().optional(),
  checked_ids: z.array(z.string()),
});

export async function PATCH(req: Request) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try {
    user = await getAuthUser(req);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const body = await req.json().catch(() => null);
  const r = patchSchema.safeParse(body);
  if (!r.success) {
    return Response.json({ error: 'Validation failed', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  const year = r.data.year ?? currentFY();
  const validIds = new Set(CHECKLIST_ITEMS.map((i) => i.id));
  const checkedIds = r.data.checked_ids.filter((id) => validIds.has(id));

  await prisma.taxYear.upsert({
    where: { userId_fiscalYear: { userId: user.id, fiscalYear: year } },
    create: {
      userId: user.id,
      fiscalYear: year,
      configJson: {},
      checklistItemsJson: checkedIds,
    },
    update: { checklistItemsJson: checkedIds },
  });

  return Response.json({
    fiscal_year: year,
    items: CHECKLIST_ITEMS,
    checked_ids: checkedIds,
  });
}
