import { prisma } from '@/lib/prisma';
import { todayInDhaka, fromDbDate, fiscalYear, IncomeType, REBATE_BUCKET_BY_ACCOUNT_TYPE } from '@fintrack/shared';
import { calculateTax, forecastTax } from '@fintrack/tax-engine';
import type { TaxInput } from '@fintrack/tax-engine';
import type { TaxYearConfig } from '@fintrack/shared';
import type { JsonValue } from '@prisma/client/runtime/library';

// ── ensureTaxYear ──────────────────────────────────────────────────────────

export async function ensureTaxYear(userId: string, fy: string) {
  const existing = await prisma.taxYear.findUnique({
    where: { userId_fiscalYear: { userId, fiscalYear: fy } },
  });
  if (existing) return existing;

  // Copy config_json from the most recent earlier year, or use defaults
  const earlier = await prisma.taxYear.findFirst({
    where: { userId, fiscalYear: { lt: fy } },
    orderBy: { fiscalYear: 'desc' },
  });

  const defaultConfig: TaxYearConfig = {
    slabs: [
      { width_paisa: 37500000, rate_bps: 0 },
      { width_paisa: 30000000, rate_bps: 1000 },
      { width_paisa: 40000000, rate_bps: 1500 },
      { width_paisa: 50000000, rate_bps: 2000 },
      { width_paisa: 300000000, rate_bps: 2500 },
      { width_paisa: null, rate_bps: 3000 },
    ],
    salary_exemption: { numerator: 1, denominator: 3, cap_paisa: 50000000 },
    rebate: { income_rate_bps: 300, investment_rate_bps: 1000, max_paisa: 100000000 },
    investment_caps_paisa: { dps: 12000000, sanchaypatra: 50000000, stocks: null, insurance: null, others: null, universal_pension: null },
    minimum_tax_paisa: 500000,
    early_filing: { rate_bps: 500, max_paisa: 200000, deadline_mmdd: '09-30' },
  };

  const configJson = earlier ? (earlier.configJson as object) : defaultConfig;

  return prisma.taxYear.create({
    data: {
      userId,
      fiscalYear: fy,
      configJson,
      configConfirmedAt: null,
    },
  });
}

// ── investedByBucket ───────────────────────────────────────────────────────

type RebateBucket = 'dps' | 'sanchaypatra' | 'universal_pension' | 'stocks' | 'insurance' | 'others';

/**
 * Σ SAVINGS_DEPOSIT in [fyStart, fyEnd) by the rebate bucket of the account deposited into.
 * A transaction with no account counts toward DPS or Sanchaypatra only by its category name.
 */
export async function investedByBucket(userId: string, fyStart: Date, fyEnd: Date): Promise<Record<RebateBucket, number>> {
  const totals: Record<RebateBucket, number> = { dps: 0, sanchaypatra: 0, universal_pension: 0, stocks: 0, insurance: 0, others: 0 };

  const [deposits, unlinked] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, isDeleted: false, type: 'SAVINGS_DEPOSIT', date: { gte: fyStart, lt: fyEnd }, savingsAccountId: { not: null } },
      select: { amountPaisa: true, savingsAccount: { select: { type: true } } },
    }),
    prisma.transaction.findMany({
      where: {
        userId, isDeleted: false, date: { gte: fyStart, lt: fyEnd }, savingsAccountId: null,
        OR: [
          { category: { name: { contains: 'dps', mode: 'insensitive' } } },
          { category: { name: { contains: 'sanchaypatra', mode: 'insensitive' } } },
        ],
      },
      select: { amountPaisa: true, category: { select: { name: true } } },
    }),
  ]);

  for (const d of deposits) {
    const bucket = d.savingsAccount ? REBATE_BUCKET_BY_ACCOUNT_TYPE[d.savingsAccount.type] : undefined;
    if (bucket) totals[bucket] += Number(d.amountPaisa);
  }
  for (const t of unlinked) {
    totals[t.category.name.toLowerCase().includes('dps') ? 'dps' : 'sanchaypatra'] += Number(t.amountPaisa);
  }
  return totals;
}

// ── buildTaxInput ──────────────────────────────────────────────────────────

export async function buildTaxInput(userId: string, fy: string): Promise<TaxInput> {
  const taxYear = await ensureTaxYear(userId, fy);
  const config = taxYear.configJson as TaxYearConfig;

  // Income entries for this FY
  const fyStartYear = parseInt(fy.split('-')[0], 10);
  const fyStart = new Date(`${fyStartYear}-07-01`);
  const fyEnd = new Date(`${fyStartYear + 1}-07-01`);

  const incomeRows = await prisma.incomeEntry.findMany({
    where: {
      userId,
      isDeleted: false,
      month: { gte: fyStart, lt: fyEnd },
    },
  });

  const incomeEntries = incomeRows.map((r) => ({
    month: fromDbDate(r.month).slice(0, 7),
    income_type: r.incomeType as IncomeType,
    gross_paisa: Number(r.grossPaisa),
    tds_paisa: Number(r.tdsPaisa),
    is_taxable: r.isTaxable,
  }));

  // Each rebate bucket = deposits this FY into accounts of the matching type (ADR-0015)
  const fromAccounts = await investedByBucket(userId, fyStart, fyEnd);

  // Amounts entered on the Tax page before Investment Accounts existed still count
  const taxInv = await prisma.taxInvestment.findUnique({
    where: { userId_fiscalYear: { userId, fiscalYear: fy } },
  });

  const investments = {
    dps: fromAccounts.dps,
    sanchaypatra: fromAccounts.sanchaypatra,
    stocks: fromAccounts.stocks + Number(taxInv?.stocksPaisa ?? 0),
    insurance: fromAccounts.insurance + Number(taxInv?.insurancePaisa ?? 0),
    others: fromAccounts.others + Number(taxInv?.othersPaisa ?? 0),
    universal_pension: fromAccounts.universal_pension + Number(taxInv?.universalPensionPaisa ?? 0),
  };

  // Tax payments assigned to this FY
  const taxPaymentAgg = await prisma.transaction.aggregate({
    where: {
      userId,
      isDeleted: false,
      type: 'TAX_PAYMENT',
      taxFiscalYear: fy,
    },
    _sum: { amountPaisa: true },
  });
  const taxPaymentsPaisa = Number(taxPaymentAgg._sum.amountPaisa ?? 0);

  return {
    fiscalYear: fy,
    config,
    incomeEntries,
    investments,
    taxPaymentsPaisa,
    filedOn: taxYear.filedOn ? fromDbDate(taxYear.filedOn).slice(0, 10) : null,
    asOf: todayInDhaka(),
  };
}

// ── serializeTaxYear ───────────────────────────────────────────────────────

export function serializeTaxYear(ty: {
  id: string;
  fiscalYear: string;
  configJson: JsonValue;
  configConfirmedAt: Date | null;
  filedOn: Date | null;
  filedResultJson: JsonValue;
  isLocked: boolean;
}) {
  return {
    id: ty.id,
    fiscal_year: ty.fiscalYear,
    config: ty.configJson,
    config_confirmed_at: ty.configConfirmedAt?.toISOString() ?? null,
    is_provisional: ty.configConfirmedAt === null,
    filed_on: ty.filedOn ? fromDbDate(ty.filedOn).slice(0, 10) : null,
    is_locked: ty.isLocked,
  };
}

// ── currentFiscalYear ──────────────────────────────────────────────────────

export function currentFY() {
  return fiscalYear(todayInDhaka());
}
