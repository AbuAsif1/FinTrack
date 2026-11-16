# 05: Borrow-Loan Ledger

**What to build:** Per-person borrow/loan tracking with running balances. Direction is always first-person: Given = money out, Received = money in. Running balance sign tells who owes whom.

**Blocked by:** 02 (Authentication)

**Status:** ready-for-agent

- [ ] POST /loan-persons: create a named loan person
- [ ] GET /loan-persons: list all with their current running balance
- [ ] POST /loan-persons/:id/entries: create a loan entry (direction: given|received, amount_paisa, date, note)
- [ ] GET /loan-persons/:id/entries: list all entries for one person with running balance per entry
- [ ] DELETE /loan-persons/:id/entries/:entryId: soft-delete only
- [ ] Running balance = Σ(given) − Σ(received); positive = person owes user, negative = user owes person
- [ ] Acceptance test: Mithun balance ৳9,841 (positive), Sohel balance −৳3,145.42 (negative) using seeded test data matching the user's real Excel values
- [ ] Integration tests: create entries, verify running balances, soft-delete an entry and verify balance recalculates
