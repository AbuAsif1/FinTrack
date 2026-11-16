# 11: Dashboard Aggregates API

**What to build:** The single endpoint that powers the dashboard summary cards and charts. Aggregates income, spending, savings, loans, and tax into one response for a given period.

**Blocked by:** 03 (Transaction CRUD), 07 (Income Management), 08 (Fixed Expenses), 05 (Borrow-Loan Ledger), 09 (Tax Dashboard API), 10 (Budget & Notifications)

**Status:** ready-for-agent

- [ ] GET /dashboard/summary?month=YYYY-MM: returns in-hand income, total spending, discretionary cash, spending by category, fixed expense status summary, unread notification count
- [ ] GET /dashboard/spending-trend?months=6: monthly spending totals for the last N months (for charts)
- [ ] GET /dashboard/loan-summary: total loan balance, per-person balances with sign (positive = owed to user, negative = user owes)
- [ ] GET /dashboard/tax-status: fiscal year progress bar data — months elapsed, TDS paid, net tax, remaining, suggested monthly TDS
- [ ] All monetary values returned as paisa integers; display formatting is frontend-only
- [ ] Integration tests: seed a month of data, call summary and verify each aggregate; spending-trend returns correct monthly totals for 3-month window
