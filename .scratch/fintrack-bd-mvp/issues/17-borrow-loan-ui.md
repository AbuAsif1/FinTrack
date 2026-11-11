# 17: Borrow-Loan UI

**What to build:** The Borrow & Loans screen: summary tiles, a person list with balance labels, a detail panel with entry history, the add-entry form and Settle Up.

**Blocked by:** 05, 12

**Status:** ready-for-agent

**Test cases:** `test-cases/17-ui.md` §Loans (`TC-UI-100` to `TC-UI-104`)

**Read first:** `design.md` §7.6 · `brd.md` §5 FR-07 and §11 `AC-LOAN-1` · `GLOSSARY.md` (Loan Entry, Running Balance, Settle Up)

- [ ] Summary tiles: They owe me, I owe them, Net position
- [ ] Person list with the balance pill and label from the balance colour rules in `design.md` §7.6
- [ ] Person detail: entry history with the Running Balance on each row
- [ ] Add entry form: direction worded from the user's side ("I gave" / "I received"), amount, date, reason, payment method, optional return due date; typing a new name creates the person
- [ ] Settle Up: a confirmation showing the entry that will be created, then one tap
- [ ] Edit and delete an entry (soft delete) with confirmation; the balance updates at once
- [ ] Due-soon and overdue chips on entries with a return due date
- [ ] The demo and test state shows `AC-LOAN-1`

## Comments
