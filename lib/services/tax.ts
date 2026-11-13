import { prisma } from '@/lib/prisma';
import { todayInDhaka, fromDbDate, fiscalYear, IncomeType } from '@fintrack/shared';
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

  // DPS deposits this FY — via SAVINGS_DEPOSIT to DPS accounts OR any category named "dps"
  const dpsTxRows = await prisma.transaction.findMany({
    where: {
      userId,
      isDeleted: false,
      date: { gte: fyStart, lt: fyEnd },
      OR: [
        { type: 'SAVINGS_DEPOSIT', savingsAccount: { type: 'DPS' } },
        { category: { name: { contains: 'dps', mode: 'insensitive' } } },
      ],
    },
    select: { id: true, amountPaisa: true },
  });
  // Deduplicate by id (a row matching both OR branches would otherwise be counted twice)
  const dpsPaisa = [...new Map(dpsTxRows.map((r) => [r.id, r])).values()]
    .reduce((sum, r) => sum + Number(r.amountPaisa), 0);

  // Sanchaypatra deposits this FY — via SAVINGS_DEPOSIT to SANCHAYPATRA accounts OR category name
  const sanchTxRows = await prisma.transaction.findMany({
    where: {
      userId,
      isDeleted: false,
      date: { gte: fyStart, lt: fyEnd },
      OR: [
        { type: 'SAVINGS_DEPOSIT', savingsAccount: { type: 'SANCHAYPATRA' } },
        { category: { name: { contains: 'sanchaypatra', mode: 'insensitive' } } },
      ],
    },
    select: { id: true, amountPaisa: true },
  });
  const sanchPaisa = [...new Map(sanchTxRows.map((r) => [r.id, r])).values()]
    .reduce((sum, r) => sum + Number(r.amountPaisa), 0);

  // Manual tax investments
  const taxInv = await prisma.taxInvestment.findUnique({
    where: { userId_fiscalYear: { userId, fiscalYear: fy } },
  });

  const investments = {
    dps: dpsPaisa,
    sanchaypatra: sanchPaisa,
    stocks: Number(taxInv?.stocksPaisa ?? 0),
    insurance: Number(taxInv?.insurancePaisa ?? 0),
    others: Number(taxInv?.othersPaisa ?? 0),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    universal_pension: Number((taxInv as any)?.universalPensionPaisa ?? 0),
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
