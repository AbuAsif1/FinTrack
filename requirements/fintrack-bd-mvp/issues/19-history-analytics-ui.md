# 19: History & Analytics UI

**What to build:** The history and analytics screen showing spending trends over time, category breakdowns, and year-over-year comparisons.

**Blocked by:** 11 (Dashboard Aggregates API), 12 (React Frontend Shell)

**Status:** ready-for-agent

- [ ] Spending trend chart: Recharts line/bar chart for last 12 months, toggleable by category
- [ ] Category breakdown: donut or bar chart showing spending distribution for a selected period
- [ ] Month-over-month comparison: current month vs same month last year
- [ ] Period selector: custom date range picker (calendar month resolution)
- [ ] Income vs spending overlay: dual-axis chart showing in-hand income and total spending per month
- [ ] Loan history: net loan balance trend over time (how much is owed in total, month by month)
- [ ] All chart labels and tooltips use formatBDT() with South Asian grouping
- [ ] Export note: no PDF/CSV export in MVP (out of scope); placeholder text only
