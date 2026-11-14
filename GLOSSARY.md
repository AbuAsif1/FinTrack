# Glossary — FinTrack BD

Domain terms for the personal finance tracking system. Definitions only: formulas a user would recognise are included, implementation details are not.
Requirements are in `.scratch/docs/brd.md`; decisions are in `.scratch/docs/adr/`.

---

## Money

### BDT (Bangladeshi Taka)

The currency of the system, written with the ৳ prefix, South Asian digit grouping and two decimal places.

### Paisa

The sub-unit of the Taka: 1 BDT = 100 Paisa. All amounts are held as whole Paisa.
_Avoid_: paise

---

## Income

### Income Entry

A record of income received in a given month, with its type, Gross Income and TDS.

### Gross Income

Income before tax is deducted. The Tax module starts from Gross Income.

### In-Hand Income

Gross Income minus TDS: the amount that actually reaches the user. The dashboard and budgets use In-Hand Income.
_Avoid_: net salary, take-home pay

### TDS (Tax Deducted at Source)

Income tax withheld by the employer before paying the user, recorded on each Income Entry.
_Avoid_: withholding tax

### Profit Share (PS)

A performance-based payment from the employer, usually quarterly, tracked separately from salary.

### Cheer / Incentive

An ad hoc payment from a named colleague rather than the employer, recorded with the payer, the period it was earned in and the month it was received.

### Holiday Support

Pay for working on holidays, calculated from days worked and a per-day rate that changes over time.

---

## Spending and cash

### Transaction

A dated movement of the user's money other than income. Its category makes it Spending, a Transfer, a Loan Entry or a Tax Payment.

### Spending

A Transaction that pays an outside party for goods or services. Only Spending counts toward Total Spending and budgets.

### Total Spending

The sum of Spending in a period. Transfers, Loan Entries and Tax Payments are excluded.

### Transfer

A Transaction that moves money from one of the user's own accounts to another, such as from a bank account to In-Hand Cash, or into a DPS. A Transfer is never Spending.

### Net Savings

In-Hand Income minus Total Spending minus Tax Payments, for a period.

### Savings Rate

Net Savings as a percentage of In-Hand Income for a period.

### Fixed Expense

A recurring monthly obligation with a due day. It has a template (standard amount and due day) and one instance per month, which is Pending, Paid or Skipped.

### Fixed Commitments

The month's total of Fixed Expense instances: the amount actually paid for Paid instances and the standard amount for Pending ones.

### Discretionary Cash

The month's In-Hand Income minus its Fixed Commitments: the planned upper bound on everything else the user can do with the month's money.

### Remaining to Spend

What is left of the current month's money right now: In-Hand Income plus other cash received, minus every Transaction already made and every Fixed Expense still Pending.
_Avoid_: free to spend, available balance

---

## Accounts and savings

### Payment Account

An account the user can pay from and receive money into: a bank savings account, an MFS Account or In-Hand Cash. DPS, FDR and Investment Accounts are not Payment Accounts.

### MFS Account

A mobile financial services account such as bKash or Nagad. It behaves like a bank account and can hold its own DPS.
_Avoid_: mobile wallet, e-wallet

### In-Hand Cash

The physical cash the user holds. Each user has at most one. A Cash payment comes out of it.
_Avoid_: petty cash

### Parent Account

The bank savings account or MFS Account that a DPS or FDR belongs to. The DPS or FDR counts toward its parent's total, and money withdrawn from it goes back to the parent.

### Investment Account

An account holding one kind of investment: Sanchaypatra, Universal Pension, Stocks, Insurance or another investment. It has no Parent Account. Payments into it count toward the Tax Rebate for its kind.

### Universal Pension

The government's universal pension scheme, paid in monthly installments into an Investment Account. Installments are eligible for Tax Rebate.
_Avoid_: pension DPS

### Funding Account

The Payment Account on the other side of a Transfer, Loan Entry or Tax Payment: the account the money leaves from, or the one it arrives in.

### Net Worth

The sum of the balances of all the user's accounts. Money lent to or borrowed from Loan Persons is not included.

### DPS (Deposit Pension Scheme)

A savings instrument with a fixed monthly installment and a maturity date, held under a Parent Account. An installment is a Transfer and is eligible for Tax Rebate up to a yearly cap.
_Avoid_: recurring deposit, RD

### Sanchaypatra

A government savings certificate. A purchase is a Transfer and is eligible for Tax Rebate up to a yearly cap.
_Avoid_: national savings certificate

### Savings Withdrawal

A Transfer that takes money out of a savings account, including a DPS maturity payout.

### Savings Interest

Interest or profit credited to a savings account. It raises the account balance without any cash changing hands.

---

## Borrow-Loan ledger

### Loan Person

A named individual the user lends to or borrows from.

### Loan Entry

A single movement of money between the user and a Loan Person, always described from the user's side: **Given** means money left the user, **Received** means money came to the user.

### Running Balance

Total Given minus total Received for a Loan Person. Positive means the person owes the user; negative means the user owes the person.

### Settle Up

Recording the one Loan Entry that brings a Loan Person's Running Balance to zero.

---

## Tax

### Fiscal Year

The Bangladesh tax year, 1 July to 30 June, written "YYYY-YY" (for example "2025-26"). Tax uses the Fiscal Year; budgets and spending use calendar months.
_Avoid_: financial year, tax year

### Taxable Income

Taxable Gross Income for the Fiscal Year minus the salary exemption (a fraction of income, up to a cap).

### Tax Rebate

A reduction in tax for qualifying investments: the smallest of a percentage of Taxable Income, a percentage of eligible investment, and a fixed maximum.
_Avoid_: credit, deduction

### Minimum Tax

The least tax payable once Taxable Income exceeds the tax-free threshold.

### Early Filing Rebate

A percentage reduction in tax, up to a maximum, for filing the return on or before 30 September.

### Net Tax Payable

Tax for the Fiscal Year after the Tax Rebate, the Minimum Tax rule and any Early Filing Rebate.

### Tax Payment

A Transaction that pays income tax directly to the government, assigned to the Fiscal Year it settles.

### Tax Paid

TDS plus Tax Payments for a Fiscal Year.

### Remaining Tax

Net Tax Payable minus Tax Paid. A negative figure means tax has been overpaid.
