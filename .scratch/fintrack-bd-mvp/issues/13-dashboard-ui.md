# 13: Dashboard UI

**What to build:** The dashboard: period tiles, the Cash This Month panel, alert banners, charts, and snapshots of Fixed Expenses, recent Transactions, tax and loans, all from one API call.

**Blocked by:** 11, 12

**Status:** done

**Test cases:** `test-cases/17-ui.md` §Dashboard (`TC-UI-020` to `TC-UI-026`)

**Read first:** `design.md` §5, §6, §7.1 · `brd.md` §5 FR-02 · `GLOSSARY.md` (Discretionary Cash, Remaining to Spend, Net Savings, Savings Rate)

- [x] Period selector with the five options and a custom range picker; a dropdown on mobile
- [x] Summary tiles: In-Hand Income, Total Spending, Net Savings, Savings Rate, with change indicators
- [x] Cash This Month panel: Discretionary Cash and Remaining to Spend, the `estimated` chip, and the danger colour when Remaining to Spend is negative
- [x] Alert banners for due-soon and overdue Fixed Expenses with a Mark Paid action
- [x] Cash flow bar chart for six months and spending-by-category donut, each with a text fallback
- [x] Fixed Expenses panel, Recent Transactions, Tax snapshot card with the provisional notice, Borrow-Loan summary
- [x] Quick actions: Add Expenses, Add Income, Mark Fixed Paid
- [x] First-run checklist card when there is no data
- [x] Loading skeletons and empty states
- [x] Desktop layout and mobile stacking order as in `design.md` §7.1

## Comments
