# FinTrack BD — Business Requirements Document

> **Owns:** what the product must do — scope (§3), feature requirements (§5), tax formulas and per-year parameters (§6), acceptance fixtures (§11).
> Stack, schema and API are in `architecture.md`. Coding constraints are in `rules.md`. Visuals are in `design.md`.

**Version:** 1.2
**Date:** 12 November 2026
**Status:** Baseline for the MVP build
**Artifact:** https://claude.ai/artifact/7dj3aJthhaLyERWfPS6LU3

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Problem Statement](#2-problem-statement)
3. [Scope](#3-scope)
4. [Multi-Role Analysis](#4-multi-role-analysis)
5. [Feature Requirements](#5-feature-requirements)
6. [Tax Module](#6-tax-module)
7. [Data Rules](#7-data-rules)
8. [Solution Architecture](#8-solution-architecture)
9. [Gap Analysis](#9-gap-analysis)
10. [Roadmap](#10-roadmap)
11. [Acceptance Fixtures and Non-Functional Requirements](#11-acceptance-fixtures-and-non-functional-requirements)
12. [Change Log](#12-change-log)

---

## 1. Product Overview

**FinTrack BD** is a personal finance web application for a salaried professional in Bangladesh. It replaces three Excel sheets with one mobile-friendly system:

1. A salary and tax worksheet: 12 months of salary, Profit Share, bonuses, TDS and tax-slab calculations
2. A fixed spending tracker with a deadline checkbox per month
3. A borrow-loan ledger of money lent to or borrowed from named individuals

Unlike generic finance apps, FinTrack BD is built around Bangladesh-specific concepts: the NBR Fiscal Year (July to June), slab-based tax with a rebate for DPS and Sanchaypatra investments, TDS reconciliation, the DPS installment as both a cash outflow and savings growth, and informal bKash and bank loans between friends.

---

## 2. Problem Statement

### Current pain points

- Three separate sheets with no single source of truth
- Tax calculation is manual, and slabs are re-entered every Fiscal Year
- No TDS reconciliation (deducted so far against total owed)
- DPS payments are recorded as spending, so savings growth is invisible
- Fixed expenses have no deadline alerts
- Loans have no return-date tracking
- No forecast of the year's tax from the income entered so far
- No view of how much of the month's money is still free

### Desired outcomes

- One app replacing all three sheets, usable from any device
- Enter salary once a month and see the tax forecast, year-to-date income and In-Hand Income update
- Mark a DPS installment Paid and see cash fall, savings rise and the rebate total move
- See at a glance: Remaining to Spend, upcoming fixed deadlines, Remaining Tax
- A per-person loan ledger with a Running Balance and return reminders
- A Tax Dashboard showing Tax Paid against Net Tax Payable, investment progress and the filing deadline
- Existing spreadsheet history carried into the app, and all data exportable at any time

---

## 3. Scope

### MVP (current release)

- Registration with email verification, sign-in and password reset; each user sees only their own data (ADR-0010)
- Admin user management: create, update, deactivate, reactivate and delete accounts, and keep each user's payment dates (ADR-0011)
- Monthly income entry: salary, bonuses, Profit Share, Cheer, Holiday Support, TDS
- Spending entry with category routing
- Fixed Expenses with monthly instances and deadline alerts
- Savings and DPS tracking, including withdrawals, maturity payouts and interest
- Borrow-loan ledger per person
- Discretionary Cash and Remaining to Spend for the current month
- Monthly budgets and in-app notifications
- Bangladesh tax calculation with editable per-Fiscal-Year parameters, forecast and year comparison
- History and analytics by month and year
- **CSV import** of income, transaction and loan history
- **Full data export** (JSON) and CSV exports
- Installable mobile-first PWA with light and dark themes

### Phase 2

Specified in `.scratch/fintrack-bd-phase-2/spec.md`; not ready to build.

**Accounts and administration**
- More admin tools: sign-up control inside the app, shared default tax settings and starter categories, site health
- Delete my account and data
- Passkey or two-factor sign-in

**Money features**
- One overall monthly spending limit with a budget-health chart on the dashboard
- Wallet balances per payment method (cash, bKash, bank) and net worth
- Savings goals
- Quarterly and annual Fixed Expenses, and suggestions for recurring payments
- Tags on Transactions
- What-if tax planner, and a filing checklist with late-filing surcharges
- Tax treatment of savings interest and Sanchaypatra profit
- Recurring income and Transaction templates
- Shareable loan statement and reminder text

**Import and documents**
- Bank and bKash statement import with column mapping, a Needs review queue, categorisation rules and a possible-duplicate warning
- Automatic bank sync, after statement import
- Direct `.xlsx` import
- Receipt photo attachment and a document vault
- Restore from an export, and scheduled backups

**Platform and polish**
- Browser push notifications with a daily scheduler
- Offline entry queue
- Bangla language toggle
- Interface polish: inline category change, remembered period with more presets, 12 px minimum text, vector icons, dialog behaviour, wider screen-size testing, a longer "coming up" list, due-soon banner colour

### Phase 3

Captured in `.scratch/fintrack-bd-phase-3/spec.md`; an idea only, not specified.

- Subscription: users pay to use the app, building on the admin's payment-date log

### Out of scope

- Family or shared finances
- Investment portfolio prices and returns
- Receipt OCR
- Credit score tracking
- Multi-currency accounts
- Tax return form (ITR PDF) generation

---

## 4. Multi-Role Analysis

| Role | Primary concern | Contribution |
|---|---|---|
| Business Analyst | Accurate business rules | Tax logic, Fiscal Year boundaries, DPS as a Transfer, loan direction convention, Cheer tracking |
| Solution Architect | Secure, maintainable design | Integer money, derived balances, pure tax engine, atomic writes |
| Senior Developer | Unambiguous, implementable spec | Routing types, rounding rule, date handling, edge cases |
| Senior QA Analyst | Coverage and quality gates | Acceptance fixtures with exact figures, boundary cases, non-functional thresholds |

---

## 5. Feature Requirements

### FR-01 · Registration, Sign-in and Profile

- Registration is required: every page except the account pages needs a signed-in user
- Register with name, email and password; the email must be verified through an emailed link before the first sign-in (ADR-0010)
- Sign in with email and password; reset a forgotten password by email; change the password while signed in
- The session ends after 30 days without use
- Each user sees only their own data; nothing financial is shared between users
- A new account starts with the starter categories and the seeded tax settings, and no financial records
- A first-run checklist on the dashboard leads to: enter this month's salary, add savings accounts, set up Fixed Expenses (suggested defaults offered), import history
- The owner can close sign-up with a deployment setting
- A deactivated account cannot sign in and is told so; its data is kept (FR-14)

### FR-02 · Dashboard

- Period selector: This Month / Last Month / This Tax Year / Last Tax Year / Custom Range. Default: This Month.
- Summary tiles for the period: In-Hand Income, Total Spending, Net Savings, Savings Rate
- Current-month cash panel: Discretionary Cash and Remaining to Spend. When this month's salary has not been entered, the figures use last month's salary and are labelled "estimated".
- Cash flow chart: income against spending per month, last 6 months
- Spending by category: donut chart for the period
- Fixed Expenses panel: the current month's instances; due within 3 days amber, overdue red
- Recent Transactions: the last 10
- Tax snapshot: "Tax paid so far ৳X · Est. remaining ৳Y · Suggested monthly TDS ৳Z", with a notice when the Fiscal Year's tax settings are provisional
- Borrow-loan summary: "People owe you ৳X · You owe ৳Y"
- Quick actions: Add Expenses, Add Income, Mark Fixed Expense Paid

### FR-03 · Income Management

- Entry fields: month, income type, Gross Income, TDS, In-Hand Income (computed, read-only), taxable flag, employer name (optional), comment
- Income types: Salary, Cheer / Incentive, Profit Share, Eid Festival Bonus, Leave Encashment, Certification Reimbursement, Holiday Support, Other
- Every type defaults to taxable except Certification Reimbursement; the user can change the flag per entry
- TDS must be between zero and the gross amount
- Cheer entries also store the payer's name and the period earned
- A new Salary entry is pre-filled from the previous month's Salary entry
- Year-to-date table for the Fiscal Year: one row per month, a column per income component, and an Entered / Pending status
- Salary history timeline, derived from Salary entries: each change of amount or employer with the month it took effect
- Holiday Support log: date, days worked, rate type (day or holiday), per-day rate, amount. The rate is pre-filled from the latest entry of that rate type and stored on the entry, so a later rate change leaves history untouched. A month's log total pre-fills a Holiday Support Income Entry.
- Income Entries are soft-deleted

### FR-04 · Spending and Transaction Entry

- Entry fields: amount, date (default today), description, category, payment method (Cash / bKash / Bank Transfer / Card)
- The category decides what the Transaction means and what else must be supplied:

| Category | Cash | Effect | Also asks for |
|---|---|---|---|
| DPS / Savings, Investment (Sanchaypatra) | out | The linked account's balance rises; counts toward the rebate when the account is a DPS or Sanchaypatra account | savings account |
| Savings Withdrawal | in | The linked account's balance falls; may not exceed the balance | savings account |
| Savings Interest | none | The linked account's balance rises | savings account |
| Loan Given | out | A Loan Entry (Given) on that person's ledger | person, reason, optional return due date |
| Loan Received | in | A Loan Entry (Received) on that person's ledger | person |
| Tax Payment | out | Adds to Tax Paid for the chosen Fiscal Year | Fiscal Year (default: current) |
| Groceries, Dining, Transport, Utility, Rent, Entertainment, Health, Shopping, Other | out | Counts toward Total Spending and the category's budget | nothing |

- The Transaction and everything it creates are saved together or not at all
- Editing: amount, date, description, payment method and the linked account or person can change. A category can change only to another of the same kind; otherwise delete and re-enter.
- Transaction list: newest first, with search and filters for date range, category, payment method, amount range and keywords
- Delete is a soft delete; bulk delete is available. Deleting a Transaction that paid a Fixed Expense returns that instance to Pending.
- The user can add, rename, recolour and archive categories; a category's kind is fixed once it has been used

### FR-05 · Fixed Recurring Expenses

- Template fields: name, standard amount, due day of month, category, linked savings account (required for DPS templates)
- Suggested defaults: YouTube Premium (৳160, day 1), Upension DPS (৳10,000, day 8), DPS 10k City Bank (৳10,000, day 14), DPS 30k City Bank (৳30,000, day 14), Mess Rent (৳8,722, day 15), Home Internet (৳500, day 16), Home Electricity (৳1,350, day 27)
- Each calendar month has one instance per active template, created when the month is first viewed
- A due day later than the month's last day falls on the last day
- A template added after its due day has passed this month starts next month
- Mark as Paid: the user confirms the actual amount and date; a linked Transaction is created
- Skip marks the instance Skipped with an optional note; a Skipped instance can be reopened
- Changing a template's standard amount affects this month's instance only if it is still Pending, and all later months; earlier months keep their amount
- Deactivating a template stops new instances from next month and keeps history
- Dashboard banner: amber when an instance is due within 3 days, red when one is past due and still Pending
- Monthly grid: templates as rows, months as columns, amount and status per cell, with totals

### FR-06 · Savings and DPS

- Account fields: name, type (Savings / DPS / Sanchaypatra / Investment / Cash), bank name, last four digits, opening balance, opening date
- DPS-specific fields: monthly installment, maturity date, interest rate (optional)
- Balance = opening balance + deposits + interest − withdrawals, always computed
- The opening balance is the balance on the opening date; only Transactions dated on or after it can link to the account
- A withdrawal or DPS maturity payout is a Savings Withdrawal; interest or profit is a Savings Interest entry; an account can be closed once its balance is zero
- Savings dashboard: total saved, this month's contribution, year-to-date contribution, and for each DPS the projected principal at maturity (balance plus remaining installments; interest is not projected)
- One combined progress bar for all DPS deposits this Fiscal Year against the DPS rebate cap
- Transaction history per account

### FR-07 · Borrow-Loan Ledger

- Summary: "People owe me ৳X · I owe people ৳Y · Net ৳Z"
- Per-person card: Running Balance (green when they owe the user, red when the user owes them, neutral at zero) and full history
- Entry fields: direction (Given / Received), amount, date, reason, payment method, optional return due date
- An entry can be added from the Loans page or by choosing a loan category on a Transaction; both produce the same single record
- Typing a new name creates the person
- Return due date alert when a return is due within 3 days or overdue and the balance is still outstanding
- Settle Up records the one entry that brings the person's Running Balance to zero
- Export a person's ledger as CSV

### FR-08 · History and Analytics

- Monthly summary: In-Hand Income, Total Spending, Net Savings, TDS, Savings Rate and Fixed Expense compliance (paid on time / late / skipped) per month
- Category trends: spending per category over 12 months
- Income trends: salary, bonuses and Profit Share over time
- Savings Rate trend with a 20% reference line
- Export the selected period as CSV

### FR-09 · Notifications

- Types: Fixed Expense due soon (3 days), Fixed Expense overdue, loan return due soon, loan return overdue, budget at 80%, budget exceeded, tax settings provisional
- Notification bell with an unread count
- Notifications are refreshed whenever the dashboard or the bell is opened, and clear themselves when the condition no longer holds (ADR-0009)

### FR-10 · Monthly Budgets

- A monthly limit per Spending category
- Progress bar: green below 70%, amber from 70% to 100%, red above 100%
- A changed limit applies from the current month; earlier months keep the limit they had
- Budgets reset each month with no rollover

### FR-11 · Data Import

- Import income, Transactions and loan history from CSV files that follow a downloadable template
- Upload shows a preview first: row count, totals and every row that fails validation, with the reason
- Nothing is saved until the user confirms, and a file with any invalid row cannot be confirmed
- Imported rows behave exactly like manually entered ones, including category routing
- Importing the same file twice adds nothing
- A past import can be undone as a whole

### FR-12 · Data Export and Backup

- One action downloads all of the user's data as a single JSON file
- CSV exports: Transactions for a date range, income for a Fiscal Year, one person's loan ledger, the monthly summary for a period

### FR-13 · Settings

- Profile name, password change, light or dark theme
- Category management (FR-04)
- Tax Year Settings (FR-TAX-08)
- Import (FR-11) and Export (FR-12)

### FR-14 · Admin User Management

An admin manages user accounts and nothing else. An admin never sees another user's Transactions, income, loans, savings, budgets, tax data or exports (ADR-0011). An admin is also an ordinary user with their own private finances; the owner's account is the first admin.

- **User list:** name, email, role, status (Active, Unverified, Deactivated until a date, Deactivated until reactivated), registered date, last sign-in, last payment date and the date payment covers until. Search by name or email; filter by status and role.
- **Create a user or an admin:** name, email and role. The account is created verified, and the person receives an email link to set their password.
- **Update a user:** name and email, and promote the user to admin.
- **Deactivate:** for a period, by giving an end date, or until an admin reactivates the account; a reason can be recorded. The user is signed out everywhere and cannot sign in. A timed deactivation ends by itself on the next sign-in after the date.
- **Reactivate** at any time.
- **Delete a user:** permanently removes the account and all of its data after the admin types the user's email to confirm. It cannot be undone. Admin accounts cannot be deleted.
- **Account help:** resend the verification email; send a password-reset email. An admin never sets or sees a password.
- **Payment dates:** a manual log per user of date paid, amount, the date the payment covers until, and a note. The list highlights users whose cover date has passed. There is no online payment, and a lapsed payment does not deactivate anyone automatically. A subscription feature may replace this in Phase 3.
- **History:** every admin change is recorded with who did it and when, and shown on the user's detail page.
- **Safeguards:**
  - An admin performs no admin operation on their own account; their own name and password are changed in Settings like any user's.
  - An admin can view other admin accounts but cannot update, deactivate, demote or delete them.
  - Only the site owner can demote or remove an admin, outside the app.

---

## 6. Tax Module

> Rules follow the user's own tax spreadsheet (`Bangladesh-Tax-Calculator-Final.xlsx`). Every parameter is stored per Fiscal Year and editable in the app (ADR-0008). Open questions against NBR law are tracked in ticket 24.

### FR-TAX-01 · Fiscal Years

- A Fiscal Year runs 1 July to 30 June and is written "YYYY-YY"
- An Income Entry belongs to the Fiscal Year of its month
- The first time a Fiscal Year is needed, its settings are copied from the previous year and marked **provisional** until the user confirms them
- A Fiscal Year is locked when the user marks its return as filed, not on 30 June. Locking freezes its Income Entries, investments and settings and keeps a snapshot of the filed figures. The user can reopen it.

### FR-TAX-02 · Calculation

All amounts are whole Paisa. Each multiplication is rounded half-up to the nearest Paisa.

| Step | Figure | Rule |
|---|---|---|
| 1 | Gross Income | Sum of gross amounts of the Fiscal Year's taxable Income Entries, using the actual monthly entries |
| 2 | Exemption | MIN(Gross Income × exemption fraction, exemption cap) |
| 3 | Taxable Income | Gross Income − Exemption |
| 4 | Gross Tax | Sum over slabs of (Taxable Income falling in the slab × slab rate) |
| 5 | Eligible Investment | Sum over investment categories of MIN(amount invested, category cap); no cap means the full amount |
| 6 | Tax Rebate | MIN(Taxable Income × income rate, Eligible Investment × investment rate, rebate maximum, Gross Tax) |
| 7 | Tax after rebate | Gross Tax − Tax Rebate; raised to the Minimum Tax when Taxable Income exceeds the tax-free threshold |
| 8 | Early Filing Rebate | MIN(step 7 × early-filing rate, early-filing maximum) when the return was filed between 1 July and the deadline after the Fiscal Year ends; otherwise zero |
| 9 | Net Tax Payable | Step 7 − step 8 |
| 10 | Tax Paid | TDS on the year's Income Entries + Tax Payments assigned to the year |
| 11 | Remaining Tax | Net Tax Payable − Tax Paid; negative means overpaid |
| 12 | Suggested Monthly TDS | MAX(0, Remaining Tax) ÷ remaining salary months |
| 13 | Further investment for maximum rebate | MAX(0, MIN(Taxable Income × income rate, rebate maximum) ÷ investment rate − Eligible Investment), rounded up |

- **Remaining salary months** are the months from the current month to June that have no Salary entry yet. For a past Fiscal Year there are none and step 12 shows "—".
- Until a return is marked filed, step 8 is zero and the dashboard shows the possible Early Filing Rebate as a saving available by the deadline.

### FR-TAX-03 · Parameters per Fiscal Year

Seeded values. All three years are seeded as provisional.

| Parameter | FY2024-25 | FY2025-26 | FY2026-27 |
|---|---|---|---|
| Slabs | 0% first ৳3,50,000 · 5% next ৳1,00,000 · 10% next ৳4,00,000 · 15% next ৳5,00,000 · 20% next ৳5,00,000 · 25% next ৳20,00,000 · 30% remainder | 0% first ৳3,75,000 · 10% next ৳3,00,000 · 15% next ৳4,00,000 · 20% next ৳5,00,000 · 25% next ৳20,00,000 · 30% remainder | As FY2025-26 |
| Exemption | one third, cap ৳4,50,000 | one third, cap ৳5,00,000 | As FY2025-26 |
| Rebate: income rate | 3% | 3% | 3% |
| Rebate: investment rate | 15% | 10% | 10% |
| Rebate: maximum | ৳10,00,000 | ৳10,00,000 | ৳10,00,000 |
| Investment caps | DPS ৳1,20,000 · Sanchaypatra ৳5,00,000 · Stocks ৳5,00,000 · Insurance none · Others none | Same | Same |
| Minimum Tax | ৳5,000 | ৳5,000 | ৳5,000 |
| Early Filing Rebate | none | 5%, maximum ৳25,000, deadline 30 September | As FY2025-26 |

**Where the values come from**

- **FY2024-25:** slabs, rebate and Minimum Tax follow KPMG's summary of the Finance Ordinance 2025 for assessment year 2025-26. That summary gives a Minimum Tax of ৳5,000 in Dhaka and Chattogram city corporations, ৳4,000 in other city corporations and ৳3,000 elsewhere; ৳5,000 is seeded. The ৳4,50,000 exemption cap is unconfirmed.
- **FY2025-26:** the user's spreadsheet. The slabs and Minimum Tax agree with the KPMG summary. The Early Filing Rebate maximum is from PwC's tax summary.
- **FY2026-27:** a copy of FY2025-26.

**Unresolved, tracked in ticket 24**

- Rebate investment rate for FY2025-26: the spreadsheet uses 10%; the KPMG summary (June 2025) says 15%; later commentary says the Finance Act 2026 reduced it to 10% with a ৳7,50,000 maximum.
- Tax-free threshold for FY2025-26 and FY2026-27: ৳3,75,000 in the spreadsheet and the KPMG summary; PwC's summary (reviewed July 2026) gives ৳4,00,000.
- The exemption caps, and whether Cheer and reimbursements count as taxable salary income.

BRD v1.0 listed six slabs for FY2024-25; that table was wrong and is replaced by the seven above.

### FR-TAX-04 · Investments

- DPS and Sanchaypatra totals for a Fiscal Year come from the deposits recorded in the app; they are never typed in
- Stocks, insurance and other eligible investments are entered as one amount each per Fiscal Year
- The investments view shows, per category: invested, cap, eligible amount; then the three rebate candidates and the further investment needed for the maximum rebate

### FR-TAX-05 · Forecast

- Projected income = the entries made so far + one copy of the latest Salary entry (gross and TDS) for each remaining salary month
- Other income types are not projected
- The forecast is labelled as a projection and feeds the dashboard's "Est. remaining"

### FR-TAX-06 · Compare Years

- The current Fiscal Year's income calculated under its own settings and under the previous year's settings, side by side with the previous year's own result

### FR-TAX-07 · Tax Dashboard

- Fiscal Year dropdown and a data-completeness bar (months entered out of 12)
- Tiles: Gross Tax, Tax Rebate, Net Tax Payable
- Taxable Income breakdown and slab-by-slab breakdown
- TDS reconciliation: Net Tax Payable, Tax Paid, Remaining Tax (or "Overpaid"), remaining salary months, Suggested Monthly TDS
- Tabs: Overview, Investments, Forecast, Compare Years
- A notice when the year's settings are provisional, and the Early Filing Rebate available before the deadline

### FR-TAX-08 · Tax Year Settings

- View and edit every parameter in FR-TAX-03 for a Fiscal Year
- Confirm the settings, which clears the provisional notice
- Mark the return as filed on a date, and reopen a filed year

---

## 7. Data Rules

The schema is in `architecture.md` §Database schema. These business rules hold at the data layer:

- Amounts are whole Paisa; Transaction amounts are positive and the category gives the direction
- 0 ≤ TDS ≤ gross on every Income Entry
- A savings category requires a savings account; a loan category requires a Loan Person; a Tax Payment requires a Fiscal Year
- A Savings Withdrawal may not exceed the account balance
- Transactions and Income Entries are soft-deleted; balances and totals ignore deleted rows
- Balances and totals are computed from rows and never stored
- Everything one user action creates is saved together or not at all
- A Fiscal Year's Income Entries, investments and settings are read-only while it is locked

---

## 8. Solution Architecture

See `architecture.md` for the stack, schema, API and deployment, and `adr/` for the decisions behind them. In one line: a single Next.js 14 app on Vercel with PostgreSQL on Neon (ADR-0001).

---

## 9. Gap Analysis

| Gap | Risk | Resolution |
|---|---|---|
| GAP-01 Floating-point money | Rounding errors compound | Integer Paisa everywhere (ADR-0003) |
| GAP-02 DPS amount varies by month | Standard × months gives the wrong balance | Each instance stores the amount actually paid |
| GAP-03 Ambiguous loan sign | Direction misread | Explicit Given / Received direction |
| GAP-04 Cheer income | No app models colleague payments | Cheer income type with payer name |
| GAP-05 Mid-year salary change | Annualising overstates tax | Calculate from actual monthly entries |
| GAP-06 Early filing | Net tax shown too high or too low | Early Filing Rebate applied only when the return is marked filed in time |
| GAP-07 No free-cash view | Overspending early in the month | Discretionary Cash and Remaining to Spend |
| GAP-08 Holiday Support rate changes | Old entries recalculated at the new rate | Rate stored on each log entry |
| GAP-09 Slab comparison | Missed planning insight | Compare Years tab |
| GAP-10 Entry without a connection | Lost or duplicated entries | Idempotency keys now; offline queue in Phase 2 |
| GAP-11 Tax law changes yearly and sources disagree | Wrong tax, hard-coded rules | All parameters per Fiscal Year, provisional until confirmed, editable in the app (ADR-0008) |
| GAP-12 Savings could only grow | Withdrawals and maturity unrecordable | Savings Withdrawal and Savings Interest |
| GAP-13 Editing or deleting routed entries | Totals drift from the ledger | Totals are derived, never stored (ADR-0005) |
| GAP-14 Dates across time zones | Entries fall in the wrong day or Fiscal Year | Calendar dates in Asia/Dhaka (ADR-0004) |
| GAP-15 Existing history stranded in Excel | App starts empty; tax year incomplete | CSV import (FR-11) |
| GAP-16 No way out for the data | Lock-in, no backup | Full export (FR-12) |
| GAP-17 No scheduler on the host | Instances and alerts never created | Generated on read (ADR-0009) |
| GAP-18 Public sign-up | Fake or abusive accounts | Email verification, rate limits, a sign-up switch for the owner (ADR-0010) and admin deactivation or deletion (ADR-0011) |
| GAP-21 Admin access to private finances | Users cannot trust the app with their data | Admin routes are limited to account data (ADR-0011) |
| GAP-19 Budget and template edits rewrite history | Past months change retroactively | Budget history by month; instance keeps its amount |
| GAP-20 Filing happens after the year ends | Year locked before it can be filed | Lock on filing, with reopen |

---

## 10. Roadmap

### MVP: 8 two-week sprints

| Sprint | Focus | Tickets |
|---|---|---|
| 1 | Foundation: repo, schema, tax engine, auth, app shell, registration | 01, 02, 12, 25 |
| 2 | Ledger core: Transactions, savings accounts, loans, category routing; admin user management | 03, 04, 05, 06, 26 |
| 3 | Income and savings screens | 07, 14 |
| 4 | Fixed Expenses | 08, 16 |
| 5 | Budgets and notifications; Transactions and Loans screens | 10, 15, 17 |
| 6 | Tax API and Tax Dashboard | 09, 18 |
| 7 | Dashboard, analytics, notifications and settings screens | 11, 13, 19, 20 |
| 8 | Import, export, PWA polish, UAT and production | 22, 23, 21 |

Ticket 24 (confirm tax parameters) is for the owner and runs alongside.

### Phase 2 and Phase 3

See §3, `.scratch/fintrack-bd-phase-2/spec.md` and `.scratch/fintrack-bd-phase-3/spec.md`.

---

## 11. Acceptance Fixtures and Non-Functional Requirements

Fixtures are binding: tests assert these exact values. Tickets refer to them by id.

### AC-TAX-1 · FY2025-26 full year

Inputs: seeded FY2025-26 settings; Gross Income ৳20,06,846.00; investments DPS ৳8,00,000, Sanchaypatra ৳1,00,000, Others ৳1,90,000; TDS ৳1,32,488.00; no Tax Payments; return not filed.

| Figure | Value | Paisa |
|---|---|---|
| Exemption | ৳5,00,000.00 | 50,000,000 |
| Taxable Income | ৳15,06,846.00 | 150,684,600 |
| Slab tax | ৳0 · ৳30,000 · ৳60,000 · ৳86,369.20 (20% of ৳4,31,846) | |
| Gross Tax | ৳1,76,369.20 | 17,636,920 |
| Eligible Investment | ৳4,10,000.00 (DPS capped at ৳1,20,000) | 41,000,000 |
| Rebate candidates | ৳45,205.38 · ৳41,000.00 · ৳10,00,000.00 | |
| Tax Rebate | ৳41,000.00 | 4,100,000 |
| Net Tax Payable | ৳1,35,369.20 | 13,536,920 |
| Tax Paid | ৳1,32,488.00 | 13,248,800 |
| Remaining Tax | ৳2,881.20 | 288,120 |
| Further investment for maximum rebate | ৳42,053.80 | 4,205,380 |

The user's spreadsheet shows Net Tax ৳1,35,225 and Remaining ৳2,737 for this year. The ৳144.20 difference equals 10% of ৳1,442, so the spreadsheet's investment inputs probably differ slightly from the rounded ones above. This fixture is derived from the documented formula; the reconciliation is in ticket 24.

### AC-TAX-2 · Mid-year salary change

Salary of ৳1,22,700 for July 2025 to March 2026 and ৳1,53,383 for April to June 2026 gives a salary Gross Income of ৳15,64,449.00, not twelve times the latest salary (৳18,40,596).

### AC-TAX-3 · Overpaid

AC-TAX-1 with TDS of ৳1,40,000.00: Remaining Tax −৳4,630.80, shown as "Overpaid ৳4,630.80". Evaluated with three salary months still remaining, Suggested Monthly TDS is ৳0.00.

### AC-TAX-4 · FY2024-25 settings

Gross Income ৳20,06,846.00 under the seeded FY2024-25 settings: Exemption ৳4,50,000.00, Taxable Income ৳15,56,846.00, Gross Tax ৳1,61,369.20 (৳0 · ৳5,000 · ৳40,000 · ৳75,000 · ৳41,369.20).

### AC-TAX-5 · Minimum Tax

Gross Income ৳6,00,000.00 under FY2025-26 settings with no investments: Taxable Income ৳4,00,000.00, Gross Tax ৳2,500.00, Net Tax Payable ৳5,000.00.

### AC-TAX-6 · Early Filing Rebate

AC-TAX-1 filed on 2026-09-15: Early Filing Rebate ৳6,768.46, Net Tax Payable ৳1,28,600.74, Remaining Tax −৳3,887.26. Filed on 2026-10-01: no rebate; figures as AC-TAX-1.

### AC-LOAN-1 · Running Balances

| Person | Running Balance | Label |
|---|---|---|
| Mithun | +৳9,841.00 | "Mithun owes you ৳9,841.00" (green) |
| Amait | +৳1,198.50 | "Amait owes you ৳1,198.50" (green) |
| Sohel | −৳3,145.42 | "You owe Sohel ৳3,145.42" (red) |
| Anapo, Babu bhai | ৳0.00 | "Settled" (neutral) |

Summary: people owe me ৳11,039.50 · I owe ৳3,145.42 · net +৳7,894.08.

### AC-FIXED-1 · Monthly commitments

The seven suggested defaults in FR-05 total ৳60,732.00.

### AC-CASH-1 · Discretionary Cash and Remaining to Spend

November: In-Hand Income ৳1,40,000. The seven defaults exist; YouTube Premium (৳160) and Upension DPS (৳10,000) are Paid, the rest Pending. Other Transactions: Groceries ৳3,000, Loan Given ৳2,000, Loan Received ৳500, Savings Withdrawal ৳5,000.

| Figure | Value |
|---|---|
| Fixed Commitments | ৳60,732.00 |
| Discretionary Cash | ৳79,268.00 |
| Remaining to Spend | ৳79,768.00 |
| Total Spending | ৳3,160.00 |
| Net Savings | ৳1,36,840.00 |
| Savings Rate | 97.7% |

### AC-SAV-1 · Savings balance

Opening balance ৳50,000 + two deposits of ৳10,000 + interest ৳1,250 − withdrawal ৳5,000 = ৳66,250.00.

### AC-FMT-1 · Formatting and dates

- `formatBDT(200684600)` is `৳20,06,846.00`; `formatBDT(-314542)` is `−৳3,145.42`; `formatBDT(0)` is `৳0.00`
- `parseBDT("1198.50")` is `119850`
- `fiscalYear("2025-06-30")` is `"2024-25"`; `fiscalYear("2025-07-01")` is `"2025-26"`

### Non-functional requirements

| Requirement | Threshold |
|---|---|
| Performance | The targets in `architecture.md` §Performance targets |
| Currency display | ৳ prefix, South Asian grouping, two decimals, tabular numerals |
| Mobile | Usable at 375 px wide with no horizontal page scroll; tap targets at least 44 px |
| Network failure | A failed submit keeps the form's contents and cannot create a duplicate on retry |
| Session | Ends after 30 days without use |
| Money arithmetic | No rounding error: integer Paisa throughout |
| Accessibility | WCAG AA contrast; status never shown by colour alone |

---

## 12. Change Log

### v1.2 — 12 November 2026

- Registration, email verification and password reset by email moved back into the MVP (ADR-0010 supersedes ADR-0002); each user sees only their own data
- Phase 2 list regrouped and extended: admin console, account deletion, overall monthly limit with a dashboard chart, net worth, savings goals, non-monthly Fixed Expenses, tags, statement import with rules and duplicate warning, bank sync, document vault and interface polish
- Bank sync moved from "out of scope" to Phase 2
- Admin user management added to the MVP as FR-14 (ADR-0011): create, update, deactivate for a period or until reactivated, delete, and a manual payment-date log. Admins can create admins, cannot act on any admin account including their own, and cannot delete admins.
- Phase 3 added for a possible subscription feature

### v1.1 — 12 November 2026

- Stack aligned to one Next.js app on Vercel with Neon; the stack, schema and API now live only in `architecture.md`
- Scope split into MVP and Phase 2; import, export, Remaining to Spend and savings withdrawals, maturity and interest moved into the MVP
- Registration, email verification and email password reset moved to Phase 2; the MVP has one seeded account
- Tax module rewritten: every parameter per Fiscal Year, explicit calculation steps and rounding, Minimum Tax, Early Filing Rebate with a maximum, forecast and remaining-month definitions, lock on filing
- FY2024-25 slab table corrected; FY2026-27 added
- Acceptance fixtures made self-consistent and given ids; loan net total corrected to ৳7,894.08
- Routing kinds unified; totals derived rather than stored; dates defined as Asia/Dhaka calendar dates
- Fixed Expense and budget history rules, notification refresh, and idempotency for all money-moving entries defined
