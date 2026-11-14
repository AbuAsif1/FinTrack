# FinTrack BD — Coding Rules

**These are non-negotiable constraints every agent must follow. Violating any of these is a bug, not a style preference.**

---

## Money — The Cardinal Rule

> **All BDT amounts are stored and transported as `BIGINT` Paisa (1 BDT = 100 Paisa). Division by 100 happens only at the display layer.**

| Rule | Correct | Wrong |
|---|---|---|
| DB column type | `BIGINT` | `DECIMAL`, `FLOAT`, `NUMERIC` |
| API request/response | integer `10000` (= ৳100.00) | float `100.0` or string `"100.00"` |
| JSON field naming | `amount_paisa` | `amount`, `amount_bdt` |
| SQL aggregation | `SUM(amount_paisa)` in integer | any float math |
| Display only | `formatBDT(paisa)` | `paisa / 100` bare |

---

## `formatBDT(paisa: number): string`

JavaScript's `Intl.NumberFormat` does **not** support South Asian (lakh/crore) grouping. You must use the custom utility from `packages/shared`:

```ts
import { formatBDT } from '@fintrack/shared';
// formatBDT(200684600) === "৳20,06,846.00"
// formatBDT(913500)    === "৳9,135.00"
```

- **Use `formatBDT()` on every monetary value shown in the UI.** No exceptions.
- Never use `toLocaleString()`, `Intl.NumberFormat`, or manual string formatting for BDT amounts.
- The ৳ prefix is included by the function — do not add it separately.

---

## Fiscal Year

```ts
import { fiscalYear } from '@fintrack/shared';
```

- Never compute fiscal year inline. Never write `date.getFullYear()` logic in feature code.
- `fiscalYear(date)` returns `"YYYY-YY"` (e.g. `"2025-26"`).
- 1 July 2025 → `"2025-26"`. 30 June 2025 → `"2024-25"`.

---

## Soft Delete

- **Never** `DELETE FROM transactions` or `DELETE FROM loan_entries`.
- Set `is_deleted = TRUE`.
- Every query that reads transactions or loan entries must filter `WHERE is_deleted = FALSE`.
- Prisma: always `where: { isDeleted: false }` on transaction/loanEntry queries.

---

## Computed Savings Balance

- `savings_accounts` has **no `balance` column**.
- Never store a balance. Never update a balance field.
- Balance = `opening_balance_paisa + SUM(linked transaction amounts WHERE is_deleted = FALSE)`.
- Compute this in SQL, not in application code.

---

## Category Routing

- All routing side-effects execute inside a single `prisma.$transaction([...])` call.
- Never apply partial side-effects. Never commit a transaction and then run a side-effect separately.
- If any side-effect fails, the whole operation rolls back. The user sees one atomic error.
- DPS payment without a `linked_account_id` → validation error, nothing written.

---

## Idempotency

- Every `POST /api/v1/transactions` must include an `idempotency_key` (UUID, client-generated).
- Backend stores it with a UNIQUE constraint.
- Duplicate key → `409` response with the existing record. No retry logic needed on the client.
- Never skip idempotency for "simple" endpoints — it protects against double-taps on slow connections.

---

## Tax Engine

- Never call the database inside `calculateTax(...)`.
- Slabs must be fetched from `tax_years` before calling the function and passed as arguments.
- The function signature is: `calculateTax(slabs, incomeEntries, investments) → TaxResult`.
- Use the same function on the frontend for live preview (no extra round-trip needed).
- 100% branch coverage on `packages/tax-engine` is a CI gate.

---

## Two Time Axes — Never Mix

| Axis | Used for | How to get it |
|---|---|---|
| Calendar month | Spending, budgets, fixed expenses | `DATE_TRUNC('month', date)` |
| Fiscal year | Tax module, annual income | `fiscalYear(date)` |

Never join a calendar-month aggregate with a fiscal-year aggregate in a single query.

---

## API Contracts

- Money fields in JSON: integers (`amount_paisa: 10000`), **never floats**.
- Fiscal year in JSON: `"2025-26"` string format.
- Timestamps: ISO 8601 UTC (`"2025-11-01T00:00:00Z"`).
- Error body: `{ error: string, code: string }`.
- Auth missing/invalid: `401`.
- Validation failure: `422` with `fields` map.
- Idempotency conflict: `409`.

---

## Frontend Rules

- **Mark interactive components `'use client'`.** Any component using hooks, React Query, or browser APIs needs this directive.
- **No `useState` for server data.** Use React Query in Client Components.
- **No duplicate Zod schemas.** Import from `packages/shared`.
- **No hardcoded BDT strings.** Always `formatBDT(paisa)`.
- **No hardcoded fiscal year logic.** Always `fiscalYear(date)`.
- **Tap targets ≥ 44px** on all interactive elements (PWA mobile-first).
- All amounts right-aligned with `font-variant-numeric: tabular-nums`.
- **Never instantiate `PrismaClient` in a component or route handler.** Import the singleton from `lib/prisma`.

---

## Bangladesh-Specific Vocabulary

| Use this | Never use this |
|---|---|
| TDS (Tax Deducted at Source) | Withholding tax |
| Fiscal Year / FY | Financial year, tax year |
| bKash | Mobile banking, mobile payment (use the brand name) |
| Sanchaypatra | National savings certificate |
| DPS (Deposit Pension Scheme) | Recurring deposit, RD |
| In-Hand Income | Net salary, take-home pay |
| Paisa | Paise (wrong spelling for Bangladesh) |

---

## Security

- Every Prisma query on user-scoped data includes `where: { userId: ctx.user.id }`.
- Never log response bodies containing financial data.
- Store only the last 4 digits of bank account numbers. Never store or log the full number.
- Never hardcode secrets. All secrets come from environment variables.

---

## What NOT to Do

- Do not add a `balance` column to `savings_accounts`.
- Do not use `DECIMAL` or `FLOAT` for money columns.
- Do not hard-delete transactions or loan entries.
- Do not compute fiscal year inline — use the shared function.
- Do not format currency with `Intl.NumberFormat` — use `formatBDT()`.
- Do not apply category routing side-effects outside a DB transaction.
- Do not write tax slab rates in application code — they live in the `tax_years` table.
