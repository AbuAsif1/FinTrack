# 15: Transactions & Budget UI

**What to build:** The Transactions list with filters, the add and edit form with category routing, and the Budgets screen.

**Blocked by:** 06, 10, 12

**Status:** ready-for-agent

**Test cases:** `test-cases/17-ui.md` §Transactions and Budgets (`TC-UI-060` to `TC-UI-068`)

**Read first:** `rules.md` §6, §10 · `design.md` §5.9, §7.3 · `brd.md` §5 FR-04, FR-10 · `architecture.md` §Frontend (Offline)

- [ ] Transactions page per `design.md` §7.3: table, filter bar (search, category, payment method, date range, amount range), active filter chips, pagination, and priority columns on mobile
- [ ] Routing indicator row under every Transaction that is not plain Spending, built from the API's `routing` summary
- [ ] Add and Edit Transaction form: amount, date (default today), description, category, payment method; a routing notice with the extra field the category needs (savings account; person, reason and return due date; Fiscal Year)
- [ ] An `idempotency_key` is generated when the form opens and reused on retry; a 409 `DUPLICATE` response is treated as success
- [ ] Delete with a confirmation that names anything else that changes (for example "Mess Rent for November returns to Pending"); bulk select and delete
- [ ] Budgets page and the budget sidebar: per-category bar with ok, warn and over states; set, edit and remove a limit
- [ ] Offline: submit is disabled with a notice; a failed submit keeps the form's contents
- [ ] Tests: switching category shows the right extra field; a duplicate response is handled as success

## Comments
