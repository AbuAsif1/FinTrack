# Test cases: Income and Holiday Support

Ticket 07. Read `README.md` in this folder first.

## Suite classification

| Suite | Included case IDs |
|-------|------------------|
| **Smoke** | TC-INC-001 |
| **Happy Path** | Smoke + TC-INC-002, TC-INC-003, TC-INC-004, TC-INC-007, TC-INC-008, TC-INC-009, TC-INC-010, TC-INC-011, TC-INC-012, TC-INC-015, TC-INC-016, TC-INC-018 |
| **Full Regression** | All cases above plus TC-INC-005, TC-INC-006, TC-INC-013, TC-INC-014, TC-INC-017, TC-INC-019, TC-INC-020 |

> **Smoke** proves a Salary entry can be created with correct In-Hand Income calculation. **Happy Path** covers every P1 income type, fiscal year boundary, locked year and idempotency case. **Full Regression** adds P2 taxable-flag, Cheer, timeline, pre-fill and Holiday Support rate cases, plus the new bank account field case.

---

| ID | Test case | Expected | Seam | P | Covers |
|---|---|---|---|---|---|
| TC-INC-001 | Create a Salary entry with gross ৳1,53,383 and TDS ৳12,000 | Saved; In-Hand Income ৳1,41,383.00 | API | P1 | FR-03 |
| TC-INC-002 | TDS greater than gross, and negative TDS | 422 each time | API | P1 | FR-03 |
| TC-INC-003 | Entries for June 2026 and July 2026 | Fiscal Years `2025-26` and `2026-27` | API | P1 | FR-TAX-01 |
| TC-INC-004 | Create each income type without a taxable flag | Certification Reimbursement is not taxable; every other type is taxable | API | P1 | FR-03 |
| TC-INC-005 | Create a Salary entry flagged not taxable | The flag is kept | API | P2 | FR-03 |
| TC-INC-006 | Create a Cheer entry with payer and period earned | Both are returned | API | P2 | FR-03 |
| TC-INC-007 | Salary and Profit Share in the same month | Both are saved; the month's In-Hand Income is their sum | API | P1 | FR-03 |
| TC-INC-008 | List by Fiscal Year, and by month | Only that year's entries; only that month's entries | API | P1 | FR-03 |
| TC-INC-009 | Update an entry; delete an entry | The change is saved; the deleted entry leaves lists and totals | API | P1 | rules §3 |
| TC-INC-010 | Create, update or delete an entry in a locked Fiscal Year | 409 `TAX_YEAR_LOCKED` each time | API | P1 | FR-TAX-01 |
| TC-INC-011 | Summary for a Fiscal Year with entries in seven months | Twelve rows from July to June, seven Entered and five Pending, with per-type amounts and year totals | API | P1 | FR-03 |
| TC-INC-012 | Summary for the `AC-TAX-2` salaries | Salary total ৳15,64,449.00 | API | P1 | AC-TAX-2 |
| TC-INC-013 | Salary history for the `AC-TAX-2` salaries | Two steps: ৳1,22,700 from July 2025 and ৳1,53,383 from April 2026 | API | P2 | FR-03 |
| TC-INC-014 | Summary's pre-fill value after several Salary entries | The most recent Salary entry | API | P2 | FR-03 |
| TC-INC-015 | Create twice with the same `idempotency_key` | 409 `DUPLICATE` with the first entry | API | P1 | rules §6 |
| TC-INC-016 | Holiday Support entry of 2 days at ৳3,200 | Amount ৳6,400.00 | API | P1 | FR-03 |
| TC-INC-017 | A new Holiday Support entry of the same rate type | The rate is pre-filled from the latest entry of that type | API | P2 | FR-03 |
| TC-INC-018 | Add a later entry at a higher rate | Earlier entries keep their rate and amount | API | P1 | GAP-08 |
| TC-INC-019 | The month's Holiday Support total | The sum of that month's log entries | API | P2 | FR-03 |
| TC-INC-020 | Create a Salary entry with a bank account name | The bank account name is saved and returned in the entry | API | P2 | FR-03 |
