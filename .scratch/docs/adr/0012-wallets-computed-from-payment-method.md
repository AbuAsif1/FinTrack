# Wallets are computed views over the existing PaymentMethod enum

Status: accepted (2026-11-14).

The MVP records `payment_method` (CASH | BKASH | BANK | CARD) on every Transaction. p2-05 adds opening balances and running totals per method without migrating the enum to a table in this release.

**Decision:** `Wallet` is a new table that holds a user-supplied opening balance and date per payment method. The running balance is derived on read: `opening_balance + SUM(inflows) − SUM(outflows)` over all non-deleted transactions whose `payment_method` matches, from `opening_balance_date` onward. Wallet-to-wallet transfers are stored in a separate `WalletTransfer` table (not mixed into the Transaction table). Income entries are not yet linked to a wallet (income does not have a `payment_method` field); the balance is therefore a spending-side view only until a future ticket adds income-to-wallet linkage.

**Why not an enum-to-table migration now:** Migrating `Transaction.payment_method` from an enum column to a FK requires back-filling every row and touching all transaction CRUD; it also raises the question of multiple BANK accounts. Deferring keeps MVP transactions untouched and unblocks the net-worth view immediately.

**Why not per-bank-account wallets:** BRAC Bank vs DBBL Bank cannot be distinguished from the BANK enum value without that migration. This ticket gives one BANK wallet. Per-bank wallets are a natural follow-on once the enum-to-table migration is done.

## Consequences

- Wallet balances are estimates if the user has not set an opening balance (shown with a warning).
- Income is not counted in wallet balances until IncomeEntry gains a `payment_method` field.
- Net worth = Σ wallet balances + Σ savings account balances + net loans given − net loans received.
- `WalletTransfer` rows affect wallet balances (debit from-method, credit to-method) but do not appear in Spending reports.
