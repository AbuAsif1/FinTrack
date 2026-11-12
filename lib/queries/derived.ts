/**
 * Derived-value queries. Each function maps to exactly one definition in architecture.md §Derived values.
 * All exclude soft-deleted rows via is_deleted: false.
 */

import { prisma } from '@/lib/prisma';

// ── Date Helpers ──────────────────────────────────────────────────────────

function monthRange(month: string): { gte: Date; lt: Date } {
  const start = new Date(`${month}-01`);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  return { gte: start, lt: end };
}

// ── Spending ──────────────────────────────────────────────────────────────

export async function totalSpending(userId: string, from: Date, to: Date): Promise<number> {
  const agg = await prisma.transaction.aggregate({
    where: { userId, isDeleted: false, type: 'NONE', date: { gte: from, lt: to } },
    _sum: { amountPaisa: true },
  });
  return Number(agg._sum.amountPaisa ?? 0);
}

// ── In-Hand Income ────────────────────────────────────────────────────────

export async function inHandIncome(userId: string, from: Date, to: Date): Promise<number> {
  const rows = await prisma.incomeEntry.findMany({
    where: { userId, isDeleted: false, month: { gte: from, lt: to } },
    select: { grossPaisa: true, tdsPaisa: true },
  });
  return rows.reduce((sum, r) => sum + Number(r.grossPaisa) - Number(r.tdsPaisa), 0);
}

// ── Tax Payments ──────────────────────────────────────────────────────────

export async function taxPayments(userId: string, from: Date, to: Date): Promise<number> {
  const agg = await prisma.transaction.aggregate({
    where: { userId, isDeleted: false, type: 'TAX_PAYMENT', date: { gte: from, lt: to } },
    _sum: { amountPaisa: true },
  });
  return Number(agg._sum.amountPaisa ?? 0);
}

// ── Fixed Commitments ─────────────────────────────────────────────────────

export async function fixedCommitments(userId: string, month: string): Promise<number> {
  const instances = await prisma.fixedExpenseInstance.findMany({
    where: { userId, month: new Date(`${month}-01`) },
    select: { status: true, actualAmountPaisa: true, standardAmountPaisa: true },
  });
  return instances.reduce((sum, inst) => {
    if (inst.status === 'PAID') return sum + Number(inst.actualAmountPaisa ?? inst.standardAmountPaisa);
    if (inst.status === 'PENDING') return sum + Number(inst.standardAmountPaisa);
    return sum; // SKIPPED = 0
  }, 0);
}

// ── Latest Salary Month ────────────────────────────────────────────────────

export async function latestSalaryInHandPaisa(userId: string, beforeMonth: string): Promise<number | null> {
  const before = new Date(`${beforeMonth}-01`);
  const entry = await prisma.incomeEntry.findFirst({
    where: { userId, isDeleted: false, incomeType: 'SALARY', month: { lt: before } },
    orderBy: { month: 'desc' },
  });
  if (!entry) return null;
  return Number(entry.grossPaisa) - Number(entry.tdsPaisa);
}

// ── Remaining to Spend ─────────────────────────────────────────────────────

export async function remainingToSpend(userId: string, month: string): Promise<{ paisa: number; income_is_estimated: boolean }> {
  const { gte, lt } = monthRange(month);

  const hasSalary = await prisma.incomeEntry.count({
    where: { userId, isDeleted: false, incomeType: 'SALARY', month: { gte, lt } },
  });

  let incomeInHand: number;
  let income_is_estimated = false;

  if (hasSalary === 0) {
    const estimated = await latestSalaryInHandPaisa(userId, month);
    incomeInHand = estimated ?? 0;
    income_is_estimated = estimated !== null;
  } else {
    incomeInHand = await inHandIncome(userId, gte, lt);
  }

  // Cash in: SAVINGS_WITHDRAWAL, LOAN_RECEIVED
  const cashIn = await prisma.transaction.aggregate({
    where: { userId, isDeleted: false, type: { in: ['SAVINGS_WITHDRAWAL', 'LOAN_RECEIVED'] }, date: { gte, lt } },
    _sum: { amountPaisa: true },
  });

  // Cash out: NONE, SAVINGS_DEPOSIT, LOAN_GIVEN, TAX_PAYMENT
  const cashOut = await prisma.transaction.aggregate({
    where: { userId, isDeleted: false, type: { in: ['NONE', 'SAVINGS_DEPOSIT', 'LOAN_GIVEN', 'TAX_PAYMENT'] }, date: { gte, lt } },
    _sum: { amountPaisa: true },
  });

  // PENDING instances standard amount
  const pendingInstances = await prisma.fixedExpenseInstance.findMany({
    where: { userId, status: 'PENDING', month: new Date(`${month}-01`) },
    select: { standardAmountPaisa: true },
  });
  const pendingTotal = pendingInstances.reduce((s, i) => s + Number(i.standardAmountPaisa), 0);

  const paisa = incomeInHand + Number(cashIn._sum.amountPaisa ?? 0) - Number(cashOut._sum.amountPaisa ?? 0) - pendingTotal;

  return { paisa, income_is_estimated };
}

// ── Spending by Category ──────────────────────────────────────────────────

export async function spendingByCategory(userId: string, from: Date, to: Date) {
  const rows = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: { userId, isDeleted: false, type: 'NONE', date: { gte: from, lt: to } },
    _sum: { amountPaisa: true },
    orderBy: { _sum: { amountPaisa: 'desc' } },
  });

  const categories = await prisma.category.findMany({
    where: { id: { in: rows.map((r) => r.categoryId) } },
    select: { id: true, name: true, colorHex: true },
  });
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  return rows.map((r) => ({
    category_id: r.categoryId,
    category_name: catMap[r.categoryId]?.name ?? 'Unknown',
    color: catMap[r.categoryId]?.colorHex ?? '#888',
    amount_paisa: Number(r._sum.amountPaisa ?? 0),
  }));
}

// ── Monthly Trend ─────────────────────────────────────────────────────────

export async function monthlyTrend(userId: string, fromMonth: string, toMonth: string) {
  const months: string[] = [];
  let cur = new Date(`${fromMonth}-01`);
  const end = new Date(`${toMonth}-01`);
  while (cur <= end) {
    months.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }

  return Promise.all(months.map(async (m) => {
    const { gte, lt } = monthRange(m);
    const [income, spending, tax] = await Promise.all([
      inHandIncome(userId, gte, lt),
      totalSpending(userId, gte, lt),
      taxPayments(userId, gte, lt),
    ]);
    const netSavings = income - spending - tax;
    const savingsRate = income > 0 ? Math.round((netSavings / income) * 10000) : null;
    return { month: m, in_hand_income_paisa: income, total_spending_paisa: spending, tax_payments_paisa: tax, net_savings_paisa: netSavings, savings_rate_bps: savingsRate };
  }));
}
