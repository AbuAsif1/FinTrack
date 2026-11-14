import { createHash } from 'crypto';
import { prisma } from '../prisma';
import { parseBDT, toDbDate, fiscalYear } from '@fintrack/shared';
import { CategoryRoutingService } from './category-routing';
import type { ImportDataset, PaymentMethod, IncomeType } from '@prisma/client';

// ── CSV template definitions ──────────────────────────────────────────────

const TEMPLATES: Record<ImportDataset, { headers: string[]; example: string[] }> = {
  INCOME: {
    headers: ['month', 'income_type', 'gross_bdt', 'tds_bdt', 'is_taxable', 'employer_name', 'payer_name', 'earned_period', 'comment'],
    example: ['2026-11', 'SALARY', '140000.00', '0.00', 'true', 'Acme Ltd', '', '', ''],
  },
  TRANSACTIONS: {
    headers: ['date', 'amount_bdt', 'description', 'category', 'payment_method', 'savings_account', 'loan_person', 'tax_fiscal_year'],
    example: ['2026-11-01', '1198.50', 'Groceries', 'Food', 'CASH', '', '', ''],
  },
  LOAN_ENTRIES: {
    headers: ['date', 'person', 'direction', 'amount_bdt', 'reason', 'payment_method', 'return_due_date'],
    example: ['2026-11-01', 'Alice', 'GIVEN', '5000.00', 'Borrowed for rent', 'CASH', '2027-01-01'],
  },
};

export function getTemplate(dataset: ImportDataset): string {
  const t = TEMPLATES[dataset];
  const rows = [t.headers.join(','), t.example.join(',')];
  return rows.join('\r\n') + '\r\n';
}

// ── CSV parsing ───────────────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim());
  return lines.map((line) => {
    const cells: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        cells.push(cur); cur = '';
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    return cells;
  });
}

function deriveKey(userId: string, dataset: ImportDataset, row: string[], occurrenceIndex: number): string {
  const canonical = `${userId}:${dataset}:${row.map((c) => c.trim()).join('|')}:${occurrenceIndex}`;
  return createHash('sha256').update(canonical).digest('hex').slice(0, 36);
}

// ── Row validators ────────────────────────────────────────────────────────

interface RowError { row: number; reason: string }
interface ParsedRow { key: string; data: Record<string, unknown> }

type RowResult = { ok: true; parsed: ParsedRow } | { ok: false; error: RowError };

const VALID_INCOME_TYPES = ['SALARY', 'FREELANCE', 'DIVIDEND', 'SAVINGS_INTEREST', 'RENTAL', 'CERTIFICATION', 'OTHER'];
const VALID_PAYMENT_METHODS = ['CASH', 'BKASH', 'BANK', 'CARD'];
const VALID_LOAN_DIRECTIONS = ['GIVEN', 'RECEIVED'];

async function validateTransactionRow(
  userId: string,
  row: string[],
  headers: string[],
  rowIndex: number,
  occurrenceIndex: number,
): Promise<RowResult> {
  const h = (name: string) => row[headers.indexOf(name)]?.trim() ?? '';
  const date = h('date');
  const amtStr = h('amount_bdt');
  const description = h('description');
  const categoryName = h('category');
  const paymentMethod = h('payment_method');
  const savingsAccountName = h('savings_account');
  const loanPersonName = h('loan_person');
  const taxFy = h('tax_fiscal_year');

  if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) return { ok: false, error: { row: rowIndex, reason: `Invalid date: ${date}` } };

  let amtParsed: number;
  try { amtParsed = parseBDT(amtStr); } catch { return { ok: false, error: { row: rowIndex, reason: `Invalid amount: ${amtStr}` } }; }
  if (amtParsed <= 0) return { ok: false, error: { row: rowIndex, reason: `Amount must be positive: ${amtStr}` } };

  if (!description) return { ok: false, error: { row: rowIndex, reason: 'Description is required' } };

  if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) return { ok: false, error: { row: rowIndex, reason: `Invalid payment_method: ${paymentMethod}` } };

  // Category lookup
  const category = await prisma.category.findFirst({ where: { userId, name: categoryName, isArchived: false } });
  if (!category) return { ok: false, error: { row: rowIndex, reason: `Unknown category: ${categoryName}` } };

  // Savings account lookup (optional)
  let savingsAccountId: string | null = null;
  if (savingsAccountName) {
    const sa = await prisma.savingsAccount.findFirst({ where: { userId, name: savingsAccountName } });
    if (!sa) return { ok: false, error: { row: rowIndex, reason: `Unknown savings account: ${savingsAccountName}` } };
    savingsAccountId = sa.id;
  }

  const key = deriveKey(userId, 'TRANSACTIONS', row, occurrenceIndex);
  return {
    ok: true,
    parsed: {
      key,
      data: {
        amount_paisa: amtParsed,
        date,
        description,
        category_id: category.id,
        payment_method: paymentMethod as PaymentMethod,
        idempotency_key: key,
        savings_account_id: savingsAccountId ?? undefined,
        loan_person_name: loanPersonName || undefined,
        tax_fiscal_year: taxFy || undefined,
      },
    },
  };
}

