import { prisma } from '@/lib/prisma';
import { toDbDate, fromDbDate } from '@fintrack/shared';

// Returns the last day of a month given YYYY-MM
function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// Clamp due_day to month's last day
function clampDueDay(year: number, month: number, dueDay: number): number {
  return Math.min(dueDay, lastDayOfMonth(year, month));
}

// Parse a YYYY-MM-DD string into { year, month, day }
function parseDateStr(d: string) {
  const [y, m, day] = d.split('-').map(Number);
  return { year: y, month: m, day };
}

// Compare two YYYY-MM strings: -1, 0, 1
function compareYM(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Idempotently creates FixedExpenseInstance rows for the given month.
 * Only creates rows for months up to and including the current calendar month.
 * Future months are served as template-derived placeholders by the GET handler.
 */
export async function ensureInstances(userId: string, month: string): Promise<void> {
  // month is YYYY-MM
  const { year, month: mo } = parseDateStr(month + '-01');

  const templates = await prisma.fixedExpense.findMany({
    where: { userId },
  });

  for (const tmpl of templates) {
    const startMonth = fromDbDate(tmpl.startMonth).slice(0, 7); // YYYY-MM
    const endMonth = tmpl.endMonth ? fromDbDate(tmpl.endMonth).slice(0, 7) : null;

    // If the template was created this month but startMonth was pushed to next month
    // (because due_day had already passed at creation time), include it this month.
    const createdMonth = tmpl.createdAt.toISOString().slice(0, 7);
    const effectiveStart = createdMonth === month && compareYM(startMonth, month) > 0 ? month : startMonth;

    // Skip if this month is before the template's effective start
    if (compareYM(month, effectiveStart) < 0) continue;
    // Skip if this month is after the template's end
    if (endMonth && compareYM(month, endMonth) > 0) continue;

    const dueDay = clampDueDay(year, mo, tmpl.dueDay);
    const dueDateStr = `${month}-${String(dueDay).padStart(2, '0')}`;

    // Upsert — unique by (fixedExpenseId, month)
    await prisma.fixedExpenseInstance.upsert({
      where: {
        fixedExpenseId_month: {
          fixedExpenseId: tmpl.id,
          month: toDbDate(month + '-01'),
        },
      },
      create: {
        userId,
        fixedExpenseId: tmpl.id,
        month: toDbDate(month + '-01'),
        dueDate: toDbDate(dueDateStr),
        standardAmountPaisa: tmpl.standardAmountPaisa,
      },
      update: {}, // existing rows are not overwritten
    });
  }
}

/**
 * When a template's standard amount changes, update the PENDING instance
 * for the current month only. Past and paid instances are untouched.
 */
export async function updatePendingInstanceAmount(
  templateId: string,
  currentMonth: string,
  newAmountPaisa: bigint,
): Promise<void> {
  await prisma.fixedExpenseInstance.updateMany({
    where: {
      fixedExpenseId: templateId,
      month: toDbDate(currentMonth + '-01'),
      status: 'PENDING',
    },
    data: { standardAmountPaisa: newAmountPaisa },
  });
}

export type InstanceStatus = 'PENDING' | 'PAID' | 'SKIPPED' | 'DUE_SOON' | 'OVERDUE' | 'FUTURE';

/**
 * Compute display status for an instance based on its stored status and due date.
 * "today" is passed so tests can inject a fixed date.
 */
export function computeDisplayStatus(
  storedStatus: 'PENDING' | 'PAID' | 'SKIPPED',
  dueDate: string, // YYYY-MM-DD
  today: string,   // YYYY-MM-DD
): InstanceStatus {
  if (storedStatus === 'PAID') return 'PAID';
  if (storedStatus === 'SKIPPED') return 'SKIPPED';

  const due = new Date(dueDate);
  const now = new Date(today);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'OVERDUE';
  if (diffDays <= 3) return 'DUE_SOON';
  return 'PENDING';
}
