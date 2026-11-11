# 03: Transaction CRUD

**What to build:** Categories and Spending Transactions: create, list, read, update and soft delete, with idempotent creation. This is the ledger that savings, loans, Fixed Expenses, budgets and the dashboard build on.

**Blocked by:** 02

**Status:** ready-for-agent

**Test cases:** `test-cases/06-transactions.md` (`TC-TXN`) · `test-cases/19-security.md` (extend `TC-SEC-001` to `TC-SEC-004` for the new endpoints)

**Read first:** `rules.md` §1, §3, §5, §6, §8 · `architecture.md` §Database schema (`categories`, `transactions`), §Category routing, §API (Categories, Transactions) · `brd.md` §5 FR-04

- [ ] `GET /categories`, `POST /categories`, `PATCH /categories/:id` (name, colour, archive); `routing_type` is fixed once a Transaction uses the category
- [ ] `CategoryRoutingService` in `lib/services/` as the single write path for Transactions, with `create`, `update` and `softDelete`. This ticket implements type `NONE`; other types return 422 `ROUTING_NOT_IMPLEMENTED` until tickets 05 and 06 complete them.
- [ ] `POST /transactions`: amount, date, description, category, payment method and `idempotency_key`; `type` copied from the category; a repeated key returns 409 `DUPLICATE` with the existing record
- [ ] `GET /transactions`: filters `from`, `to`, `category_id`, `payment_method`, `type`, `min_paisa`, `max_paisa`, `q`; newest first; paginated
- [ ] `GET /transactions/:id`
- [ ] `PATCH /transactions/:id`: amount, date, description, payment method, and category within the same routing type
- [ ] `DELETE /transactions/:id` as a soft delete; `POST /transactions/bulk-delete`
- [ ] Tests: create, read, update, delete; a duplicate key returns the original record and writes nothing; soft-deleted rows are absent from the list; each filter; another user's Transaction is 404; a zero or negative amount is 422

## Comments
