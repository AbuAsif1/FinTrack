# 17: Borrow-Loan UI

**What to build:** The borrow/loan ledger screen: per-person sections, entry history, running balance with color coding, and Settle Up action.

**Blocked by:** 05 (Borrow-Loan Ledger), 12 (React Frontend Shell)

**Status:** ready-for-agent

- [ ] Loan persons list: each person shows name, running balance with color (green = they owe user, red = user owes them)
- [ ] Person detail: full entry history with running balance per row (like a mini bank statement)
- [ ] Add entry form: direction selector (Given / Received), amount, date, note; direction labels use first-person language ("I gave" / "I received")
- [ ] Settle Up action: pre-fills a Received entry for the exact outstanding balance; one-tap settlement
- [ ] Delete entry: soft-delete with confirmation; balance recalculates immediately
- [ ] Add loan person: name field
- [ ] Real data acceptance: Mithun balance ৳9,841, Amait ৳1,198.50, Sohel −৳3,145.42 visible in test/demo state
- [ ] Running balance sign explanation: tooltip or label clarifying "positive = they owe you"
