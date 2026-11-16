# p2-04: Overall Monthly Spending Limit with Dashboard Chart

**Status:** done
**Phase:** 2
**Spec ref:** Phase 2 §4

---

## What to build

A single budget limit for the user's total monthly spending (across all categories), shown on the dashboard as a **budget-health ring** alongside the existing per-category budget bars. The ring changes colour as spending rises toward and past the limit.

This is separate from, and complements, the per-category budgets already in the MVP.

---

## Why

The per-category budgets help the user control individual lines (e.g. "don't spend more than ৳3,000 on eating out"). But there is no single number that answers "am I overspending this month overall?" The owner's original plan included a global monthly limit for exactly this: a quick health check on the dashboard without needing to scan every category bar.

---

## User flows

### Setting the limit for the first time
1. User is on the Dashboard. The budget-health ring shows "No monthly limit set" with a dashed border.
2. User clicks the ring (or a "Set limit" link nearby).
3. A small modal opens: "Monthly spending limit" with a currency input (default empty).
4. User types ৳25,000 and clicks Save.
5. Modal closes. The ring immediately reflects current month's spending against ৳25,000.

### Seeing the ring on the dashboard
- The ring sits beside the per-category budget bars in the Budget section of the dashboard.
- The ring shows spent / limit and a percentage label in the centre (e.g. "68%").
- Colour states:
  - 0–74 %: green (healthy)
  - 75–99 %: amber (approaching limit)
  - 100 %+: red (over limit)
- Hovering / tapping shows the exact amounts: "৳17,000 of ৳25,000 spent".

### Editing the limit
1. User clicks the ring or the edit icon next to it.
2. Modal opens pre-filled with the current limit.
3. User changes the value and saves.

### Removing the limit
1. User clicks edit.
2. User clears the field (empty value) and saves.
3. The ring reverts to "No monthly limit set."

### Month navigation
- The ring always shows the currently selected month (the same period selector the rest of the dashboard uses).
- Switching months updates the ring to reflect spending vs. the same limit for that month. The limit is global (not per-month).

---

## Scenarios

**Scenario A — first-time budgeter:** A user sets ৳30,000 as their total monthly limit at the start of the month. By the 20th they are at 92 % (amber ring). The visual cue prompts them to review their spending before the month ends.

**Scenario B — over budget:** The user ends the month at 115 % (red ring). The dashboard shows the overrun clearly; the user can click through to the transaction list filtered to the current month to see what drove it.

**Scenario C — no interest in a global limit:** A user who already manages spending category-by-category simply never sets the global limit. The ring stays hidden or shows a neutral "not set" state; it does not nag them.

**Scenario D — mid-month limit increase:** User gets an unexpected bonus expense (a sudden trip). They update the limit from ৳30,000 to ৳40,000 to reflect reality; the ring percentage drops accordingly.

---

## Impact areas

- New API: `GET /budgets/monthly-limit` and `PUT /budgets/monthly-limit` (single row per user: `monthly_limit_paisa`, nullable)
- Dashboard aggregate API (ticket 11) must include current-month total spending and the monthly limit in its response
- Dashboard UI (ticket 13) must render the ring component
- The ring's spend total must use the same logic as per-category budgets: Spending-type transactions only, within the selected period
- DB: single new column on `users` or a new `monthly_budget` row — confirm schema location
- Design needs a spec for the ring component (colours, states, size relative to category bars)

---

## Decisions needed before build

- Does the monthly limit include Fixed Expenses, or only ad-hoc Spending transactions? (Recommend: all Spending-type transactions including Fixed Expense payments, to give a true monthly outflow picture. Confirm with owner.)
- Should there be an alert/notification when the ring hits amber or red? (That is a push-notification feature from p2-18; leave the hook for it here but do not implement it in this ticket.)
- Should the limit be per-month-settable or one value applied to every month? (Spec says one global limit. Confirm.)

---

## Blocked by

- Ticket 11 (Dashboard Aggregates API) — the aggregate endpoint must be extended.
- Ticket 13 (Dashboard UI) — the ring is added to the existing dashboard.

## Comments

<!-- Append discussion below this line -->
