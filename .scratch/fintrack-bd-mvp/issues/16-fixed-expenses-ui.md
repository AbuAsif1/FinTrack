# 16: Fixed Expenses UI

**What to build:** The Fixed Expenses screen: the monthly grid, this month's checklist, the Mark as Paid drawer with skip and reopen, and template management with the suggested defaults.

**Blocked by:** 08, 12

**Status:** ready-for-agent

**Test cases:** `test-cases/17-ui.md` §Fixed Expenses (`TC-UI-080` to `TC-UI-084`)

**Read first:** `design.md` §5.6, §7.4 · `brd.md` §5 FR-05

- [ ] Monthly grid per `design.md` §7.4: templates as rows, months as columns, a status cell for each, and totals; it scrolls horizontally inside its own container
- [ ] On mobile, this month's checklist comes first with overdue items at the top, and the grid sits behind a "Year view" toggle
- [ ] Mark as Paid drawer: actual amount (pre-filled with the standard amount), date, Confirm; Skip with an optional note; Reopen for a Skipped item
- [ ] A Paid cell links to its Transaction
- [ ] Manage templates: add, edit, deactivate; a DPS template requires a savings account
- [ ] Setup: `SUGGESTED_FIXED_EXPENSES` offered with checkboxes; the DPS ones ask for the account
- [ ] Month totals: Fixed Commitments, paid and pending
- [ ] Alert banners for due-soon and overdue items, using the component shared with ticket 13

## Comments
