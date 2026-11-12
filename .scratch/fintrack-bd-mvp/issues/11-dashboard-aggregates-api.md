# 11: Dashboard & Analytics API

**What to build:** The single endpoint that powers the dashboard, and the endpoints behind the History & Analytics charts. Every figure comes from the one definition in `architecture.md` §Derived values.

**Blocked by:** 07, 08, 09, 10

**Status:** done

**Test cases:** `test-cases/14-dashboard-analytics.md` (`TC-DASH`) · `test-cases/19-security.md` (extend `TC-SEC-001` to `TC-SEC-004` for the new endpoints)

**Read first:** `rules.md` §2, §4 · `architecture.md` §Derived values (all), §API (Dashboard, Analytics), §Performance targets · `brd.md` §5 FR-02, FR-08 and §11 `AC-CASH-1`

- [x] `GET /dashboard/summary?from=&to=` returns in one response:
  - period tiles: In-Hand Income, Total Spending, Net Savings, Savings Rate, each with the change against the previous period of equal length
  - current month: Discretionary Cash, Remaining to Spend, Fixed Commitments and `income_is_estimated`
  - spending by category for the period
  - income against spending for the last six months
  - the current month's Fixed Expense instances with display status
  - the last 10 Transactions
  - loan summary
  - tax snapshot for the current Fiscal Year: Tax Paid, forecast Remaining Tax, Suggested Monthly TDS, `is_provisional`
  - unread notification count
- [x] The endpoint calls `ensureInstances` for the current month and `refreshNotifications`
- [x] `GET /analytics/monthly?from=&to=`: per month In-Hand Income, Total Spending, Net Savings, TDS, Savings Rate and Fixed Expense compliance (paid on time, paid late, skipped, unpaid)
- [x] `GET /analytics/category-trend?months=12` and `GET /analytics/income-trend?fiscal_year=`
- [x] Each derived figure is computed by its query in `lib/queries/`; nothing is recalculated a second way here
- [x] Tests: `AC-CASH-1`; `income_is_estimated` is true when the month has no Salary entry; soft-deleted rows are excluded everywhere; Transfers, loans and Tax Payments are absent from Total Spending; a three-month trend returns the right totals; the summary responds within 2 s with 500 seeded Transactions

## Comments