async function validateIncomeRow(
  userId: string,
  row: string[],
  headers: string[],
  rowIndex: number,
  occurrenceIndex: number,
): Promise<RowResult> {
  const h = (name: string) => row[headers.indexOf(name)]?.trim() ?? '';
  const month = h('month');
  const incomeType = h('income_type');
  const grossStr = h('gross_bdt');
  const tdsStr = h('tds_bdt');
  const isTaxableStr = h('is_taxable');

  if (!month.match(/^\d{4}-\d{2}$/)) return { ok: false, error: { row: rowIndex, reason: `Invalid month: ${month}` } };
  if (!VALID_INCOME_TYPES.includes(incomeType)) return { ok: false, error: { row: rowIndex, reason: `Invalid income_type: ${incomeType}` } };

  let grossPaisa: number;
  try { grossPaisa = parseBDT(grossStr); } catch { return { ok: false, error: { row: rowIndex, reason: `Invalid gross_bdt: ${grossStr}` } }; }
  if (grossPaisa <= 0) return { ok: false, error: { row: rowIndex, reason: `gross_bdt must be positive: ${grossStr}` } };

  let tdsPaisa = 0;
  if (tdsStr) { try { tdsPaisa = parseBDT(tdsStr); } catch { return { ok: false, error: { row: rowIndex, reason: `Invalid tds_bdt: ${tdsStr}` } }; } }
  if (tdsPaisa < 0 || tdsPaisa > grossPaisa) return { ok: false, error: { row: rowIndex, reason: 'TDS exceeds gross' } };

  // Check if FY is locked
  const fy = fiscalYear(`${month}-01`);
  const taxYear = await prisma.taxYear.findUnique({
    where: { userId_fiscalYear: { userId, fiscalYear: fy } },
  });
  if (taxYear?.isLocked) return { ok: false, error: { row: rowIndex, reason: `Fiscal year ${fy} is locked` } };

  const isTaxable = isTaxableStr.toLowerCase() !== 'false';
  const key = deriveKey(userId, 'INCOME', row, occurrenceIndex);
  return {
    ok: true,
    parsed: {
      key,
      data: {
        month,
        income_type: incomeType as IncomeType,
        gross_paisa: grossPaisa,
        tds_paisa: tdsPaisa,
        is_taxable: isTaxable,
        employer_name: h('employer_name') || undefined,
        payer_name: h('payer_name') || undefined,
        earned_period: h('earned_period') || undefined,
        comment: h('comment') || undefined,
        idempotency_key: key,
      },
    },
  };
}

