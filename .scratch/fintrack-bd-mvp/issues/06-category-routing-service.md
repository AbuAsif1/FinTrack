# 06: Category Routing Service

**What to build:** Complete `CategoryRoutingService` so that creating, updating and deleting a Transaction through `/transactions` works for every routing type, with required links validated and every multi-row write atomic.

**Blocked by:** 03, 04, 05

**Status:** ready-for-agent

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

## Comments
