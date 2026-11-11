# FinTrack BD MVP — Specification

**Status:** ready-for-agent  
**Label:** ready-for-agent  
**Created:** 2026-11-11  
**Source:** Synthesized from `docs/brd.md`, `docs/design.md`, `GLOSSARY.md`, `docs/project-overview.md`

---

## Problem Statement

A salaried professional in Bangladesh maintains three separate Excel spreadsheets to manage personal finances:

1. A salary and tax worksheet tracking 12 months of income across salary, Profit Share, bonuses, TDS, and Bangladesh NBR tax-slab calculations.
2. A fixed spending tracker with per-month deadline checkboxes for recurring obligations (DPS installments, rent, utilities).
3. A Borrow-Loan ledger recording money lent to or borrowed from named individuals, with running balances.

These spreadsheets have no single source of truth, no cross-sheet calculations, no automatic TDS reconciliation, no deadline alerts, no cash-flow forecast, and no mobile access. Tax calculations must be re-entered manually each fiscal year. DPS payments appear in spending but their savings growth is invisible. There is no way to see how much Discretionary Cash remains after committing to Fixed Expenses for the month.

---

## Solution

FinTrack BD is a mobile-first PWA that replaces all three spreadsheets with a single, always-available system. It introduces:

- **Income Management** — enter salary once a month; the app updates the tax forecast, year-to-date income, and In-Hand Income automatically.
- **Category Routing** — marking a DPS payment atomically deducts from Discretionary Cash, credits the linked savings account balance, and updates the tax rebate tracker.
- **Fixed Expense Tracker** — monthly instances with deadline alerts (3-day warning, overdue flag), mark-as-paid drawer, and a grid view across all months.
- **Borrow-Loan Ledger** — per-person Running Balance with sign-aware display (green = they owe me, red = I owe them), return due-date alerts, and Settle Up action.
- **Tax Dashboard** — data-driven slab configuration, gross-tax and rebate calculation, TDS reconciliation bar, investment progress toward maximum rebate, and a Forecast tab.
- **Dashboard** — period-scoped summary tiles (In-Hand Income, Total Spending, Net Savings, Savings Rate %), cash-flow chart, Discretionary Cash indicator, and a tax snapshot mini-card.

The system is Bangladesh-specific throughout: NBR Fiscal Year (July–June), South Asian number grouping (lakhs/crores), TDS vocabulary, bKash as a payment method, and Sanchaypatra as a tax-rebate-eligible investment.

---

## User Stories

### Authentication & Profile

1. As a user, I want to register with an email and password, so that my financial data is private and secured to my account.
2. As a user, I want to verify my email before first login, so that my account cannot be created with a spoofed address.
3. As a user, I want to complete an onboarding form with my name, current monthly salary, and employment start date, so that the app can pre-populate sensible defaults.
4. As a user, I want to update my monthly salary at any time and have it take effect from a chosen month, so that historical tax calculations remain accurate even after a pay rise.
5. As a user, I want my session to expire after 30 days of inactivity, so that my data is not exposed on a shared device.
6. As a user, I want a password-reset flow via email, so that I can recover access if I forget my password.

### Dashboard

7. As a user, I want to see In-Hand Income, Total Spending, Net Savings, and Savings Rate for the selected period on the dashboard, so that I can judge my financial health at a glance.
8. As a user, I want to switch the period between This Month, Last Month, This Tax Year, Last Tax Year, and a custom date range, so that I can compare performance across different time frames.
9. As a user, I want a 6-month grouped bar chart of income versus spending, so that I can see cash-flow trends without opening the Analytics page.
10. As a user, I want a spending-by-category donut chart for the selected period, so that I know which categories consume the most of my budget.
11. As a user, I want to see the last 10 Transactions with merchant, category, amount, and date, so that I can verify recent entries without navigating to the full ledger.
12. As a user, I want a Discretionary Cash indicator showing In-Hand Income minus all active Fixed Expense standard amounts, so that I know my true free-to-spend amount before making a purchase.
13. As a user, I want a tax snapshot mini-card on the dashboard showing tax paid so far, estimated remaining tax, and suggested monthly TDS, so that I can stay on top of tax obligations without opening the Tax Dashboard.
14. As a user, I want a summary of people who owe me and amounts I owe, so that I can see my loan position without opening the Borrow-Loan ledger.
15. As a user, I want quick-action buttons for Add Spending, Add Income, and Mark Fixed Expense Done on the dashboard, so that I can enter data without navigating away.

