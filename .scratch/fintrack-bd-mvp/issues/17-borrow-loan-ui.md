# 17: Borrow-Loan UI

**What to build:** The Borrow & Loans screen: summary tiles, a person list with balance labels, a detail panel with entry history, the add-entry form and Settle Up.

**Blocked by:** 05, 12

**Status:** done

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

---

## Why

Informal lending is ubiquitous in Bangladesh — giving money to a family member for a purchase, lending to a colleague until salary day, borrowing from a friend for an emergency. Without a tracking system, users lose track of who owes what. The Borrow-Loan screen gives a person-centric view of the ledger: each person has their own history and running balance. The colour-coded balance pills (green = they owe me, red = I owe them, grey = settled) make the net position instantly readable. Due-date chips and overdue alerts nudge the user to follow up on outstanding amounts.

## User flows

### Opening the loans screen
1. User opens Borrow & Loans.
2. Summary tiles: "They owe me: ৳45,000 | I owe: ৳20,000 | Net: ৳25,000."
3. Person list: each card shows name, balance pill (green "৳45,000" for positive, red "-৳20,000" for negative, grey "৳0" for settled).
4. Recently active persons appear at the top.

### Adding a loan entry for an existing person
1. User taps "Reza Bhai." Opens the person detail screen.
2. Entry history shows: "Given ৳15,000 — 2026-10-01 | Balance ৳15,000." "Received ৳5,000 — 2026-11-01 | Balance ৳10,000."
3. User taps "Add entry."
4. Direction: "I received" (Reza paid back another ৳5,000). Amount: ৳5,000. Date: today.
5. Saves. History updates: "Received ৳5,000 — Balance ৳5,000." Summary tiles update.

### Adding a new person while recording a loan
1. User taps "Add entry" on the main Loans page (or the + button).
2. Types a new name "Karim Bhai" in the person field. The name auto-creates the person.
3. Direction: "I gave." Amount: ৳10,000. Reason: "Emergency." Return due: 2026-12-15. Payment method: "bKash."
4. Saves. Karim Bhai appears in the person list with balance ৳10,000.
5. A "Return due Dec 15" chip appears on the entry in Karim's history.

### Settling up
1. Running balance for Reza Bhai: ৳5,000.
2. User taps "Settle Up."
3. Confirmation modal: "This will record a 'Received ৳5,000' entry and bring Reza Bhai's balance to zero. Proceed?"
4. User confirms. The entry is created. Balance shows ৳0 (grey pill). The entry is flagged as a settlement.

### Editing or deleting an entry
1. User spots a data error — an entry is recorded as ৳15,000 but was actually ৳12,000.
2. Taps the entry → Edit. Changes the amount. Saves.
3. The Running Balance for the entire history recalculates from the first entry.
4. To delete an entry: tap → Delete → confirm. The paired Transaction is soft-deleted. Balance recalculates.

## Scenarios

**Scenario A — overdue loan due date chip:** An entry with return due 1 November is now overdue on 10 November. The entry row shows a red "Overdue 9 days" chip. The notification drawer also shows "Karim Bhai's loan return overdue — ৳10,000."

**Scenario B — balance direction label:** Reza Bhai has a negative balance (-৳20,000) — the user borrowed from Reza, not the other way. The pill shows "-৳20,000" in red. The label says "I owe Reza Bhai." In the summary tiles, this ৳20,000 appears in "I owe."

**Scenario C — Settle Up from negative balance:** User owes Maa ৳20,000 (-৳20,000 balance). They tap Settle Up. The confirmation shows "This will record a 'Given ৳20,000' entry." The user just paid Maa back. After confirming, balance returns to ৳0.

**Scenario D — multiple people, net position:** User has: Reza ৳10,000 (they owe me), Karim ৳15,000 (they owe me), Maa -৳20,000 (I owe). Summary: They owe me ৳25,000, I owe ৳20,000, Net ৳5,000. The person list shows all three with appropriate colour pills.

## Context notes

- Direction wording is from the user's perspective: "I gave" = Loan Given (money out) = positive balance (they owe me). "I received" = Loan Received (money in) = negative balance (I owe them).
- The Running Balance shown on each history row is the cumulative balance after that entry, not just that entry's amount.
- Due-soon and overdue chips on entries are purely display — they come from comparing the entry's `return_due_date` to today (client-side date comparison). No separate API call.
- Settle Up creates exactly one new entry with `is_settlement = true`. It is a normal entry in the data model, not a special operation. The confirmation modal must show the direction and amount clearly.
- Delete must show a confirmation naming what else changes. Deleting a Loan Given entry reverses the linked Transaction (soft-delete). The balance recalculates client-side before the page refreshes.

## Comments
