# 03: Transaction CRUD

**What to build:** The core spending/income transaction API — create, read, update, soft-delete. This is the data foundation that category routing, budgets, and the dashboard all build on.

**Blocked by:** 02 (Authentication)

**Status:** ready-for-agent

- [ ] POST /transactions: create a transaction; accepts idempotency-key header to prevent double-submission
- [ ] GET /transactions: list with filters (month, category, payment method); paginated
- [ ] GET /transactions/:id: single transaction detail
- [ ] PATCH /transactions/:id: update amount, description, category, date
- [ ] DELETE /transactions/:id: soft-delete only (sets is_deleted = true); never hard-delete
- [ ] All amounts stored as BIGINT paisa; API accepts and returns paisa integers
- [ ] Zod schema validation on request body; shared schema exported from packages/shared
- [ ] Integration tests: CRUD happy paths, idempotency key deduplication, soft-delete confirmed by list not returning deleted record
