# FinTrack BD — Architecture

> **Owns:** stack, repository layout, database schema, API endpoints, auth, category routing, derived-value definitions, tax-engine types, testing and deployment.
> Constraints are in `rules.md`. Feature behaviour, tax formulas and acceptance fixtures are in `brd.md`. Reasons are in `adr/`.

---

## Stack

One Next.js app serves the frontend and the API (ADR-0001).

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 14, App Router, TypeScript | Pages plus Route Handlers in one deployment |
| API | Route Handlers under `app/api/v1/` | No separate server process |
| Database | PostgreSQL 16 | Neon in production; any PostgreSQL 16 locally and in CI |
| ORM | Prisma | `@prisma/adapter-neon` only when the host is Neon |
| Validation | Zod | Schemas in `packages/shared`, used by API and forms |
| Server state | TanStack Query v5 | Client Components only |
| Forms | React Hook Form + Zod | |
| Charts | Recharts | |
| Auth | JWT access token (`jose`) + opaque refresh cookie | Passwords hashed with `bcryptjs`, cost 12 |
| Email | Resend | Verification and password-reset emails only |
| PWA | `next-pwa` | Manifest, app-shell cache, offline notice |
| Tests | Vitest, Playwright | See §Testing |
| Hosting | Vercel | Auto-deploys `main` |
| Package manager | pnpm workspaces | Use `pnpm` for every install and script |

---

## Repository layout

```
fintrack-bd/
├── app/
│   ├── api/v1/            # Route Handlers: app/api/v1/<resource>/route.ts
│   ├── (app)/             # authenticated pages
│   ├── login/
│   └── layout.tsx
├── components/            # React components
├── lib/
│   ├── prisma.ts          # the only PrismaClient
│   ├── auth.ts            # getAuthUser, token helpers
│   ├── services/          # multi-row writes (routing, fixed expenses, loans, imports)
│   └── queries/           # derived-value SQL (§Derived values)
├── packages/
│   ├── shared/            # @fintrack/shared: Zod schemas, enums, money and date helpers
│   └── tax-engine/        # @fintrack/tax-engine: pure tax calculation
├── prisma/                # schema.prisma, migrations, seed.ts
├── scripts/               # user-create.ts, reset-password.ts, set-role.ts, test-matrix.ts
├── tests/
│   ├── api/               # route-handler tests, one file per test-matrix area
│   └── helpers/           # createTestContext, factories
├── e2e/                   # Playwright smoke flows
├── middleware.ts
└── pnpm-workspace.yaml
```

`@fintrack/shared` exports: `formatBDT`, `parseBDT`, `toDecimalString`, `toPaisa`, `roundHalfUp`, `paisaSchema`, `fiscalYear`, `fiscalYearRange`, `todayInDhaka`, `toDbDate`, `fromDbDate`, all enums and all request/response schemas.

---

## Environment variables

Documented in `.env.example`; set in the Vercel dashboard for production and `.env.local` for development.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (`?sslmode=require` on Neon) |
| `TEST_DATABASE_URL` | Separate database for integration and E2E tests |
| `JWT_SECRET` | Signs access tokens |
| `SEED_USER_EMAIL`, `SEED_USER_PASSWORD`, `SEED_USER_NAME` | The owner's account, created already verified by the seed script |
| `APP_URL` | Base URL used in email links |
| `RESEND_API_KEY`, `EMAIL_FROM` | Sending verification and password-reset emails |
| `SIGNUP_MODE` | `open` or `closed`; when `closed`, registration returns `403` |
| `SENTRY_DSN` | Optional error tracking; disabled when unset |

---

## Authentication and sessions

Anyone can register, and each user sees only their own data (ADR-0010).

- **Access token:** JWT (HS256), 15-minute lifetime, held in memory on the client and sent as `Authorization: Bearer`.
- **Refresh token:** 32 random bytes, stored only as a SHA-256 hash in `refresh_tokens`. Sent as the `refresh_token` cookie: `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=30 days`.
- **Rotation:** every refresh revokes the presented token and issues a new one. Presenting a revoked token revokes all of that user's tokens.
- **Session length:** 30 days without a refresh ends the session.
- **Rate limit:** 10 failed logins per IP and per email in 15 minutes, counted in `auth_rate_limits`; then `429`. Registration, resend-verification and password-reset requests are limited to 5 per IP and per email per hour.
- **Origin check:** `/auth/refresh` and `/auth/logout` reject a request whose `Origin` header is present and is not the app's origin.

```ts
// lib/auth.ts
export async function getAuthUser(req: Request): Promise<AuthUser> // throws AuthError(401)

// app/api/v1/transactions/route.ts
export async function GET(req: Request) {
  const user = await getAuthUser(req);
  // every query: where: { userId: user.id, ... }
}
```

