# 05: Borrow-Loan Ledger

**What to build:** Per-person loan tracking. Direction is always from the user's side: Given is money out, Received is money in. Every Loan Entry is paired with one Transaction, and the Running Balance is computed from those pairs.

**Blocked by:** 03

**Status:** done

**Test cases:** `test-cases/08-loans.md` (`TC-LOAN`) · `test-cases/19-security.md` (extend `TC-SEC-001` to `TC-SEC-004` for the new endpoints)

**Read first:** `rules.md` §3, §5, §6 · `architecture.md` §Database schema (`loan_persons`, `loan_entries`), §Category routing, §Derived values (Running Balance), §API (Loans) · `brd.md` §5 FR-07 and §11 `AC-LOAN-1` · `GLOSSARY.md` (Loan Entry, Running Balance, Settle Up)

- [ ] `GET /loan-persons` with each person's Running Balance, `POST /loan-persons`, `PATCH /loan-persons/:id`
- [ ] `POST /loan-persons/:id/entries`: direction, amount, date, reason, payment method, optional return due date and `idempotency_key`. Writes the Transaction (category Loan Given or Loan Received) and its Loan Entry in one database transaction through `CategoryRoutingService`.
- [ ] `GET /loan-persons/:id/entries`: history with the Running Balance after each entry
- [ ] `PATCH /loan-persons/:id/entries/:entryId`; `DELETE /loan-persons/:id/entries/:entryId` soft-deletes the paired Transaction
- [ ] `POST /loan-persons/:id/settle`: creates the one entry that brings the Running Balance to zero, flagged `is_settlement`; 409 when the balance is already zero
- [ ] `GET /loans/summary`: people owe me, I owe, net
- [ ] Tests: `AC-LOAN-1` from seeded entries; deleting an entry recalculates the balance; Settle Up from a positive and from a negative balance; a duplicate key returns the original; a failure while writing the Loan Entry leaves no Transaction behind

---

## Why

Informal lending is common in Bangladesh: a user might lend money to a friend for a wedding, borrow from a colleague until salary day, or owe their family member from a shared purchase. The app tracks these in a per-person ledger where direction is always from the user's side (I gave money / I received money). The Running Balance shows how much is outstanding at any moment. Without this, users either forget informal debts or keep a separate note which is not integrated with their financial picture (dashboard loan summary, notifications for overdue returns).

## User flows

### Recording money lent to a friend
1. User opens the Borrow & Loans page.
2. Taps "Add entry" (or "Add person" if it's a new contact).
3. Direction: "I gave" (money out). Amount: ৳15,000. Date: today. Person: "Reza Bhai" (typed, creates a new Loan Person). Reason: "Wedding gift loan." Return due: 2026-12-01.
4. Payment method: "bKash." Saves.
5. The API writes two records atomically: a Transaction (category Loan Given, type LOAN_GIVEN) and a Loan Entry linked to it. Reza Bhai's card appears with running balance ৳15,000 (positive = they owe me).

### Recording a repayment
1. Reza Bhai returns ৳10,000.
2. User taps Reza Bhai → "Add entry." Direction: "I received." Amount: ৳10,000.
3. After saving, running balance shows ৳5,000 remaining.

### Settling up
1. Running balance is ৳5,000. User taps "Settle Up."
2. A confirmation modal shows: "This will record a ৳5,000 received entry and bring the balance to zero."
3. User confirms. One final entry is created, flagged `is_settlement = true`. Balance becomes ৳0.

### Borrowing from someone
1. User taps "Add entry." Direction: "I received." Amount: ৳20,000. Person: "Maa."
2. Running balance shows -৳20,000 (negative = I owe them).

## Scenarios

**Scenario A — overdue loan alert:** A user set a return due date of 1 November. It is now 10 November. The notification system (ticket 10) flags Reza Bhai's loan as overdue. The Borrow & Loans page shows the entry highlighted in red with an "Overdue 9 days" chip.

**Scenario B — multiple loans to the same person:** A user lent Karim ৳10,000 on three separate occasions without settling. Each entry appears in the history. The Running Balance shows ৳30,000. The dashboard loan summary shows this in "They owe me."

**Scenario C — atomic failure:** The server crashes while writing the Transaction for a loan entry. The Loan Entry is never created either — the entire operation rolls back. The user sees an error and can retry. No orphaned transactions exist.

**Scenario D — settle up from a negative balance (I owe them):** Running balance is -৳20,000. User taps Settle Up. A ৳20,000 "I gave" entry is created. Balance returns to ৳0. The settlement entry appears in the ledger history.

## Context notes

- Direction is always from the user's perspective: Loan Given (I gave) = money out of my pocket; Loan Received (I received) = money into my pocket. The balance is positive when others owe the user, negative when the user owes others.
- Each Loan Entry is permanently paired with a Transaction (LOAN_GIVEN or LOAN_RECEIVED). Soft-deleting the entry soft-deletes its paired Transaction automatically. The two must never become orphaned.
- The Running Balance is computed from entries, never stored. Sum of all non-deleted entries for a person: Given entries increase the balance, Received entries decrease it.
- Settle Up creates exactly one new entry that brings the balance to zero. It is not special in the data model (except `is_settlement = true`) — it is a normal Loan Entry and Transaction.
- `409` when Settle Up is called on a zero balance — do not create a zero-amount entry.

## Comments
