# Balances and tax totals are derived from transactions, never stored

Status: accepted (2026-11-11).

Savings account balances, Loan Person Running Balances, rebate-eligible DPS and Sanchaypatra totals, and Tax Paid are all computed by SQL aggregation over non-deleted rows. Stored counters would have to be reversed correctly on every edit, soft delete and import undo, which is exactly where the spreadsheets went wrong. The cost is an aggregate query per read, which is acceptable at one user's data volume.

## Consequences

- `savings_accounts` has no balance column and `loan_persons` has no balance column.
- `tax_investments` holds only amounts that have no transactions in the app (stocks, insurance, others). DPS and Sanchaypatra totals always come from transactions.
- Money, date and soft-delete state for a Loan Entry live on its paired Transaction, so the two can never disagree.
