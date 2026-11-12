import { z } from 'zod';
import { paisaSchema } from './money';

// ---------------------------------------------------------------------------
// Tax Year Config
// ---------------------------------------------------------------------------

const slabSchema = z.object({
  width_paisa: z.number().int().positive().nullable(),
  rate_bps: z.number().int().min(0).max(10000),
});

const salaryExemptionSchema = z.object({
  numerator: z.number().int().positive(),
  denominator: z.number().int().positive(),
  cap_paisa: z.number().int().positive(),
});

const rebateSchema = z.object({
  income_rate_bps: z.number().int().min(0),
  investment_rate_bps: z.number().int().min(0),
  max_paisa: z.number().int().positive(),
});

const investmentCapsSchema = z.object({
  dps: z.number().int().positive().nullable(),
  sanchaypatra: z.number().int().positive().nullable(),
  stocks: z.number().int().positive().nullable(),
  insurance: z.number().int().positive().nullable(),
  others: z.number().int().positive().nullable(),
});

const earlyFilingSchema = z.object({
  rate_bps: z.number().int().min(0),
  max_paisa: z.number().int().positive(),
  deadline_mmdd: z.string().regex(/^\d{2}-\d{2}$/),
});

export const taxYearConfigSchema = z
  .object({
    slabs: z
      .array(slabSchema)
      .min(1)
      .refine(
        (slabs) => {
          const last = slabs[slabs.length - 1];
          return last.width_paisa === null;
        },
        { message: 'The last slab must have width_paisa: null (remainder slab)' }
      )
      .refine(
        (slabs) => slabs.every((s) => s.rate_bps >= 0),
        { message: 'All slab rates must be non-negative' }
      ),
    salary_exemption: salaryExemptionSchema,
    rebate: rebateSchema,
    investment_caps_paisa: investmentCapsSchema,
    minimum_tax_paisa: z.number().int().min(0),
    early_filing: earlyFilingSchema.nullable(),
  });

export type TaxYearConfig = z.infer<typeof taxYearConfigSchema>;

// ---------------------------------------------------------------------------
// Auth request/response schemas
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(10, 'Password must be at least 10 characters'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10, 'Password must be at least 10 characters'),
});

export const patchMeSchema = z.object({
  name: z.string().min(1).max(100),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const resendVerificationSchema = z.object({
  email: z.string().email(),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(10, 'Password must be at least 10 characters'),
});

// ---------------------------------------------------------------------------
// Category schemas
// ---------------------------------------------------------------------------

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  routingType: z.enum(['NONE', 'SAVINGS_DEPOSIT', 'SAVINGS_WITHDRAWAL', 'SAVINGS_INTEREST',
    'LOAN_GIVEN', 'LOAN_RECEIVED', 'TAX_PAYMENT']),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export const patchCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  isArchived: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Transaction schemas
// ---------------------------------------------------------------------------

export const createTransactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amountPaisa: paisaSchema.positive(),
  description: z.string().min(1).max(500),
  categoryId: z.string().cuid(),
  paymentMethod: z.enum(['CASH', 'BKASH', 'BANK', 'CARD']),
  savingsAccountId: z.string().cuid().optional(),
  loanPersonId: z.string().cuid().optional(),
  loanPersonName: z.string().min(1).optional(),
  loanReason: z.string().optional(),
  loanReturnDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  taxFiscalYear: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  idempotencyKey: z.string().uuid(),
  importBatchId: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Income schemas
// ---------------------------------------------------------------------------

export const createIncomeEntrySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  incomeType: z.enum(['SALARY', 'CHEER', 'PROFIT_SHARE', 'EID_BONUS',
    'LEAVE_ENCASHMENT', 'CERTIFICATION', 'HOLIDAY_SUPPORT', 'OTHER']),
  grossPaisa: paisaSchema.positive(),
  tdsPaisa: paisaSchema.min(0),
  isTaxable: z.boolean().default(true),
  employerName: z.string().optional(),
  payerName: z.string().optional(),
  earnedPeriod: z.string().optional(),
  comment: z.string().optional(),
  idempotencyKey: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Admin schemas
// ---------------------------------------------------------------------------

export const createAdminUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(['USER', 'ADMIN']).default('USER'),
});

export const patchAdminUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['ADMIN']).optional(),
});

export const deactivateUserSchema = z.object({
  until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  reason: z.string().optional(),
});
