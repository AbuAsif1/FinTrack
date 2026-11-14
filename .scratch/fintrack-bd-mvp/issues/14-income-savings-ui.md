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

---

## Why

Income and savings are two of the user's most important financial categories, but they have different shapes. Income is recorded monthly and feeds the tax calculation — the user needs a year-to-date view that shows each month's status (Entered or Pending), along with the ability to add, edit, and confirm entries. Savings accounts (DPS, Sanchaypatra, etc.) are long-term holdings where the user tracks balance, monitors DPS rebate progress toward the tax cap, and sees when accounts mature. Combining them in one screen reduces navigation friction for the monthly workflow: check income → check savings progress → review tax rebate impact.

## User flows

### Monthly income entry workflow
1. User opens the Income page on the 1st of November.
2. The year-to-date table shows July–June rows. November shows "Pending" (no entry yet).
3. User clicks the November row (or the + button). The Add Income modal opens.
4. The Salary entry from October (৳85,000) pre-fills the gross field. User confirms (same amount) or adjusts.
5. TDS is entered (৳11,040). In-Hand Income auto-computes (৳73,960) in the read-only field.
6. User saves. November row updates to "Entered ৳85,000 gross / ৳73,960 in-hand."

### Holiday Support entry
1. User opens the Holiday Support log section on the Income page.
2. The rate is pre-filled from last time (৳1,500/day for Eid days). User records 2 days.
3. Amount: 2 × ৳1,500 = ৳3,000. User taps "Create Income Entry."
4. The Income modal opens pre-filled with type "Holiday Support," gross ৳3,000.

### Adding a DPS account
1. User opens the Savings tab (or Savings page).
2. Taps "Add account." Type: DPS. Bank: "BRAC Bank." Name: "BRAC DPS Nov 2023."
3. Monthly installment: ৳10,000. Opening date: 2023-11-01. Maturity: 2028-11-01.
4. Saves. Card appears showing: Balance ৳4,80,000 (48 months × ৳10,000), Projected at maturity: ৳10,00,000 (remaining months × ৳10,000 + current balance).

### DPS rebate progress
1. The Savings page shows a combined progress bar across all DPS accounts.
2. "DPS deposits this fiscal year: ৳1,20,000 / ৳1,20,000 cap (100%)."
3. Making another DPS deposit this fiscal year will not increase the rebate — the cap is reached.

## Scenarios

**Scenario A — TDS exceeds gross blocked:** User enters ৳10,000 gross and ৳15,000 TDS. The Save button shows an inline error "TDS cannot exceed gross." Save is disabled until corrected.

**Scenario B — income type auto-sets taxable flag:** User switches type from Salary (taxable: ON) to Certification Reimbursement (taxable: OFF by default). The taxable toggle flips automatically. User can override it.

**Scenario C — Withdraw from savings:** User needs ৳20,000 from their Standard Chartered savings. They tap "Withdraw" on the account card. The Add Transaction form opens pre-filled with category "Savings Withdrawal" (routing SAVINGS_WITHDRAWAL) and the account selected. Amount: ৳20,000. After saving, the account balance decreases.

**Scenario D — Close account at zero balance:** User's FDR has matured and they withdrew all funds. The balance shows ৳0.00. The "Close account" button appears. They tap it, confirm, and the account moves to "Closed" (archived). Historical transactions remain.

## Context notes

- The year-to-date income table shows months July through June. Rows are fiscal-year months, not calendar months. A "Pending" row is a month with no income entry.
- Clicking a "Pending" row opens the Add Income modal pre-filled with the latest Salary entry's values. The user can confirm or adjust.
- The combined DPS rebate progress bar uses the DPS total from `GET /savings-accounts` (which sums all SAVINGS_DEPOSIT transactions to DPS-type accounts in the fiscal year). It shows the cap from the current fiscal year's tax settings.
- Withdraw and Add Interest buttons appear only on active (not closed) accounts.
- The projected principal at maturity for a DPS account = current balance + (monthly installment × months remaining to maturity). This is computed server-side by `GET /savings-accounts/:id`.

## Comments

Implemented TC-UI-040 through TC-UI-046:
- TDS > gross: Save button disabled with inline error (TC-UI-040)
- Income type auto-sets taxable flag; Certification defaults to false (TC-UI-041)
- Pending row click opens modal with latest salary pre-fill (TC-UI-042)
- In-Hand is read-only computed field (TC-UI-043)
- Withdraw/Add interest buttons on each active account card (TC-UI-044)
- Close Account button appears only when balance is ৳0.00 (TC-UI-045)
- Single combined DPS rebate progress bar across all accounts (TC-UI-046)