async function validateLoanRow(
  userId: string,
  row: string[],
  headers: string[],
  rowIndex: number,
  occurrenceIndex: number,
): Promise<RowResult> {
  const h = (name: string) => row[headers.indexOf(name)]?.trim() ?? '';
  const date = h('date');
  const person = h('person');
  const direction = h('direction');
  const amtStr = h('amount_bdt');
  const reason = h('reason');
  const paymentMethod = h('payment_method');

  if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) return { ok: false, error: { row: rowIndex, reason: `Invalid date: ${date}` } };
  if (!person) return { ok: false, error: { row: rowIndex, reason: 'Person name is required' } };
  if (!VALID_LOAN_DIRECTIONS.includes(direction)) return { ok: false, error: { row: rowIndex, reason: `Invalid direction: ${direction}` } };
  if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) return { ok: false, error: { row: rowIndex, reason: `Invalid payment_method: ${paymentMethod}` } };

  let amtPaisa: number;
  try { amtPaisa = parseBDT(amtStr); } catch { return { ok: false, error: { row: rowIndex, reason: `Invalid amount_bdt: ${amtStr}` } }; }
  if (amtPaisa <= 0) return { ok: false, error: { row: rowIndex, reason: `amount_bdt must be positive: ${amtStr}` } };

  // Find category for loan routing
  const loanCategoryName = direction === 'GIVEN' ? 'Loan Given' : 'Loan Received';
  const category = await prisma.category.findFirst({
    where: { userId, routingType: direction === 'GIVEN' ? 'LOAN_GIVEN' : 'LOAN_RECEIVED', isArchived: false },
  });
  if (!category) return { ok: false, error: { row: rowIndex, reason: `No ${loanCategoryName} category found` } };

  const key = deriveKey(userId, 'LOAN_ENTRIES', row, occurrenceIndex);
  const returnDueDateStr = h('return_due_date');
  return {
    ok: true,
    parsed: {
      key,
      data: {
        amount_paisa: amtPaisa,
        date,
        description: reason || loanCategoryName,
        category_id: category.id,
        payment_method: paymentMethod as PaymentMethod,
        idempotency_key: key,
        loan_person_name: person,
        reason: reason || undefined,
        return_due_date: returnDueDateStr || undefined,
      },
    },
  };
}

// ── Preview ───────────────────────────────────────────────────────────────

export interface PreviewResult {
  batch_id: string;
  dataset: ImportDataset;
  filename: string;
  total_rows: number;
  valid_rows: number;
  error_rows: RowError[];
  already_imported: number;
  total_paisa: number;
}

export async function previewImport(
  userId: string,
  dataset: ImportDataset,
  filename: string,
  csvText: string,
): Promise<PreviewResult> {
  const rows = parseCSV(csvText);
  if (rows.length < 2) {
    const batch = await prisma.importBatch.create({
      data: { userId, dataset, filename, status: 'PREVIEWED', rowCount: 0, rowsJson: { errors: [], rows: [] } as unknown as import('@prisma/client').Prisma.InputJsonValue },
    });
    return { batch_id: batch.id, dataset, filename, total_rows: 0, valid_rows: 0, error_rows: [], already_imported: 0, total_paisa: 0 };
  }

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const dataRows = rows.slice(1);

  const errors: RowError[] = [];
  const parsed: ParsedRow[] = [];
  let alreadyImported = 0;
  let totalPaisa = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    // Find occurrence index (for de-dup: how many times same row appeared before)
    const canonicalRow = row.map((c) => c.trim()).join('|');
    const occurrenceIndex = dataRows.slice(0, i).filter((r) => r.map((c) => c.trim()).join('|') === canonicalRow).length;

    let result: RowResult;
    if (dataset === 'TRANSACTIONS') {
      result = await validateTransactionRow(userId, row, headers, i + 2, occurrenceIndex);
    } else if (dataset === 'INCOME') {
      result = await validateIncomeRow(userId, row, headers, i + 2, occurrenceIndex);
    } else {
      result = await validateLoanRow(userId, row, headers, i + 2, occurrenceIndex);
    }

    if (!result.ok) {
      errors.push(result.error);
      continue;
    }

    // Check if already imported (by idempotency key)
    const existing = dataset === 'TRANSACTIONS'
      ? await prisma.transaction.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey: result.parsed.key } } })
      : dataset === 'INCOME'
        ? await prisma.incomeEntry.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey: result.parsed.key } } })
        : null; // loan entries don't have a direct idempotency check here

    if (existing) { alreadyImported++; }

    parsed.push(result.parsed);
    const amt = (result.parsed.data as { amount_paisa?: number; gross_paisa?: number }).amount_paisa
      ?? (result.parsed.data as { amount_paisa?: number; gross_paisa?: number }).gross_paisa ?? 0;
    totalPaisa += amt;
  }

  const batch = await prisma.importBatch.create({
    data: {
      userId,
      dataset,
      filename,
      status: 'PREVIEWED',
      rowCount: dataRows.length,
      rowsJson: { errors, rows: parsed } as unknown as import('@prisma/client').Prisma.InputJsonValue,
    },
  });

  return {
    batch_id: batch.id,
    dataset,
    filename,
    total_rows: dataRows.length,
    valid_rows: parsed.length,
    error_rows: errors,
    already_imported: alreadyImported,
    total_paisa: totalPaisa,
  };
}

