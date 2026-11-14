# 15: Transactions & Budget UI

**What to build:** The Transactions list with filters, the add and edit form with category routing, and the Budgets screen.

**Blocked by:** 06, 10, 12

**Status:** done

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

---

## Why

The Transactions page is the user's ledger view — the definitive list of everything that happened financially. Users spend most of their time here when reviewing, correcting, and understanding their spending. The filter bar makes it possible to slice by time, category, payment method, or search term. The routing indicator row is critical context: when a transaction is a DPS deposit or a loan payment, the user needs to see which savings account or loan person is linked so they know the full effect. The Budget sidebar gives real-time feedback on each category's standing as the user reviews their transactions.

## User flows

### Browsing transactions
1. User opens the Transactions page. The list loads newest-first, paginated (25 per page).
2. Each row shows: date, description, category chip, payment method, amount.
3. For non-Spending transactions, a routing indicator row appears below: "→ BRAC DPS: balance ৳4,80,000" or "→ Reza Bhai: balance ৳15,000."
4. User scrolls or taps "Next page" to see older transactions.

### Filtering transactions
1. User opens the filter bar. Active filters appear as chips below the bar.
2. User sets: Category = "Food & Dining," Date range = "last 30 days."
3. The list updates immediately (or on Apply). Active filter chips show "Food & Dining ×" and "Nov 1 – Nov 30 ×."
4. User removes the date filter chip. The list shows all Food & Dining transactions.

### Adding a transaction from the Transactions page
1. User taps the + button or the "Add Expenses" quick action.
2. The Add Transaction modal opens with today's date pre-filled.
3. User selects category "Dining Out" (routing NONE). No extra fields appear.
4. User selects category "BRAC DPS" (routing SAVINGS_DEPOSIT). A "Savings account" dropdown appears, pre-filtered to DPS accounts.
5. User fills in amount, date, payment method, description. Saves.
6. The new transaction appears at the top of the list. The routing indicator shows the savings account name and new balance.

### Editing a transaction
1. User taps a transaction row → action menu → Edit.
2. The form opens with current values. User changes the amount from ৳850 to ৳920.
3. Saves. The row updates in place.

### Bulk delete
1. User enables bulk-select mode (long press or a checkbox toggle).
2. Selects 5 transactions. A bulk action bar appears at the bottom: "5 selected | Delete."
3. Taps Delete. A confirmation modal names what will change ("2 of these transactions are linked to Fixed Expense instances — those instances will return to Pending.").
4. User confirms. All 5 are soft-deleted. Linked instances return to Pending.

### Setting a budget
1. User opens the Budgets page (or the budget sidebar from Transactions).
2. Finds "Food & Dining" row. Taps "Set limit."
3. Enters ৳4,000. Saves. The bar immediately reflects this month's spending vs ৳4,000.
4. At ৳3,200 spent (80%), the bar turns amber (warn state). At ৳4,100, it turns red (over state).

## Scenarios

**Scenario A — offline submit:** User is on the metro with no connectivity. The Add Transaction form shows "You're offline — this entry cannot be saved until you reconnect." The Save button is disabled. The form contents are preserved so the user can submit when connectivity returns.

**Scenario B — duplicate response treated as success:** User taps Save on a loan entry. The request succeeds but the response never arrives (network drop). They tap Save again. The server returns 409 `DUPLICATE` with the original record. The form closes successfully. The UI shows the transaction as if the save was normal.

**Scenario C — routing indicator for loan:** User adds "৳15,000 | Loan Given | Reza Bhai." The routing indicator row below shows "→ Reza Bhai: running balance ৳15,000." The user knows exactly which person this transaction belongs to.

**Scenario D — delete with confirmation:** User deletes a "Mess Rent" transaction (which paid the Fixed Expense instance). The confirmation modal says: "Deleting this transaction will return 'Mess Rent for November' to Pending." User confirms. The transaction is soft-deleted and the instance returns to PENDING. The budget recalculates.

## Context notes

- The filter bar must include: search text (description), category, payment method, date range (from/to), amount range (min/max). All filters are combinable.
- The routing indicator row appears below any transaction whose type is not NONE (savings deposits, loans, tax payments). It shows the linked entity name and updated balance/running balance from the API's `routing` summary field.
- The idempotency_key is generated when the form opens (not on submit). This key is reused on every retry within the same form session. The form generates a new key when it closes and reopens.
- Bulk delete must show a confirmation that names any side effects (Fixed Expense instances returned to Pending, etc.). The user must be able to cancel.
- Budget limits apply to routing NONE categories only. The budget sidebar shows only budgeted categories. Categories without a limit are not shown.

## Comments
