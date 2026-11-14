# p2-22: Account types, Parent Accounts and the Bank & Wallet page

**Status:** in-progress
**Phase:** 2
**Read first:** `rules.md` §1, §3, §4, §5, §6; `architecture.md` §Category routing, §Derived values; ADR-0014
**Test cases:** `.scratch/fintrack-bd-phase-2/test-cases/p2-22-account-types.md` (TC-P2ACC-001 to 015)

---

## What to build

Every place money sits is a savings account row, and every money movement names the account it leaves and the account it enters.

| Account type | Parent | Pays Spending / receives income | Bank & Wallet total |
|---|---|---|---|
| `SAVINGS` (bank account) | none | yes | Bank |
| `MFS` (bKash, Nagad, …) | none | yes | MFS |
| `CASH` (In-Hand Cash, one per user) | none | yes | In-Hand Cash |
| `DPS`, `FDR` | required: a `SAVINGS` or `MFS` account | no | the parent's total |
| `SANCHAYPATRA`, `INVESTMENT` | none | no | Sanchaypatra & Investment |

- Add Expenses offers `BANK` and `CASH` only. `BANK` lists every `SAVINGS` and `MFS` account. `CASH` uses the In-Hand Cash account.
- Loans and Tax Payments paid by `BANK` name their account like Spending does.
- A DPS installment can be paid from any Payment Account; its amount comes from the Fixed Expense.
- Income credits its receiving account with gross − TDS. Only Payment Accounts can receive.
- A Savings Withdrawal from a DPS/FDR credits its parent.
- Transfers move money between Payment Accounts.
- The Wallets page and the manual wallet setup are removed. The Bank & Savings page becomes **Bank & Wallet** with totals: Bank, MFS, In-Hand Cash, Sanchaypatra & Investment, Net Worth. Total Saved, YTD Contribution, DPS Accounts and the DPS rebate bar are removed (the Tax page keeps rebate tracking). The dashboard's Net Worth uses the same figure.
- Card is removed from all forms. Old Card and bKash transactions keep their label.
- Existing DPS/FDR without a parent show "Link to parent account" and count only in Net Worth until linked.

## Out of scope

- Credit cards.
- Dropping the old `wallets` / `wallet_transfers` tables (left in place, unused; dropping needs the owner's go-ahead because they may hold data).

## Acceptance

- [x] Schema: `MFS` account type, nullable `parent_account_id`
- [x] One balance calculation used by every balance and total
- [x] Account rules enforced on create, update, payments, income and transfers
- [x] Bank & Wallet page, Add Expenses and Income forms follow the rules above
- [x] Wallets page, API and nav entry removed; `/wallets` redirects
- [x] Every TC-P2ACC case has a passing test; MVP regression still passes (422/422)
- [ ] Production build and browser check of the Bank & Wallet page, Add Expenses, Income and Mark Paid

## Comments

- 2026-11-14: Five copies of the balance formula existed and disagreed (the single-account view ignored Spending; the dashboard's Net Worth summed opening balances only). All now call `lib/services/accounts.ts`.
- 2026-11-14: Fixed Expenses "Mark Paid" never named a paying account, so a DPS rose with no bank going down. It now asks which account pays (TC-P2ACC-016).
- 2026-11-14: Updated `architecture.md` §Derived values, `design.md` §7.5 and `GLOSSARY.md` to match ADR-0014; ADR-0012 marked superseded.
- 2026-11-15 (owner): Investment becomes one account type with a Kind (Sanchaypatra, UPension, Stocks, Insurance, Others), each with an optional monthly installment, each feeding its own Tax Rebate bucket (ADR-0015, TC-P2ACC-017 to 021). Add Expenses → Investment now pays into an Investment Account. Manual investment editing removed from the Tax page (TC-UI-125 retired). "Tax Dashboard" renamed "Tax" in the menu and page title.
