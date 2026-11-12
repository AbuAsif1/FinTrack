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

## Comments
