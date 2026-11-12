import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { toDbDate, fromDbDate, todayInDhaka } from '@fintrack/shared';
import { ensureInstances, computeDisplayStatus } from '@/lib/services/fixed-expenses';

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function clampDueDay(year: number, month: number, dueDay: number): number {
  return Math.min(dueDay, lastDayOfMonth(year, month));
}

function instanceToJson(
  inst: {
    id: string;
    fixedExpenseId: string;
    month: Date;
    dueDate: Date;
    standardAmountPaisa: bigint;
    status: string;
    actualAmountPaisa: bigint | null;
    paidDate: Date | null;
    transactionId: string | null;
    note: string | null;
  },
  today: string,
  templateName?: string,
  categoryName?: string,
  savingsAccountId?: string | null,
) {
  const dueDateStr = fromDbDate(inst.dueDate).slice(0, 10);
  const displayStatus = computeDisplayStatus(inst.status as 'PENDING' | 'PAID' | 'SKIPPED', dueDateStr, today);
  return {
    id: inst.id,
    fixed_expense_id: inst.fixedExpenseId,
    month: fromDbDate(inst.month).slice(0, 7),
    due_date: dueDateStr,
    standard_amount_paisa: Number(inst.standardAmountPaisa),
    status: displayStatus,
    actual_amount_paisa: inst.actualAmountPaisa != null ? Number(inst.actualAmountPaisa) : null,
    paid_date: inst.paidDate ? fromDbDate(inst.paidDate).slice(0, 10) : null,
    transaction_id: inst.transactionId,
    note: inst.note,
    template_name: templateName,
    category_name: categoryName,
    savings_account_id: savingsAccountId ?? null,
  };
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const url = new URL(req.url);
  const from = url.searchParams.get('from'); // YYYY-MM
  const to = url.searchParams.get('to');     // YYYY-MM

  const today = todayInDhaka();
  const currentMonth = today.slice(0, 7);

  // Default: current month only
  const fromMonth = from ?? currentMonth;
  const toMonth = to ?? currentMonth;

  // Enumerate months from fromMonth to toMonth
  const months: string[] = [];
  let cur = fromMonth;
  while (cur <= toMonth) {
    months.push(cur);
    const [y, m] = cur.split('-').map(Number);
    const next = new Date(y, m, 1);
    cur = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
  }

  // For past and current months, ensure instances exist
  for (const month of months) {
    if (month <= currentMonth) {
      await ensureInstances(user.id, month);
    }
  }

  const templates = await prisma.fixedExpense.findMany({
    where: { userId: user.id },
    include: {
      category: { select: { name: true } },
      savingsAccount: { select: { id: true } },
    },
  });

  const result: ReturnType<typeof instanceToJson>[] = [];

  for (const month of months) {
    if (month <= currentMonth) {
      // Load stored instances for this month
      const instances = await prisma.fixedExpenseInstance.findMany({
        where: {
          userId: user.id,
          month: toDbDate(month + '-01'),
        },
        include: {
          fixedExpense: {
            include: {
              category: { select: { name: true } },
              savingsAccount: { select: { id: true } },
            },
          },
        },
      });

      for (const inst of instances) {
        result.push(instanceToJson(
          inst,
          today,
          inst.fixedExpense.name,
          inst.fixedExpense.category.name,
          inst.fixedExpense.savingsAccountId,
        ));
      }
    } else {
      // Future month: template-derived placeholders (no DB rows)
      const [y, m] = month.split('-').map(Number);
      for (const tmpl of templates) {
        const startMonth = fromDbDate(tmpl.startMonth).slice(0, 7);
        const endMonth = tmpl.endMonth ? fromDbDate(tmpl.endMonth).slice(0, 7) : null;
        if (month < startMonth) continue;
        if (endMonth && month > endMonth) continue;

        const dueDay = clampDueDay(y, m, tmpl.dueDay);
        const dueDateStr = `${month}-${String(dueDay).padStart(2, '0')}`;

        result.push({
          id: `future-${tmpl.id}-${month}`,
          fixed_expense_id: tmpl.id,
          month,
          due_date: dueDateStr,
          standard_amount_paisa: Number(tmpl.standardAmountPaisa),
          status: 'FUTURE',
          actual_amount_paisa: null,
          paid_date: null,
          transaction_id: null,
          note: null,
          template_name: tmpl.name,
          category_name: tmpl.category.name,
          savings_account_id: tmpl.savingsAccountId ?? null,
        });
      }
    }
  }

  return Response.json(result);
}
