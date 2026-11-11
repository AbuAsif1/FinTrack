# 08: Fixed Expenses

**What to build:** Fixed Expense templates and their monthly instances. Instances are created on read, marked Paid (which creates the Transaction), skipped or reopened. A DPS template pays into a savings account as a Transfer.

**Blocked by:** 06

**Status:** ready-for-agent

**Test cases:** `test-cases/11-fixed-expenses.md` (`TC-FIX`) · `test-cases/19-security.md` (extend `TC-SEC-001` to `TC-SEC-004` for the new endpoints)

**Read first:** `rules.md` §5 · `architecture.md` §Generated on read (`ensureInstances`), §Database schema (`fixed_expenses`, `fixed_expense_instances`), §Derived values (Fixed Commitments), §API (Fixed Expenses) · `brd.md` §5 FR-05 and §11 `AC-FIXED-1` · ADR-0009

- [ ] `GET /fixed-expenses`, `POST /fixed-expenses`, `PATCH /fixed-expenses/:id` (deactivating sets `end_month`); a template whose category routes to `SAVINGS_DEPOSIT` requires `savings_account_id`
- [ ] `ensureInstances(userId, month)` with every rule in `architecture.md` §Generated on read
- [ ] `GET /fixed-expense-instances?from=&to=`: stored instances for the current and past months, template-derived placeholders for future months, each with a display status (paid, due soon, overdue, pending, skipped, future)
- [ ] `POST /fixed-expense-instances/:id/pay`: actual amount and paid date; creates the Transaction through `CategoryRoutingService` and marks the instance `PAID` in one database transaction; an already-paid instance is 409 with the existing Transaction
- [ ] `POST /fixed-expense-instances/:id/skip` (optional note) and `POST /fixed-expense-instances/:id/reopen`
- [ ] Soft-deleting the paying Transaction returns the instance to `PENDING`
- [ ] `SUGGESTED_FIXED_EXPENSES` constant in `@fintrack/shared`: the seven defaults in `brd.md` FR-05 with name, amount, due day and category (YouTube Premium → Entertainment; the three DPS → DPS / Savings; Mess Rent → Rent; Home Internet and Home Electricity → Utility)
- [ ] Tests: `AC-FIXED-1`; due day 31 in a 30-day month and in February; a template created after its due day starts next month; paying a DPS instance raises the savings balance; paying twice is 409; a standard-amount change reaches only a `PENDING` current instance; deleting the Transaction un-pays the instance; a deactivated template creates no instance next month

## Comments
