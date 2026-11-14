# FinTrack BD — Business Requirements Document

> **When to read:** when you need full feature requirements, acceptance criteria with real BDT figures, the data model, or the full API endpoint list. For just the coding constraints, read `rules.md` instead.

**Version:** 1.0 Draft  
**Date:** November 2026  
**Status:** Under Review  
**Artifact:** https://claude.ai/artifact/7dj3aJthhaLyERWfPS6LU3

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Problem Statement](#2-problem-statement)
3. [Scope Boundaries](#3-scope-boundaries)
4. [Multi-Role Analysis](#4-multi-role-analysis)
5. [Feature Requirements](#5-feature-requirements)
6. [Tax Module Requirements](#6-tax-module-requirements)
7. [Data Model](#7-data-model)
8. [Solution Architecture](#8-solution-architecture)
9. [Gap Analysis](#9-gap-analysis)
10. [Roadmap](#10-roadmap)
11. [QA Requirements](#11-qa-requirements)

---

## 1. Product Overview

**FinTrack BD** is a personal finance management web application built for salaried professionals in Bangladesh. It converts the manual work currently spread across three Excel sheets into a single, automated, always-available system.

The user currently maintains:
1. A salary + tax worksheet tracking 12 months of income across salary, profit share, bonuses, TDS, and tax-slab calculations
2. A fixed spending tracker with deadline checkboxes per month
3. A borrow-loan ledger tracking money lent to or borrowed from named individuals

Unlike generic finance apps, FinTrack BD understands Bangladesh-specific concepts: the NBR fiscal year (July–June), tax slab-based calculation with rebate for DPS/Sanchaypatra investments, TDS reconciliation, the DPS installment as both a cash outflow and a savings growth event, and the informal culture of tracking bKash and bank-transfer loans between friends.

---

## 2. Problem Statement

### Current Pain Points

- Three separate Excel sheets with no single source of truth or cross-sheet calculation
- Tax calculation is manual — slabs must be re-entered each fiscal year
- No automatic TDS reconciliation (deducted so far vs. total owed)
- DPS payments are recorded as spending but their savings growth is invisible
- Fixed expenses have no automated deadline alerts — relies on memory
- Borrow-loan entries have no return-date tracking or notification
- No forecast: "If I add this month's salary, what is my projected annual tax?"
- No cash flow view — daily discretionary cash is not visible after fixed commitments

### Desired Outcomes

- One app replacing all three Excel sheets, accessible from any device
- Enter salary once a month → app updates tax forecast, year-to-date income, in-hand calculation
- Mark DPS as paid → deducts from cash, adds to savings, updates tax rebate
- See at a glance: remaining budget, upcoming fixed deadlines, net tax payable
- Borrow-loan ledger per person with running balance and optional return reminders
- Tax dashboard: TDS paid vs. still owed, investment progress, filing deadline

---

## 3. Scope Boundaries

### In Scope (MVP + V2)

- Single-user personal finance tracking
- Bangladesh NBR tax calculation, fiscal year Jul–Jun
- Monthly income entry (salary, bonus, PS, cheer, TDS)
- Daily spending entry with category routing
- Fixed recurring expense management + deadline alerts
- DPS/savings tracking with dual effect (cash outflow + balance growth)
- Borrow-loan per-person ledger
- Tax slab configuration per fiscal year
- Investment tracking for tax rebate
- History and analytics by month and year
- Mobile-responsive PWA

### Out of Scope (V1)

- Bank API / automatic statement sync
- Multi-user / family finance sharing
- Investment portfolio (stock prices, NAV, returns)
- Receipt OCR / photo scanning
- Credit score tracking
- Push notifications (browser only, V2)
- Multi-currency accounts
- Tax return form (ITR PDF) generation

---

## 4. Multi-Role Analysis

| Role | Primary Concern | Key Contributions |
|------|----------------|-------------------|
| Business Analyst | Accurate business rules, user stories | Tax slab logic, fiscal year boundaries, DPS dual-effect, borrow-loan sign convention, cheer tracking |
| Solution Architect | Scalable, secure, maintainable design | Integer money storage, transaction routing service, pure-function tax engine, audit trail, API contracts |
| Senior Developer | Implementable, unambiguous spec | Category routing enum, formula precision, fiscal year utility, Bangladesh-specific edge cases |
| Senior QA Analyst | Test coverage and quality gates | Acceptance criteria with exact BDT figures from real data, boundary conditions, non-functional thresholds |

---

## 5. Feature Requirements

### FR-01 · User Registration & Profile

- Register with email and password; verify email before first login
- Onboarding collects: full name, current monthly salary, employment start date, fiscal year preference (default July)
- Settings allow updating monthly salary at any time — salary history is stored by effective month so historical tax calculations remain accurate
- Password reset via email; sessions expire after 30 days of inactivity
- All financial data scoped to the authenticated user — no cross-account data access

### FR-02 · Dashboard

- Period selector: This Month / Last Month / This Tax Year / Last Tax Year / Custom Range. Default: This Month.
- Summary cards: In-Hand Income (period), Total Spending (period), Net Savings, Savings Rate %
- Monthly cash flow chart: grouped bar chart, income vs. spending per month, last 6 months
- Spending by category: donut chart from real transactions in selected period
- Fixed expenses panel: upcoming deadlines in next 7 days shown amber; overdue items red
- Recent transactions: last 10 entries with merchant, category, amount, date
- Tax snapshot mini-card: "Tax paid so far ৳X · Est. remaining ৳Y · Suggested monthly TDS ৳Z"
- Quick actions: + Add Spending, + Add Income, Mark Fixed Expense Done
- Borrow-loan summary: "People owe you ৳X · You owe ৳Y" with link to Loans page

### FR-03 · Income Management

- Income entry fields: month, income type, gross amount, TDS deducted at source, in-hand amount (auto-computed), comment/notes
- Income types: Salary, Cheer / Incentive Bonus, Profit Share, Leave Encashment, Eid Festival Bonus, ISTQB / Certification Reimbursement, Holiday Support, Other
- Cheer entries store: payer name, earned period, received month
- Submitting a salary entry automatically recalculates cumulative taxable income and projected annual tax liability
- Previous month's salary is auto-suggested as the starting value for a new entry
- Year-to-date income table with breakdown by component type
- Salary history timeline shows career progression with employer names and effective dates
- Holiday Support log: date, days worked, rate type (day/holiday), computed amount

### FR-04 · Spending & Transaction Entry

- Entry fields: amount (BDT), date (default today), description, category, payment method (Cash / bKash / Bank Transfer / Card)
- Category routing: when a transaction is submitted, the system applies side-effects based on the category's routing type
- Starter categories: Groceries, Dining, Transport, Utility, Rent, Entertainment, Health, Shopping, DPS / Savings, Investment (Sanchaypatra), Loan Given, Loan Received, Tax Payment, Other
- Transaction list sorted by date descending with search and filter: date range, category, payment method, amount range, keywords
- Bulk delete; soft-delete (audit trail preserved)

#### Category Routing Side-Effects

| Category Type | Deducts from | Adds to | Special Prompt / Action |
|--------------|-------------|---------|------------------------|
| DPS / Savings | Discretionary cash | Linked savings account balance | Must select which savings account; amount credited to DPS rebate tracker (up to ৳1,20,000 cap) |
| Investment (Sanchaypatra) | Discretionary cash | Sanchaypatra investment total | Auto-credited to rebate-eligible investment |
| Loan Given | Discretionary cash | Borrow-Loan ledger (they owe me) | Prompts for person name, reason; creates loan entry |
| Loan Received | Borrow-Loan ledger (I owe) | Discretionary cash | Prompts for person name; creates negative entry in their ledger |
| Tax Payment | Discretionary cash | Tax paid total | Marks a manual tax payment for TDS reconciliation |
| All other categories | Discretionary cash / budget | Category spending total | None |

### FR-05 · Fixed Recurring Expenses

- Template fields: name, standard amount, due day of month, category, linked savings account (for DPS entries), active/inactive status
- Suggested defaults: YouTube Premium (৳160, day 1), Upension DPS (৳10,000, day 8), DPS 10k City Bank (৳10,000, day 14), DPS 30k City Bank (৳30,000, day 14), Mess Rent (৳8,722, day 15), Home Internet (৳500, day 16), Home Electricity (৳1,350, day 27)
- Each calendar month the system creates a pending instance for each active template
- Mark as Paid: user enters actual amount paid (may differ from standard); a transaction is automatically created and linked
- Dashboard banner: amber if any fixed expense is due within 3 days; red if any is past due day without being marked paid
- Monthly grid view: all fixed expenses as rows, months as columns, amount + paid/unpaid status per cell
- Annual total and paid/unpaid summary at bottom

### FR-06 · Savings & DPS Module

- Account fields: name, type (Savings Account / DPS / Sanchaypatra / Investment / Cash), bank name, last 4 digits, opening balance, opening date
- DPS-specific fields: monthly installment amount, maturity date, interest rate (optional)
- Account balance = opening balance + sum of all linked deposit transactions (always computed, never stored as a mutable field)
- Savings dashboard: total saved across all accounts, monthly savings contribution, year-to-date savings, projected maturity value per DPS
- Transaction history per account

### FR-07 · Borrow-Loan Ledger

- Top summary: "People owe me ৳X · I owe people ৳Y · Net ৳Z"
- Per-person card: running balance (green = they owe me, red = I owe them), full transaction history
- Entry fields: direction (Given / Received), amount, date, reason/note, transfer method (bKash / Bank / Cash), optional return due date
- Transaction category routing creates entries automatically — no double entry needed
- If person doesn't exist, typing their name creates their ledger section
- Return due date alert: dashboard notification if due within 3 days or overdue
- "Settle Up" action: marks a set of pending entries as settled with a single settlement transaction
- Export per-person ledger as CSV

### FR-08 · History & Analytics

- Monthly summary: income, spending by category, savings, TDS deducted, net cash change
- Yearly summary: cumulative figures with month-by-month breakdown table
- Category trends: spending per category over 12 months as a grouped bar chart
- Income trends: salary, bonuses, profit share over time
- Savings rate trend: month-over-month savings % line chart
- Fixed expense compliance: how many paid on time vs. late vs. missed per month
- Download: export selected period as CSV

### FR-09 · Notifications & Alerts

- Types: Fixed expense due soon (3 days), Fixed expense overdue, Loan return due soon, Budget limit at 80%, Budget limit exceeded
- In-app notification bell with unread count badge
- Notifications computed on login; manual refresh available
- V2: browser push notification opt-in

### FR-10 · Monthly Budget Limits

- User sets a monthly limit per category
- Progress bars: green under 70%, amber 70–100%, red over
- "Discretionary cash" indicator: in-hand minus all fixed expense commitments = free-to-spend amount
- Budget resets every month — no rollover

---

## 6. Tax Module Requirements

> All tax rules derived from Bangladesh-Tax-Calculator-Final.xlsx (NBR FY2025-26 rules). Slabs stored per fiscal year in DB, not in code.

### FR-TAX-01 · Fiscal Year Definition

- Bangladesh fiscal year: 1 July to 30 June. Format: "YYYY-YY" (e.g., "2025-26").
- Income entries automatically assigned to fiscal year by transaction date
- Historical tax years become read-only after 30 June
- System ships with FY2024-25 and FY2025-26 slabs pre-configured

### FR-TAX-02 · Taxable Income Calculation

```
Total Gross = Σ(Salary + Cheer + Profit Share + Bonuses + Other) for Jul–Jun
Exemption   = MIN(Gross / 3, 500000)
Taxable     = Total Gross − Exemption
```

### FR-TAX-03 · Tax Slab Configuration (Data-Driven)

| Slab | FY2024-25 | FY2025-26 | Limit |
|------|-----------|-----------|-------|
| First slice | 0% | 0% | ৳3,50,000 / ৳3,75,000 |
| Second slice | 5% | 10% | next ৳1,00,000 / next ৳3,00,000 |
| Third slice | 10% | 15% | next ৳4,00,000 / next ৳4,00,000 |
| Fourth slice | 15% | 20% | next ৳5,00,000 / next ৳5,00,000 |
| Fifth slice | 20% | 25% | next ৳20,00,000 |
| Remaining | 25% | 30% | Remaining |

### FR-TAX-04 · Tax Rebate

```
Total Eligible = MIN(DPS, 120000) + MIN(Sanchaypatra, 500000) + MIN(Stocks, 500000) + Insurance + Others
Rebate         = MIN(Taxable × 0.03, TotalEligible × 0.10, 1000000)
Net Tax        = Gross Tax − Rebate − FirstQuarterIncentive (if filed before Sep 30)
```

### FR-TAX-05 · TDS Reconciliation

```
Remaining Tax         = Net Tax Payable − TDS Deducted
Suggested Monthly TDS = MAX(0, Remaining Tax) / Remaining Months in Fiscal Year
```

### FR-TAX-06 · Tax Dashboard UI

- Year dropdown, data-completeness progress bar
- Three tiles: Gross Tax | Total Rebate | Net Tax Payable
- TDS reconciliation bar chart
- Investment progress and "Required investment for maximum rebate" field
- Forecast tab: projects full-year income from partial data
- Comparison tab: current vs. prior fiscal year side-by-side

---

## 7. Data Model

### Core Entities

| Entity | Key Fields | Notes |
|--------|-----------|-------|
| `users` | id, email, name, created_at | All data scoped by user_id |
| `income_entries` | id, user_id, fiscal_year, month, income_type, gross_paisa, tds_paisa, comment, payer_name, earned_period | Amounts as integer paisa |
| `transactions` | id, user_id, date, amount_paisa, description, category_id, payment_method, type, linked_entity_type, linked_entity_id, is_deleted | Soft-deleted |
| `categories` | id, user_id, name, routing_type, color_hex | routing_type: none \| dps_savings \| sanchaypatra \| loan_given \| loan_received \| tax_payment |
| `fixed_expenses` | id, user_id, name, standard_amount_paisa, due_day, category_id, linked_account_id, is_active | Template |
| `fixed_expense_instances` | id, fixed_expense_id, year, month, actual_amount_paisa, paid_at, transaction_id, status | status: pending \| paid \| skipped |
| `savings_accounts` | id, user_id, name, type, bank_name, last_four, opening_balance_paisa, opening_date, monthly_installment_paisa, maturity_date | Balance always computed |
| `loan_persons` | id, user_id, name, notes | Per-person ledger |
| `loan_entries` | id, loan_person_id, direction, amount_paisa, date, reason, payment_method, return_due_date, transaction_id, is_deleted | direction: given \| received |
| `tax_years` | id, user_id, fiscal_year, slabs_json, is_locked | slabs_json: [{limit, rate}] |
| `tax_investments` | id, user_id, fiscal_year, dps_paisa, sanchaypatra_paisa, stocks_paisa, insurance_paisa, others_paisa, filed_at | |
| `budgets` | id, user_id, category_id, monthly_limit_paisa, is_active | |
| `notifications` | id, user_id, type, message, entity_type, entity_id, is_read, created_at | |

### Key Business Rules

- All BDT amounts stored as BIGINT paisa; no FLOAT columns for money
- DPS routing constraint: requires linked savings_account_id
- Loan routing constraint: requires linked loan_person_id
- Soft delete only: is_deleted flag; balances exclude deleted rows
- Fiscal year: 2025-07-01 → FY2025-26; 2025-06-30 → FY2024-25
- Loan balance = SUM(given entries − received entries) per person
- TDS constraint: 0 ≤ tds_paisa ≤ gross_paisa
- All routing side-effects execute atomically in one DB transaction

---

## 8. Solution Architecture

### Technology Stack

| Layer | Choice |
|-------|--------|
| Frontend | React + TypeScript (Vite) |
| State | React Query |
| Charts | Recharts |
| Backend | Node.js + Fastify |
| Validation | Zod (shared frontend/backend) |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT access token (15 min) + HTTP-only refresh cookie (30 days) |
| Hosting | Railway (backend + DB) + Vercel (frontend) |
| PWA | Vite PWA plugin |

### Critical Engineering Decisions

1. **BIGINT paisa** — no floating-point money arithmetic
2. **Tax engine as pure function** — deterministic, testable, shared between backend and frontend preview
3. **Atomic category routing service** — all side-effects roll back together on any failure
4. **Idempotent transaction creation** — client-generated UUID prevents duplicate submissions
5. **`fiscalYear(date)` utility** — single function used everywhere, never computed inline
6. **Computed account balance** — `opening_balance + SUM(transactions)`, never a mutable column

---

## 9. Gap Analysis

| Gap | Risk | Solution |
|-----|------|----------|
| GAP-01 Floating-point arithmetic | Rounding errors compound over time | BIGINT paisa everywhere |
| GAP-02 DPS variable month amounts | Standard × months gives wrong balance | Instance stores actual amount paid |
| GAP-03 Ambiguous loan sign convention | Misread direction of money flow | Explicit `direction` field (Given/Received) |
| GAP-04 Cheer income tracking | No standard app models colleague payments | First-class "Cheer / Incentive" income type with payer name |
| GAP-05 Mid-year salary change | Annualized calc overstates tax | Calculate from actual monthly entries only |
| GAP-06 First-quarter filing incentive | Net tax shown too high without it | Filing status section; 5% applied when filed_at ≤ Sep 30 |
| GAP-07 No discretionary cash view | User can't see free-to-spend amount | In-hand minus fixed commitments = discretionary cash |
| GAP-08 Holiday support rate versioning | 2025 rate ≠ 2026 rate | Versioned rate history in Holiday Support log |
| GAP-09 Tax slab comparison | Missed planning insight | Comparison tab: actual income under old vs. new slabs |
| GAP-10 Offline spending entry | Network failure at market | V2 PWA offline queue; V1 must use idempotent UUIDs |

---

## 10. Roadmap

### MVP Sprint Plan (8 × 2-Week Sprints)

| Sprint | Focus |
|--------|-------|
| 1 | Foundation — DB schema, auth API, React shell, deployment |
| 2 | Transactions Core — CRUD, category routing, transaction list |
| 3 | Income & Savings — monthly income entry, savings accounts, DPS flow |
| 4 | Fixed Expenses — templates, monthly instances, mark-as-paid, dashboard banner |
| 5 | Borrow-Loan Ledger — per-person CRUD, running balance, Settle Up |
| 6 | Tax Dashboard — slab config, tax engine, TDS reconciliation, investment entry |
| 7 | Dashboard & Notifications — period selector, summary cards, charts, notifications |
| 8 | Polish & Launch — mobile pass, error/empty/loading states, UAT, production |

---

## 11. QA Requirements

### Acceptance Criteria — Tax Calculation (FY2025-26)

- Gross ৳20,06,846 → Taxable ৳15,06,846 → Gross Tax ৳1,76,369.20
- DPS ৳8,00,000 + Sanchaypatra ৳1,00,000 + Others ৳1,90,000 → Rebate ৳41,000
- TDS paid ৳1,32,488, Net Tax ৳1,35,225 → Remaining ৳2,737
- Mid-year raise must use actual month figures, not annualized current salary

### Acceptance Criteria — Loan Balances (from real data)

- Mithun: ৳9,841 (they owe me — green)
- Amait: ৳1,198.50 (they owe me — green)
- Sohel: ৳-3,145.42 (I owe Sohel — red, label "You owe Sohel ৳3,145.42")
- Anapo, Babu bhai: ৳0 (neutral)

### Non-Functional Requirements

| Requirement | Threshold |
|-------------|-----------|
| Dashboard cold load (500 transactions) | < 2 seconds |
| Transaction entry round-trip | < 500 ms |
| Tax calculation API | < 300 ms |
| Currency display | 2 decimal places, tabular-nums, ৳ prefix |
| Mobile tap targets | ≥ 44px; no horizontal scroll |
| Data loss on network error | Zero |
| Session expiry | 30 days inactivity |
| Money arithmetic | Zero rounding errors (integer paisa) |
