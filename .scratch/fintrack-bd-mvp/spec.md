# FinTrack BD MVP — Specification

**Status:** ready-for-agent
**Created:** 2026-11-11 · **Revised:** 2026-11-12 (aligned with BRD v1.2)

> **Owns:** the MVP's user stories and test seams.
> Feature rules, tax formulas and acceptance fixtures: `.scratch/docs/brd.md`. Stack, schema and API: `.scratch/docs/architecture.md`. Constraints: `.scratch/docs/rules.md`. Tickets: `issues/`.

---

## Problem Statement

A salaried professional in Bangladesh keeps three Excel spreadsheets: a salary and tax worksheet, a fixed spending tracker with monthly deadline checkboxes, and a Borrow-Loan ledger. They share no data, calculate nothing across sheets, give no deadline alerts and are not usable on a phone. Tax slabs are re-entered by hand each Fiscal Year, DPS payments look like spending while their savings growth is invisible, and there is no way to see how much of the month's money is still free.

## Solution

FinTrack BD is a mobile-first PWA that replaces the three spreadsheets:

- **Income** — enter income once a month; In-Hand Income, the year-to-date table and the tax forecast update.
- **Category routing** — the category chosen for a Transaction decides whether it is Spending, a Transfer to or from savings, a Loan Entry or a Tax Payment.
- **Fixed Expenses** — one instance per template per month, with due-soon and overdue alerts and a mark-as-paid action.
- **Savings and DPS** — computed balances that rise with deposits and interest and fall with withdrawals.
- **Borrow-Loan ledger** — a Running Balance per Loan Person with return reminders and Settle Up.
- **Tax Dashboard** — slab tax, Tax Rebate, Tax Paid against Net Tax Payable, forecast and year comparison, from per-Fiscal-Year settings the user can edit.
- **Dashboard** — period tiles, Discretionary Cash and Remaining to Spend for the month, alerts and snapshots.
- **Import and export** — bring spreadsheet history in by CSV; take all data out at any time.

---

## User Stories

### Registration, sign-in and profile

1. As a new user, I want to register with my name, email and password and verify my email, so that only I can open my account.
2. As a user, I want to sign in and see only my own data, with my session ending after 30 days without use, so that my finances stay private.
3. As a user, I want to reset a forgotten password by email and to change my password and display name, so that I control my account.
4. As a new user, I want a first-run checklist that starts with entering this month's salary, so that I know what to set up first.

### Dashboard

5. As the user, I want In-Hand Income, Total Spending, Net Savings and Savings Rate for a selected period, so that I can judge my finances at a glance.
6. As the user, I want to switch between This Month, Last Month, This Tax Year, Last Tax Year and a custom range, so that I can compare periods.
7. As the user, I want Discretionary Cash for the month, so that I know what is left after Fixed Commitments.
8. As the user, I want Remaining to Spend, so that I know what is left right now after everything I have already paid and everything still due.
9. As the user, I want these cash figures marked "estimated" until I enter this month's salary, so that an early-month view is not misleading.
10. As the user, I want a six-month income against spending chart and a spending-by-category chart, so that I can see trends and concentrations.
11. As the user, I want my last 10 Transactions, a tax snapshot and a loan summary on the dashboard, so that I rarely need to open another page.
12. As the user, I want quick actions for Add Spending, Add Income and Mark Fixed Expense Paid, so that entry takes seconds.

### Income

13. As the user, I want to record income by month, type, Gross Income and TDS, so that the year-to-date record is accurate.
14. As the user, I want In-Hand Income computed for me and TDS validated against the gross amount, so that impossible figures are rejected.
15. As the user, I want last month's salary pre-filled, so that an unchanged salary takes one tap.
16. As the user, I want to mark an entry as not taxable, so that reimbursements do not inflate my tax.
17. As the user, I want Cheer income recorded with the payer and the period earned, so that colleague payments are tracked properly.
18. As the user, I want a Fiscal Year table showing each month as Entered or Pending, so that I can see what is missing.
19. As the user, I want a Holiday Support log that keeps the rate used on each entry, so that a rate change does not rewrite history.
20. As the user, I want a salary history timeline, so that I can see my progression.

### Transactions and category routing

21. As the user, I want to add a Transaction with amount, date, description, category and payment method, with the date defaulting to today.
22. As the user, I want a savings category to ask for the account and update its balance, so that savings growth is visible.
23. As the user, I want to record withdrawals, maturity payouts and interest on a savings account, so that its balance stays true.
24. As the user, I want a loan category to ask for the person and create the Loan Entry, so that I never enter a loan twice.
25. As the user, I want a Tax Payment assigned to the Fiscal Year it settles, so that paying last year's tax in September counts for last year.
26. As the user, I want everything one entry creates saved together or not at all, so that data is never half-updated.
27. As the user, I want a double tap or a retry never to create a duplicate.
28. As the user, I want to filter and search Transactions by date, category, payment method, amount and keyword.
29. As the user, I want deletes to be soft and bulk delete to be available, so that mistakes are recoverable and clean-up is fast.
30. As the user, I want a routing note under any Transaction that affected savings, a loan or tax, so that I can confirm what happened.

### Fixed Expenses

31. As the user, I want Fixed Expense templates with name, standard amount, due day and category, and suggested defaults during setup.
32. As the user, I want an instance for each active template every month without doing anything.
33. As the user, I want to mark an instance Paid with the actual amount and have the Transaction created for me.
34. As the user, I want to skip an instance, reopen it, or undo a payment.
35. As the user, I want amber due-soon and red overdue banners, so that I do not miss a deadline.
36. As the user, I want a monthly grid of all Fixed Expenses, so that I can see compliance across the year.
37. As the user, I want changing or deactivating a template to leave past months untouched.

### Savings and DPS

