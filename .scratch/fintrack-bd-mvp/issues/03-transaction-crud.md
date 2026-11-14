# 03: Transaction CRUD

**What to build:** Categories and Spending Transactions: create, list, read, update and soft delete, with idempotent creation. This is the ledger that savings, loans, Fixed Expenses, budgets and the dashboard build on.

**Blocked by:** 02

**Status:** done

**Test cases:** `test-cases/06-transactions.md` (`TC-TXN`) · `test-cases/19-security.md` (extend `TC-SEC-001` to `TC-SEC-004` for the new endpoints)

**Read first:** `rules.md` §1, §3, §5, §6, §8 · `architecture.md` §Database schema (`categories`, `transactions`), §Category routing, §API (Categories, Transactions) · `brd.md` §5 FR-04

- [x] `GET /categories`, `POST /categories`, `PATCH /categories/:id` (name, colour, archive); `routing_type` is fixed once a Transaction uses the category
- [x] `CategoryRoutingService` in `lib/services/` as the single write path for Transactions, with `create`, `update` and `softDelete`. This ticket implements type `NONE`; other types return 422 `ROUTING_NOT_IMPLEMENTED` until tickets 05 and 06 complete them.
- [x] `POST /transactions`: amount, date, description, category, payment method and `idempotency_key`; `type` copied from the category; a repeated key returns 409 `DUPLICATE` with the existing record
- [x] `GET /transactions`: filters `from`, `to`, `category_id`, `payment_method`, `type`, `min_paisa`, `max_paisa`, `q`; newest first; paginated
- [x] `GET /transactions/:id`
- [x] `PATCH /transactions/:id`: amount, date, description, payment method, and category within the same routing type
- [x] `DELETE /transactions/:id` as a soft delete; `POST /transactions/bulk-delete`
- [x] Tests: create, read, update, delete; a duplicate key returns the original record and writes nothing; soft-deleted rows are absent from the list; each filter; another user's Transaction is 404; a zero or negative amount is 422

---

## Why

The Transaction is the atomic unit of the app's ledger. Everything that matters — budgets, dashboard totals, net savings, the Fixed Expense compliance rate, the tax calculation, the loan running balance — is derived from Transactions. Getting the data model and category routing right here is the prerequisite for every other feature. Idempotent creation protects against double-entry when a mobile user retries after a network failure.

## User flows

### Adding a spending transaction
1. User taps "Add Expenses" (global topbar quick action).
2. Selects a Spending category (e.g. "Food & Dining"), enters amount ৳850, picks today as the date, adds description "Lunch at Meena Bazar", selects payment method "bKash".
3. The form generates an `idempotency_key` when it opens. User taps Save.
4. `POST /transactions` creates the record. The dashboard and transaction list update immediately.
5. If the user taps Save twice (network delay): the second call returns 409 `DUPLICATE` with the original record — no double entry.

### Editing a transaction
1. User finds a transaction in the list, taps the action menu → Edit.
2. Changes the amount from ৳850 to ৳920 (actual receipt differed).
3. `PATCH /transactions/:id` updates the record. All derived totals (budget, dashboard) recalculate on next read.

### Soft-deleting a transaction
1. User deletes a transaction. `DELETE /transactions/:id` sets `deleted_at` to now.
2. The transaction disappears from all lists and totals. It is NOT physically removed — the row stays in the database for audit.
3. If the transaction was the payment for a Fixed Expense instance, the instance returns to `PENDING` automatically (handled in ticket 06 / 08).

### Filtering the transaction list
1. User opens Transactions → filter bar.
2. Applies: category "Food & Dining", date range "last 30 days", payment method "bKash".
3. `GET /transactions?category_id=X&from=Y&to=Z&payment_method=bKash` returns matching records, newest first, paginated.

## Scenarios

**Scenario A — month-end reconciliation:** A user filters transactions for the current month and category "Utilities." They see three rows totalling ৳4,200. They bulk-delete a duplicate entry (they accidentally added the electricity bill twice). The budget recalculates.

**Scenario B — network retry:** A user submits a ৳1,500 transaction on the metro. The connection drops before the response arrives. They tap Submit again. The second call uses the same `idempotency_key` and gets back the original record (409 DUPLICATE treated as success). No double entry.

**Scenario C — category change:** A user edits a transaction and changes its category from "Food" (routing NONE) to another NONE category. This is allowed. Changing to a category of routing type SAVINGS_DEPOSIT would be 422 — routing types cannot change on an existing transaction.

**Scenario D — bulk delete:** A user imports 3 months of history and realises 15 rows are duplicates. They select all 15 in the Transactions list → bulk delete. `POST /transactions/bulk-delete` with the array of ids removes them all.

## Context notes

- Soft delete only (ADR-0003 / rules.md §3). Never physically delete a Transaction row. `deleted_at IS NULL` is the standard filter — always include it in queries.
- `idempotency_key` is generated client-side when the form opens and stored server-side. A repeated key with a different amount is NOT an error — the first record wins. This is by design for network retries.
- `type` on a Transaction is copied from its category at creation and never changes. Moving a transaction to a different routing type is 422.
- Amount must be positive and in Paisa. Zero or negative amounts are rejected with 422.
- Another user's transaction must return 404 (not 403) to prevent user enumeration (rules.md §8).

## Comments
