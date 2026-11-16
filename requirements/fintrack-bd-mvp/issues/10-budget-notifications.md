# 10: Budget & Notifications API

**What to build:** Per-category monthly budgets with over-budget detection, and a notifications queue that agents and the dashboard can read. Discretionary Cash = In-Hand Income − Σ(active fixed expense amounts).

**Blocked by:** 03 (Transaction CRUD), 05 (Borrow-Loan Ledger), 08 (Fixed Expenses)

**Status:** ready-for-agent

- [ ] POST /budgets: set a monthly budget for a category (amount_paisa, calendar_month)
- [ ] GET /budgets?month=YYYY-MM: list budgets with spent_paisa and remaining_paisa for each category
- [ ] Discretionary Cash endpoint: GET /dashboard/discretionary?month=YYYY-MM → in_hand_income − fixed_expense_total
- [ ] POST /notifications: internal API for creating a notification (type, message, severity)
- [ ] GET /notifications: list unread notifications
- [ ] PATCH /notifications/:id/read: mark as read
- [ ] Notification triggers: over-budget when spending in category exceeds budget; fixed expense due within 3 days and still Pending; loan balance crosses zero (direction flip)
- [ ] Integration tests: add spending that pushes category over budget → notification created; mark read; discretionary cash calculation verified