38. As the user, I want savings accounts with type, bank, last four digits, opening balance and opening date.
39. As the user, I want DPS accounts to hold the installment, maturity date and optional interest rate, and to show projected principal at maturity.
40. As the user, I want balances always computed from the ledger.
41. As the user, I want one progress bar for all DPS deposits this Fiscal Year against the rebate cap.

### Borrow-Loan ledger

42. As the user, I want a summary of what people owe me, what I owe and the net.
43. As the user, I want a card per person with a Running Balance, a clear label ("Mithun owes you ৳X" / "You owe Sohel ৳X") and full history.
44. As the user, I want to add a Loan Entry with direction, amount, date, reason, payment method and optional return due date, and to create a person by typing a new name.
45. As the user, I want an alert when a return is due within 3 days or overdue.
46. As the user, I want Settle Up to close a balance in one step.
47. As the user, I want to export a person's ledger as CSV.

### Tax

48. As the user, I want to pick a Fiscal Year and see how many months of income are entered.
49. As the user, I want Gross Tax, Tax Rebate and Net Tax Payable, with the Taxable Income and slab breakdowns behind them.
50. As the user, I want Tax Paid against Net Tax Payable, the Remaining Tax (or the amount overpaid) and a Suggested Monthly TDS.
51. As the user, I want an investment table with caps and eligible amounts, and the further investment needed for the maximum rebate.
52. As the user, I want a forecast of the full year from the income entered so far.
53. As the user, I want to compare this year's income under this year's and last year's settings.
54. As the user, I want to view and edit every tax parameter for a Fiscal Year, so that a new Finance Act needs no deployment.
55. As the user, I want to be told when a year's tax settings are provisional, and to confirm them.
56. As the user, I want to mark a return as filed, have the Early Filing Rebate applied when I filed in time, and reopen the year if needed.

### Budgets and notifications

57. As the user, I want a monthly limit per Spending category with green, amber and red progress.
58. As the user, I want a changed limit to apply from this month without altering past months.
59. As the user, I want a notification bell with an unread count for due and overdue Fixed Expenses, loan returns and budgets.
60. As the user, I want notifications to clear themselves once the condition is resolved.

### History and analytics

61. As the user, I want a monthly summary table of In-Hand Income, Total Spending, Net Savings, TDS, Savings Rate and Fixed Expense compliance.
62. As the user, I want category, income and Savings Rate trend charts.
63. As the user, I want to export a period as CSV.

### Import and export

64. As the user, I want to import income, Transactions and loan history from CSV templates, so that my spreadsheet history is in the app.
65. As the user, I want a preview with every invalid row explained before anything is saved.
66. As the user, I want re-importing a file to add nothing, and to be able to undo an import.
67. As the user, I want to download all my data as one file at any time.

### Admin user management

68. As an admin, I want a list of all users with their status, registration date, last sign-in and payment dates, searchable and filterable, so that I can see who uses the site.
69. As an admin, I want to create a user who then sets their own password by email, so that I can add people without knowing their password.
70. As an admin, I want to update a user's name and email and to create or promote another admin, so that I can correct details and share the work.
71. As an admin, I want to deactivate a user until a date or until I reactivate them, with a reason, so that I can suspend access without losing their data.
72. As an admin, I want to reactivate a user at any time.
73. As an admin, I want to delete a user (never an admin) and all of their data after a typed confirmation, so that removal is deliberate.
74. As an admin, I want to resend a verification email or send a password-reset email for a user, so that I can help with access problems.
75. As an admin, I want to record each user's payment date, amount and the date it covers until, and to see whose cover has lapsed.
76. As an admin, I want a history of admin changes on each user, so that every action is accountable.
77. As a user, I want admins to be unable to see my Transactions, income, loans, savings or tax data, so that my finances stay private.
78. As a deactivated user, I want a clear message when I try to sign in, so that I know why I cannot get in.
79. As an admin, I want admin accounts, mine included, to be closed to admin operations and impossible to delete in the app, so that no admin can lock out or remove another.

### Non-functional

80. As the user, I want the dashboard within 2 seconds and Transaction entry within 500 ms.
81. As the user, I want to install the app on my Android phone and use it at 375 px wide without horizontal scrolling.
82. As the user, I want every amount in Bangladesh notation: ৳ prefix, South Asian grouping, two decimals.
83. As the user, I want light and dark themes.

---

## Testing Decisions

A good test exercises behaviour the user would observe, through the highest stable seam, with the acceptance fixtures in `brd.md` §11. Tests do not assert which Prisma method was called or how a service is structured.

| Seam | What it covers |
|---|---|
| 1. Tax engine | `calculateTax` and `forecastTax` called directly with explicit settings; all `AC-TAX-…` fixtures; 100% branch coverage |
| 2. Route handlers | Every other backend behaviour, called as functions against a real PostgreSQL 16 database; no mocks, no service-layer unit tests |
| 3. Smoke flows | Five Playwright journeys through the built app |

Development is test-first. The cases to implement, one at a time, are the regression test matrix in `test-cases/` (start at its `README.md`); each ticket names its cases.

Details, the test helper and the CI set-up: `architecture.md` §Testing.

---

## Out of Scope

Phase 2 and permanently excluded items are listed in `brd.md` §3. Phase 2 has its own spec at `.scratch/fintrack-bd-phase-2/spec.md`.

---

## Notes

- **Acceptance fixtures are binding.** A result one Paisa away from a fixture in `brd.md` §11 is a bug.
- **Tax settings are provisional.** Seeded parameters follow the user's spreadsheet and await confirmation in ticket 24; the engine must not depend on any of them being final.
- **Design reference.** `.scratch/docs/design.md` is authoritative for every visual decision.

## Comments

<!-- Append discussion below this line -->
