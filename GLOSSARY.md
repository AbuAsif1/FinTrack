# Glossary — FinTrack BD

Domain terms for the personal finance tracking system. No implementation details here.
See `docs/brd.md` for full requirements and `docs/adr/` for architectural decisions.

---

## BDT (Bangladeshi Taka)

The currency unit used throughout the system. All monetary values are displayed in BDT with the ৳ symbol prefix, two decimal places, and right-aligned tabular numerals.

---

## Cheer / Incentive

An ad hoc cash payment received from a named colleague, distinct from employer salary. Taxable income. Recorded with the payer's name, the period it was earned in, and the month it was actually received (which may differ — e.g., a Q3 payment received in Q4).

---

## Discretionary Cash

The portion of a user's In-Hand Income that is not committed to Fixed Expenses in a given calendar month.

```
Discretionary Cash = In-Hand Income − Σ(active Fixed Expense standard amounts)
```

Not the same as "savings" — it is the upper bound on what could be spent before exceeding the month's available cash.

---

## DPS (Deposit Pension Scheme)

A recurring monthly savings instrument offered by Bangladeshi banks. The user deposits a fixed installment each month for a fixed term and receives the principal plus interest at maturity.

A DPS payment is modelled as a **Transfer**, not as Spending. It reduces Discretionary Cash and increases the linked savings account balance, but does not count toward spending totals or category budgets.

The DPS installment amount is eligible for tax rebate (up to ৳1,20,000 per fiscal year).

---

## Fiscal Year

Bangladesh's National Board of Revenue (NBR) tax year: 1 July to 30 June. Identified in the system as a "YYYY-YY" string (e.g., "2025-26"). All tax calculations use the fiscal year as their time boundary. Budgeting and spending views use the calendar month instead.

---

## Fixed Expense

A recurring monthly obligation with a known due day of the month (e.g., DPS on the 14th, rent on the 15th). Each fixed expense has a **template** (the standard amount and due day) and a **monthly instance** (the actual amount paid and when). An instance is either Pending, Paid, or Skipped.

---

## Gross Income

The total pre-tax income received from an employer in a given month or fiscal year. Includes salary, profit share, bonuses, festival bonuses, and leave encashment. Used by the Tax Module as the starting point for taxable income calculation.

---

## In-Hand Income

Gross Income minus Tax Deducted at Source (TDS). This is the amount that actually reaches the user's bank account. Used as the primary income figure for dashboard, budget, and spending ratio calculations. Not the same as Gross Income.

---

## Loan Entry

A record in the Borrow-Loan Ledger representing a single movement of money between the user and a named Loan Person. Always recorded from the user's first-person perspective:

- **Direction: Given** — the user transferred money out to that person.
- **Direction: Received** — the user received money from that person (whether as a repayment of a prior loan or a new loan taken).

The sign of the Loan Person's Running Balance determines who owes whom, not the direction field alone.

---

## Loan Person

A named individual who appears in the Borrow-Loan Ledger. Each Loan Person has their own section showing all Loan Entries and their Running Balance.

---

## Paisa

The sub-unit of the Bangladeshi Taka used for internal arithmetic. 1 BDT = 100 paisa. All monetary values are stored as integer paisa in the database to avoid floating-point rounding errors. Values are divided by 100 only at the display layer.

---

## Profit Share (PS)

A performance-based payment from the employer, typically paid quarterly. Distinct from base salary and tracked separately in income records. Taxable income.

---

## Running Balance

The net balance on a Loan Person's ledger at any point in time:

```
Running Balance = Σ(Given entries) − Σ(Received entries) for all non-deleted Loan Entries
```

A positive balance means the Loan Person owes the user. A negative balance means the user owes the Loan Person.

---

## Sanchaypatra

A government savings instrument (national savings certificate) in Bangladesh. Eligible for tax rebate (up to ৳5,00,000 per fiscal year). Modelled as an Investment Transfer, not as Spending.

---

## Tax Rebate

A reduction in the gross tax liability based on qualifying investments (DPS, Sanchaypatra, stocks, life insurance, and other NBR-approved sectors). Calculated as the minimum of three values:

- 3% of Taxable Income
- 10% of Total Eligible Investment
- Statutory maximum of ৳10,00,000

---

## Taxable Income

The portion of Gross Income subject to tax slab calculation:

```
Taxable Income = Gross Annual Income − Exemption
Exemption      = MIN(Gross Annual Income / 3, 500,000)
```

---

## TDS (Tax Deducted at Source)

The portion of income tax withheld by the employer each month before paying the employee's salary. Recorded on each income entry. Cumulative TDS for the fiscal year is compared against Net Tax Payable to compute the Remaining Tax.

---

## Transfer

A movement of money between two of the user's own accounts (e.g., cash → DPS account, cash → Sanchaypatra). Reduces Discretionary Cash and increases the destination account balance, but does not count toward spending totals or category budgets.

Distinct from a Transaction (which is a spending or income event involving an external party).

---

## Transaction

A record of money moving between the user and an external party — either a Spending event (money leaves) or an Income event (money arrives). Stored with a category, payment method, date, and description.

Not to be confused with a Transfer (which is internal to the user's own accounts).
