export enum RoutingType {
  NONE = 'NONE',
  SAVINGS_DEPOSIT = 'SAVINGS_DEPOSIT',
  SAVINGS_WITHDRAWAL = 'SAVINGS_WITHDRAWAL',
  SAVINGS_INTEREST = 'SAVINGS_INTEREST',
  LOAN_GIVEN = 'LOAN_GIVEN',
  LOAN_RECEIVED = 'LOAN_RECEIVED',
  TAX_PAYMENT = 'TAX_PAYMENT',
}

export enum PaymentMethod {
  CASH = 'CASH',
  BKASH = 'BKASH',
  BANK = 'BANK',
  CARD = 'CARD',
}

export enum IncomeType {
  SALARY = 'SALARY',
  CHEER = 'CHEER',
  PROFIT_SHARE = 'PROFIT_SHARE',
  EID_BONUS = 'EID_BONUS',
  LEAVE_ENCASHMENT = 'LEAVE_ENCASHMENT',
  CERTIFICATION = 'CERTIFICATION',
  HOLIDAY_SUPPORT = 'HOLIDAY_SUPPORT',
  OTHER = 'OTHER',
  SAVINGS_INTEREST = 'SAVINGS_INTEREST',
  SANCHAYPATRA_PROFIT = 'SANCHAYPATRA_PROFIT',
}

export enum SavingsAccountType {
  SAVINGS = 'SAVINGS',
  MFS = 'MFS',
  DPS = 'DPS',
  FDR = 'FDR',
  SANCHAYPATRA = 'SANCHAYPATRA',
  UNIVERSAL_PENSION = 'UNIVERSAL_PENSION',
  STOCKS = 'STOCKS',
  INSURANCE = 'INSURANCE',
  /** "Other" investment kind */
  INVESTMENT = 'INVESTMENT',
  CASH = 'CASH',
}

/** Payment Accounts: the only accounts that pay Spending, receive income and send transfers. */
export const PAYMENT_ACCOUNT_TYPES: readonly string[] = ['SAVINGS', 'MFS', 'CASH'];

/** Account types that must sit under a Parent Account. */
export const CHILD_ACCOUNT_TYPES: readonly string[] = ['DPS', 'FDR'];

/** Account types that can be a Parent Account. */
export const PARENT_ACCOUNT_TYPES: readonly string[] = ['SAVINGS', 'MFS'];

/** Investment Account kinds, each feeding the Tax Rebate bucket of the same kind. */
export const INVESTMENT_ACCOUNT_TYPES: readonly string[] = ['SANCHAYPATRA', 'UNIVERSAL_PENSION', 'STOCKS', 'INSURANCE', 'INVESTMENT'];

/** Tax Rebate investment bucket that a deposit into each account type counts toward. */
export const REBATE_BUCKET_BY_ACCOUNT_TYPE: Readonly<Record<string, 'dps' | 'sanchaypatra' | 'universal_pension' | 'stocks' | 'insurance' | 'others'>> = {
  DPS: 'dps',
  SANCHAYPATRA: 'sanchaypatra',
  UNIVERSAL_PENSION: 'universal_pension',
  STOCKS: 'stocks',
  INSURANCE: 'insurance',
  INVESTMENT: 'others',
};

export enum FixedExpenseStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  SKIPPED = 'SKIPPED',
}

export enum FixedExpenseCadence {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUAL = 'ANNUAL',
}

export enum LoanDirection {
  GIVEN = 'GIVEN',
  RECEIVED = 'RECEIVED',
}

export enum NotificationType {
  FIXED_DUE_SOON = 'FIXED_DUE_SOON',
  FIXED_OVERDUE = 'FIXED_OVERDUE',
  LOAN_RETURN_DUE_SOON = 'LOAN_RETURN_DUE_SOON',
  LOAN_RETURN_OVERDUE = 'LOAN_RETURN_OVERDUE',
  BUDGET_80 = 'BUDGET_80',
  BUDGET_EXCEEDED = 'BUDGET_EXCEEDED',
  TAX_CONFIG_PROVISIONAL = 'TAX_CONFIG_PROVISIONAL',
}

export enum ImportDataset {
  INCOME = 'INCOME',
  TRANSACTIONS = 'TRANSACTIONS',
  LOAN_ENTRIES = 'LOAN_ENTRIES',
}

export enum EmailTokenPurpose {
  VERIFY_EMAIL = 'VERIFY_EMAIL',
  PASSWORD_RESET = 'PASSWORD_RESET',
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}
