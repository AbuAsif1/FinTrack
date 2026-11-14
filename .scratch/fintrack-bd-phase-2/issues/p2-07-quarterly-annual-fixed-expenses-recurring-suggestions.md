# p2-07: Quarterly and Annual Fixed Expenses, and Recurring-Payment Suggestions

**Status:** needs-triage
**Phase:** 2
**Spec ref:** Phase 2 §7

---

## What to build

Two related improvements to Fixed Expenses:

1. **Non-monthly cadences** — a Fixed Expense can be quarterly or annual (e.g. car insurance once a year, club subscription every 3 months). Each is shown with a **monthly equivalent** so the user can compare it to monthly costs.

2. **Recurring-payment suggestions** — when the system detects the same payment repeating (same description + similar amount, within a date tolerance), it suggests turning it into a Fixed Expense template. The user can Keep (create the template) or Ignore (suppress future suggestions for this pattern).

---

## Why

The MVP only supports monthly Fixed Expenses. Real recurring costs — car insurance, annual professional memberships, quarterly utility top-ups — do not fit a monthly cadence. Without this, users either ignore the Fixed Expense feature for these costs or create confusing manual workarounds (e.g. entering a fake monthly amount).

The recurring-payment suggestion closes the gap between manual transaction entry and the Fixed Expense system: users who have been entering the same payment repeatedly get a nudge to formalise it, which then appears on the upcoming-payments list and in notifications.

---

## User flows

### Creating a quarterly or annual Fixed Expense
1. User opens **Fixed Expenses → New** (or edits an existing one).
2. The **Cadence** field now offers: Monthly / Quarterly / Annual (was Monthly only in MVP).
3. If Quarterly: user picks the first due month (e.g. January → due in Jan, Apr, Jul, Oct).
4. If Annual: user picks the due month (e.g. June → due every June).
5. The form shows: "Monthly equivalent: ৳X" in a muted note below the amount field (amount ÷ 3 for quarterly, ÷ 12 for annual).
6. User saves. The Fixed Expense appears in the upcoming list at the correct cadence.

### Viewing monthly equivalents
- In the Fixed Expenses list, each non-monthly expense shows a secondary line: "৳X / month equivalent."
- The dashboard's total committed fixed expenses figure uses monthly equivalents so it is always a comparable monthly cost.
- The yearly view on the Fixed Expenses page shows non-monthly items only in the months they are due (not every month), but includes their monthly equivalent in the summary totals.

### Receiving a recurring-payment suggestion
1. The system detects that the user has entered a transaction matching the pattern "Pragati Insurance" for ৳12,000 in June 2024 and again in June 2025.
2. A suggestion card appears on the Fixed Expenses page (or as a banner on the Transactions page): "It looks like you pay ৳12,000 for 'Pragati Insurance' every year. Turn it into a Fixed Expense?"
3. **Keep:** opens the new-Fixed-Expense form pre-filled with the detected name, amount and cadence (annual, due month: June). User reviews and saves.
4. **Ignore:** dismisses the suggestion. The pattern is suppressed — this combination of description + amount + cadence will not be suggested again.

### Managing ignored suggestions
- Settings → Suggestions → Ignored shows all suppressed patterns.
- User can un-ignore a pattern to allow future suggestions for it.

---

## Scenarios

**Scenario A — car insurance (annual):** User creates an annual Fixed Expense "Car Insurance" for ৳36,000 due every June. The expense appears on the June upcoming list. The dashboard shows ৳3,000/month equivalent in committed expenses. Eleven months before June, the upcoming banner shows "Car Insurance due in 30 days — ৳36,000."

**Scenario B — club subscription (quarterly):** User adds "Professional Association" ৳4,500 quarterly, first due March. Due months are March, June, September, December. Monthly equivalent shown as ৳1,500.

**Scenario C — suggestion accepted:** The user has manually entered "bKash top-up for internet ৳950" on the 5th of every month for 4 consecutive months. A suggestion card appears. They click Keep, review the pre-filled form (monthly, ৳950, "bKash Internet"), and save. The next month's payment shows in the upcoming list.

**Scenario D — suggestion ignored:** The user gets a suggestion for a one-off large payment that happened to repeat twice (a gift for a relative's wedding in consecutive years). They click Ignore. The suggestion never appears again.

---

## Impact areas

- `fixed_expense_templates` table needs a `cadence` column (`MONTHLY` / `QUARTERLY` / `ANNUAL`) and a `due_month` field (for quarterly: first month of the cycle; for annual: the due month)
- `fixed_expense_instances` generation logic must produce instances at the correct cadence — currently assumes monthly
- Monthly-equivalent calculation: a utility function used in list display, dashboard totals and the fixed-expense yearly view
- New table: `dismissed_suggestions` (user_id, pattern_hash, dismissed_at)
- Suggestion detection: a background job or on-demand check that scans transactions for repeating patterns. Define the pattern-matching rules (description similarity, amount tolerance, date tolerance) before implementing.
- Dashboard committed-expense total must switch to monthly-equivalent aggregation
- Upcoming payments list must show non-monthly items only in their actual due months (no every-month phantom entries)

---

## Decisions needed before build

- Cadences to support at launch: Monthly, Quarterly, Annual only? (Bi-monthly, bi-annual, etc. deferred unless the owner requests them.)
- Pattern-matching rules for suggestions: exact description match or fuzzy? Amount tolerance: exact match or ±5%? Minimum repetitions before suggesting: 2 or 3?
- Should the monthly-equivalent be shown in the transaction list when a Fixed Expense payment is made? (The routing indicator row in ticket 15 already notes the Fixed Expense link; adding the monthly-equivalent label there is optional.)
- Who runs the suggestion-detection job: triggered on sign-in, on a daily cron (p2-18), or on-demand when the user opens the Fixed Expenses page?

---

## Blocked by

- Ticket 08 (Fixed Expenses API) — the template and instance data model must be stable.
- Ticket 16 (Fixed Expenses UI) — the UI extensions build on this.

## Comments

<!-- Append discussion below this line -->
