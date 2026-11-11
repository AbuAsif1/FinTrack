# 14: Income & Savings UI

**What to build:** Two screens: (1) monthly income entry and history, (2) savings accounts list with per-account balance detail and DPS installment tracking.

**Blocked by:** 07 (Income Management), 04 (Savings Accounts), 12 (React Frontend Shell)

**Status:** ready-for-agent

- [ ] Income list screen: grouped by fiscal year, shows gross + TDS + in-hand for each entry; add/edit form
- [ ] Income add form: type selector (salary/PS/bonus/festival/cheer/leave), gross amount, TDS amount, month picker, earned_period for Cheer
- [ ] Savings accounts list: each account card shows name, type badge, computed balance with formatBDT()
- [ ] Savings account detail: balance history chart (Recharts line), list of linked transfer transactions
- [ ] DPS account card: shows next installment due date and amount, days-until-due countdown
- [ ] Add savings account form: name, type, opening balance, DPS-specific fields (installment amount, due day)
- [ ] All monetary inputs accept BDT decimal (e.g. "50000") and convert to paisa before API call
- [ ] Empty states for no income recorded yet, no savings accounts yet
