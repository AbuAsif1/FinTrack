# 10: Budgets & Notifications API

**What to build:** Monthly limits per Spending category that keep their history, and in-app notifications that are refreshed on read and resolve themselves.

**Blocked by:** 05, 08

**Status:** ready-for-agent

**Test cases:** `test-cases/13-budgets-notifications.md` (`TC-BUD`, `TC-NOTIF`) · `test-cases/19-security.md` (extend `TC-SEC-001` to `TC-SEC-004` for the new endpoints)

**Read first:** `architecture.md` §Generated on read (`refreshNotifications` and its table), §Database schema (`budgets`, `notifications`), §API (Budgets, Notifications) · `brd.md` §5 FR-09, FR-10 · ADR-0009

- [ ] `PUT /budgets/:categoryId` with `monthly_limit_paisa`: upserts the row effective from the current month; only categories of type `NONE` are accepted
- [ ] `DELETE /budgets/:categoryId`: writes a null limit effective from the current month
- [ ] `GET /budgets?month=`: for each budgeted category the limit in force that month, spent, remaining, percentage and state (`ok` below 70%, `warn` from 70% to 100%, `over` above 100%)
- [ ] `refreshNotifications(userId)` implementing every row of the table in `architecture.md`, idempotent through `dedupe_key`, setting `resolved_at` on alerts that no longer apply
- [ ] `GET /notifications` (runs the refresh; unread first; unresolved and recently resolved), `POST /notifications/:id/read`, `POST /notifications/read-all`
- [ ] Tests: changing a limit this month leaves last month's figures unchanged; spending up to 80% and past 100% raises each alert once; paying an overdue instance resolves its alert; loan return alerts respect the Running Balance and the latest settlement; running the refresh twice creates no duplicates

## Comments
