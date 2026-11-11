# 13: Dashboard UI

**What to build:** The main dashboard screen: summary cards, spending chart, quick stats for loans and tax, and unread notification badge. Uses formatBDT() and South Asian grouping throughout.

**Blocked by:** 11 (Dashboard Aggregates API), 12 (React Frontend Shell)

**Status:** ready-for-agent

- [ ] Summary cards: In-Hand Income, Total Spending, Discretionary Cash, Savings Balance (all using formatBDT() with South Asian grouping)
- [ ] Spending trend bar chart (Recharts): last 6 months, BDT labels on Y-axis
- [ ] Fixed expenses mini-panel: count of pending vs paid for the current month; overdue items highlighted
- [ ] Loan summary row: total net balance with color coding (green = owed to user, red = user owes)
- [ ] Tax progress strip: fiscal year progress, TDS paid vs net tax, remaining amount
- [ ] Period selector: switch between calendar months; updates all cards
- [ ] Notification bell badge: count of unread; tapping opens notification drawer
- [ ] Empty states for first-time use (no income yet, no transactions yet)
- [ ] Mobile-first layout matching the wireframe in docs/design.md §8 Dashboard page