### Income Management

16. As a user, I want to record monthly income by selecting month, income type, Gross Income, and TDS deducted, so that the app can maintain an accurate year-to-date income record.
17. As a user, I want In-Hand Income computed automatically as Gross minus TDS and shown read-only, so that I never enter the wrong figure by hand.
18. As a user, I want the system to validate that TDS is between zero and gross amount, so that impossible values are rejected before saving.
19. As a user, I want last month's salary pre-filled as the starting value for a new income entry, so that I do not need to re-enter an unchanged salary each month.
20. As a user, I want to record Cheer / Incentive income with a payer name and the period it was earned in (even if received in a different month), so that ad hoc colleague payments are tracked accurately.
21. As a user, I want to record Profit Share, Eid Festival Bonus, Leave Encashment, and Certification Reimbursement as separate income types, so that the year-to-date breakdown reflects real income composition.
22. As a user, I want a monthly income table for the full Fiscal Year (July–June) showing each month's status (Entered / Pending), so that I can see at a glance which months I have not yet recorded.
23. As a user, I want a Holiday Support log where I record dates worked, days, and rate type, so that holiday-rate earnings are computed and stored separately.
24. As a user, I want to view income history across fiscal years, so that I can see salary progression over my career.

### Transactions & Spending

25. As a user, I want to add a spending entry with amount, date, description, category, and payment method, so that every cash outflow is captured in one place.
26. As a user, I want the entry date to default to today, so that most entries require no date editing.
27. As a user, I want to choose from Cash, bKash, Bank Transfer, and Card as payment methods, so that I can track how I actually pay.
28. As a user, I want to filter the transaction list by date range, category, payment method, amount range, and keyword search, so that I can find any entry quickly.
29. As a user, I want to soft-delete Transactions (with an audit trail preserved) rather than hard-delete them, so that accidental deletions do not destroy financial history.
30. As a user, I want to bulk-select and delete multiple Transactions at once, so that cleaning up duplicate or test entries is efficient.
31. As a user, I want a routing indicator shown beneath any Transaction with a category side-effect, so that I can confirm that the DPS, loan, or tax posting happened correctly.

### Category Routing

32. As a user, I want selecting the DPS / Savings category to prompt me for the linked savings account and add the amount to that account's balance and the tax rebate tracker, so that savings growth is not invisible.
33. As a user, I want selecting the Sanchaypatra investment category to automatically credit the amount to the rebate-eligible investment total, so that I do not have to update tax figures separately.
34. As a user, I want selecting the Loan Given category to prompt for a Loan Person name and reason, and create a Loan Entry in that person's ledger, so that there is no double entry.
35. As a user, I want selecting the Loan Received category to record the amount in the Borrow-Loan ledger as a received entry for the named Loan Person, so that my outstanding obligation appears immediately.
36. As a user, I want all category routing side-effects (savings credit, Loan Entry, rebate update) to roll back atomically if any part fails, so that the data is never left in a half-updated state.

### Fixed Recurring Expenses

37. As a user, I want to define Fixed Expense templates with name, standard amount, due day of month, and category, so that recurring obligations are captured once and not re-entered monthly.
38. As a user, I want the system to suggest the standard defaults (Upension DPS ৳10,000 day 8, City Bank DPS 10k ৳10,000 day 14, City Bank DPS 30k ৳30,000 day 14, Mess Rent ৳8,722 day 15, Home Internet ৳500 day 16, Home Electricity ৳1,350 day 27, YouTube ৳160 day 1) during setup, so that I do not need to enter them from scratch.
39. As a user, I want monthly instances created automatically for each active template, so that I never miss a due date because I forgot to create the entry.
40. As a user, I want to mark a Fixed Expense instance as Paid by entering the actual amount paid (which may differ from the standard), so that variable charges are recorded accurately.
41. As a user, I want marking a Fixed Expense as Paid to automatically create a linked Transaction, so that the fixed expense and transaction ledger stay in sync without double entry.
42. As a user, I want an amber dashboard banner when any Fixed Expense is due within 3 days, so that I do not miss a deadline.
43. As a user, I want a red dashboard banner when any Fixed Expense is past its due day without being marked Paid, so that overdue items are unmissable.
44. As a user, I want a monthly grid view showing all Fixed Expenses as rows and months as columns, so that I can see annual compliance at a glance.
45. As a user, I want to deactivate a Fixed Expense template without deleting it, so that historical data is preserved when an obligation ends.

