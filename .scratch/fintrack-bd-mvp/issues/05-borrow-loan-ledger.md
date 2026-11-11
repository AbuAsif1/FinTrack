# 05: Borrow-Loan Ledger

**What to build:** Per-person loan tracking. Direction is always from the user's side: Given is money out, Received is money in. Every Loan Entry is paired with one Transaction, and the Running Balance is computed from those pairs.

**Blocked by:** 03

**Status:** ready-for-agent

**Test cases:** `test-cases/08-loans.md` (`TC-LOAN`) · `test-cases/19-security.md` (extend `TC-SEC-001` to `TC-SEC-004` for the new endpoints)

**Read first:** `rules.md` §3, §5, §6 · `architecture.md` §Database schema (`loan_persons`, `loan_entries`), §Category routing, §Derived values (Running Balance), §API (Loans) · `brd.md` §5 FR-07 and §11 `AC-LOAN-1` · `GLOSSARY.md` (Loan Entry, Running Balance, Settle Up)

- [ ] `GET /loan-persons` with each person's Running Balance, `POST /loan-persons`, `PATCH /loan-persons/:id`
- [ ] `POST /loan-persons/:id/entries`: direction, amount, date, reason, payment method, optional return due date and `idempotency_key`. Writes the Transaction (category Loan Given or Loan Received) and its Loan Entry in one database transaction through `CategoryRoutingService`.
- [ ] `GET /loan-persons/:id/entries`: history with the Running Balance after each entry
- [ ] `PATCH /loan-persons/:id/entries/:entryId`; `DELETE /loan-persons/:id/entries/:entryId` soft-deletes the paired Transaction
- [ ] `POST /loan-persons/:id/settle`: creates the one entry that brings the Running Balance to zero, flagged `is_settlement`; 409 when the balance is already zero
- [ ] `GET /loans/summary`: people owe me, I owe, net
- [ ] Tests: `AC-LOAN-1` from seeded entries; deleting an entry recalculates the balance; Settle Up from a positive and from a negative balance; a duplicate key returns the original; a failure while writing the Loan Entry leaves no Transaction behind

## Comments
