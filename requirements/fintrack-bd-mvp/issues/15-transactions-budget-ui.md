# 15: Transactions & Budget UI

**What to build:** The transaction list, add/edit form, and budget overview screen. Category routing side effects (DPS, loan entries) happen transparently when a category with a routing type is selected.

**Blocked by:** 06 (Category Routing Service), 10 (Budget & Notifications), 12 (React Frontend Shell)

**Status:** ready-for-agent

- [ ] Transaction list: filterable by month, category, payment method; grouped by date; each row shows formatted BDT amount, category chip, payment method icon
- [ ] Add transaction form: amount, date, category selector (shows routing type badge for DPS/loan/Sanchaypatra), description, payment method (cash/bKash/bank); bKash highlighted with #E2136E
- [ ] Category routing disclosure: when user picks a DPS category, show inline note "This will credit your DPS account"
- [ ] Edit/delete transaction: confirmation for delete (soft-delete); shows affected side effects
- [ ] Budget screen: per-category budget vs spent bar, remaining amount, over-budget categories in danger color
- [ ] Set/edit budget for a category: amount input + month picker
- [ ] Discretionary cash display: in-hand income minus fixed commitments
- [ ] Transaction search: filter by description text