### Savings & DPS

46. As a user, I want to define savings accounts with name, type (Savings / DPS / Sanchaypatra / Investment / Cash), bank name, last four digits, opening balance, and opening date, so that all my savings instruments are tracked in one place.
47. As a user, I want DPS accounts to store the monthly installment amount, maturity date, and optional interest rate, so that projected maturity value can be shown.
48. As a user, I want account balances computed as opening balance plus sum of all linked deposit Transactions rather than stored as a mutable field, so that the balance is always consistent with the Transaction history.
49. As a user, I want a savings dashboard showing total saved across all accounts, monthly contribution, year-to-date savings, and projected maturity value per DPS account, so that my savings position is clear.
50. As a user, I want to see per-DPS progress toward the ৳1,20,000 annual tax-rebate cap, so that I know when I have maximised the DPS rebate benefit.

### Borrow-Loan Ledger

51. As a user, I want a summary banner showing total amount people owe me, total I owe others, and net position, so that I know my overall loan exposure at a glance.
52. As a user, I want a per-person card with a Running Balance and full Loan Entry history, so that I can see the complete record for each individual without searching.
53. As a user, I want balances displayed with the correct label: green "Mithun owes you ৳X" for positive balances and red "You owe Sohel ৳X" for negative balances, so that the direction of obligation is unambiguous.
54. As a user, I want to record a Loan Entry with direction (Given / Received), amount, date, reason, payment method, and optional return due date, so that every loan movement is fully documented.
55. As a user, I want typing a new name in the Loan Person field to create a ledger section for that person automatically, so that I never need to pre-register a person before recording an entry.
56. As a user, I want a return-due-date alert on the dashboard when a loan return is due within 3 days or overdue, so that I can follow up in time.
57. As a user, I want a Settle Up action that marks a set of pending entries as settled in a single settlement Transaction, so that closing a balanced account is one step, not many edits.
58. As a user, I want to export a Loan Person's ledger as CSV, so that I can share the history with that person.

### Tax Dashboard

59. As a user, I want to select a Fiscal Year from a dropdown and see the data-completeness progress bar, so that I know how much of the year's income has been entered.
60. As a user, I want three summary tiles showing Gross Tax, Total Rebate, and Net Tax Payable, so that the tax outcome is visible at a glance.
61. As a user, I want to see the Taxable Income calculation broken down (Gross Annual minus Exemption equals Taxable Income), so that I can verify the figures match my own understanding.
62. As a user, I want to see the tax slab breakdown showing how much tax falls in each slab tier, so that I can understand the composition of my gross tax.
63. As a user, I want TDS reconciliation shown as Net Tax Payable minus TDS Paid to Date with the remaining tax and suggested monthly TDS, so that I know exactly what I still owe and can instruct my employer accordingly.
64. As a user, I want an investment table showing DPS, Sanchaypatra, stocks, insurance, and other investments alongside their rebate caps and actual eligible amounts, so that I can see which categories have headroom.
65. As a user, I want to see the "required investment for maximum rebate" figure, so that I know how much more I need to invest this Fiscal Year.
66. As a user, I want a Forecast tab that projects full-year Taxable Income from partial data, so that I can plan for the tax bill before the Fiscal Year ends.
67. As a user, I want a Compare Years tab showing the current Fiscal Year side-by-side with the prior year under both old and new slab rates, so that I can understand the impact of slab changes on my liability.
68. As a user, I want tax slab configurations stored in the database per Fiscal Year and not in code, so that new NBR slab announcements can be applied without a deployment.
69. As a user, I want the system to apply the 5% first-quarter filing incentive when I mark a tax return as filed before 30 September, so that early filing is rewarded in the calculation.

### Budget & Notifications

