# Test cases: Savings accounts

Ticket 04. Read `README.md` in this folder first. Until ticket 06, savings Transactions are created by test fixtures.

## Suite classification

| Suite | Included case IDs |
|-------|------------------|
| **Smoke** | TC-SAV-004 |
| **Happy Path** | Smoke + TC-SAV-001, TC-SAV-002, TC-SAV-003, TC-SAV-005, TC-SAV-007, TC-SAV-009 |
| **Full Regression** | All cases above plus TC-SAV-006, TC-SAV-008, TC-SAV-010, TC-SAV-011, TC-SAV-012, TC-SAV-013, TC-SAV-014 |

> **Smoke** runs the full balance-calculation fixture (opening + deposits + interest + withdrawal). **Happy Path** covers every P1 account lifecycle case. **Full Regression** adds P2 list totals, maturity projection, history, update and transfer cases.

---

| ID | Test case | Expected | Seam | P | Covers |
|---|---|---|---|---|---|
| TC-SAV-001 | Create an account of each type (Savings, DPS, Sanchaypatra, Investment, Cash) | Each is saved and listed | API | P1 | FR-06 |
| TC-SAV-002 | Create with last-four of `4521`, and with a full account number | The first is saved; the second is 422 | API | P1 | rules §9 |
| TC-SAV-003 | An account with no Transactions | Balance equals the opening balance | API | P1 | FR-06 |
| TC-SAV-004 | Opening ৳50,000, two deposits of ৳10,000, interest ৳1,250, withdrawal ৳5,000 | Balance ৳66,250.00 | API | P1 | AC-SAV-1 |
| TC-SAV-005 | Delete one of the deposits | The balance falls by that deposit | API | P1 | ADR-0005 |
| TC-SAV-006 | Savings list totals | Total saved, this month's deposits and this Fiscal Year's deposits match the Transactions | API | P2 | FR-06 |
| TC-SAV-007 | Two DPS accounts with deposits this Fiscal Year | One combined DPS figure against the DPS cap from that year's tax settings | API | P1 | FR-06 |
| TC-SAV-008 | A DPS with balance ৳80,000, installment ৳10,000 and 88 installments left | Projected principal at maturity ৳9,60,000.00 | API | P2 | FR-06 |
| TC-SAV-009 | Close an account with a balance, then one at zero | 422, then closed | API | P1 | FR-06 |
| TC-SAV-010 | An account's Transaction history | Only that account's Transactions, newest first | API | P2 | FR-06 |
| TC-SAV-011 | Update name, bank name and DPS fields | Saved | API | P2 | FR-06 |
| TC-SAV-012 | A Sanchaypatra account with one purchase | Balance is the opening balance plus the purchase | API | P2 | FR-06 |
| TC-SAV-013 | Transfer ৳10,000 from one savings account to another | Source balance falls by ৳10,000; destination balance rises by ৳10,000; Total Spending is unchanged | API | P1 | FR-06 |
| TC-SAV-014 | Transfer an amount above the source account's balance | 422; both balances are unchanged | API | P1 | FR-06 |
