# 13: Dashboard UI

**What to build:** The dashboard: period tiles, the Cash This Month panel, alert banners, charts, and snapshots of Fixed Expenses, recent Transactions, tax and loans, all from one API call.

**Blocked by:** 11, 12

**Status:** ready-for-agent

**Test cases:** `test-cases/17-ui.md` §Dashboard (`TC-UI-020` to `TC-UI-026`)

**Read first:** `design.md` §5, §6, §7.1 · `brd.md` §5 FR-02 · `GLOSSARY.md` (Discretionary Cash, Remaining to Spend, Net Savings, Savings Rate)

- [ ] Period selector with the five options and a custom range picker; a dropdown on mobile
- [ ] Summary tiles: In-Hand Income, Total Spending, Net Savings, Savings Rate, with change indicators
- [ ] Cash This Month panel: Discretionary Cash and Remaining to Spend, the `estimated` chip, and the danger colour when Remaining to Spend is negative
- [ ] Alert banners for due-soon and overdue Fixed Expenses with a Mark Paid action
- [ ] Cash flow bar chart for six months and spending-by-category donut, each with a text fallback
- [ ] Fixed Expenses panel, Recent Transactions, Tax snapshot card with the provisional notice, Borrow-Loan summary
- [ ] Quick actions: Add Spending, Add Income, Mark Fixed Paid
- [ ] First-run checklist card when there is no data
- [ ] Loading skeletons and empty states
- [ ] Desktop layout and mobile stacking order as in `design.md` §7.1

## Comments
