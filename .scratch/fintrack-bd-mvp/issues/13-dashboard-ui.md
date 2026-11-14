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

---

## Why

The dashboard is the app's home screen and the user's daily check-in. It must answer "how am I doing this month?" at a glance, with no need to navigate to multiple pages. The design presents period tiles for the financial snapshot, a Cash This Month panel for the budgeted view, alert banners for action items, and charts for trend context — all in one view. The first-run checklist guides new users who have no data yet, preventing an empty-screen experience that would cause them to abandon the app.

## User flows

### Daily check-in
1. User opens the app. The dashboard loads with the current month selected.
2. Summary tiles show: In-Hand Income ৳73,960, Total Spending ৳52,400, Net Savings ৳21,560, Savings Rate 29.1%, each with a coloured change chip (↑ green, ↓ red).
3. Cash This Month panel: Discretionary Cash ৳21,560 | Remaining to Spend ৳8,560 | Fixed Commitments ৳45,000.
4. If the month's salary hasn't been entered yet, the "Estimated" chip appears on income-related figures.
5. Alert banners show: "Home Electricity due in 2 days — ৳2,500" with a Mark Paid button.
6. Cash flow chart shows the last 6 months as income/spending bars.
7. Spending donut shows top categories for the current month.
8. Fixed Expenses panel shows this month's checklist (Paid, Pending, Overdue items).
9. Recent Transactions shows the last 10, newest first.
10. Tax snapshot card: "Remaining estimated tax: ৳69,129 | Suggested monthly TDS: ৳11,522 | Provisional ⚠"
11. Borrow-Loan summary: "They owe me ৳25,000."

### Switching periods
1. User clicks the period selector and chooses "Last 3 months."
2. All period tiles and charts update for the 3-month window.
3. Cash This Month panel always shows the current calendar month.

### Quick actions
1. User taps "Add Expenses" in the global topbar.
2. The Add Transaction modal opens. User enters ৳450 / Groceries / Cash.
3. After saving, the dashboard refreshes. Total Spending tile increases. Spending donut updates.

### First run
1. New user opens the app for the first time. All tiles show ৳0.
2. The first-run checklist card appears: "Add your first income entry," "Add a Fixed Expense," "Record a transaction," "Add a savings account."
3. Each item links to the relevant page or modal.

## Scenarios

**Scenario A — overdue alert:** "Mess Rent" due day was 5th. It's now the 8th and the instance is still PENDING. The alert banner shows "Mess Rent — Overdue 3 days — ৳8,000" in red. The user taps "Mark Paid," enters the amount and date in the drawer, and the banner disappears. The Fixed Expenses panel updates.

**Scenario B — negative remaining to spend:** Total Spending has exceeded Fixed Commitments + discretionary budget. "Remaining to Spend" shows -৳3,420 in red. The user knows they have overspent this month.

**Scenario C — desktop vs mobile layout:** On a 1440px desktop, the tiles appear in a row, the cash-flow chart and donut sit side by side, and the Fixed Expenses / Recent Transactions panels sit in a two-column grid. On a 375px mobile, tiles stack, charts stack, and the Fixed Expenses checklist comes before the charts.

**Scenario D — provisional tax notice:** The Tax snapshot card shows "⚠ Provisional — tax parameters for FY2026-27 not yet confirmed." The user clicks the card, which links to Tax Year Settings where they can confirm the parameters.

## Context notes

- All data comes from a single `GET /dashboard/summary` call. Do not add additional API calls to the dashboard page — this is a core performance requirement.
- Change indicators (↑12%) must be hidden when the previous period has no data (a new user's first month). Show the chip only when `has_prior_period_data` is true in the response.
- The alert banners use the same component shared with the Fixed Expenses page (ticket 16). Do not duplicate the banner component.
- The Quick Actions (Add Expenses, Add Income, Mark Fixed Paid) are in the global topbar (not the dashboard card). They are always accessible from any page.
- Loading skeletons must render during the data fetch. Each section has its own skeleton matching its content shape. Never show an empty page while loading.

## Comments
