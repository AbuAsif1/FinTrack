# FinTrack BD Phase 2 — Backlog

**Status:** needs-triage
**Created:** 2026-11-12

> **Owns:** the features deferred from the MVP. Nothing here is ready to build: each item needs a decision from the owner and its own tickets under `issues/` before work starts.
> MVP scope: `.scratch/docs/brd.md` §3. MVP spec: `.scratch/fintrack-bd-mvp/spec.md`.

---

## Accounts and administration

### 1. More admin tools

The MVP gives admins user management only (`brd.md` FR-14, ADR-0011). Deferred:

- Opening and closing sign-up from inside the app (a deployment setting in the MVP)
- Shared default tax settings and starter categories that new users receive, maintained by the admin
- Site health and usage counts

Admins still never see any user's financial data. Paying for the app is a Phase 3 idea: `.scratch/fintrack-bd-phase-3/spec.md`.

### 2. Delete my account and data

A typed-confirmation action that removes a user's account and everything in it, after offering the full export. Needs a recorded exception to the soft-delete rule.

### 3. Passkey or two-factor sign-in

A second factor or passkey for an app that holds all of a user's finances.

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

### 12. Shareable loan statement and reminder text

A statement for one Loan Person as an image or PDF, and a ready-to-send bKash reminder message.

---

## Import and documents

### 13. Statement import with column mapping

Import a bank or bKash statement CSV as it comes, mapping its columns. Uncategorised rows go to a Needs review queue. Includes categorisation rules ("description contains X, then category Y") and a warning when a row matches an existing entry on date, amount and description.

- **Builds on:** the MVP's template-based CSV import.

### 14. Automatic bank sync

Balances and transactions pulled from the bank. From the owner's original plan ("later").

- **Depends on:** item 13, and on a bank or aggregator offering an API in Bangladesh.

### 15. Direct `.xlsx` import

Read the owner's spreadsheets directly instead of CSV templates. Each sheet's layout needs its own mapping.

### 16. Receipt photos and a document vault

Attach a photo to a Transaction, and keep salary certificates, TDS challans and DPS or Sanchaypatra statements for filing.

- **Needs:** file storage and a privacy decision about storing documents with a third party.

### 17. Restore from export and scheduled backups

Restore an account from a full JSON export, and take automatic periodic backups.

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
