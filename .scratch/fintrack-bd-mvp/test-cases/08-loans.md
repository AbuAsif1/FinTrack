# Test cases: Borrow-Loan ledger

Ticket 05. Read `README.md` in this folder first.

## Suite classification

| Suite | Included case IDs |
|-------|------------------|
| **Smoke** | TC-LOAN-002 |
| **Happy Path** | Smoke + TC-LOAN-001, TC-LOAN-003, TC-LOAN-004, TC-LOAN-005, TC-LOAN-006, TC-LOAN-007, TC-LOAN-008, TC-LOAN-009, TC-LOAN-010, TC-LOAN-012, TC-LOAN-013 |
| **Full Regression** | All cases above plus TC-LOAN-011, TC-LOAN-014 |

> **Smoke** proves a Loan Given entry can be created and appears in the ledger. **Happy Path** covers every P1 person, entry and settle-up case plus the `AC-LOAN-1` fixture. **Full Regression** adds P2 zero-balance settle-up and optional-date cases.

---

| ID | Test case | Expected | Seam | P | Covers |
|---|---|---|---|---|---|
| TC-LOAN-001 | Create a Loan Person; create another whose name differs only by case | Saved; then 422 | API | P1 | FR-07 |
| TC-LOAN-002 | Add a Given entry | The entry appears in the person's ledger and as a Loan Given Transaction | API | P1 | FR-07 |
| TC-LOAN-003 | Add a Received entry | The entry appears in the ledger and as a Loan Received Transaction | API | P1 | FR-07 |
| TC-LOAN-004 | Seed the `AC-LOAN-1` entries | Mithun +৳9,841.00, Amait +৳1,198.50, Sohel −৳3,145.42, Anapo and Babu bhai ৳0.00 | API | P1 | AC-LOAN-1 |
| TC-LOAN-005 | Loan summary for `AC-LOAN-1` | Owed to me ৳11,039.50; I owe ৳3,145.42; net +৳7,894.08 | API | P1 | AC-LOAN-1 |
| TC-LOAN-006 | A person's history with three entries | Each row carries the Running Balance after it, in date order | API | P1 | FR-07 |
| TC-LOAN-007 | Change an entry's amount | The Running Balance follows | API | P1 | FR-07 |
| TC-LOAN-008 | Delete an entry | It leaves the ledger and the Transaction list; the balance recalculates | API | P1 | rules §3 |
| TC-LOAN-009 | Settle Up when the person owes ৳9,841 | One Received entry of ৳9,841 flagged as a settlement; balance ৳0.00 | API | P1 | FR-07 |
| TC-LOAN-010 | Settle Up when the user owes ৳3,145.42 | One Given entry of ৳3,145.42; balance ৳0.00 | API | P1 | FR-07 |
| TC-LOAN-011 | Settle Up at a zero balance | 409; nothing is created | API | P2 | FR-07 |
| TC-LOAN-012 | Add an entry twice with the same `idempotency_key` | 409 `DUPLICATE` with the first entry; one entry exists | API | P1 | rules §6 |
| TC-LOAN-013 | Writing the Loan Entry fails after the Transaction is prepared | Neither exists afterwards | API | P1 | rules §5 |
| TC-LOAN-014 | Add an entry with and without a return due date | Both are saved; the date is returned when given | API | P2 | FR-07 |