**Client flow.** On load the app calls `POST /auth/refresh` to obtain an access token. A `401` from any request triggers one refresh and one retry; if the refresh fails the app goes to `/login`. The login page attempts a silent refresh before showing the form.

**`middleware.ts`** redirects requests for app pages to `/login` when the refresh cookie is absent; the public account pages are exempt. It is a navigation convenience only; `getAuthUser` in each route handler is the authorisation check.

**Registration and recovery**

- `POST /auth/register` (name, email, password of at least 10 characters) creates the user unverified, runs `provisionNewUser` in the same database transaction and emails a verification link. With `SIGNUP_MODE=closed` it returns `403` `SIGNUP_CLOSED`.
- `POST /auth/verify-email` (token) sets `email_verified_at`. Login before verification returns `403` `EMAIL_NOT_VERIFIED`. `POST /auth/resend-verification` sends a new link.
- `POST /auth/password-reset/request` emails a reset link. `POST /auth/password-reset/confirm` (token, new password) sets the password and revokes every refresh token of that user.
- Email tokens are 32 random bytes, stored only as a SHA-256 hash in `email_tokens`, and single use. Verification links last 24 hours; reset links last 1 hour.
- Register, resend and reset-request return the same response whether or not the email is registered.
- `provisionNewUser(userId)` gives a new account the 16 starter categories and the three seeded `tax_years` rows, read from data files in `prisma/defaults/`. It creates nothing else.
- Email goes through `lib/email.ts`. Tests use an in-memory transport and read the links from it.

**Account scripts.** `pnpm user:create` (also run by the seed; creates a verified user), `pnpm user:reset-password` and `pnpm user:set-role` operate directly on the database. They are the site owner's tools and the only way to demote or remove an admin.

**Admin role and account status** (ADR-0011)

- `users.role` is `USER` or `ADMIN`. The seeded owner account is an `ADMIN`. `getAdminUser(req)` in `lib/auth.ts` wraps `getAuthUser` and throws `403` `ADMIN_ONLY` for other users; every `/admin/*` route starts with it.
- Admin routes read and write `users`, `user_payments`, `admin_actions` and the token tables only. They never query a financial table.
- **Deactivation:** `deactivated_at` with an optional `deactivated_until` date and a reason. A deactivated user's refresh tokens are revoked and login returns `403` `ACCOUNT_DEACTIVATED`. When `deactivated_until` has passed, the next login clears the deactivation; without a date the account stays deactivated until an admin reactivates it. The user's data is kept.
- **Admin-created accounts** are created verified with no password, and the user receives a set-password link (a `PASSWORD_RESET` token valid for 24 hours).
- **Deletion** applies to `USER` accounts only. It permanently removes the user and every row they own, in one database transaction.
- **Guards:** every write under `/admin/users/:id` is refused when the target is the acting admin (`409` `SELF_ACTION`) or any other admin (`409` `ADMIN_PROTECTED`). An admin can create an admin or promote a user to admin; after that, an admin account is changed only by its owner through Settings or by the site owner's `pnpm user:set-role` script. Admin accounts are never deleted from the app.
- **Payments** are a manual log kept by the admin: date paid, amount, the date it covers until, and a note. There is no payment gateway and nothing is deactivated automatically when a payment lapses. A subscription feature is a Phase 3 candidate.
- Every admin write appends a row to `admin_actions`.
- `users.last_login_at` is set on each successful login.

---

## Database schema

20 tables. Column names are `snake_case` in PostgreSQL and mapped to `camelCase` in Prisma. Every table except `auth_rate_limits` has an `id UUID` primary key, and every table except `users`, `auth_rate_limits` and `admin_actions` has `user_id`. Money columns are `BIGINT` Paisa; dates follow `rules.md` §2.

| Table | Purpose |
|---|---|
| `users` | The account |
| `refresh_tokens` | Hashed refresh tokens |
| `email_tokens` | Hashed email-verification and password-reset tokens |
| `user_payments` | Admin's manual log of a user's payment dates |
| `admin_actions` | Audit log of admin writes |
| `auth_rate_limits` | Failed-login counters |
| `categories` | Category names with a routing type |
| `transactions` | Every money movement except income; soft-deleted |
| `savings_accounts` | Savings, DPS, Sanchaypatra, investment and cash accounts |
| `loan_persons` | People in the Borrow-Loan ledger |
| `loan_entries` | Loan detail, one-to-one with a loan Transaction |
| `income_entries` | Monthly income by type; soft-deleted |
| `holiday_support_entries` | Worksheet of holiday days worked |
| `fixed_expenses` | Fixed Expense templates |
| `fixed_expense_instances` | One instance per template per month |
| `tax_years` | Per-Fiscal-Year tax configuration and filing state |
| `tax_investments` | Rebate investments that have no transactions |
| `budgets` | Monthly category limits with history |
| `notifications` | In-app alerts |
| `import_batches` | CSV import previews, commits and undos |

