# FinTrack BD Phase 2 — Backlog

**Status:** needs-triage
**Created:** 2026-11-12

> **Owns:** the features deferred from the MVP. Nothing here is ready to build: each item needs a decision from the owner and its own tickets under `issues/` before work starts.
> MVP scope: `.scratch/docs/brd.md` §3. MVP spec: `.scratch/fintrack-bd-mvp/spec.md`.

## Issue tickets

Each item below has a detailed ticket in `issues/` with user flows, scenarios, and impact notes.

| # | Ticket | Area |
|---|--------|------|
| 1 | [p2-01 More admin tools](issues/p2-01-more-admin-tools.md) | Admin |
| 4 | [p2-04 Monthly spending limit + dashboard chart](issues/p2-04-monthly-spending-limit-dashboard-chart.md) | Money |
| 5 | [p2-05 Wallet balances and net worth](issues/p2-05-wallet-balances-and-net-worth.md) | Money |
| 6 | [p2-06 Savings goals](issues/p2-06-savings-goals.md) | Money |
| 7 | [p2-07 Quarterly/annual Fixed Expenses + recurring suggestions](issues/p2-07-quarterly-annual-fixed-expenses-recurring-suggestions.md) | Money |
| 8 | [p2-08 Tags on Transactions](issues/p2-08-tags-on-transactions.md) | Money |
| 9 | [p2-09 What-if tax planner + filing checklist](issues/p2-09-what-if-tax-planner-and-filing-checklist.md) | Tax |
| 10 | [p2-10 Tax treatment of savings interest + Sanchaypatra](issues/p2-10-tax-treatment-savings-interest-sanchaypatra.md) | Tax |
| 11 | [p2-11 Recurring income + Transaction templates](issues/p2-11-recurring-income-and-transaction-templates.md) | Money |
| 15 | [p2-15 Direct .xlsx import](issues/p2-15-direct-xlsx-import.md) | Import |
| 18 | [p2-18 Browser push notifications + daily scheduler](issues/p2-18-browser-push-notifications-and-daily-scheduler.md) | Platform |
| 19 | [p2-19 Offline entry queue](issues/p2-19-offline-entry-queue.md) | Platform |
| 20 | [p2-20 Bangla language toggle](issues/p2-20-bangla-language-toggle.md) | Platform |
| 21 | [p2-21 Interface polish](issues/p2-21-interface-polish.md) | Platform |

> **Moved to Phase 3:** items 2 (delete account), 3 (2FA/passkey), 12 (loan statement), 13 (statement import), 14 (bank sync), 16 (document vault), 17 (restore/backups). See `.scratch/fintrack-bd-phase-3/spec.md`.

---

## Accounts and administration

### 1. More admin tools

The MVP gives admins user management only (`brd.md` FR-14, ADR-0011). Deferred:

- Opening and closing sign-up from inside the app (a deployment setting in the MVP)
- Shared default tax settings and starter categories that new users receive, maintained by the admin
- Site health and usage counts

Admins still never see any user's financial data. Paying for the app is a Phase 3 idea: `.scratch/fintrack-bd-phase-3/spec.md`.

---

## Money features

### 4. Overall monthly spending limit with a dashboard chart

One limit for the whole month, shown on the dashboard as a budget-health ring beside the per-category budgets. From the owner's original plan.

### 5. Wallet balances and net worth

A balance for cash, bKash and each bank account, and a net worth figure calculated from savings balances, wallet balances and what is owed in each direction.

- **Why deferred:** it turns payment method from a label into an account, which touches every Transaction and needs opening balances and transfers between wallets.

### 6. Savings goals

A target amount and date, with progress taken from a linked savings account's balance.

### 7. Quarterly and annual Fixed Expenses, and recurring-payment suggestions

Fixed Expenses on cadences other than monthly, shown with a monthly equivalent; and suggestions for new templates when the same payment repeats, with Keep and Ignore.

### 8. Tags on Transactions

Labels that cut across categories (for example "Eid", "Trip"), usable as a filter.

### 9. What-if tax planner and filing checklist

"If I invest ৳X more, I save ৳Y" on the Tax Dashboard, and a checklist for filing: documents, the 30 September Early Filing Rebate date, and late-filing surcharges.

- **To settle first:** late-filing surcharge rules (ticket 24 lists what PwC reports).

### 10. Tax treatment of savings interest and Sanchaypatra profit

Record tax deducted at source on bank interest and Sanchaypatra profit and include them correctly in the year's tax.

### 11. Recurring income and Transaction templates

Salary proposed automatically each month for one-tap confirmation, and saved templates for frequent Transactions.

---

## Import and documents

### 15. Direct `.xlsx` import

Read the owner's spreadsheets directly instead of CSV templates. Each sheet's layout needs its own mapping.

---

## Platform and polish

### 18. Browser push notifications and a daily scheduler

Push alerts for due and overdue items without opening the app. Needs a daily cron and push subscription storage (ADR-0009).

### 19. Offline entry queue

Queue Transactions made without a connection and send them when it returns. Idempotency keys already make the retries safe.

### 20. Bangla language toggle

Bangla UI text and, optionally, Bangla numerals. Every string needs externalising first.

### 21. Interface polish

- Inline category change in the Transactions list
- The selected period remembered across devices, with "Last 3 months", "Last 6 months" and "All time"
- A change indicator shown only when the previous period has real data
- Minimum text size of 12 px (labels and badges are 11 px today)
- Vector icons in place of the emoji in the wireframes
- Dialogs keep focus inside, close on Escape, and disable submit while saving
- Screen-size testing at 768 px and 1440 px as well as 375 px and 390 px
- The "coming up" list extended to loan returns due and DPS maturity dates
- Due-soon banner colour: the owner's plan says light blue; the design uses amber

---

## Not planned

Family or shared finances, investment portfolio prices, receipt OCR, credit score tracking, multi-currency accounts, and tax return (ITR) PDF generation. See `brd.md` §3.

## Comments

<!-- Append discussion below this line -->
