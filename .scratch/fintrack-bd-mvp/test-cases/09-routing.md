# Test cases: Category routing

Ticket 06. Read `README.md` in this folder first. All cases go through `/transactions`.

| ID | Test case | Expected | Seam | P | Covers |
|---|---|---|---|---|---|
| TC-ROUTE-001 | Create in "DPS / Savings" with no savings account | 422; nothing is written | API | P1 | rules §5 |
| TC-ROUTE-002 | Create a deposit into a savings account | The account balance rises by the amount | API | P1 | FR-04 |
| TC-ROUTE-003 | Total Spending and the category budget after a deposit | Neither changes | API | P1 | ADR-0006 |
| TC-ROUTE-004 | Create a Savings Withdrawal within the balance | The balance falls by the amount | API | P1 | FR-04 |
| TC-ROUTE-005 | Create a Savings Withdrawal above the balance | 422; the balance is unchanged | API | P1 | FR-06 |
| TC-ROUTE-006 | Create a Savings Interest entry | The balance rises by the amount | API | P1 | FR-04 |
| TC-ROUTE-007 | Deposit, interest and withdrawal reproducing `AC-SAV-1` | Balance ৳66,250.00 | API | P1 | AC-SAV-1 |
| TC-ROUTE-008 | A deposit dated before the account's opening date | 422 | API | P1 | FR-06 |
| TC-ROUTE-009 | A deposit into a closed account | 422 | API | P2 | FR-06 |
| TC-ROUTE-010 | A deposit naming another user's savings account | Rejected; that account is unchanged | API | P1 | rules §9 |
| TC-ROUTE-011 | "Loan Given" with an existing person id | Same ledger entry and balance as adding it from the Loans endpoint | API | P1 | FR-07 |
| TC-ROUTE-012 | "Loan Given" with a new person name | The person is created with the entry | API | P1 | FR-07 |
| TC-ROUTE-013 | "Loan Given" with a name that matches an existing person in different case | The entry goes to the existing person; no new person | API | P2 | FR-07 |
| TC-ROUTE-014 | A loan category with no person | 422; nothing is written | API | P1 | rules §5 |
| TC-ROUTE-015 | "Tax Payment" with no Fiscal Year given | It is assigned to the Fiscal Year of its date | API | P1 | FR-04 |
| TC-ROUTE-016 | "Tax Payment" dated September, assigned to the previous Fiscal Year | Accepted | API | P1 | FR-04 |
| TC-ROUTE-017 | "Tax Payment" assigned to a future Fiscal Year, or one two years back | 422 | API | P2 | architecture §Category routing |
| TC-ROUTE-018 | Change a deposit's amount | The account balance follows | API | P1 | ADR-0005 |
| TC-ROUTE-019 | Move a loan Transaction to another person | Both people's Running Balances update | API | P2 | architecture §Category routing |
| TC-ROUTE-020 | Delete a deposit; delete a loan Transaction | The balance falls; the entry leaves the person's ledger | API | P1 | rules §3 |
| TC-ROUTE-021 | A failure part-way through creating a loan with a new person | No person, Transaction or entry exists afterwards | API | P1 | rules §5 |
| TC-ROUTE-022 | The response to creating a deposit, a loan and a Tax Payment | Each carries a `routing` summary: account and new balance; person and new Running Balance; Fiscal Year | API | P2 | ticket 06 |
| TC-ROUTE-023 | Deposits into a DPS, a Sanchaypatra and an ordinary Savings account in one Fiscal Year | The DPS total counts the first, the Sanchaypatra total counts the second, the third counts in neither | API | P1 | ADR-0006 |
