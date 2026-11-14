import { prisma } from '../prisma';

const SUPPORTED_VERSIONS = ['1.0'];

export interface RestoreSummary {
  categories: { created: number; skipped: number };
  savingsAccounts: { created: number; skipped: number };
  loanPersons: { created: number; skipped: number };
  transactions: { created: number; restored: number; skipped: number };
  loanEntries: { created: number; skipped: number };
  incomeEntries: { created: number; restored: number; skipped: number };
  holidaySupportEntries: { created: number; skipped: number };
  taxYears: { created: number; skipped: number };
  taxInvestments: { created: number; skipped: number };
  total: number;
  errors: string[];
}

type IdMap = Map<string, string>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isSupportedExport(payload: any): payload is Record<string, unknown> {
  return (
    payload &&
    typeof payload === 'object' &&
    typeof payload.schema_version === 'string' &&
    SUPPORTED_VERSIONS.includes(payload.schema_version)
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function restoreFromExport(userId: string, payload: any): Promise<RestoreSummary> {
  if (!isSupportedExport(payload)) {
    throw new Error('Unsupported or missing schema_version. Only version 1.0 is accepted.');
  }

  const summary: RestoreSummary = {
    categories: { created: 0, skipped: 0 },
    savingsAccounts: { created: 0, skipped: 0 },
    loanPersons: { created: 0, skipped: 0 },
    transactions: { created: 0, restored: 0, skipped: 0 },
    loanEntries: { created: 0, skipped: 0 },
    incomeEntries: { created: 0, restored: 0, skipped: 0 },
    holidaySupportEntries: { created: 0, skipped: 0 },
    taxYears: { created: 0, skipped: 0 },
    taxInvestments: { created: 0, skipped: 0 },
    total: 0,
    errors: [],
  };

  const catIdMap: IdMap = new Map();
  const savIdMap: IdMap = new Map();
  const lpIdMap: IdMap = new Map();
  const txIdMap: IdMap = new Map();

  // ── 1. Categories ──────────────────────────────────────────────────────
  const exportedCats = Array.isArray(payload.categories) ? payload.categories : [];
  for (const cat of exportedCats) {
    try {
      const existing = await prisma.category.findFirst({
        where: { userId, name: cat.name },
        select: { id: true },
      });
      if (existing) {
        catIdMap.set(cat.id, existing.id);
        summary.categories.skipped++;
      } else {
        const created = await prisma.category.create({
          data: {
            userId,
            name: cat.name,
            routingType: cat.routingType ?? cat.routing_type ?? 'NONE',
            colorHex: cat.colorHex ?? cat.color_hex ?? '#888888',
            isArchived: cat.isArchived ?? cat.is_archived ?? false,
          },
          select: { id: true },
        });
        catIdMap.set(cat.id, created.id);
        summary.categories.created++;
      }
    } catch (err) {
      summary.errors.push(`Category "${cat.name}": ${(err as Error).message}`);
    }
  }

  // ── 2. Savings Accounts ────────────────────────────────────────────────
  const exportedSav = Array.isArray(payload.savings_accounts) ? payload.savings_accounts : [];
  for (const sav of exportedSav) {
    try {
      const existing = await prisma.savingsAccount.findFirst({
        where: { userId, name: sav.name, type: sav.type },
        select: { id: true },
      });
      if (existing) {
        savIdMap.set(sav.id, existing.id);
        summary.savingsAccounts.skipped++;
      } else {
        const created = await prisma.savingsAccount.create({
          data: {
            userId,
            name: sav.name,
            type: sav.type,
            bankName: sav.bankName ?? sav.bank_name ?? '',
            lastFour: sav.lastFour ?? sav.last_four ?? null,
            openingBalancePaisa: BigInt(sav.openingBalancePaisa ?? sav.opening_balance_paisa ?? 0),
            openingDate: new Date(sav.openingDate ?? sav.opening_date),
            monthlyInstallmentPaisa: sav.monthlyInstallmentPaisa != null ? BigInt(sav.monthlyInstallmentPaisa) : null,
            maturityDate: sav.maturityDate ? new Date(sav.maturityDate) : null,
            interestRateBps: sav.interestRateBps ?? sav.interest_rate_bps ?? null,
            closedOn: sav.closedOn ? new Date(sav.closedOn) : null,
          },
          select: { id: true },
        });
        savIdMap.set(sav.id, created.id);
        summary.savingsAccounts.created++;
      }
    } catch (err) {
      summary.errors.push(`SavingsAccount "${sav.name}": ${(err as Error).message}`);
    }
  }

  // ── 3. Loan Persons ────────────────────────────────────────────────────
  const exportedLp = Array.isArray(payload.loan_persons) ? payload.loan_persons : [];
  for (const lp of exportedLp) {
    try {
      const existing = await prisma.loanPerson.findFirst({
        where: { userId, name: lp.name },
        select: { id: true },
      });
      if (existing) {
        lpIdMap.set(lp.id, existing.id);
        summary.loanPersons.skipped++;
      } else {
        const created = await prisma.loanPerson.create({
          data: { userId, name: lp.name, notes: lp.notes ?? null },
          select: { id: true },
        });
        lpIdMap.set(lp.id, created.id);
        summary.loanPersons.created++;
      }
    } catch (err) {
      summary.errors.push(`LoanPerson "${lp.name}": ${(err as Error).message}`);
    }
  }

  // ── 4. Transactions ────────────────────────────────────────────────────
  const exportedTx = Array.isArray(payload.transactions) ? payload.transactions : [];
  for (const tx of exportedTx) {
    try {
      const existing = await prisma.transaction.findFirst({
        where: { userId, idempotencyKey: tx.idempotencyKey ?? tx.idempotency_key },
        select: { id: true, isDeleted: true },
      });
      if (existing) {
        txIdMap.set(tx.id, existing.id);
        if (existing.isDeleted) {
          await prisma.transaction.update({
            where: { id: existing.id },
            data: { isDeleted: false, deletedAt: null },
          });
          summary.transactions.restored++;
        } else {
          summary.transactions.skipped++;
        }
      } else {
        const newCatId = catIdMap.get(tx.categoryId ?? tx.category_id) ?? tx.categoryId ?? tx.category_id;
        const newSavId = tx.savingsAccountId
          ? (savIdMap.get(tx.savingsAccountId) ?? tx.savingsAccountId)
          : (tx.savings_account_id ? (savIdMap.get(tx.savings_account_id) ?? null) : null);
        const newBankId = tx.bankSourceId
          ? (savIdMap.get(tx.bankSourceId) ?? tx.bankSourceId)
          : (tx.bank_source_id ? (savIdMap.get(tx.bank_source_id) ?? null) : null);
        const created = await prisma.transaction.create({
          data: {
            userId,
            date: new Date(tx.date),
            amountPaisa: BigInt(tx.amountPaisa ?? tx.amount_paisa),
            description: tx.description,
            categoryId: newCatId,
            type: tx.type,
            paymentMethod: tx.paymentMethod ?? tx.payment_method,
            savingsAccountId: newSavId,
            bankSourceId: newBankId,
            taxFiscalYear: tx.taxFiscalYear ?? tx.tax_fiscal_year ?? null,
            idempotencyKey: tx.idempotencyKey ?? tx.idempotency_key,
            isDeleted: tx.isDeleted ?? tx.is_deleted ?? false,
            deletedAt: (tx.isDeleted || tx.is_deleted) ? (tx.deletedAt ? new Date(tx.deletedAt) : new Date()) : null,
          },
          select: { id: true },
        });
        txIdMap.set(tx.id, created.id);
        summary.transactions.created++;
      }
    } catch (err) {
      summary.errors.push(`Transaction idKey="${tx.idempotencyKey ?? tx.idempotency_key}": ${(err as Error).message}`);
    }
  }

  // ── 5. Loan Entries ────────────────────────────────────────────────────
  const exportedLe = Array.isArray(payload.loan_entries) ? payload.loan_entries : [];
  for (const le of exportedLe) {
    try {
      const newTxId = txIdMap.get(le.transactionId ?? le.transaction_id);
      if (!newTxId) {
        summary.loanEntries.skipped++;
        continue;
      }
      const newLpId = lpIdMap.get(le.loanPersonId ?? le.loan_person_id) ?? le.loanPersonId ?? le.loan_person_id;
      const existing = await prisma.loanEntry.findFirst({
        where: { transactionId: newTxId },
        select: { id: true },
      });
      if (existing) {
        summary.loanEntries.skipped++;
      } else {
        await prisma.loanEntry.create({
          data: {
            userId,
            loanPersonId: newLpId,
            transactionId: newTxId,
            direction: le.direction,
            reason: le.reason ?? null,
            returnDueDate: le.returnDueDate ? new Date(le.returnDueDate) : (le.return_due_date ? new Date(le.return_due_date) : null),
            isSettlement: le.isSettlement ?? le.is_settlement ?? false,
          },
        });
        summary.loanEntries.created++;
      }
    } catch (err) {
      summary.errors.push(`LoanEntry txId="${le.transactionId ?? le.transaction_id}": ${(err as Error).message}`);
    }
  }

  // ── 6. Income Entries ──────────────────────────────────────────────────
  const exportedInc = Array.isArray(payload.income_entries) ? payload.income_entries : [];
  for (const ie of exportedInc) {
    try {
      const existing = await prisma.incomeEntry.findFirst({
        where: { userId, idempotencyKey: ie.idempotencyKey ?? ie.idempotency_key },
        select: { id: true, isDeleted: true },
      });
      if (existing) {
        if (existing.isDeleted) {
          await prisma.incomeEntry.update({
            where: { id: existing.id },
            data: { isDeleted: false, deletedAt: null },
          });
          summary.incomeEntries.restored++;
        } else {
          summary.incomeEntries.skipped++;
        }
      } else {
        const savId = ie.savingsAccountId
          ? (savIdMap.get(ie.savingsAccountId) ?? ie.savingsAccountId)
          : ie.savings_account_id ? (savIdMap.get(ie.savings_account_id) ?? null) : null;
        await prisma.incomeEntry.create({
          data: {
            userId,
            month: new Date(ie.month),
            fiscalYear: ie.fiscalYear ?? ie.fiscal_year,
            incomeType: ie.incomeType ?? ie.income_type,
            grossPaisa: BigInt(ie.grossPaisa ?? ie.gross_paisa),
            tdsPaisa: BigInt(ie.tdsPaisa ?? ie.tds_paisa ?? 0),
            isTaxable: ie.isTaxable ?? ie.is_taxable ?? true,
            employerName: ie.employerName ?? ie.employer_name ?? null,
            payerName: ie.payerName ?? ie.payer_name ?? null,
            earnedPeriod: ie.earnedPeriod ?? ie.earned_period ?? null,
            comment: ie.comment ?? null,
            savingsAccountId: savId,
            idempotencyKey: ie.idempotencyKey ?? ie.idempotency_key,
            isDeleted: ie.isDeleted ?? ie.is_deleted ?? false,
            deletedAt: (ie.isDeleted || ie.is_deleted) ? (ie.deletedAt ? new Date(ie.deletedAt) : new Date()) : null,
          },
        });
        summary.incomeEntries.created++;
      }
    } catch (err) {
      summary.errors.push(`IncomeEntry idKey="${ie.idempotencyKey ?? ie.idempotency_key}": ${(err as Error).message}`);
    }
  }

  // ── 7. Holiday Support Entries ─────────────────────────────────────────
  const exportedHse = Array.isArray(payload.holiday_support_entries) ? payload.holiday_support_entries : [];
  for (const hse of exportedHse) {
    try {
      const existing = await prisma.holidaySupportEntry.findFirst({
        where: { userId, date: new Date(hse.date), amountPaisa: BigInt(hse.amountPaisa ?? hse.amount_paisa) },
        select: { id: true },
      });
      if (existing) {
        summary.holidaySupportEntries.skipped++;
      } else {
        await prisma.holidaySupportEntry.create({
          data: {
            userId,
            date: new Date(hse.date),
            days: hse.days,
            rateType: hse.rateType ?? hse.rate_type,
            ratePaisa: BigInt(hse.ratePaisa ?? hse.rate_paisa),
            amountPaisa: BigInt(hse.amountPaisa ?? hse.amount_paisa),
            note: hse.note ?? null,
          },
        });
        summary.holidaySupportEntries.created++;
      }
    } catch (err) {
      summary.errors.push(`HolidaySupportEntry date="${hse.date}": ${(err as Error).message}`);
    }
  }

  // ── 8. Tax Years ───────────────────────────────────────────────────────
  const exportedTy = Array.isArray(payload.tax_years) ? payload.tax_years : [];
  for (const ty of exportedTy) {
    try {
      const existing = await prisma.taxYear.findFirst({
        where: { userId, fiscalYear: ty.fiscalYear ?? ty.fiscal_year },
        select: { id: true },
      });
      if (existing) {
        summary.taxYears.skipped++;
      } else {
        await prisma.taxYear.create({
          data: {
            userId,
            fiscalYear: ty.fiscalYear ?? ty.fiscal_year,
            configJson: ty.configJson ?? ty.config_json ?? {},
            configConfirmedAt: ty.configConfirmedAt ? new Date(ty.configConfirmedAt) : null,
            filedOn: ty.filedOn ? new Date(ty.filedOn) : null,
            filedResultJson: ty.filedResultJson ?? ty.filed_result_json ?? null,
            isLocked: ty.isLocked ?? ty.is_locked ?? false,
            checklistItemsJson: ty.checklistItemsJson ?? ty.checklist_items_json ?? null,
          },
        });
        summary.taxYears.created++;
      }
    } catch (err) {
      summary.errors.push(`TaxYear "${ty.fiscalYear ?? ty.fiscal_year}": ${(err as Error).message}`);
    }
  }

  // ── 9. Tax Investments ─────────────────────────────────────────────────
  const exportedTi = Array.isArray(payload.tax_investments) ? payload.tax_investments : [];
  for (const ti of exportedTi) {
    try {
      const existing = await prisma.taxInvestment.findFirst({
        where: { userId, fiscalYear: ti.fiscalYear ?? ti.fiscal_year },
        select: { id: true },
      });
      if (existing) {
        summary.taxInvestments.skipped++;
      } else {
        await prisma.taxInvestment.create({
          data: {
            userId,
            fiscalYear: ti.fiscalYear ?? ti.fiscal_year,
            stocksPaisa: BigInt(ti.stocksPaisa ?? ti.stocks_paisa ?? 0),
            insurancePaisa: BigInt(ti.insurancePaisa ?? ti.insurance_paisa ?? 0),
            othersPaisa: BigInt(ti.othersPaisa ?? ti.others_paisa ?? 0),
            universalPensionPaisa: BigInt(ti.universalPensionPaisa ?? ti.universal_pension_paisa ?? 0),
          },
        });
        summary.taxInvestments.created++;
      }
    } catch (err) {
      summary.errors.push(`TaxInvestment "${ti.fiscalYear ?? ti.fiscal_year}": ${(err as Error).message}`);
    }
  }

  summary.total =
    summary.categories.created +
    summary.savingsAccounts.created +
    summary.loanPersons.created +
    summary.transactions.created +
    summary.transactions.restored +
    summary.loanEntries.created +
    summary.incomeEntries.created +
    summary.incomeEntries.restored +
    summary.holidaySupportEntries.created +
    summary.taxYears.created +
    summary.taxInvestments.created;

  return summary;
}

export function countExportRecords(payload: Record<string, unknown>): number {
  const keys = [
    'categories', 'savings_accounts', 'loan_persons', 'transactions',
    'loan_entries', 'income_entries', 'holiday_support_entries',
    'tax_years', 'tax_investments',
  ];
  return keys.reduce((n, k) => n + (Array.isArray(payload[k]) ? (payload[k] as unknown[]).length : 0), 0);
}
