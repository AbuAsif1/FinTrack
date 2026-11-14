import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser, AuthError } from '@/lib/auth';

interface NotificationPrefs {
  fixed_expenses_due: boolean;
  overdue_loans: boolean;
  savings_maturity: boolean;
  budget_exceeded: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  fixed_expenses_due: true,
  overdue_loans: true,
  savings_maturity: true,
  budget_exceeded: false,
};

function mergeWithDefaults(json: unknown): NotificationPrefs {
  if (!json || typeof json !== 'object') return { ...DEFAULT_PREFS };
  const p = json as Partial<NotificationPrefs>;
  return {
    fixed_expenses_due: p.fixed_expenses_due ?? DEFAULT_PREFS.fixed_expenses_due,
    overdue_loans: p.overdue_loans ?? DEFAULT_PREFS.overdue_loans,
    savings_maturity: p.savings_maturity ?? DEFAULT_PREFS.savings_maturity,
    budget_exceeded: p.budget_exceeded ?? DEFAULT_PREFS.budget_exceeded,
  };
}

export async function GET(req: Request) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try {
    user = await getAuthUser(req);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { notificationPrefsJson: true },
  });

  return Response.json(mergeWithDefaults(record?.notificationPrefsJson));
}

const patchSchema = z.object({
  fixed_expenses_due: z.boolean().optional(),
  overdue_loans: z.boolean().optional(),
  savings_maturity: z.boolean().optional(),
  budget_exceeded: z.boolean().optional(),
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

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { notificationPrefsJson: true },
  });
  const current = mergeWithDefaults(record?.notificationPrefsJson);
  const updated: NotificationPrefs = {
    fixed_expenses_due: r.data.fixed_expenses_due ?? current.fixed_expenses_due,
    overdue_loans: r.data.overdue_loans ?? current.overdue_loans,
    savings_maturity: r.data.savings_maturity ?? current.savings_maturity,
    budget_exceeded: r.data.budget_exceeded ?? current.budget_exceeded,
  };

  await prisma.user.update({
    where: { id: user.id },
    data: { notificationPrefsJson: updated as unknown as Record<string, boolean> },
  });

  return Response.json(updated);
}
