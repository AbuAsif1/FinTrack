import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

const SCHEMA_VERSION = '1.0';

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const [
    categories,
    transactions,
    savingsAccounts,
    loanPersons,
    loanEntries,
    incomeEntries,
    holidaySupportEntries,
    fixedExpenses,
    fixedExpenseInstances,
    taxYears,
    taxInvestments,
    budgets,
    notifications,
    importBatches,
  ] = await Promise.all([
    prisma.category.findMany({ where: { userId: user.id } }),
    prisma.transaction.findMany({ where: { userId: user.id } }),
    prisma.savingsAccount.findMany({ where: { userId: user.id } }),
    prisma.loanPerson.findMany({ where: { userId: user.id } }),
    prisma.loanEntry.findMany({ where: { userId: user.id } }),
    prisma.incomeEntry.findMany({ where: { userId: user.id } }),
    prisma.holidaySupportEntry.findMany({ where: { userId: user.id } }),
    prisma.fixedExpense.findMany({ where: { userId: user.id } }),
    prisma.fixedExpenseInstance.findMany({ where: { userId: user.id } }),
    prisma.taxYear.findMany({ where: { userId: user.id } }),
    prisma.taxInvestment.findMany({ where: { userId: user.id } }),
    prisma.budget.findMany({ where: { userId: user.id } }),
    prisma.notification.findMany({ where: { userId: user.id } }),
    prisma.importBatch.findMany({ where: { userId: user.id } }),
  ]);

  const payload = {
    schema_version: SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    categories,
    transactions: transactions.map((t) => ({ ...t, amountPaisa: Number(t.amountPaisa) })),
    savings_accounts: savingsAccounts,
    loan_persons: loanPersons,
    loan_entries: loanEntries,
    income_entries: incomeEntries.map((e) => ({
      ...e,
      grossPaisa: Number(e.grossPaisa),
      tdsPaisa: Number(e.tdsPaisa),
    })),
    holiday_support_entries: holidaySupportEntries.map((e) => ({
      ...e,
      amountPaisa: Number(e.amountPaisa),
    })),
    fixed_expenses: fixedExpenses.map((f) => ({ ...f, standardAmountPaisa: Number(f.standardAmountPaisa) })),
    fixed_expense_instances: fixedExpenseInstances.map((i) => ({
      ...i,
      standardAmountPaisa: Number(i.standardAmountPaisa),
      actualAmountPaisa: i.actualAmountPaisa !== null ? Number(i.actualAmountPaisa) : null,
    })),
    tax_years: taxYears,
    tax_investments: taxInvestments.map((t) => ({
      ...t,
      stocksPaisa: Number(t.stocksPaisa),
      insurancePaisa: Number(t.insurancePaisa),
      othersPaisa: Number(t.othersPaisa),
    })),
    budgets: budgets.map((b) => ({ ...b, monthlyLimitPaisa: b.monthlyLimitPaisa !== null ? Number(b.monthlyLimitPaisa) : null })),
    notifications,
    import_batches: importBatches,
  };

  return new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="fintrack_export_${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
