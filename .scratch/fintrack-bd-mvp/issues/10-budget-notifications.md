# 10: Budgets & Notifications API

**What to build:** Monthly limits per Spending category that keep their history, and in-app notifications that are refreshed on read and resolve themselves.

**Blocked by:** 05, 08

**Status:** done

**Test cases:** `test-cases/13-budgets-notifications.md` (`TC-BUD`, `TC-NOTIF`) · `test-cases/19-security.md` (extend `TC-SEC-001` to `TC-SEC-004` for the new endpoints)

**Read first:** `architecture.md` §Generated on read (`refreshNotifications` and its table), §Database schema (`budgets`, `notifications`), §API (Budgets, Notifications) · `brd.md` §5 FR-09, FR-10 · ADR-0009

- [ ] `PUT /budgets/:categoryId` with `monthly_limit_paisa`: upserts the row effective from the current month; only categories of type `NONE` are accepted
- [ ] `DELETE /budgets/:categoryId`: writes a null limit effective from the current month
- [ ] `GET /budgets?month=`: for each budgeted category the limit in force that month, spent, remaining, percentage and state (`ok` below 70%, `warn` from 70% to 100%, `over` above 100%)
- [ ] `refreshNotifications(userId)` implementing every row of the table in `architecture.md`, idempotent through `dedupe_key`, setting `resolved_at` on alerts that no longer apply
- [ ] `GET /notifications` (runs the refresh; unread first; unresolved and recently resolved), `POST /notifications/:id/read`, `POST /notifications/read-all`
- [ ] Tests: changing a limit this month leaves last month's figures unchanged; spending up to 80% and past 100% raises each alert once; paying an overdue instance resolves its alert; loan return alerts respect the Running Balance and the latest settlement; running the refresh twice creates no duplicates

---

## Why

The user needs two things beyond raw data: (1) a spending limit per category to know when they are approaching or over budget, and (2) proactive alerts so they do not miss a due Fixed Expense or an overdue loan return. Without per-category budgets, the user has to manually calculate whether their ৳3,000 "Dining Out" budget is at risk. Without notifications, overdue items go unnoticed until the monthly review. Both features build on data already in the app — budgets augment transaction totals, and notifications are generated from Fixed Expense instances, loan due dates and budget states.

## User flows

### Setting a category budget
1. User opens Budgets → category "Food & Dining" → "Set limit."
2. Enters ৳4,000 for the month.
3. `PUT /budgets/food-dining-category-id` upserts the limit effective from the current month.
4. The budget sidebar on the Transactions page shows "৳4,000" for Food & Dining.
5. After spending ৳3,200, the bar is at 80% (amber — warn state).
6. After spending ৳4,100, the bar is at 103% (red — over state).

### Removing a budget
1. User decides to stop tracking "Entertainment."
2. Taps "Remove limit" on the category.
3. `DELETE /budgets/entertainment-id` writes a null limit effective from the current month.
4. The bar disappears from the budget page. Last month's data is unaffected.

### Viewing notifications
1. User opens the notification drawer (bell icon in the top bar).
2. `GET /notifications` calls `refreshNotifications` first, then returns the list.
3. The refresh checks: Fixed Expense instances due in ≤3 days → "due soon" alert. Overdue instances → "overdue" alert. Budget over limit → "over budget" alert. Loan entries with return due date in the past → "overdue loan" alert.
4. Existing alerts that no longer apply (e.g. the Fixed Expense was paid) have `resolved_at` set.
5. User sees unread alerts first. Each alert links to its relevant screen.

### Marking notifications read
1. User reads the "Mess Rent overdue" notification.
2. Taps to mark it read (or taps "Mark all as read").
3. The unread count badge on the bell decreases.

## Scenarios

**Scenario A — budget limit history preserved:** User sets a ৳3,000 limit for Dining in October, then raises it to ৳4,500 in November. `GET /budgets?month=2026-10` still returns ৳3,000 for October. `GET /budgets?month=2026-11` returns ৳4,500. Historical budget figures are immutable.

**Scenario B — notification idempotency:** `refreshNotifications` runs twice in quick succession (two API calls). The second run creates no duplicate notifications. The `dedupe_key` on each notification type prevents duplicates within the same trigger state.

**Scenario C — alert resolved automatically:** "Home Electricity — overdue" notification is in the drawer. User pays the instance. Next time `GET /notifications` is called, `refreshNotifications` runs. The overdue instance is now PAID, so the alert's `resolved_at` is set. The notification moves to the "resolved" section of the drawer.

**Scenario D — budget applies only to routing NONE:** User tries to set a budget on the "DPS / Savings" category. The API returns 422 — budgets only apply to Spending-type categories (routing NONE). DPS deposits are Transfers, not Spending (ADR-0006).

## Context notes

- Budget limits are stored with an effective month. `GET /budgets?month=` returns the limit in force for that month. For the current month, the most recent limit on or before this month applies.
- `refreshNotifications(userId)` is called on every `GET /notifications` request AND on every `GET /dashboard/summary` request. It is idempotent — always safe to call, never creates duplicates.
- The notification table uses a `dedupe_key` to prevent duplicate alerts for the same trigger. The key format is defined in `architecture.md`.
- Resolved notifications (`resolved_at IS NOT NULL`) remain in the response for a short window (e.g. last 7 days) so the user can see recently cleared alerts. Older resolved notifications are excluded.
- Budget over-state: `ok` = spent < 70% of limit. `warn` = 70%–100%. `over` = >100%.

## Comments