70. As a user, I want to set a monthly spending limit per category, so that I am alerted when I approach or exceed it.
71. As a user, I want progress bars coloured green under 70%, amber at 70–99%, and red over 100%, so that budget health is encoded visually without reading the number.
72. As a user, I want an in-app notification bell with an unread count badge, so that I do not miss alerts for overdue Fixed Expenses, overdue loans, or over-budget categories.
73. As a user, I want notifications recomputed on login so they are always fresh, so that I see the current state without a separate refresh step.

### History & Analytics

74. As a user, I want a monthly summary table showing In-Hand Income, Spending, Savings, TDS, Savings Rate, and Fixed Expense compliance per month, so that I can review any past month in one view.
75. As a user, I want a category spending trend chart across 12 months, so that I can see which categories are growing or shrinking over time.
76. As a user, I want an income trend chart showing salary, bonuses, and Profit Share over time, so that I can see career earnings progression.
77. As a user, I want a savings rate trend line chart with a 20% target reference line, so that I know whether my savings discipline is improving or declining.
78. As a user, I want to export any selected period as CSV, so that I can analyse the data in my own tools.

### Non-Functional

79. As a user, I want the dashboard to load within 2 seconds with 500 Transactions, so that I do not wait on a large history.
80. As a user, I want Transaction entry to complete in under 500 ms round-trip, so that adding entries in the field feels instant.
81. As a user, I want the app to be installable as a PWA on my Android phone, so that I have a home-screen shortcut and near-native experience without an app store.
82. As a user, I want the app to display correctly on screens as narrow as 375px without horizontal scrolling, so that all pages are fully usable on a small phone.
83. As a user, I want all monetary amounts to use Bangladesh currency notation (৳ prefix, South Asian number grouping, two decimal places), so that figures look familiar rather than foreign.

---

## Implementation Decisions

### Money representation
All BDT amounts are stored as `BIGINT` Paisa in every database column and transported as integers in every API response. Division by 100 (for display) happens only at the presentation layer. No `FLOAT` or `DECIMAL` column is ever used for money. This prevents floating-point rounding errors from corrupting tax calculations.

### Fiscal year utility
A single pure function `fiscalYear(date: Date): string` (returning `"YYYY-YY"`) is the only place in the codebase where the July–June boundary is computed. It is shared between backend and frontend. No inline fiscal-year logic anywhere else.

### Tax engine as a pure function
The tax engine is a pure function: `calculateTax(slabs, income, investments) → TaxResult`. It has no I/O, no DB calls, and no side effects. It lives in a shared `packages/tax-engine` workspace package consumed by both the API and the frontend (for instant preview without a round-trip). Tax slab inputs come from the `tax_years` table at query time, not hardcoded.

### Atomic category routing
A `CategoryRoutingService` on the backend executes all Transaction side-effects (savings account credit, Loan Entry creation, rebate update, tax payment recording) inside a single Prisma transaction. If any step throws, the entire transaction rolls back. The frontend receives either a success response with the full set of created records, or an error with no partial state.

### Computed savings account balances
Savings account balances are never stored as mutable columns. Balance = `opening_balance_paisa + SUM(linked transaction amounts)`. The `savings_accounts` table has no `balance` column. This invariant is enforced at schema level.

### Idempotent transaction creation
Every Transaction-create request includes a client-generated UUID (`idempotency_key`). The backend rejects duplicate keys with 409 and returns the already-created record. Double-taps on the Save button are therefore safe.

### Tax slab configuration is data-driven
Slabs are stored in a `tax_years` table as a `slabs_json` column, not in application code. FY2024-25 and FY2025-26 are seeded at migration time. Adding a new Fiscal Year's slabs is a data migration, not a code deployment.

### Soft delete only
Transactions and Loan Entries are never hard-deleted. They carry an `is_deleted` boolean. All balance and spending aggregates exclude `is_deleted = true` rows.

### Two-time-axis design
Calendar month is used for spending, budgets, Fixed Expenses, and dashboard summaries. Fiscal Year is used exclusively for the Tax module and income yearly totals. These axes are never mixed in a single query.

### Technology stack
- Frontend: React 18 + TypeScript, Vite, React Query, Recharts, React Hook Form + Zod
- Backend: Node.js, Fastify, Prisma, Zod (shared schemas via `packages/shared`)
- Database: PostgreSQL 16
- Auth: JWT access token (15 min TTL) + HTTP-only refresh cookie (30 days)
- Hosting: Railway (Fastify + PostgreSQL) + Vercel (React PWA)
- Monorepo: pnpm workspaces

