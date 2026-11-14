import { prisma } from '@/lib/prisma';
import { getEmailTransport } from '@/lib/email';

const SCHEMA_VERSION = '1.0';

// Called by Vercel Cron or a manual trigger. Secured by a shared secret.
// Configure CRON_SECRET in env and add to vercel.json:
//   { "crons": [{ "path": "/api/v1/cron/backup", "schedule": "0 1 * * 0" }] }
export async function POST(req: Request) {
  const secret = req.headers.get('x-cron-secret') ?? '';
  if (!secret || secret !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
  }

  const today = new Date();
  const dayOfWeek = today.getUTCDay(); // 0 = Sunday
  const dayOfMonth = today.getUTCDate(); // 1–31

  // Find users with an active backup schedule that matches today.
  const users = await prisma.user.findMany({
    where: { deactivatedAt: null },
    select: { id: true, email: true, name: true, backupPrefsJson: true },
  });

  const results = { processed: 0, skipped: 0, failed: 0 };

  for (const user of users) {
    const prefs = (user.backupPrefsJson ?? {}) as Record<string, unknown>;
    const cadence = (prefs.cadence as string) ?? 'OFF';

    const shouldRun =
      (cadence === 'WEEKLY' && dayOfWeek === 0) ||
      (cadence === 'MONTHLY' && dayOfMonth === 1);

    if (!shouldRun) {
      results.skipped++;
      continue;
    }

    let recordCount = 0;
    let status = 'COMPLETED';
    let errorMessage: string | null = null;

    try {
      // Build the full export payload (same as GET /export/full).
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
        import_batches: importBatches,
      };

      recordCount =
        transactions.length +
        incomeEntries.length +
        loanEntries.length +
        savingsAccounts.length +
        loanPersons.length +
        categories.length +
        taxYears.length;

      const json = JSON.stringify(payload);
      const dateStr = today.toISOString().slice(0, 10);

      // Email the backup as an inline attachment. For large backups, use a
      // signed-URL delivery method instead (not yet implemented).
      const transport = getEmailTransport();
      await transport.send({
        to: user.email,
        subject: `FinTrack backup — ${dateStr}`,
        html: backupEmailHtml(user.name, dateStr, json, recordCount),
      });

      results.processed++;
    } catch (err) {
      status = 'FAILED';
      errorMessage = (err as Error).message;
      results.failed++;
    }

    await prisma.backupRun.create({
      data: {
        userId: user.id,
        recordCount,
        deliveryMethod: 'EMAIL',
        status,
        errorMessage,
      },
    });
  }

  return Response.json(results);
}

function backupEmailHtml(name: string, dateStr: string, json: string, recordCount: number): string {
  const escaped = json.replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px">
<h1 style="font-size:20px;margin:0 0 16px">FinTrack backup — ${dateStr}</h1>
<p style="margin:0 0 16px;color:#555">Hi ${name}, your automatic backup is attached below as a JSON file. It contains ${recordCount} records. Save it somewhere safe.</p>
<p style="margin:0 0 16px;color:#555">To restore this backup, go to <strong>Settings → Export → Restore from backup</strong> and upload this file.</p>
<details style="margin-top:24px">
  <summary style="cursor:pointer;color:#3A5FCD;font-weight:600">View raw backup data</summary>
  <pre style="margin-top:12px;padding:16px;background:#f5f5f5;border-radius:8px;overflow-x:auto;font-size:11px;white-space:pre-wrap">${escaped.slice(0, 20000)}${escaped.length > 20000 ? '\n…(truncated in email; download for full data)' : ''}</pre>
</details>
<p style="margin:24px 0 0;color:#999;font-size:13px">To change your backup schedule, go to Settings → Export → Automatic backups.</p>
</div>`;
}
