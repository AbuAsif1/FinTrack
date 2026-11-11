# FinTrack BD — Coding Rules

> **Owns:** the constraints every change must obey. Read this for every ticket.
> Mechanics, schema and endpoints live in `architecture.md`. Reasons live in `adr/`. Breaking a rule here is a bug, not a style choice.

---

## 1. Money

**Every amount is integer Paisa (1 BDT = 100 Paisa) in the database, in JSON and in TypeScript.** (ADR-0003)

| Where | Rule |
|---|---|
| DB column | `BIGINT`, name ends in `_paisa` |
| JSON | integer number, field name ends in `_paisa` (`"amount_paisa": 10000` is ৳100.00) |
| TypeScript | `number`; convert Prisma `bigint` with `toPaisa()` at the data-access boundary |
| Zod | `paisaSchema` (integer, safe-integer range) |
| Arithmetic | integers only; aggregate in SQL with `SUM(amount_paisa)` |
| User input → Paisa | `parseBDT(text)`: exact decimal-string parsing |
| Paisa → screen | `formatBDT(paisa)` on every amount shown |
| Paisa → CSV export | `toDecimalString(paisa)` (`"1198.50"`, no grouping) |
| Rates | integer basis points (`rate_bps`: 1000 is 10%) |
| Rounding | `roundHalfUp()` to the nearest Paisa |

All helpers come from `@fintrack/shared`.

```ts
formatBDT(200684600) // "৳20,06,846.00"  South Asian grouping, always two decimals, ৳ included
formatBDT(-314542)   // "−৳3,145.42"     U+2212 minus, before the ৳
parseBDT("1198.50")  // 119850
```

- `amount_paisa` on a Transaction is always positive. The Transaction's `type` gives the direction.
- `Intl.NumberFormat` and `toLocaleString()` cannot produce lakh/crore grouping, so `formatBDT()` is the only formatter.
- A float, a `DECIMAL` column, `parseFloat(x) * 100` or a bare `paisa / 100` anywhere in money code is a bug.

---

## 2. Dates and the two time axes

**Business dates are calendar dates in Asia/Dhaka.** (ADR-0004)

| Value | DB type | JSON |
|---|---|---|
| Transaction date, due date, paid date | `DATE` | `"YYYY-MM-DD"` |
| Month (income month, budget month, instance month) | `DATE` on the 1st of the month | `"YYYY-MM"` |
| Fiscal Year | `TEXT` | `"YYYY-YY"`, e.g. `"2025-26"` |
| Audit timestamps (`created_at`, `updated_at`, `deleted_at`) | `TIMESTAMPTZ` | ISO 8601 UTC |

```ts
import { fiscalYear, fiscalYearRange, todayInDhaka } from '@fintrack/shared';
fiscalYear("2025-07-01")   // "2025-26"
fiscalYear("2025-06-30")   // "2024-25"
fiscalYearRange("2025-26") // { from: "2025-07-01", to: "2026-06-30" }
todayInDhaka()             // "2026-11-12"
```

- Get "today" from `todayInDhaka()`. Get a Fiscal Year from `fiscalYear(dateString)`. These are the only places that know the timezone and the July boundary.
- Pass date strings between layers. Construct a `Date` object only inside `@fintrack/shared`.

**Two time axes, kept apart.** (ADR-0007)

| Axis | Used for | Income figure |
|---|---|---|
| Calendar month | Spending, budgets, Fixed Expenses, dashboard | In-Hand Income |
| Fiscal Year (1 Jul to 30 Jun) | Tax module, annual income totals | Gross Income |

One query aggregates on one axis. A fiscal-year preset on the dashboard is just a date range over calendar data.

---

## 3. Soft delete

- `transactions` and `income_entries` are soft-deleted: set `is_deleted = TRUE` and `deleted_at`.
- A Loan Entry is deleted by soft-deleting its paired Transaction.
- Every read and every aggregate over these tables filters `is_deleted = FALSE`.
- These tables never receive a SQL `DELETE`, including from import undo. The one exception is an admin deleting a whole account, which removes every row that user owns (ADR-0011).

---

## 4. Derived values

**Balances and totals are computed from rows, never stored.** (ADR-0005)

The definitions in `architecture.md` §Derived values are the only definitions. This covers savings account balance, Loan Person Running Balance, rebate-eligible DPS and Sanchaypatra totals, Tax Paid, Total Spending, Fixed Commitments, Discretionary Cash and Remaining to Spend.

- Compute them in SQL.
- Tables carry no balance or running-total column.

---

## 5. Category routing and atomic writes

- A Transaction's `type` is copied from its category's `routing_type` when it is created, and it never changes afterwards.
- Every write that touches more than one row runs in a single `prisma.$transaction(...)`: creating a loan Transaction with its Loan Entry, marking a Fixed Expense instance Paid, Settle Up, committing or undoing an import.
- If any part fails, nothing is written and the client receives one error.
- A category with a savings routing type requires `savings_account_id`. A loan routing type requires a Loan Person. A missing link is a `422` and nothing is written.