### Database schema (13 tables)
`users`, `income_entries`, `transactions`, `categories`, `fixed_expenses`, `fixed_expense_instances`, `savings_accounts`, `loan_persons`, `loan_entries`, `tax_years`, `tax_investments`, `budgets`, `notifications` — as specified in `docs/brd.md` §7, with all money columns as `BIGINT`.

### API design
RESTful JSON API under `/api/v1/`. All endpoints require a valid JWT. All money values in API responses are integers (Paisa). Timestamps use ISO 8601 UTC. Fiscal Year strings use `"YYYY-YY"`. Resource-noun URL patterns (`/transactions`, `/income-entries`, `/fixed-expenses/:id/instances/:instanceId/pay`, etc.).

---

## Testing Decisions

### What makes a good test
A good test exercises external behaviour through the highest stable seam and uses the same real acceptance-criteria figures that come from the user's Excel files. Tests must not assert implementation details (which Prisma methods were called, internal service method signatures, or intermediate computed values not surfaced in the API response). A failing test means the user would observe incorrect behaviour; a passing test means the feature works as the user would experience it.

### Seam 1 — Tax engine (pure function)
The tax engine is a pure function with no I/O. Tests call it directly with acceptance-criteria inputs and assert exact BDT outputs. No mocking needed.

Key anchor cases:
- FY2025-26 slabs, Gross ৳20,06,846 → Net Tax ৳1,35,369
- Rebate capped correctly when DPS > ৳1,20,000
- Remaining tax = ৳0 when TDS already exceeds Net Tax Payable
- Mid-year salary change uses actual monthly entries, not an annualised figure

### Seam 2 — Fastify HTTP API (integration tests, real PostgreSQL)
All other modules are tested through Fastify's `inject()` against a test PostgreSQL database migrated fresh for each test file. No DB mocking. No service-layer unit tests. No repository-layer tests. If the HTTP response is correct, the feature is correct.

Modules covered through this seam: auth, income CRUD and YTD aggregates, Transaction CRUD including category routing side-effects, Fixed Expense template CRUD and mark-as-paid, savings account CRUD and computed balance, Loan Person + Loan Entry CRUD and Running Balance, Settle Up, tax calculation endpoint, budget CRUD and spending-vs-limit aggregates, notification generation, dashboard summary aggregates.

### Test harness
Sprint 1 establishes a `createTestApp()` helper (vitest): migrates a fresh database, seeds a test user, issues a JWT, and returns a configured Fastify app. All subsequent test files import this helper.

---

## Out of Scope

- Bank API / automatic statement sync
- Multi-user or family finance sharing
- Investment portfolio tracking (stock prices, NAV, returns)
- Receipt OCR / photo scanning
- Credit score tracking
- Browser push notifications (in-app only in V1)
- Multi-currency accounts
- Tax return form (ITR PDF) generation
- PWA offline queue (V1 uses idempotency keys; V2 adds a service worker queue)
- Role-based access control

---

## Further Notes

### Grilling Round 1 decisions must be resolved first
Seven foundational questions await user confirmation (see `docs/project-overview.md` §"Grilling Session Round 1"). ADRs cannot be written and Sprint 1 cannot begin until at minimum Q1 (PWA vs. native), Q3 (single-user vs. multi-tenant scaffolding), and Q4 (DPS as Transfer not Spending) are answered.

### Acceptance criteria figures are binding
The exact BDT values in `docs/project-overview.md` §"Real Data Acceptance Criteria" are the primary QA gate. If the tax calculation returns ৳1,35,370 instead of ৳1,35,369, it is a bug — not a rounding choice.

### South Asian number grouping
JavaScript's `Intl.NumberFormat` does not support South Asian grouping natively. A custom `formatBDT(paisa: number): string` utility must be written and used in every display context. The app renders `৳20,06,846`, never `৳2,006,846`.

### Design reference
`docs/design.md` is the authoritative source for all visual decisions: color tokens, typography scale, component wireframes, page layouts, and Bangladesh-specific display rules. Any agent implementing frontend code must read this document before writing a component.

## Comments

<!-- Append discussion below this line -->
