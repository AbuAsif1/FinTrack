import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureInstances } from '@/lib/services/fixed-expenses';
import { refreshNotifications } from '@/lib/services/notifications';
import { buildTaxInput, currentFY } from '@/lib/services/tax';
import { netWorthPaisa } from '@/lib/services/accounts';
import {
  inHandIncome,
  totalSpending,
  taxPayments as taxPaymentsFn,
  fixedCommitments,
  remainingToSpend,
  spendingByCategory,
  monthlyTrend,
} from '@/lib/queries/derived';
import { forecastTax } from '@fintrack/tax-engine';
import { todayInDhaka, fromDbDate } from '@fintrack/shared';

function parseDateParam(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function currentMonth(): string {
  return todayInDhaka().slice(0, 7);
}

function sixMonthsAgo(): string {
  const today = todayInDhaka();
  const [y, m] = today.split('-').map(Number);
  const d = new Date(y, m - 7, 1); // 6 months back
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const url = new URL(req.url);
  const today = todayInDhaka();
  const cm = currentMonth();

  // Parse period params (defaults: start of current month to today)
  const fromStr = url.searchParams.get('from');
  const toStr = url.searchParams.get('to');
  const fromDate = parseDateParam(fromStr) ?? new Date(`${cm}-01`);
  const toDate = parseDateParam(toStr) ?? new Date(today);
  // toDate is exclusive in queries — add 1 day
  const toExclusive = new Date(toDate.getTime() + 86400000);

  // Run idempotent generation
  await Promise.all([
    ensureInstances(user.id, cm),
    refreshNotifications(user.id),
  ]);

  // ── Period tiles ─────────────────────────────────────────────────────────
  const [income, spending, taxPaid] = await Promise.all([
    inHandIncome(user.id, fromDate, toExclusive),
    totalSpending(user.id, fromDate, toExclusive),
    taxPaymentsFn(user.id, fromDate, toExclusive),
  ]);
  const netSavings = income - spending - taxPaid;
  const savingsRate = income > 0 ? Math.round((netSavings / income) * 10000) : null;

  // Previous period of equal length for change indicators
  const periodMs = toExclusive.getTime() - fromDate.getTime();
  const prevFrom = new Date(fromDate.getTime() - periodMs);
  const prevTo = new Date(fromDate.getTime());
  const [prevIncome, prevSpending, prevTaxPaid] = await Promise.all([
    inHandIncome(user.id, prevFrom, prevTo),
    totalSpending(user.id, prevFrom, prevTo),
    taxPaymentsFn(user.id, prevFrom, prevTo),
  ]);
  const prevNetSavings = prevIncome - prevSpending - prevTaxPaid;
  const prevSavingsRate = prevIncome > 0 ? Math.round((prevNetSavings / prevIncome) * 10000) : null;

  // Sub-item C: show change indicators only when prior period has real data
  const hasPriorPeriodData = prevIncome > 0 || prevSpending > 0;

  const tiles = {
    in_hand_income_paisa: income,
    in_hand_income_change_paisa: hasPriorPeriodData ? income - prevIncome : null,
    total_spending_paisa: spending,
    total_spending_change_paisa: hasPriorPeriodData ? spending - prevSpending : null,
    net_savings_paisa: netSavings,
    net_savings_change_paisa: hasPriorPeriodData ? netSavings - prevNetSavings : null,
    savings_rate_bps: savingsRate,
    savings_rate_change_bps: hasPriorPeriodData && prevSavingsRate !== null && savingsRate !== null ? savingsRate - prevSavingsRate : null,
    has_prior_period_data: hasPriorPeriodData,
  };

  // ── Current month panel ───────────────────────────────────────────────────
  const [fc, remaining] = await Promise.all([
    fixedCommitments(user.id, cm),
    remainingToSpend(user.id, cm),
  ]);
  const cmIncome = await inHandIncome(user.id, new Date(`${cm}-01`), new Date(new Date(`${cm}-01`).getFullYear(), new Date(`${cm}-01`).getMonth() + 1, 1));
  const discretionaryCash = cmIncome - fc;

  const currentMonthPanel = {
    month: cm,
    fixed_commitments_paisa: fc,
    discretionary_cash_paisa: discretionaryCash,
    remaining_to_spend_paisa: remaining.paisa,
    income_is_estimated: remaining.income_is_estimated,
  };

  // ── Spending by category ──────────────────────────────────────────────────
  const categorySpending = await spendingByCategory(user.id, fromDate, toExclusive);

  // ── 6-month income vs spending ────────────────────────────────────────────
  const trend = await monthlyTrend(user.id, sixMonthsAgo(), cm);

  // ── Fixed Expense instances this month ────────────────────────────────────
  const instances = await prisma.fixedExpenseInstance.findMany({
    where: { userId: user.id, month: new Date(`${cm}-01`) },
    include: { fixedExpense: { select: { name: true, category: { select: { name: true } } } } },
    orderBy: { dueDate: 'asc' },
  });
  const todayDate = new Date(today);
  const fixedExpensePanel = instances.map((inst) => {
    const dueDate = fromDbDate(inst.dueDate);
    const dueSoon = inst.status === 'PENDING' && inst.dueDate >= todayDate && inst.dueDate <= new Date(todayDate.getTime() + 3 * 86400000);
    const overdue = inst.status === 'PENDING' && inst.dueDate < todayDate;
    return {
      id: inst.id,
      name: inst.fixedExpense.name,
      category: inst.fixedExpense.category.name,
      status: inst.status,
      standard_amount_paisa: Number(inst.standardAmountPaisa),
      actual_amount_paisa: inst.actualAmountPaisa !== null ? Number(inst.actualAmountPaisa) : null,
      due_date: dueDate.slice(0, 10),
      is_due_soon: dueSoon,
      is_overdue: overdue,
    };
  });

  // ── Last 10 transactions ───────────────────────────────────────────────────
  const recentTxs = await prisma.transaction.findMany({
    where: { userId: user.id, isDeleted: false },
    orderBy: { date: 'desc' },
    take: 10,
    select: {
      id: true,
      date: true,
      amountPaisa: true,
      description: true,
      type: true,
      category: { select: { name: true } },
    },
  });
  const recentTransactions = recentTxs.map((tx) => ({
    id: tx.id,
    date: fromDbDate(tx.date).slice(0, 10),
    amount_paisa: Number(tx.amountPaisa),
    description: tx.description,
    type: tx.type,
    category_name: tx.category?.name ?? null,
  }));

  // ── Loan summary ──────────────────────────────────────────────────────────
  const loanPersons = await prisma.loanPerson.findMany({ where: { userId: user.id } });
  let owedToMe = 0;
  let iOwe = 0;
  await Promise.all(loanPersons.map(async (person) => {
    const [givenAgg, receivedAgg] = await Promise.all([
      prisma.transaction.aggregate({ where: { userId: user.id, isDeleted: false, type: 'LOAN_GIVEN', loanEntry: { loanPersonId: person.id } }, _sum: { amountPaisa: true } }),
      prisma.transaction.aggregate({ where: { userId: user.id, isDeleted: false, type: 'LOAN_RECEIVED', loanEntry: { loanPersonId: person.id } }, _sum: { amountPaisa: true } }),
    ]);
    const balance = Number(givenAgg._sum.amountPaisa ?? 0) - Number(receivedAgg._sum.amountPaisa ?? 0);
    if (balance > 0) owedToMe += balance;
    else if (balance < 0) iOwe += Math.abs(balance);
  }));
  const loanSummary = { owed_to_me_paisa: owedToMe, i_owe_paisa: iOwe, net_paisa: owedToMe - iOwe };

  // ── Tax snapshot for current FY ───────────────────────────────────────────
  const fy = currentFY();
  const taxInput = await buildTaxInput(user.id, fy);
  const taxResult = forecastTax(taxInput);
  const taxYear = await prisma.taxYear.findUnique({
    where: { userId_fiscalYear: { userId: user.id, fiscalYear: fy } },
  });
  const taxSnapshot = {
    fiscal_year: fy,
    tax_paid_paisa: taxResult.tax_paid_paisa,
    remaining_tax_paisa: taxResult.remaining_tax_paisa,
    suggested_monthly_tds_paisa: taxResult.suggested_monthly_tds_paisa,
    is_provisional: !taxYear?.configConfirmedAt,
  };

  // ── Unread notification count ─────────────────────────────────────────────
  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, isRead: false, resolvedAt: null },
  });

  // ── Upcoming events (sub-item H): loan returns + savings maturity ─────────
  const thirtyDaysFromNow = new Date(todayDate.getTime() + 30 * 86400000);
  const [upcomingLoans, upcomingSavings] = await Promise.all([
    prisma.loanEntry.findMany({
      where: {
        userId: user.id,
        returnDueDate: { gte: todayDate, lte: thirtyDaysFromNow },
        isSettlement: false,
        transaction: { isDeleted: false },
      },
      include: {
        loanPerson: { select: { name: true } },
        transaction: { select: { amountPaisa: true } },
      },
      orderBy: { returnDueDate: 'asc' },
    }),
    prisma.savingsAccount.findMany({
      where: {
        userId: user.id,
        closedOn: null,
        maturityDate: { gte: todayDate, lte: thirtyDaysFromNow },
      },
      select: { id: true, name: true, bankName: true, maturityDate: true, openingBalancePaisa: true },
      orderBy: { maturityDate: 'asc' },
    }),
  ]);
  const upcomingEvents = [
    ...upcomingLoans.map((e) => ({
      type: 'loan_return_due',
      date: fromDbDate(e.returnDueDate!).slice(0, 10),
      label: `${e.loanPerson.name} loan return due`,
      amount_paisa: Number(e.transaction.amountPaisa),
      entity_id: e.id,
    })),
    ...upcomingSavings.map((s) => ({
      type: 'savings_maturity',
      date: fromDbDate(s.maturityDate!).slice(0, 10),
      label: `${s.name} at ${s.bankName} matures`,
      amount_paisa: Number(s.openingBalancePaisa),
      entity_id: s.id,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const [net_worth_paisa, userRecord] = await Promise.all([
    netWorthPaisa(user.id),
    prisma.user.findUnique({ where: { id: user.id }, select: { monthlyLimitPaisa: true } }),
  ]);
  const monthly_limit_paisa = userRecord?.monthlyLimitPaisa !== null && userRecord?.monthlyLimitPaisa !== undefined
    ? Number(userRecord.monthlyLimitPaisa)
    : null;

  return Response.json({
    tiles,
    current_month: currentMonthPanel,
    spending_by_category: categorySpending,
    six_month_trend: trend,
    fixed_expense_panel: fixedExpensePanel,
    upcoming_events: upcomingEvents,
    recent_transactions: recentTransactions,
    loan_summary: loanSummary,
    tax_snapshot: taxSnapshot,
    unread_notification_count: unreadCount,
    net_worth_paisa,
    monthly_limit_paisa,
  });
}