Routing types, their required links and their effects: `architecture.md` §Category routing.

---

## 6. Idempotency

- Every request that creates a money-moving record carries a client-generated `idempotency_key` (UUID) in the body: Transactions, Income Entries, Loan Entries, Settle Up.
- The key is stored with a unique constraint per user. A repeated key returns `409` with `code: "DUPLICATE"` and the existing record; the client treats that as success.
- State-changing actions are guarded by state: marking a Paid instance Paid again returns `409` with the existing Transaction.

---

## 7. Tax engine

- `packages/tax-engine` is pure: no I/O, no database, no clock, no constants. Signature: `calculateTax(input: TaxInput): TaxResult`.
- Every tax parameter comes from `tax_years.config_json`, loaded by the caller and passed in. Tax rates, caps and thresholds never appear in application code. (ADR-0008)
- The frontend imports the same function for live preview.
- 100% branch coverage on `packages/tax-engine` is a CI gate.

Formulas and parameters: `brd.md` §6. Types: `architecture.md` §Tax engine.

---

## 8. API contracts

- Base path `/api/v1/`. Route files live at `app/api/v1/<resource>/route.ts`.
- Request and response bodies are validated with Zod schemas imported from `@fintrack/shared`.
- Enum values are `UPPER_SNAKE_CASE` in the database, in JSON and in code.
- Error body: `{ "error": string, "code": string }`. Validation errors add `"fields": { name: message }`.

| Status | When |
|---|---|
| `401` | missing, invalid or expired access token |
| `403` | the email is not verified yet, sign-up is closed, the account is deactivated, or an admin route is called by a non-admin |
| `404` | the record does not exist or belongs to another user |
| `409` | duplicate idempotency key, action already applied, or the Fiscal Year is locked |
| `422` | validation failure |
| `429` | login rate limit reached |

---

## 9. Auth and security

- Every route except `/api/v1/auth/*` and `/api/v1/health` starts with `getAuthUser(req)` from `lib/auth.ts`.
- Every query on user data includes `userId: user.id`. A record owned by another user is reported as `404`.
- Import the Prisma client from `lib/prisma`; that file is the only place it is constructed, and only route handlers and server-side services use it.
- Every `/api/v1/admin/*` route starts with `getAdminUser(req)` and reads account tables only (`users`, `user_payments`, `admin_actions`, token tables). Admin code never queries a financial table, and an admin's own finances go through the normal user routes. (ADR-0011)
- An admin write is refused when its target is the acting admin or any other admin account. Only `USER` accounts can be updated, deactivated or deleted through admin routes.
- Registration and recovery endpoints give the same response whether or not the email is registered.
- A new account receives starter categories and tax settings only; no financial record is ever created for a user automatically.
- Store only the last four digits of a bank account number.
- Logs carry request ids, routes and status codes, and never amounts, descriptions or request bodies.
- Secrets come from environment variables listed in `.env.example`.

---

## 10. Frontend

- All authenticated data reaches the UI through `/api/v1` with TanStack Query in Client Components (`'use client'`). Server Components render the static shell only.
- Server data lives in the TanStack Query cache, not in `useState`.
- Forms use React Hook Form with the shared Zod schemas.
- Every amount is rendered with `formatBDT()`, right-aligned, with `font-variant-numeric: tabular-nums`.
- Every Fiscal Year label comes from `fiscalYear()`.
- Interactive targets are at least 44×44 px.
- Colours, type and layouts come from `design.md`.

---

## 11. Vocabulary

Use the `GLOSSARY.md` term in code, comments, names and UI text.

| Use | Not |
|---|---|
| TDS (Tax Deducted at Source) | withholding tax |
| Fiscal Year / FY | financial year, tax year |
| bKash | mobile banking, mobile payment |
| Sanchaypatra | national savings certificate |
| DPS (Deposit Pension Scheme) | recurring deposit, RD |
| In-Hand Income | net salary, take-home pay |
| Paisa | paise |
| Rebate | credit, deduction |

---

## 12. Tests

- **Work test-first.** Take one case from the ticket's file in `.scratch/fintrack-bd-mvp/test-cases/`, write its test, watch it fail, then write just enough code to pass it. Repeat. Writing a batch of tests before any implementation is the wrong order.
- Start each test title with its case id (`TC-TXN-004 …`). A new behaviour gets a new case in the matrix in the same change.
- Test through the seams in `architecture.md` §Testing: the tax engine as a pure function, route handlers against a real PostgreSQL 16 database, and Playwright smoke flows.
- Acceptance fixtures are identified by `AC-…` ids in `brd.md` §11. Assert the exact Paisa values given there.
- Assert observable behaviour (HTTP responses, rendered text), not which internal function was called.
