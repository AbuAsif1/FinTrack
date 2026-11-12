# 14: Income & Savings UI

**What to build:** Two screens: Income (monthly entry, year-to-date table, Holiday Support log, salary history) and Savings & DPS (account cards with computed balances, deposits progress, withdrawals and interest).

**Blocked by:** 04, 06, 07, 12

**Status:** done

**Test cases:** `test-cases/17-ui.md` §Income and Savings (`TC-UI-040` to `TC-UI-046`)

**Read first:** `design.md` §7.2, §7.5 · `brd.md` §5 FR-03, FR-06

**Income**

- [x] Income page: Fiscal Year selector, year-to-date tiles, monthly table with Entered or Pending, inline expand to edit
- [x] Add and Edit Income modal per `design.md` §7.2: month, type, gross, TDS, read-only In-Hand Income, taxable toggle, employer, notes, and the Cheer fields; a Pending row opens it pre-filled from the latest Salary entry
- [x] Holiday Support log with the rate pre-filled, and an action that starts a Holiday Support Income Entry from the month's total
- [x] Salary history timeline

**Savings**

- [x] Savings page: summary tiles, the combined DPS rebate progress bar, and account cards per `design.md` §7.5
- [x] Add and Edit account form, with the DPS fields shown for DPS accounts
- [x] Account detail: Transaction history and, for DPS, projected principal at maturity
- [x] Withdraw and Add interest actions that open the Add Transaction form with the category and account pre-selected; Close account when the balance is zero
- [x] Empty states for no income and no accounts
- [x] Tests: TDS above gross is blocked in the form; the taxable toggle defaults by income type

## Comments

Implemented TC-UI-040 through TC-UI-046:
- TDS > gross: Save button disabled with inline error (TC-UI-040)
- Income type auto-sets taxable flag; Certification defaults to false (TC-UI-041)
- Pending row click opens modal with latest salary pre-fill (TC-UI-042)
- In-Hand is read-only computed field (TC-UI-043)
- Withdraw/Add interest buttons on each active account card (TC-UI-044)
- Close Account button appears only when balance is ৳0.00 (TC-UI-045)
- Single combined DPS rebate progress bar across all accounts (TC-UI-046)
