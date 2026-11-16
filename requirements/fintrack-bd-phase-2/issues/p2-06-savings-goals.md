# p2-06: Savings Goals

**Status:** done
**Phase:** 2
**Spec ref:** Phase 2 §6

---

## What to build

A savings goal that links a **target amount**, a **target date**, and a **savings account** (DPS, Sanchaypatra, FDR, or bank savings). Progress is calculated from the linked account's current balance against the target.

A user can have multiple active goals (e.g. "Emergency fund", "Hajj trip 2027", "Car").

---

## Why

The user already tracks their savings accounts in the app but has no way to set an intention for them. A savings goal turns a passive balance into a motivated target — the user can see at a glance whether they are on track to hit ৳5,00,000 for their hajj trip by December 2026. This was part of the owner's original financial-wellness vision for the app.

---

## User flows

### Creating a goal
1. User opens **Savings → Goals** (tab or section on the Savings page).
2. Clicks "New goal."
3. Modal fields:
   - **Goal name** (e.g. "Emergency fund") — required
   - **Target amount** (e.g. ৳3,00,000) — required
   - **Target date** (e.g. 31 December 2026) — required
   - **Linked account** — dropdown of the user's savings accounts (DPS accounts, Sanchaypatra, FDR, bank savings); required
4. User saves. The goal card appears.

### Viewing goal progress
- Each goal shows:
  - Goal name and linked account name
  - Progress bar: current balance / target amount
  - Percentage complete
  - Amount remaining (e.g. "৳1,20,000 to go")
  - Days / months remaining to target date
  - On-track status: "On track" / "Behind" / "Achieved"
- "On track" is calculated as: current balance ≥ (target amount × days elapsed / total days).
- "Achieved" when current balance ≥ target amount.

### Editing a goal
1. User clicks the goal card's edit icon.
2. Modal opens pre-filled.
3. User can change name, target amount, target date, or linked account.
4. Save updates the goal and recalculates progress.

### Archiving / closing a goal
1. User marks a goal as achieved (manual override) or the target date passes with balance ≥ target.
2. Completed goals move to an "Achieved" section; they can be archived or deleted.
3. If the target date passes with balance < target, the goal shows "Missed" but stays visible for the user to decide whether to extend or close.

---

## Scenarios

**Scenario A — emergency fund:** A user creates a goal "Emergency fund" linked to their Standard Chartered savings account, target ৳5,00,000 by June 2026. Each month when their DPS matures and they transfer funds to savings, the goal progress updates automatically (the balance comes from the linked savings account record).

**Scenario B — multiple goals:** A user has three goals: "Hajj 2027", "New laptop", "Car down payment." The savings page shows all three cards. The laptop goal is at 100% and shows "Achieved." The others show progress bars.

**Scenario C — goal missed:** A user's "Car down payment" goal target date passes with 72% progress. The card turns amber and shows "Missed — target date was 1 July 2026." The user extends the date by 6 months.

**Scenario D — no savings accounts yet:** A user tries to create a goal before adding any savings accounts. The "Linked account" dropdown is empty with a prompt: "Add a savings account first."

---

## Impact areas

- New DB table: `savings_goals` (user_id, name, target_amount_paisa, target_date, linked_account_id, status, created_at)
- `linked_account_id` references the existing `savings_accounts` table (DPS, Sanchaypatra, FDR — already in the MVP)
- New API routes: `GET/POST /savings-goals`, `GET/PATCH/DELETE /savings-goals/:id`
- Savings page UI (ticket 14) needs a Goals tab or section
- Balance used for progress is the current balance of the linked savings account (read from existing `savings_accounts` data)
- If p2-05 (wallet balances) is built first, goals could also link to wallet accounts — keep the data model extensible

---

## Decisions needed before build

- Can a goal link to more than one account? (Spec implies one; keep it simple. Confirm.)
- What is the "current balance" for a DPS that is not yet matured — the total deposited so far, or the maturity value? (Recommend: total deposited, since the full maturity value is not yet available. This is consistent with how the MVP tracks DPS.)
- Should the goal show a projected completion date based on the savings rate? (Nice to have, out of scope for this ticket.)
- What happens to goals when the linked savings account is deleted? Mark the goal as "Account removed" and disassociate rather than cascade-deleting the goal.

---

## Blocked by

- Ticket 04 (Savings Accounts) — the savings account data model must be stable.

## Comments

<!-- Append discussion below this line -->
