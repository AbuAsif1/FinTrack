# 04: Savings Accounts

**What to build:** Savings account management (Savings, DPS, Sanchaypatra, Investment, Cash) with balances that are always computed from Transactions and can go down as well as up.

**Blocked by:** 03

**Status:** done

**Test cases:** `test-cases/07-savings.md` (`TC-SAV`) · `test-cases/19-security.md` (extend `TC-SEC-001` to `TC-SEC-004` for the new endpoints)

**Read first:** `rules.md` §4 · `architecture.md` §Database schema (`savings_accounts`), §Derived values (Savings balance, DPS total), §API (Savings) · `brd.md` §5 FR-06 and §11 `AC-SAV-1` · ADR-0005

- [ ] `POST /savings-accounts`: name, type, bank name, last four digits, opening balance, opening date; for DPS also monthly installment, maturity date and optional interest rate
- [ ] `GET /savings-accounts`: every account with computed `balance_paisa`, plus totals: total saved, this month's deposits, this Fiscal Year's deposits, and combined DPS deposits this Fiscal Year against the DPS cap in that year's tax settings
- [ ] `GET /savings-accounts/:id`: detail with computed balance; for DPS the projected principal at maturity (balance + monthly installment × months from next month through the maturity month)
- [ ] `PATCH /savings-accounts/:id`: editable fields; `closed_on` accepted only when the balance is zero
- [ ] `GET /savings-accounts/:id/transactions`
- [ ] Balance computed in SQL from the definition in `architecture.md`; the table has no balance column
- [ ] Tests (savings Transactions are inserted by fixture until ticket 06): `AC-SAV-1`; a soft-deleted deposit does not count; closing an account with a balance is 422; combined DPS progress across two DPS accounts; a Sanchaypatra account balance

---

## Why

The user has DPS (recurring monthly savings with a maturity date), Sanchaypatra (government savings certificates), fixed deposits (FDR), and regular savings accounts. These are the primary investment instruments in the Bangladesh context. Tracking them in the app serves two purposes: (1) the savings dashboard shows the user their total saved and DPS progress toward the tax rebate cap, and (2) the DPS total feeds directly into the tax calculation as an investment rebate. The balance is always computed from Transactions — no stored balance column — so it can never be out of sync with the ledger (ADR-0005).

## User flows

### Opening a new savings account
1. User opens Savings → "Add account."
2. Selects type: Savings / DPS / Sanchaypatra / FDR / Investment.
3. Enters: bank name (e.g. "BRAC Bank"), account name, last four digits (optional), opening date, opening balance.
4. For DPS: also enters monthly installment (e.g. ৳10,000), maturity date (e.g. 2028-06-01), and optional interest rate.
5. Saves. The account card appears on the Savings page.

### Making a DPS deposit (monthly)
1. The DPS account card shows the next installment due.
2. User taps "Deposit" → opens the Add Transaction form pre-filled with category "DPS / Savings" (routing type SAVINGS_DEPOSIT) and the account pre-selected.
3. User confirms the amount (e.g. ৳10,000) and date.
4. `POST /transactions` with `savings_account_id` creates the transaction. The account balance updates to reflect the new deposit.

### Adding savings interest
1. User taps "Add interest" on a savings account card.
2. Opens Add Transaction with routing type SAVINGS_INTEREST, account pre-selected.
3. User enters the interest amount credited by the bank.
4. Transaction created; balance increases.

### Closing an account
1. User taps "Close account" (only visible when balance is exactly ৳0.00).
2. A confirmation modal explains that the account will be archived.
3. `PATCH /savings-accounts/:id` with `closed_on: today` marks it inactive.
4. The account moves to a "Closed accounts" section. Its historical balance and transactions remain.

## Scenarios

**Scenario A — DPS tax rebate progress:** A user has two DPS accounts totalling ৳10,000/month. The Savings page shows the combined DPS rebate progress bar: "৳1,20,000 deposited this fiscal year / ৳1,20,000 cap (100%)." The tax engine uses this figure for the investment rebate.

**Scenario B — Sanchaypatra purchase:** A user buys ৳5,00,000 of Sanchaypatra. They create a Sanchaypatra account and record the purchase as a SAVINGS_DEPOSIT transaction. The Savings page shows the total saved including this new investment.

**Scenario C — DPS maturity projection:** A user has a DPS account with ৳3,20,000 current balance, ৳10,000/month installment, and maturity in 18 months. The account detail shows "Projected principal at maturity: ৳5,00,000" (current balance + 18 × ৳10,000).

**Scenario D — insufficient balance withdrawal:** A user tries to withdraw ৳50,000 from a savings account with a ৳30,000 balance. `POST /transactions` returns 422 — a SAVINGS_WITHDRAWAL cannot exceed the balance (CategoryRoutingService check in ticket 06).

## Context notes

- Balance is computed in SQL from all SAVINGS_DEPOSIT, SAVINGS_WITHDRAWAL, and SAVINGS_INTEREST transactions for the account (ADR-0005). There is no `balance_paisa` column in the table. Never cache or store a balance.
- DPS total for the tax rebate is the sum of all SAVINGS_DEPOSIT transactions to DPS-type accounts in the fiscal year, capped at the DPS limit in `tax_years.config_json`. This is computed by the tax engine — do not hardcode the cap.
- An account can only be closed when its computed balance is zero. The API returns 422 if attempted with a non-zero balance.
- Soft delete applies to transactions, not accounts. An account is deactivated with `closed_on`, not deleted.
- The opening balance is a special transaction (type SAVINGS_DEPOSIT with a note "Opening balance") created when the account is first set up. It counts toward the balance but not toward the fiscal-year DPS total.

## Comments
