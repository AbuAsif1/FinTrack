import { prisma } from '@/lib/prisma';
import { todayInDhaka, fromDbDate } from '@fintrack/shared';

/**
 * Recompute and upsert notification records for the user.
 * Idempotent — repeated calls create no duplicates; resolved alerts get resolved_at set.
 */
export async function refreshNotifications(userId: string): Promise<void> {
  const today = todayInDhaka();
  const now = new Date();

  const activeKeys = new Set<string>();

  // 1. FIXED_DUE_SOON and FIXED_OVERDUE
  const pendingInstances = await prisma.fixedExpenseInstance.findMany({
    where: { userId, status: 'PENDING' },
    include: { fixedExpense: { select: { name: true } } },
  });

  for (const inst of pendingInstances) {
    const dueDate = fromDbDate(inst.dueDate).slice(0, 10);
    const diffDays = Math.floor((new Date(dueDate).getTime() - new Date(today).getTime()) / 86400000);

    if (diffDays < 0) {
      const key = `FIXED_OVERDUE:${inst.id}`;
      activeKeys.add(key);
      await prisma.notification.upsert({
        where: { userId_dedupeKey: { userId, dedupeKey: key } },
        create: {
          userId, type: 'FIXED_OVERDUE',
          message: `${inst.fixedExpense.name} overdue (due ${dueDate})`,
          entityType: 'FixedExpenseInstance', entityId: inst.id,
          dedupeKey: key,
        },
        update: { resolvedAt: null },
      });
    } else if (diffDays <= 3) {
      const key = `FIXED_DUE_SOON:${inst.id}`;
      activeKeys.add(key);
      await prisma.notification.upsert({
        where: { userId_dedupeKey: { userId, dedupeKey: key } },
        create: {
          userId, type: 'FIXED_DUE_SOON',
          message: `${inst.fixedExpense.name} due in ${diffDays === 0 ? 'today' : `${diffDays} day${diffDays > 1 ? 's' : ''}`}`,
          entityType: 'FixedExpenseInstance', entityId: inst.id,
          dedupeKey: key,
        },
        update: { resolvedAt: null },
      });
    }
  }

  // 2. LOAN_RETURN_DUE_SOON and LOAN_RETURN_OVERDUE
  const loanEntries = await prisma.loanEntry.findMany({
    where: { userId, returnDueDate: { not: null } },
    include: {
      transaction: { select: { id: true, amountPaisa: true, categoryId: true, date: true, isDeleted: true } },
      loanPerson: { select: { id: true, name: true } },
    },
  });

  // Get latest settlement per person
  const settlements = await prisma.loanEntry.findMany({
    where: { userId, isSettlement: true },
    include: { transaction: { select: { date: true } } },
  });
  const latestSettlementDate: Record<string, Date> = {};
  for (const s of settlements) {
    if (s.transaction?.date) {
      const existing = latestSettlementDate[s.loanPersonId];
      if (!existing || s.transaction.date > existing) {
        latestSettlementDate[s.loanPersonId] = s.transaction.date;
      }
    }
  }

  for (const entry of loanEntries) {
    if (!entry.returnDueDate) continue;
    if (!entry.transaction || entry.transaction.isDeleted) continue;

    const latestSettle = latestSettlementDate[entry.loanPersonId];
    if (latestSettle && entry.transaction.date <= latestSettle) continue;

    const dueDate = fromDbDate(entry.returnDueDate).slice(0, 10);
    const diffDays = Math.floor((new Date(dueDate).getTime() - new Date(today).getTime()) / 86400000);

    // Check running balance for person still non-zero
    const given = await prisma.transaction.aggregate({
      where: { userId, isDeleted: false, loanEntry: { loanPersonId: entry.loanPersonId, direction: 'GIVEN' } },
      _sum: { amountPaisa: true },
    });
    const received = await prisma.transaction.aggregate({
      where: { userId, isDeleted: false, loanEntry: { loanPersonId: entry.loanPersonId, direction: 'RECEIVED' } },
      _sum: { amountPaisa: true },
    });
    const balance = Number(given._sum.amountPaisa ?? 0) - Number(received._sum.amountPaisa ?? 0);
    if (balance === 0) continue;

    if (diffDays < 0) {
      const key = `LOAN_RETURN_OVERDUE:${entry.id}`;
      activeKeys.add(key);
      await prisma.notification.upsert({
        where: { userId_dedupeKey: { userId, dedupeKey: key } },
        create: {
          userId, type: 'LOAN_RETURN_OVERDUE',
          message: `Loan to ${entry.loanPerson.name} overdue (due ${dueDate})`,
          entityType: 'LoanEntry', entityId: entry.id,
          dedupeKey: key,
        },
        update: { resolvedAt: null },
      });
    } else if (diffDays <= 3) {
      const key = `LOAN_RETURN_DUE_SOON:${entry.id}`;
      activeKeys.add(key);
      await prisma.notification.upsert({
        where: { userId_dedupeKey: { userId, dedupeKey: key } },
        create: {
          userId, type: 'LOAN_RETURN_DUE_SOON',
          message: `Loan to ${entry.loanPerson.name} due in ${diffDays === 0 ? 'today' : `${diffDays} day${diffDays > 1 ? 's' : ''}`}`,
          entityType: 'LoanEntry', entityId: entry.id,
          dedupeKey: key,
        },
        update: { resolvedAt: null },
      });
    }
  }

  // 3. BUDGET_80 and BUDGET_EXCEEDED
  const currentMonth = today.slice(0, 7);
  const monthStart = new Date(`${currentMonth}-01`);
  const nextMonthDate = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

  const budgets = await prisma.budget.findMany({
    where: { userId, monthlyLimitPaisa: { not: null } },
    orderBy: { effectiveFromMonth: 'desc' },
  });

  // For each category, pick the latest effective budget row for or before currentMonth
  const latestBudgetByCategory: Record<string, { categoryId: string; monthlyLimitPaisa: bigint }> = {};
  for (const b of budgets) {
    const bMonth = fromDbDate(b.effectiveFromMonth).slice(0, 7);
    if (bMonth <= currentMonth && !(b.categoryId in latestBudgetByCategory)) {
      latestBudgetByCategory[b.categoryId] = { categoryId: b.categoryId, monthlyLimitPaisa: b.monthlyLimitPaisa! };
    }
  }

  for (const [categoryId, budget] of Object.entries(latestBudgetByCategory)) {
    const spending = await prisma.transaction.aggregate({
      where: {
        userId, isDeleted: false,
        categoryId,
        date: { gte: monthStart, lt: nextMonthDate },
        category: { routingType: 'NONE' },
      },
      _sum: { amountPaisa: true },
    });

    const spent = Number(spending._sum.amountPaisa ?? 0);
    const limit = Number(budget.monthlyLimitPaisa);
    const pct = limit > 0 ? spent / limit : 0;

    const key80 = `BUDGET_80:${categoryId}:${currentMonth}`;
    const keyOver = `BUDGET_EXCEEDED:${categoryId}:${currentMonth}`;

    if (pct >= 1.0) {
      activeKeys.add(keyOver);
      await prisma.notification.upsert({
        where: { userId_dedupeKey: { userId, dedupeKey: keyOver } },
        create: {
          userId, type: 'BUDGET_EXCEEDED',
          message: `Budget exceeded for a category this month (${Math.round(pct * 100)}%)`,
          entityType: 'Category', entityId: categoryId,
          dedupeKey: keyOver,
        },
        update: { resolvedAt: null },
      });
    } else if (pct >= 0.8) {
      activeKeys.add(key80);
      await prisma.notification.upsert({
        where: { userId_dedupeKey: { userId, dedupeKey: key80 } },
        create: {
          userId, type: 'BUDGET_80',
          message: `Budget is at ${Math.round(pct * 100)}% for a category this month`,
          entityType: 'Category', entityId: categoryId,
          dedupeKey: key80,
        },
        update: { resolvedAt: null },
      });
    }
  }

  // 4. TAX_CONFIG_PROVISIONAL — current FY config not confirmed
  const taxYear = today.slice(0, 4);
  const fyStartMonth = parseInt(today.slice(5, 7)) >= 7 ? parseInt(taxYear) : parseInt(taxYear) - 1;
  const currentFY = `${fyStartMonth}-${String(fyStartMonth + 1).slice(2)}`;

  const taxYearRow = await prisma.taxYear.findFirst({
    where: { userId, fiscalYear: currentFY },
  });

  const taxKey = `TAX_CONFIG_PROVISIONAL:${currentFY}`;
  if (taxYearRow && taxYearRow.configConfirmedAt === null) {
    activeKeys.add(taxKey);
    await prisma.notification.upsert({
      where: { userId_dedupeKey: { userId, dedupeKey: taxKey } },
      create: {
        userId, type: 'TAX_CONFIG_PROVISIONAL',
        message: `Tax configuration for ${currentFY} is provisional and not yet confirmed`,
        entityType: 'TaxYear', entityId: currentFY,
        dedupeKey: taxKey,
      },
      update: { resolvedAt: null },
    });
  }

  // Resolve alerts that no longer apply
  const unresolvedNotifs = await prisma.notification.findMany({
    where: { userId, resolvedAt: null },
  });
  for (const notif of unresolvedNotifs) {
    if (!activeKeys.has(notif.dedupeKey)) {
      await prisma.notification.update({
        where: { id: notif.id },
        data: { resolvedAt: now },
      });
    }
  }
}