### Columns

**`users`** — `email` (unique, case-insensitive), `password_hash` (null until an admin-created user sets one), `name`, `role` (UserRole), `email_verified_at` (null until verified), `deactivated_at`, `deactivated_until`, `deactivation_reason`, `last_login_at`, `created_at`, `updated_at`

**`user_payments`** — `user_id`, `paid_on`, `amount_paisa`, `covers_until`, `note`, `recorded_by` (admin's user id), `created_at`

**`admin_actions`** — `admin_id`, `target_user_id` (kept as plain text after the user is deleted), `target_email`, `action`, `detail`, `created_at`. This table has no `user_id`.

**`refresh_tokens`** — `token_hash` (unique), `expires_at`, `revoked_at`, `created_at`

**`email_tokens`** — `purpose` (EmailTokenPurpose), `token_hash` (unique), `expires_at`, `used_at`, `created_at`

**`auth_rate_limits`** — `key` (PK: `ip:<addr>` or `email:<addr>`), `window_start`, `attempts`

**`categories`** — `name` (unique per user, case-insensitive), `routing_type` (RoutingType; fixed once a Transaction uses the category), `color_hex`, `is_archived`

**`transactions`** — `date`, `amount_paisa` (> 0), `description`, `category_id`, `type` (RoutingType, copied from the category at creation), `payment_method`, `savings_account_id` (nullable FK), `tax_fiscal_year` (nullable; set for `TAX_PAYMENT`), `idempotency_key` (unique per user), `import_batch_id` (nullable), `is_deleted`, `deleted_at`, `created_at`, `updated_at`. Indexes: `(user_id, date)`, `(user_id, savings_account_id)`.

**`savings_accounts`** — `name`, `type` (SavingsAccountType), `bank_name`, `last_four`, `opening_balance_paisa`, `opening_date`, `monthly_installment_paisa` (DPS), `maturity_date` (DPS), `interest_rate_bps` (optional), `closed_on` (nullable)

**`loan_persons`** — `name` (unique per user, case-insensitive), `notes`

**`loan_entries`** — `loan_person_id`, `transaction_id` (unique, required), `direction` (LoanDirection), `reason`, `return_due_date` (nullable), `is_settlement`. Amount, date, payment method and deletion state are read from the paired Transaction.

**`income_entries`** — `month`, `fiscal_year` (set from `fiscalYear(month)` on write), `income_type` (IncomeType), `gross_paisa`, `tds_paisa` (0 ≤ TDS ≤ gross), `is_taxable`, `employer_name`, `payer_name` and `earned_period` (Cheer), `comment`, `idempotency_key` (unique per user), `import_batch_id`, `is_deleted`, `deleted_at`, `created_at`, `updated_at`. Index: `(user_id, fiscal_year)`.

**`holiday_support_entries`** — `date`, `days`, `rate_type` (`DAY` | `HOLIDAY`), `rate_paisa` (per day, copied onto the entry), `amount_paisa` (= days × rate), `note`

**`fixed_expenses`** — `name`, `standard_amount_paisa`, `due_day` (1–31), `category_id`, `savings_account_id` (required when the category routes to `SAVINGS_DEPOSIT`), `start_month`, `end_month` (nullable; null means active)

**`fixed_expense_instances`** — `fixed_expense_id`, `month`, `due_date`, `standard_amount_paisa` (copied at creation), `status` (FixedExpenseStatus), `actual_amount_paisa`, `paid_date`, `transaction_id`, `note`. Unique: `(fixed_expense_id, month)`.

**`tax_years`** — `fiscal_year` (unique per user), `config_json` (TaxYearConfig), `config_confirmed_at` (null means provisional), `filed_on`, `filed_result_json` (TaxResult snapshot at filing), `is_locked`

**`tax_investments`** — `fiscal_year` (unique per user), `stocks_paisa`, `insurance_paisa`, `others_paisa`

**`budgets`** — `category_id`, `effective_from_month`, `monthly_limit_paisa` (null means "no budget from this month"). Unique: `(user_id, category_id, effective_from_month)`.

**`notifications`** — `type` (NotificationType), `message`, `entity_type`, `entity_id`, `dedupe_key` (unique per user), `is_read`, `resolved_at`, `created_at`

**`import_batches`** — `dataset` (ImportDataset), `filename`, `status` (`PREVIEWED` | `COMMITTED` | `UNDONE`), `row_count`, `rows_json`, `created_at`, `committed_at`, `undone_at`

### Enums

| Enum | Values |
|---|---|
| RoutingType | `NONE`, `SAVINGS_DEPOSIT`, `SAVINGS_WITHDRAWAL`, `SAVINGS_INTEREST`, `LOAN_GIVEN`, `LOAN_RECEIVED`, `TAX_PAYMENT` |
| PaymentMethod | `CASH`, `BKASH`, `BANK`, `CARD` |
| IncomeType | `SALARY`, `CHEER`, `PROFIT_SHARE`, `EID_BONUS`, `LEAVE_ENCASHMENT`, `CERTIFICATION`, `HOLIDAY_SUPPORT`, `OTHER` |
| SavingsAccountType | `SAVINGS`, `DPS`, `SANCHAYPATRA`, `INVESTMENT`, `CASH` |
| FixedExpenseStatus | `PENDING`, `PAID`, `SKIPPED` |
| LoanDirection | `GIVEN`, `RECEIVED` |
| NotificationType | `FIXED_DUE_SOON`, `FIXED_OVERDUE`, `LOAN_RETURN_DUE_SOON`, `LOAN_RETURN_OVERDUE`, `BUDGET_80`, `BUDGET_EXCEEDED`, `TAX_CONFIG_PROVISIONAL` |
| ImportDataset | `INCOME`, `TRANSACTIONS`, `LOAN_ENTRIES` |
| EmailTokenPurpose | `VERIFY_EMAIL`, `PASSWORD_RESET` |
| UserRole | `USER`, `ADMIN` |

### Prisma boundary

Prisma returns `BIGINT` as `bigint` and `DATE` as a `Date` at UTC midnight. Convert at the data-access boundary with `toPaisa()` and `fromDbDate()`, and write dates with `toDbDate()`. Code above `lib/` sees only `number` and date strings.

```ts
// lib/prisma.ts — Neon adapter only for Neon hosts
const url = process.env.DATABASE_URL!;
export const prisma = new URL(url).hostname.endsWith('neon.tech')
  ? new PrismaClient({ adapter: new PrismaNeon(new Pool({ connectionString: url })) }) // neonConfig.webSocketConstructor = ws
  : new PrismaClient();
```

---

## Category routing

A category's `routing_type` decides what a Transaction means. The value is copied to `transactions.type` at creation (ADR-0006).

| Type | Meaning | Required link | Cash | Spending and budgets | Other effect |
|---|---|---|---|---|---|
| `NONE` | Spending | none | out | counted | none |
| `SAVINGS_DEPOSIT` | Transfer into a savings account | `savings_account_id` | out | excluded | balance up; rebate bucket from the account type |
| `SAVINGS_WITHDRAWAL` | Withdrawal or maturity payout | `savings_account_id` | in | excluded | balance down; may not exceed the balance |
| `SAVINGS_INTEREST` | Interest or profit credited to the account | `savings_account_id` | none | excluded | balance up |
| `LOAN_GIVEN` | Money lent or repaid by the user | Loan Person | out | excluded | Loan Entry `GIVEN` |
| `LOAN_RECEIVED` | Money borrowed or repaid to the user | Loan Person | in | excluded | Loan Entry `RECEIVED` |
| `TAX_PAYMENT` | Income tax paid directly | `tax_fiscal_year` | out | excluded | adds to Tax Paid |

Starter categories, created for every new user: Groceries, Dining, Transport, Utility, Rent, Entertainment, Health, Shopping, Other (`NONE`); DPS / Savings and Investment (Sanchaypatra) (`SAVINGS_DEPOSIT`); Savings Withdrawal; Savings Interest; Loan Given; Loan Received; Tax Payment.

`CategoryRoutingService` in `lib/services/` is the single write path for Transactions.

**Create**
- Validates the required link, that it belongs to the user, and for savings types that `date ≥ opening_date` and the account is not closed.
- Loan types accept `loan_person_id` or `loan_person_name`; an unknown name creates the Loan Person. The Transaction, the Loan Entry and any new Loan Person are written in one database transaction.
- `TAX_PAYMENT` defaults `tax_fiscal_year` to `fiscalYear(date)`; the user may choose the previous Fiscal Year.

**Update**
- Amount, date, description, payment method and links may change. The category may change only to another category with the same routing type; to change the type, delete and re-enter.

**Soft delete**
- Derived totals follow automatically. If the Transaction paid a Fixed Expense instance, the instance returns to `PENDING` in the same database transaction.

---

## Derived values

These are the only definitions (ADR-0005). All exclude soft-deleted rows. "Dated in M" means `date` within calendar month M.

| Value | Definition |
|---|---|
| Savings balance | `opening_balance_paisa` + Σ`SAVINGS_DEPOSIT` + Σ`SAVINGS_INTEREST` − Σ`SAVINGS_WITHDRAWAL` for the account |
| Running Balance (Loan Person) | Σ amounts of `GIVEN` entries − Σ amounts of `RECEIVED` entries |
| Total Spending (range) | Σ Transactions of type `NONE` |
| Tax Payments (range) | Σ Transactions of type `TAX_PAYMENT`, by date |
| In-Hand Income (month) | Σ (`gross_paisa` − `tds_paisa`) of Income Entries for the month |
| Net Savings (range) | In-Hand Income − Total Spending − Tax Payments |
| Savings Rate (range) | Net Savings ÷ In-Hand Income, in basis points; null when In-Hand Income is 0 |
| Fixed Commitments (month) | Σ over the month's instances: `actual_amount_paisa` if `PAID`, `standard_amount_paisa` if `PENDING`, 0 if `SKIPPED` |
| Discretionary Cash (month) | In-Hand Income − Fixed Commitments |
| Remaining to Spend (month) | In-Hand Income + cash in − cash out − Σ `standard_amount_paisa` of `PENDING` instances. Cash in: `SAVINGS_WITHDRAWAL`, `LOAN_RECEIVED`. Cash out: `NONE`, `SAVINGS_DEPOSIT`, `LOAN_GIVEN`, `TAX_PAYMENT`. |
| DPS total (Fiscal Year) | Σ `SAVINGS_DEPOSIT` dated in the Fiscal Year whose account type is `DPS` |
| Sanchaypatra total (Fiscal Year) | Σ `SAVINGS_DEPOSIT` dated in the Fiscal Year whose account type is `SANCHAYPATRA` |
| Tax Paid (Fiscal Year) | Σ `tds_paisa` of Income Entries in the Fiscal Year + Σ `TAX_PAYMENT` with that `tax_fiscal_year` |

**Estimated income.** For Discretionary Cash and Remaining to Spend, when the month has no `SALARY` Income Entry, add the In-Hand amount of the most recent earlier `SALARY` entry and return `income_is_estimated: true`.

```sql
-- Savings balance
SELECT sa.opening_balance_paisa
     + COALESCE(SUM(t.amount_paisa) FILTER (WHERE t.type IN ('SAVINGS_DEPOSIT','SAVINGS_INTEREST')), 0)
     - COALESCE(SUM(t.amount_paisa) FILTER (WHERE t.type = 'SAVINGS_WITHDRAWAL'), 0) AS balance_paisa
FROM savings_accounts sa
LEFT JOIN transactions t ON t.savings_account_id = sa.id AND t.is_deleted = FALSE
WHERE sa.id = $1 AND sa.user_id = $2
GROUP BY sa.id;
```

---

## Tax engine

`packages/tax-engine` exports two pure functions. The calculation steps and parameter values are in `brd.md` §6.

```ts
type TaxYearConfig = {
  slabs: { width_paisa: number | null; rate_bps: number }[]; // in order; null width = remainder
  salary_exemption: { numerator: number; denominator: number; cap_paisa: number };
  rebate: { income_rate_bps: number; investment_rate_bps: number; max_paisa: number };
  investment_caps_paisa: Record<'dps' | 'sanchaypatra' | 'stocks' | 'insurance' | 'others', number | null>;
  minimum_tax_paisa: number;
  early_filing: { rate_bps: number; max_paisa: number; deadline_mmdd: string } | null;
};

type TaxInput = {
  fiscalYear: string;
  config: TaxYearConfig;
  incomeEntries: { month: string; income_type: IncomeType; gross_paisa: number; tds_paisa: number; is_taxable: boolean }[];
  investments: Record<'dps' | 'sanchaypatra' | 'stocks' | 'insurance' | 'others', number>;
  taxPaymentsPaisa: number;
  filedOn: string | null;
  asOf: string; // todayInDhaka(), passed in by the caller
};

calculateTax(input: TaxInput): TaxResult
forecastTax(input: TaxInput): TaxResult // adds projected SALARY entries, then calls calculateTax
```

`TaxResult` returns every intermediate figure the Tax Dashboard shows: gross income, exemption, taxable income, per-slab breakdown, gross tax, per-category invested/cap/eligible amounts, the three rebate candidates and the rebate, whether minimum tax applied, early-filing rebate (applied and potential), net tax, TDS paid, tax payments, tax paid, remaining tax (signed), remaining salary months, suggested monthly TDS, required further investment for maximum rebate, and months entered.

The API route loads `tax_years.config_json`, the Fiscal Year's Income Entries, the derived DPS and Sanchaypatra totals, `tax_investments` and Tax Payments, then calls the engine. The `tax_years` Zod schema in `@fintrack/shared` validates `config_json` on every write.

---

## Generated on read

No scheduler exists (ADR-0009). Each function is idempotent through a unique key.

**`ensureInstances(userId, month)`** — called by the Fixed Expense and dashboard endpoints.
- Creates the missing instance for each template where `start_month ≤ month ≤ end_month` (or no end), for the current month and earlier months only. Future months are rendered from templates without rows.
- `due_date` is `due_day` clamped to the last day of the month.
- A new template's `start_month` is the current month if its `due_day` is today or later, otherwise next month.
- Editing a template's standard amount updates the current month's instance only while it is `PENDING`. Earlier instances keep their copied amount.
- Deactivating a template sets `end_month` to the current month.
- Transitions: `PENDING → PAID` (pay), `PENDING → SKIPPED` (skip), `SKIPPED → PENDING` (reopen), `PAID → PENDING` (its Transaction was soft-deleted).
- Due soon: `PENDING` and due in 0 to 3 days. Overdue: `PENDING` and `due_date` before today.

**`ensureTaxYear(userId, fiscalYear)`** — called by tax endpoints. Creates a missing row by copying the latest earlier year's `config_json`, with `config_confirmed_at` null.

**`refreshNotifications(userId)`** — called by `GET /notifications` and `GET /dashboard/summary`. Computes the current alert set, upserts each by `dedupe_key`, and sets `resolved_at` on alerts that no longer apply.

| Type | Condition | `dedupe_key` |
|---|---|---|
| `FIXED_DUE_SOON` | instance is due soon | `FIXED_DUE_SOON:<instance_id>` |
| `FIXED_OVERDUE` | instance is overdue | `FIXED_OVERDUE:<instance_id>` |
| `LOAN_RETURN_DUE_SOON` | entry's `return_due_date` is in 0 to 3 days and the person's Running Balance is still non-zero in that entry's direction | `LOAN_RETURN_DUE_SOON:<entry_id>` |
| `LOAN_RETURN_OVERDUE` | as above, with the date passed | `LOAN_RETURN_OVERDUE:<entry_id>` |
| `BUDGET_80` | category spending this month is at least 80% of its limit | `BUDGET_80:<category_id>:<YYYY-MM>` |
| `BUDGET_EXCEEDED` | category spending this month exceeds its limit | `BUDGET_EXCEEDED:<category_id>:<YYYY-MM>` |
| `TAX_CONFIG_PROVISIONAL` | current Fiscal Year's `config_confirmed_at` is null | `TAX_CONFIG_PROVISIONAL:<fiscal_year>` |

Entries dated on or before a Loan Person's latest settlement raise no loan alerts.

---

## Import and export

**Import** (`ImportDataset`: `INCOME`, `TRANSACTIONS`, `LOAN_ENTRIES`)

1. `GET /imports/templates/:dataset` returns a CSV template with a header row and one example.
2. `POST /imports/preview` (multipart, max 2 MB, 5,000 rows) parses and validates every row, stores the result as a `PREVIEWED` batch, and returns counts, totals and per-row errors.
3. `POST /imports/:id/commit` writes all rows through the same services as manual entry, in one database transaction. A batch with any error cannot be committed.
4. `POST /imports/:id/undo` soft-deletes the batch's rows and marks it `UNDONE`.

- Amount columns are BDT decimals (`1198.50`) parsed with `parseBDT`.
- Each row's `idempotency_key` is a UUIDv5 of the user, dataset, canonical row text and its occurrence number in the file, so importing the same file twice adds nothing.
- Categories and savings accounts are matched by name and must already exist; unknown Loan Person names are created.

| Dataset | Columns |
|---|---|
| `INCOME` | `month`, `income_type`, `gross_bdt`, `tds_bdt`, `is_taxable`, `employer_name`, `payer_name`, `earned_period`, `comment` |
| `TRANSACTIONS` | `date`, `amount_bdt`, `description`, `category`, `payment_method`, `savings_account`, `loan_person`, `tax_fiscal_year` |
| `LOAN_ENTRIES` | `date`, `person`, `direction`, `amount_bdt`, `reason`, `payment_method`, `return_due_date` |

**Export**

- `GET /export/full` downloads one JSON file: `schema_version`, `exported_at` and every table's rows for the user, without password hashes or tokens.
- CSV exports write amounts with `toDecimalString(paisa)` (`1198.50`, no grouping) so spreadsheets read them as numbers.

---

## API

Conventions are in `rules.md` §8. Paths below are relative to `/api/v1`. Collection routes live at `app/api/v1/<resource>/route.ts`, single-record routes at `app/api/v1/<resource>/[id]/route.ts`.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register` · `POST /auth/verify-email` · `POST /auth/resend-verification` · `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `POST /auth/change-password` · `POST /auth/password-reset/request` · `POST /auth/password-reset/confirm` |
| Profile | `GET /me` (includes `role`) · `PATCH /me` |
| Admin: users | `GET /admin/users` (filters: `q`, `status`, `role`, `page`) · `POST /admin/users` · `GET /admin/users/:id` · `PATCH /admin/users/:id` (name, email, promote to admin) · `DELETE /admin/users/:id` (users only) · `POST /admin/users/:id/deactivate` (`until`, `reason`) · `POST /admin/users/:id/reactivate` · `POST /admin/users/:id/resend-verification` · `POST /admin/users/:id/send-password-reset` |
| Admin: payments | `GET /admin/users/:id/payments` · `POST /admin/users/:id/payments` · `PATCH /admin/users/:id/payments/:paymentId` · `DELETE /admin/users/:id/payments/:paymentId` |
| Admin: audit | `GET /admin/actions?user_id=` |
| Health | `GET /health` (no auth) |
| Categories | `GET /categories` · `POST /categories` · `PATCH /categories/:id` |
| Transactions | `GET /transactions` (filters: `from`, `to`, `category_id`, `payment_method`, `type`, `min_paisa`, `max_paisa`, `q`, `page`, `page_size`) · `POST /transactions` · `GET /transactions/:id` · `PATCH /transactions/:id` · `DELETE /transactions/:id` · `POST /transactions/bulk-delete` |
| Income | `GET /income-entries` (`fiscal_year` or `month`) · `POST /income-entries` · `PATCH /income-entries/:id` · `DELETE /income-entries/:id` · `GET /income-entries/summary?fiscal_year=` |
| Holiday Support | `GET /holiday-support-entries` · `POST /holiday-support-entries` · `PATCH /holiday-support-entries/:id` · `DELETE /holiday-support-entries/:id` |
| Savings | `GET /savings-accounts` · `POST /savings-accounts` · `GET /savings-accounts/:id` · `PATCH /savings-accounts/:id` · `GET /savings-accounts/:id/transactions` |
| Fixed Expenses | `GET /fixed-expenses` · `POST /fixed-expenses` · `PATCH /fixed-expenses/:id` · `GET /fixed-expense-instances?from=YYYY-MM&to=YYYY-MM` · `POST /fixed-expense-instances/:id/pay` · `POST /fixed-expense-instances/:id/skip` · `POST /fixed-expense-instances/:id/reopen` |
| Loans | `GET /loan-persons` · `POST /loan-persons` · `PATCH /loan-persons/:id` · `GET /loan-persons/:id/entries` · `POST /loan-persons/:id/entries` · `PATCH /loan-persons/:id/entries/:entryId` · `DELETE /loan-persons/:id/entries/:entryId` · `POST /loan-persons/:id/settle` · `GET /loans/summary` |
| Tax | `GET /tax/summary?fiscal_year=` · `GET /tax/forecast?fiscal_year=` · `GET /tax/compare?fiscal_year=` · `GET /tax-years` · `GET /tax-years/:fiscalYear` · `PUT /tax-years/:fiscalYear` · `POST /tax-years/:fiscalYear/confirm` · `POST /tax-years/:fiscalYear/file` · `POST /tax-years/:fiscalYear/reopen` · `GET /tax-investments/:fiscalYear` · `PUT /tax-investments/:fiscalYear` |
| Budgets | `GET /budgets?month=YYYY-MM` · `PUT /budgets/:categoryId` · `DELETE /budgets/:categoryId` |
| Notifications | `GET /notifications` · `POST /notifications/:id/read` · `POST /notifications/read-all` |
| Dashboard | `GET /dashboard/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` |
| Analytics | `GET /analytics/monthly?from=YYYY-MM&to=YYYY-MM` · `GET /analytics/category-trend?months=12` · `GET /analytics/income-trend?fiscal_year=` |
| Import | `GET /imports/templates/:dataset` · `POST /imports/preview` · `POST /imports/:id/commit` · `POST /imports/:id/undo` · `GET /imports` |
| Export | `GET /export/full` · `GET /export/transactions.csv?from=&to=` · `GET /export/income.csv?fiscal_year=` · `GET /export/loan-persons/:id.csv` · `GET /export/monthly-summary.csv?from=&to=` |

Notes:
- Savings deposits, withdrawals and interest are created with `POST /transactions` using a category of the matching routing type.
- `GET /dashboard/summary` returns everything the dashboard shows in one response. Discretionary Cash, Remaining to Spend and the Fixed Expense panel always describe the current calendar month; the tax snapshot always describes the current Fiscal Year; the other figures follow `from` and `to`.
- `POST /tax-years/:fiscalYear/file` stores `filed_on`, snapshots the `TaxResult` into `filed_result_json` and sets `is_locked`. While locked, writes to that year's Income Entries, `tax_investments` and `config_json` return `409` with `code: "TAX_YEAR_LOCKED"`. `reopen` clears the lock.

---

## Security

1. `getAuthUser` on every route except `/auth/*` and `/health`; `401` otherwise.
2. `user_id` filter on every query; another user's record is `404`.
3. Refresh cookie attributes and rotation as in §Authentication.
4. Login, registration and recovery rate limits as in §Authentication; auth endpoints never reveal whether an email is registered.
5. Prisma parameterised queries; `$queryRaw` only with tagged templates.
6. HTTPS only in production.
7. Last four digits only for bank account numbers.
8. Logs and error reports carry no amounts, descriptions or request bodies. Sentry's `beforeSend` strips request data.
9. `/admin/*` routes require `getAdminUser` and touch account tables only; no admin response contains another user's financial data.

---

## Frontend

- **Data access:** Client Components call `/api/v1` through an Axios instance in `lib/api.ts` (Bearer header, one refresh-and-retry on `401`) with TanStack Query. Server Components render the static shell only.
- **Public routes:** `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`.
- **App routes:** `/` (Dashboard), `/income`, `/transactions`, `/budgets`, `/fixed-expenses`, `/savings`, `/loans`, `/tax`, `/history`, `/settings`, `/settings/tax-years`, `/settings/import`, `/settings/export`.
- **Admin routes:** `/admin/users`, `/admin/users/[id]`. Shown in the navigation only when `role` is `ADMIN`; the API enforces access.
- **Navigation:** `design.md` §8 — left sidebar on desktop; on mobile a bottom tab bar (Home, Transactions, Add, Fixed, More).
- **Theme:** light and dark tokens from `design.md` §2 as CSS custom properties; the choice is stored in `localStorage`.
- **Fonts:** Inter and Space Grotesk through `next/font`, so they are self-hosted and cached offline.
- **PWA:** manifest at `/public/manifest.json` (`theme_color: "#3A5FCD"`, `display: standalone`), service worker from `next-pwa` caching the app shell.
- **Offline:** the MVP has no offline queue. When offline the app shows a notice and disables submit buttons. A failed submit keeps the form's contents and retries with the same `idempotency_key`.

---

## Testing

| Seam | Scope | Tooling |
|---|---|---|
| 1. Tax engine | `calculateTax` and `forecastTax` called directly with explicit config | Vitest; 100% branch coverage gate |
| 2. Route handlers | Every other backend behaviour, by calling the exported `GET`/`POST`/… functions with a `Request` | Vitest against PostgreSQL 16 (`TEST_DATABASE_URL`) |
| 3. Smoke flows | Five end-to-end journeys through the built app | Playwright against `next build && next start` |

**Development is test-first.** The behaviours to protect are listed in the regression test matrix at `.scratch/fintrack-bd-mvp/test-cases/`. Each case becomes one automated test whose title starts with the case id, written and seen to fail before the code that passes it, one case at a time.

| Test code | Location |
|---|---|
| Shared helpers and tax engine | next to the source: `packages/*/src/**/*.test.ts` |
| Route handlers | `tests/api/<area>.test.ts`, one file per matrix file |
| Components | next to the component: `components/**/*.test.tsx` |
| Smoke flows | `e2e/*.spec.ts` |
| Helpers and factories | `tests/helpers/` |

`pnpm test:matrix` lists matrix case ids that have no test with that id in its title.

- `createTestContext()` (ticket 01) migrates the test database once per run, truncates all tables between test files, seeds a user and returns helpers that build authenticated `Request` objects.
- No database mocks and no service-layer unit tests: if the HTTP response is right, the feature is right.
- Helpers in `@fintrack/shared` (`formatBDT`, `parseBDT`, `fiscalYear`, …) have unit tests.
- Form components have Vitest + Testing Library tests for validation and Paisa conversion.
- CI (GitHub Actions) runs lint, typecheck, Vitest and Playwright with a `postgres:16` service container.

Smoke flows: register, verify the email, sign in and add Spending; mark a DPS Fixed Expense Paid and see the savings balance rise; record a loan and see the Running Balance; open the Tax Dashboard on `AC-TAX-1` data; preview and commit a CSV import.

---

## Deployment

| Component | Platform | Notes |
|---|---|---|
| Next.js app | Vercel (free tier) | One deployment; `main` auto-deploys |
| PostgreSQL | Neon (free tier) | Vercel–Neon integration injects `DATABASE_URL` |
| Email | Resend (free tier) | Verification and password-reset emails |
| Error tracking | Sentry (free tier), optional | Enabled only when `SENTRY_DSN` is set |

Scaling later means upgrading the Vercel and Neon plans; no code changes.

### Performance targets

Measured warm, at the 95th percentile, with 500 Transactions.

| Operation | Target |
|---|---|
| `GET /dashboard/summary` and first dashboard render | under 2 s |
| Transaction create round trip | under 500 ms |
| `GET /tax/summary` | under 300 ms |
| First request after the database has auto-suspended | under 5 s, with skeleton screens shown |
