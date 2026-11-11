# 14: Income & Savings UI

**What to build:** Two screens: Income (monthly entry, year-to-date table, Holiday Support log, salary history) and Savings & DPS (account cards with computed balances, deposits progress, withdrawals and interest).

**Blocked by:** 04, 06, 07, 12

**Status:** ready-for-agent

**Test cases:** `test-cases/17-ui.md` §Income and Savings (`TC-UI-040` to `TC-UI-046`)

**Read first:** `design.md` §7.2, §7.5 · `brd.md` §5 FR-03, FR-06

**Income**

- [ ] Income page: Fiscal Year selector, year-to-date tiles, monthly table with Entered or Pending, inline expand to edit
- [ ] Add and Edit Income modal per `design.md` §7.2: month, type, gross, TDS, read-only In-Hand Income, taxable toggle, employer, notes, and the Cheer fields; a Pending row opens it pre-filled from the latest Salary entry
- [ ] Holiday Support log with the rate pre-filled, and an action that starts a Holiday Support Income Entry from the month's total
- [ ] Salary history timeline

**Savings**

- [ ] Savings page: summary tiles, the combined DPS rebate progress bar, and account cards per `design.md` §7.5
- [ ] Add and Edit account form, with the DPS fields shown for DPS accounts
- [ ] Account detail: Transaction history and, for DPS, projected principal at maturity
- [ ] Withdraw and Add interest actions that open the Add Transaction form with the category and account pre-selected; Close account when the balance is zero
- [ ] Empty states for no income and no accounts
- [ ] Tests: TDS above gross is blocked in the form; the taxable toggle defaults by income type

## Comments
