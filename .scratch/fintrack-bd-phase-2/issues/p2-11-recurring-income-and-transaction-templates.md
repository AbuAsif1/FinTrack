# p2-11: Recurring Income and Transaction Templates

**Status:** needs-triage
**Phase:** 2
**Spec ref:** Phase 2 §11

---

## What to build

Two related automation features:

1. **Recurring income proposals** — the system proposes the user's monthly salary at the start of each month, pre-filled with the last confirmed amount. The user confirms with one tap (or edits before confirming).

2. **Transaction templates** — saved templates for frequently recurring transactions (not Fixed Expenses, which are already managed separately). A template stores description, amount, category and payment method; the user applies it to create a new transaction instantly.

---

## Why

The user's salary is their most predictable income event, yet they currently re-enter it manually each month. A one-tap confirmation reduces friction. More broadly, many users have recurring payments (weekly grocery runs, monthly internet bill paid manually) that are not Fixed Expenses but are repetitive. Templates save time and reduce entry errors for these.

The difference from Fixed Expenses: a Fixed Expense is a commitment tracked for upcoming-payment awareness and budgeting. A template is a convenience for quick re-entry with no scheduling or due-date tracking.

---

## User flows

### Monthly salary proposal
1. On the first working day of each calendar month (or when the user next opens the app after the month turns), a proposal card appears on the **Dashboard** or **Income** page:
   > "It's a new month. Your salary was ৳85,000 last month. Confirm for [Month Year]?"
2. **Confirm:** creates an income record with the same amount, category (Salary), payment method and fiscal year as last month, with today as the date. The card disappears.
3. **Edit first:** opens the Income modal pre-filled with last month's values. User adjusts (e.g. salary increased) and saves.
4. **Skip:** dismisses the card for this month. The user can still add income manually.
5. If the user has already added salary income for the current month (manually or via import), the proposal is not shown.

### Creating a transaction template
1. User opens the transaction list and finds a frequently used transaction (e.g. "Grocery — Meena Bazar — ৳2,500 — Spending").
2. User taps the row's overflow menu → "Save as template."
3. A modal shows the pre-filled template: name (editable, e.g. "Meena Bazar weekly"), description, amount, category, payment method. User saves.
4. Alternatively, user opens **Templates** (a section on the Add Transaction form or in Settings) and creates a template from scratch.

### Using a transaction template
1. User opens **Add Transaction**.
2. A "Templates" section shows saved templates as quick-select cards (or the user opens a "From template" button).
3. User taps "Meena Bazar weekly." The form fills with the template's values. Amount and date are editable before saving.
4. User adjusts the date to today and taps Save. A new transaction is created.
5. The template is not consumed — it remains for future use.

### Managing templates
1. Settings → Templates (or in the transaction form) shows all templates.
2. User can rename, edit fields, or delete a template.
3. Templates are ordered by most recently used.

---

## Scenarios

**Scenario A — month-turn salary confirmation:** The user opens the app on the 1st of November. A blue card at the top of the Dashboard shows the salary proposal. They tap Confirm. Salary income for November is recorded in 2 seconds with no typing.

**Scenario B — salary raise:** In January, the user's salary increases. The proposal appears with last month's amount. They tap "Edit first," change the amount to ৳90,000, and confirm. The new amount becomes the reference for next month's proposal.

**Scenario C — template for weekly groceries:** A user shops at Meena Bazar every Friday for roughly the same amount. They create a template. Each Friday they open the app, pick the template, adjust the amount slightly (৳2,400 this week), and save. Entry takes 10 seconds instead of 60.

**Scenario D — multiple salary sources:** A user has both a main job and freelance income. The salary proposal is for the primary salary category only. Freelance income is entered manually or via a separate template.

---

## Impact areas

- Salary proposal: requires knowing "did the user record salary this month already?" — query income records for the current month filtered by salary category
- Proposal card UI: a dismissable banner/card on the Dashboard and/or Income page
- New DB table: `transaction_templates` (user_id, name, description, amount_paisa, category_id, payment_method, created_at, last_used_at)
- New API routes: `GET/POST /transaction-templates`, `GET/PATCH/DELETE /transaction-templates/:id`
- Transaction form UI: a "Templates" quick-select section (must not add visual complexity for users who have no templates)
- Salary proposal timing: based on the calendar month turning, not a 30-day interval — check on app open, compare current month to last income record's month
- The proposal must respect the user's local date (Bangladesh time), not UTC

---

## Decisions needed before build

- Should the salary proposal card appear only on the Dashboard, or also on the Income page? (Recommend both, so it's hard to miss.)
- What determines "last month's salary"? The most recent income record of category Salary, regardless of month? Or specifically last calendar month? (Recommend: last calendar month's salary record. If none exists, do not show the proposal.)
- Template usage limit: should there be a maximum number of templates? (Recommend no hard limit, but cap the quick-select view at 5 most-recently-used.)
- Should templates be available for income entries too, or only spending transactions? (Recommend spending and income, since freelance payments and rent income also recur.)

---

## Blocked by

- Ticket 07 (Income Management API) — the income data model must be stable.
- Ticket 03 (Transaction CRUD) — the transaction data model must be stable.
- Ticket 15 (Transactions & Budget UI) — the transaction form is extended with the template picker.
- Ticket 14 (Income & Savings UI) — the income form is extended with the salary proposal card.

## Comments

<!-- Append discussion below this line -->
