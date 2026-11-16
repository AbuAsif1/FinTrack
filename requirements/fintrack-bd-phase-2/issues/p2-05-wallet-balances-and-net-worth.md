# p2-05: Wallet Balances and Net Worth

**Status:** done
**Phase:** 2
**Spec ref:** Phase 2 §5

---

## What to build

Balance tracking for each payment method (cash, bKash, each bank account), and a **net worth figure** calculated from:

- Savings account balances (DPS, Sanchaypatra, FDR — already tracked in the MVP)
- Wallet balances (cash, bKash, bank accounts — new in this ticket)
- Loans owed to the user (money the user lent, net of repayments)
- Loans owed by the user (money the user borrowed, net of repayments) — subtracted

This turns "payment method" from a label on a Transaction into a first-class account with its own opening balance and running total.

---

## Why

The MVP records which payment method was used for each transaction (bKash, BRAC Bank, cash, etc.) but does not track how much is in each. A user who wants to know "how much do I have in bKash right now?" cannot find out. The net worth figure is the owner's original vision for the app: a single number that answers "what is my overall financial position?"

**Why deferred from MVP:** Turning payment method into an account is a schema-level change that touches every Transaction. It requires opening balances (a chicken-and-egg problem for existing data) and a transfer mechanism between wallets (e.g. moving money from BRAC Bank to bKash). This is a significant feature; it was deferred to avoid blocking the MVP.

---

## User flows

### Setting an opening balance for a wallet
1. When the feature is introduced (or when a user first sets up), each payment method shows "Opening balance: not set."
2. User opens **Wallets** (new page or section in Settings or Dashboard sidebar).
3. User selects "BRAC Bank" and clicks "Set opening balance."
4. A modal asks for the balance on a specific date (default: account creation date or a user-chosen date).
5. User types ৳85,000 and picks 1 January 2025. Saves.
6. The wallet now shows a running balance: opening balance ± all transactions using this payment method from that date.

### Viewing wallet balances
1. User opens **Wallets** (or a Wallets card on the Dashboard).
2. Each wallet shows: name, current balance, last-updated timestamp.
3. Tapping a wallet shows a mini statement — recent transactions that used it.

### Transferring between wallets
1. User opens **Wallets → Transfer**.
2. Selects "From: BRAC Bank" and "To: bKash."
3. Enters ৳5,000 and a date. Optionally adds a note.
4. The transfer creates two linked internal transactions: a debit on BRAC Bank and a credit on bKash. Neither appears in Spending or Income totals — it is a transfer, not an expense.
5. Both wallet balances update immediately.

### Net worth view
1. Net worth section (dashboard card or dedicated view) shows:
   - **Assets:** sum of wallet balances + sum of savings account balances + total lent (outstanding)
   - **Liabilities:** total borrowed (outstanding)
   - **Net worth:** Assets − Liabilities
2. Each line is expandable to show the contributing accounts.

---

## Scenarios

**Scenario A — month-end reconciliation:** The user receives their salary into BRAC Bank. After paying rent (bank transfer out) and bKash top-up (transfer), they open Wallets and confirm each balance matches what they see in their actual bank app.

**Scenario B — first-time setup mid-year:** A user has been using the app for 6 months without wallet balances. They now enable this feature and enter opening balances for each payment method as of today; the running balance is calculated forward from today (older transactions are not retroactively adjusted).

**Scenario C — net worth milestone:** The user's net worth crosses ৳10,00,000 for the first time. The net worth card shows this clearly; they can see which savings account contributed most.

**Scenario D — negative cash balance (data error):** The user's cash wallet shows a negative balance because some transactions used "Cash" as payment method but no opening balance was set. The app shows the balance with a warning: "Opening balance not set — balance may be inaccurate."

---

## Impact areas

- **Schema change:** `payment_methods` becomes a table (or at least gains an `opening_balance_paisa` and `opening_balance_date`); every `Transaction.payment_method` column must reference it
- New DB table: `wallet_transfers` (from_method_id, to_method_id, amount_paisa, date, note)
- New API routes: `GET/PUT /wallets`, `GET /wallets/:id/transactions`, `POST /wallets/transfers`
- Dashboard aggregate API must include net worth calculation
- Net worth calculation must handle the case where savings accounts have no current balance (DPS maturity in the future, Sanchaypatra with known profit date)
- Existing Transaction CRUD must continue to work; payment_method field on Transaction must remain valid after schema migration
- Migration: existing payment methods (enum strings) need to become rows in the new table with null opening balances

---

## Decisions needed before build

- Should wallet balances be maintained as a running total (recalculated from transactions) or stored as a snapshot updated on each transaction? (Running total is simpler and always correct; snapshot is faster at scale but risks drift. Recommend running total for now.)
- How to handle the enum-to-table migration for payment methods without breaking existing transactions.
- Should transfers appear in the transaction history with a special type, or only in a dedicated transfers view?
- Write an ADR for the payment-method-as-account design before implementing.

---

## Blocked by

- Ticket 03 (Transaction CRUD) — transaction payment_method field must be stable.
- Ticket 04 (Savings Accounts) — savings balance data is needed for net worth.
- Ticket 05 (Borrow/Loan Ledger) — loan balances are needed for net worth.

## Comments

<!-- Append discussion below this line -->
