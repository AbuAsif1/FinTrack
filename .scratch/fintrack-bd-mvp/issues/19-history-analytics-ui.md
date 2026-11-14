# 19: History & Analytics UI

**What to build:** The History & Analytics screen: a monthly summary table and trend charts for income, spending by category and Savings Rate.

**Blocked by:** 11, 12

**Status:** done

**Test cases:** `test-cases/17-ui.md` §History (`TC-UI-140` to `TC-UI-142`)

**Read first:** `design.md` §6.4, §7.8 · `brd.md` §5 FR-08

- [x] Period selector and four tabs: Monthly Summary, Income Trends, Spending Trends, Savings Rate
- [x] Monthly Summary table per `design.md` §7.8, with a totals row and Fixed Expense compliance
- [x] Income Trends: stacked bars by income type per month
- [x] Spending Trends: grouped bars for the top five categories over 12 months, with tooltips
- [x] Savings Rate: line chart with the 20% reference line and an endpoint label
- [x] Every chart has a table or text fallback; labels and tooltips use `formatBDT`
- [x] Empty states for periods with no data

The Export CSV button on this page is added by ticket 23.

---

## Why

The dashboard shows the current month. History & Analytics answers the longer-term question: "What have my finances looked like over the past year?" A monthly summary table gives the user a spreadsheet-like overview for any period. Trend charts reveal patterns — a user can see that their spending spikes in December, their savings rate has been declining, or their income grew significantly in Q4. The Export CSV button on this page closes the loop for users who want to do further analysis in Excel.

## User flows

### Monthly summary review
1. User opens History & Analytics → Monthly Summary tab.
2. Default period: last 12 months (Jul 2025 – Jun 2026).
3. Table rows: each month with In-Hand Income, Total Spending, Net Savings, TDS, Savings Rate, Fixed Expense compliance (3/4 paid, 0 skipped, 1 unpaid).
4. Totals row at the bottom: year totals for each column.
5. User changes the period to "Last 6 months." Table updates.

### Income trends
1. User opens the Income Trends tab.
2. Stacked bar chart: each month's bar broken down by income type (Salary, Cheer, Holiday Support, Profit Share).
3. Hovering a bar segment shows the exact amount for that type and month.
4. User can see which months had Cheer or Holiday Support payments.

### Spending trends
1. User opens the Spending Trends tab.
2. Grouped bars for the top 5 spending categories over the last 12 months.
3. Tooltips show the exact amount per category per month.
4. User notices "Food & Dining" spiking in October — remembers it was Eid and spending was higher.

### Savings rate trend
1. User opens the Savings Rate tab.
2. Line chart showing savings rate percentage per month, with a horizontal reference line at 20% (the target).
3. The endpoint label shows the most recent month's rate.
4. Months below 20% are visually distinct (line or point in a different colour).

### Exporting data
1. User clicks "Export CSV" on the History & Analytics page.
2. Options: Transactions (all or filtered by date), Income (by fiscal year), Monthly Summary (by date range).
3. User downloads "transactions-2026-01-01-2026-11-30.csv." Opens in Excel. All amounts are in BDT decimal format (not Paisa integers).

## Scenarios

**Scenario A — first run with little data:** User has 2 months of data. The monthly summary shows 2 rows. The trend charts show 2 data points. Empty-state text explains what will appear as more data accumulates.

**Scenario B — Fixed Expense compliance column:** November shows "2/4 paid, 1 skipped, 1 unpaid." The user clicks the row to drill into November. The dashboard loads with November as the selected period, showing the 4 Fixed Expenses and their status.

**Scenario C — large dataset table:** User has 36 months of data. The monthly summary table scrolls vertically within its container. The header row stays visible (sticky header). No horizontal overflow.

**Scenario D — chart without data for some months:** User started using the app 6 months ago. The Income Trends chart for 12 months shows bars for the last 6 months and empty space for the first 6. No broken chart or zero-value bars for missing months — the chart skips those months or shows them clearly as "No data."

## Context notes

- Every chart must have a text/table fallback for accessibility. The fallback shows the same data as the chart in a table format.
- All amount values in charts and tables use `formatBDT` — not raw Paisa integers.
- The Export CSV button is added to the History & Analytics page by ticket 23 (ticket 23 provides the API endpoints; ticket 19 provides the button and UI).
- The period selector on History & Analytics is independent from the dashboard period selector. The user can select any date range.
- Fixed Expense compliance (paid, skipped, unpaid) is a separate dimension returned by `GET /analytics/monthly`. Do not compute it client-side — use the API value.

## Comments
