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

---

## Why

The dashboard is the user's daily view: "how am I doing this month?" All the information a user needs to stay on track — income vs spending, remaining discretionary cash, upcoming fixed expenses, loan summary, tax snapshot, unread alerts — arrives in a single API call. The single-endpoint design prevents the dashboard page from making 8 separate requests that each add latency and show staggered loading states. The analytics endpoints support the History page's trend charts, which give the user a longer view of their financial trajectory.

## User flows

### Opening the dashboard
1. User opens the app. `GET /dashboard/summary` runs with `from` and `to` matching the current month.
2. The API calls `ensureInstances` (generates this month's Fixed Expense instances) and `refreshNotifications` (updates alert states). Both are idempotent.
3. Returns in one payload:
   - Period tiles: In-Hand Income (৳73,960), Total Spending (৳52,400), Net Savings (৳21,560), Savings Rate (29.1%)
   - Each tile with change vs last month: "↑12% vs last month"
   - Current month: Discretionary Cash (৳21,560), Remaining to Spend (৳8,560), Fixed Commitments (৳45,000)
   - Cash flow chart data (last 6 months)
   - Spending-by-category donut data
   - Fixed Expense instances (this month's checklist)
   - Last 10 transactions
   - Loan summary: "They owe me: ৳25,000 | I owe: ৳0 | Net: ৳25,000"
   - Tax snapshot: Tax paid: ৳66,240 | Remaining: ৳69,129 | Suggested monthly TDS: ৳11,522
   - Unread notification count: 2

### Switching the dashboard period
1. User selects "Last 3 months" on the period selector.
2. `GET /dashboard/summary?from=2026-09-01&to=2026-11-30` returns the same structure for the 3-month window.
3. Period tiles and change indicators update to reflect the selected range. Cash This Month panel always shows the current month regardless of the selected period.

### Viewing monthly analytics
1. User opens History & Analytics → Monthly Summary tab.
2. `GET /analytics/monthly?from=2026-01-01&to=2026-11-30` returns 11 month rows.
3. Each row: month, In-Hand Income, Total Spending, Net Savings, TDS, Savings Rate, Fixed Expense compliance (3 paid, 1 skipped, 0 unpaid).

## Scenarios

**Scenario A — `income_is_estimated` flag:** It's the 5th of November. The user has not yet entered November's salary. `GET /dashboard/summary` returns `income_is_estimated: true`. The dashboard shows an "Estimated" chip on the income tile and Cash This Month panel. The income figure is projected from last month's salary.

**Scenario B — first run, no data:** A new user opens the app. All period tiles are ৳0. The API returns `income_is_estimated: true`. The dashboard shows the first-run checklist card guiding them to add income, categories, and their first transaction.

**Scenario C — performance with 500 transactions:** A seed test inserts 500 transactions for the current month and calls `GET /dashboard/summary`. The response arrives within 2 seconds (performance target from `architecture.md`). No N+1 queries — all data is fetched in bulk queries via `lib/queries/`.

**Scenario D — Transfers excluded from spending:** A user deposits ৳10,000 into DPS (a SAVINGS_DEPOSIT transaction). Total Spending does not increase. Transfers, Loans, and Tax Payments are excluded from the spending total by design.

## Context notes

- Every derived figure (In-Hand Income, Total Spending, Net Savings, Discretionary Cash, etc.) has a single definition in `architecture.md` §Derived values. The dashboard API must use these definitions exactly — not approximate them or recalculate differently.
- `income_is_estimated` is true when the current month has no Salary income entry. The dashboard uses the most recent Salary entry's gross as the estimate.
- The endpoint calls `ensureInstances` and `refreshNotifications` as a side effect. These are always safe to call and are idempotent.
- Performance target: `GET /dashboard/summary` must respond within 2 seconds with 500 seeded transactions. All queries must be in `lib/queries/` — no ad-hoc joins in the route handler.
- Change indicators (↑12%) compare the selected period against an equal-length previous period. For a 1-month period, the previous month. For a 3-month period, the previous 3 months.

## Comments
