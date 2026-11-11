# 04: Savings Accounts

**What to build:** Savings account management (Savings, DPS, Sanchaypatra, Investment, Cash) with balances that are always computed from Transactions and can go down as well as up.

**Blocked by:** 03

**Status:** ready-for-agent

**Test cases:** `test-cases/07-savings.md` (`TC-SAV`) · `test-cases/19-security.md` (extend `TC-SEC-001` to `TC-SEC-004` for the new endpoints)

**Read first:** `rules.md` §4 · `architecture.md` §Database schema (`savings_accounts`), §Derived values (Savings balance, DPS total), §API (Savings) · `brd.md` §5 FR-06 and §11 `AC-SAV-1` · ADR-0005

- [ ] `POST /savings-accounts`: name, type, bank name, last four digits, opening balance, opening date; for DPS also monthly installment, maturity date and optional interest rate
- [ ] `GET /savings-accounts`: every account with computed `balance_paisa`, plus totals: total saved, this month's deposits, this Fiscal Year's deposits, and combined DPS deposits this Fiscal Year against the DPS cap in that year's tax settings
- [ ] `GET /savings-accounts/:id`: detail with computed balance; for DPS the projected principal at maturity (balance + monthly installment × months from next month through the maturity month)
- [ ] `PATCH /savings-accounts/:id`: editable fields; `closed_on` accepted only when the balance is zero
- [ ] `GET /savings-accounts/:id/transactions`
- [ ] Balance computed in SQL from the definition in `architecture.md`; the table has no balance column
- [ ] Tests (savings Transactions are inserted by fixture until ticket 06): `AC-SAV-1`; a soft-deleted deposit does not count; closing an account with a balance is 422; combined DPS progress across two DPS accounts; a Sanchaypatra account balance

## Comments