// ── Commit ────────────────────────────────────────────────────────────────

export async function commitImport(userId: string, batchId: string): Promise<{ committed: number }> {
  const batch = await prisma.importBatch.findUnique({ where: { id: batchId } });
  if (!batch || batch.userId !== userId) throw Object.assign(new Error('Not found'), { status: 404 });
  if (batch.status !== 'PREVIEWED') throw Object.assign(new Error('Batch is not in PREVIEWED state'), { status: 409 });

  const rows = batch.rowsJson as unknown as { errors: RowError[]; rows: ParsedRow[] };
  if (rows.errors.length > 0) throw Object.assign(new Error('Batch has validation errors'), { status: 422 });

  const svc = new CategoryRoutingService(userId);
  let committed = 0;

  await prisma.$transaction(async () => {
    for (const row of rows.rows) {
      if (batch.dataset === 'INCOME') {
        const d = row.data as {
          month: string; income_type: IncomeType; gross_paisa: number; tds_paisa: number;
          is_taxable: boolean; employer_name?: string; payer_name?: string;
          earned_period?: string; comment?: string; idempotency_key: string;
        };
        // Skip if already exists
        const existing = await prisma.incomeEntry.findUnique({
          where: { userId_idempotencyKey: { userId, idempotencyKey: d.idempotency_key } },
        });
        if (existing) continue;

        const fy = fiscalYear(`${d.month}-01`);
        await prisma.incomeEntry.create({
          data: {
            userId,
            month: toDbDate(`${d.month}-01`),
            fiscalYear: fy,
            incomeType: d.income_type,
            grossPaisa: BigInt(d.gross_paisa),
            tdsPaisa: BigInt(d.tds_paisa),
            isTaxable: d.is_taxable,
            employerName: d.employer_name ?? null,
            payerName: d.payer_name ?? null,
            earnedPeriod: d.earned_period ?? null,
            comment: d.comment ?? null,
            idempotencyKey: d.idempotency_key,
            importBatchId: batchId,
          },
        });
      } else {
        // TRANSACTIONS and LOAN_ENTRIES both go through CategoryRoutingService
        const d = row.data as unknown as Parameters<CategoryRoutingService['create']>[0];
        await svc.create({ ...d, import_batch_id: batchId });
      }
      committed++;
    }

    await prisma.importBatch.update({
      where: { id: batchId },
      data: { status: 'COMMITTED', committedAt: new Date() },
    });
  });

  return { committed };
}

// ── Undo ──────────────────────────────────────────────────────────────────

export async function undoImport(userId: string, batchId: string): Promise<{ undone: number }> {
  const batch = await prisma.importBatch.findUnique({ where: { id: batchId } });
  if (!batch || batch.userId !== userId) throw Object.assign(new Error('Not found'), { status: 404 });
  if (batch.status !== 'COMMITTED') throw Object.assign(new Error('Batch is not committed'), { status: 409 });

  const now = new Date();
  const [txResult, incomeResult] = await prisma.$transaction([
    prisma.transaction.updateMany({
      where: { userId, importBatchId: batchId, isDeleted: false },
      data: { isDeleted: true, deletedAt: now },
    }),
    prisma.incomeEntry.updateMany({
      where: { userId, importBatchId: batchId, isDeleted: false },
      data: { isDeleted: true, deletedAt: now },
    }),
  ]);

  const undone = txResult.count + incomeResult.count;

  await prisma.importBatch.update({
    where: { id: batchId },
    data: { status: 'UNDONE', undoneAt: now },
  });

  return { undone };
}
