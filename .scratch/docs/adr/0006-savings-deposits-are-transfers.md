# Savings deposits are Transfers, not Spending

Status: accepted (2026-11-11). Replaces the `DPS_TRANSFER` / `SANCHAYPATRA_TRANSFER` and `dps_savings` / `sanchaypatra` routing names used in earlier drafts.

A DPS installment or Sanchaypatra purchase is a Transaction of type `SAVINGS_DEPOSIT` linked to a savings account. It reduces Remaining to Spend and increases the account balance, but it is excluded from Total Spending and from budgets. Counting it as Spending would understate the Savings Rate and hide savings growth, which was a stated pain point of the spreadsheets. The rebate bucket (DPS or Sanchaypatra) comes from the linked account's type, so one routing type covers both. Withdrawals (`SAVINGS_WITHDRAWAL`) and interest (`SAVINGS_INTEREST`) have their own types so a balance can go down as well as up.
