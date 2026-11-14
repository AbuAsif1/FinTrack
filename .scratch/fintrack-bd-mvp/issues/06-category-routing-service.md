# 06: Category Routing Service

**What to build:** Complete `CategoryRoutingService` so that creating, updating and deleting a Transaction through `/transactions` works for every routing type, with required links validated and every multi-row write atomic.

**Blocked by:** 03, 04, 05

**Status:** done

**Test cases:** `test-cases/09-routing.md` (`TC-ROUTE`) · `test-cases/19-security.md` (extend `TC-SEC-001` to `TC-SEC-004` for the new endpoints)

**Read first:** `rules.md` §5 · `architecture.md` §Category routing (all), §Derived values · `brd.md` §5 FR-04 and §11 `AC-SAV-1` · ADR-0005, ADR-0006

- [ ] `SAVINGS_DEPOSIT`, `SAVINGS_WITHDRAWAL`, `SAVINGS_INTEREST`: require a `savings_account_id` that belongs to the user, is not closed, and has `opening_date` on or before the Transaction date; a withdrawal above the balance is 422
- [ ] `LOAN_GIVEN`, `LOAN_RECEIVED` through `POST /transactions`: accept `loan_person_id` or `loan_person_name` (a new name creates the person) with reason and optional return due date, using the same service path as ticket 05
- [ ] `TAX_PAYMENT`: `tax_fiscal_year` defaults to `fiscalYear(date)`; only the current or the previous Fiscal Year is accepted
- [ ] `transactions.type` is copied from the category at creation and never changes; moving to a category of a different routing type is 422
- [ ] Update: amount, date and links can change, and derived totals follow
- [ ] Soft delete of a Transaction that paid a Fixed Expense instance returns that instance to `PENDING` in the same database transaction (exercised in ticket 08)
- [ ] Create and update responses include a `routing` summary for the UI: the account name and new balance, or the person and new Running Balance, or the Fiscal Year
- [ ] Tests: deposit, interest and withdrawal through the API reproduce `AC-SAV-1`; a missing link is 422 and writes nothing; a forced failure mid-write rolls back every row; a loan created by category matches one created through ticket 05's endpoint; a person is created from a new name; a Tax Payment can be assigned to the previous Fiscal Year

---

## Why

A transaction in FinTrack is not always just a Spending record. Paying rent deducts from a budget. Depositing into DPS increases a savings balance and counts toward the tax rebate. Lending money creates a loan entry and a transaction atomically. `CategoryRoutingService` is the single write path that enforces these rules — no route handler may write a Transaction directly. This ensures that routing invariants (savings account required, loan person required, fiscal year validated) are always enforced, and that multi-row writes (transaction + loan entry, transaction + fixed expense instance) are always atomic.

## User flows

This ticket has no independent user-visible flow — it underlies every transaction write. The developer-facing flows are:

### Creating a savings deposit via a transaction
1. Any form that records a savings deposit calls `CategoryRoutingService.create({ ...transactionData, savings_account_id: X })`.
2. The service checks: account belongs to user, account is not closed, opening date ≤ transaction date.
3. For a SAVINGS_WITHDRAWAL: also checks that the transaction amount ≤ current balance.
4. Writes the transaction row. Returns the account name and new balance in the `routing` summary.

### Creating a loan entry via a transaction
1. The form passes `loan_person_id` (or `loan_person_name` for a new person).
2. The service writes the Transaction and the Loan Entry in one database transaction.
3. If the Loan Entry write fails, the Transaction is rolled back.
4. Returns the person name and new Running Balance in `routing`.

### Tax Payment routing
1. A transaction with routing type TAX_PAYMENT needs a `tax_fiscal_year`.
2. If not provided, `fiscalYear(date)` is used.
3. Only the current or previous fiscal year is accepted.

## Scenarios

**Scenario A — missing savings account:** A user tries to record a DPS deposit via the API without providing `savings_account_id`. The service returns 422 `MISSING_SAVINGS_ACCOUNT`. Nothing is written.

**Scenario B — forced mid-write failure:** A test injects a failure after the Transaction row is written but before the Loan Entry row. The database transaction rolls back. Both rows are absent. The API returns a 500. The client can safely retry with the same `idempotency_key`.

**Scenario C — routing type locked:** A user tries to change a Loan Given transaction's category to "Food & Dining" (routing NONE). The service returns 422 — a transaction's routing type cannot change once set.

**Scenario D — Tax Payment to previous year:** A user makes a tax payment in September 2026 that should count for FY2025-26 (deadline month). They set `tax_fiscal_year: "2025-26"`. The service accepts it (previous fiscal year). Setting it to `"2024-25"` would be 422 (too old).

## Context notes

- `CategoryRoutingService` is the ONLY way to create, update or soft-delete a Transaction. Route handlers must not write `transactions` rows directly.
- All multi-row writes (transaction + loan entry, etc.) must be wrapped in a Prisma `$transaction`. Partial writes are a data integrity bug.
- The `routing` field in create/update responses gives the UI immediate feedback: account name + new balance, or person + new Running Balance. The UI must display this — not make a second API call.
- Soft-deleting a Transaction that paid a Fixed Expense instance returns that instance to `PENDING` status in the same database transaction (implemented in ticket 08 and exercised here).
- When a loan is created by category routing (via `POST /transactions` with a loan category and `loan_person_name`), the resulting Loan Entry must be identical to one created via `POST /loan-persons/:id/entries`. Both paths must share the service layer.

## Comments
