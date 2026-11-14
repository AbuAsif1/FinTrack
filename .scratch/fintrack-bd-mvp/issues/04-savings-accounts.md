# 04: Savings Accounts

**What to build:** Savings account management (DPS, Sanchaypatra, general savings). Balances are always computed from transactions — never stored as a mutable column.

**Blocked by:** 02 (Authentication)

**Status:** ready-for-agent

- [ ] POST /savings-accounts: create a savings account with type (DPS, Sanchaypatra, other), name, opening_balance_paisa
- [ ] GET /savings-accounts: list all accounts with computed running balance
- [ ] GET /savings-accounts/:id: detail with balance = opening_balance + SUM(linked transfer amounts)
- [ ] PATCH /savings-accounts/:id: update name, opening balance
- [ ] Balance is always computed on read — no mutable balance column
- [ ] DPS accounts track installment_amount_paisa and due_day_of_month
- [ ] Integration tests: create DPS account, link two transfer transactions, verify computed balance matches sum; Sanchaypatra account balance test
