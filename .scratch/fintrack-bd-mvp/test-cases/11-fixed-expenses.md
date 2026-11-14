# Test cases: Fixed Expenses

Ticket 08. Read `README.md` in this folder first. "Today" is set by the test clock.

## Suite classification

| Suite | Included case IDs |
|-------|------------------|
| **Smoke** | TC-FIX-004 |
| **Happy Path** | Smoke + TC-FIX-001, TC-FIX-002, TC-FIX-003, TC-FIX-005, TC-FIX-006, TC-FIX-007, TC-FIX-009, TC-FIX-010, TC-FIX-011, TC-FIX-012, TC-FIX-013, TC-FIX-014, TC-FIX-015, TC-FIX-016, TC-FIX-017, TC-FIX-018 |
| **Full Regression** | All cases above plus TC-FIX-008 |

> **Smoke** proves the generated-on-read instances exist for the current month. **Happy Path** covers every P1 template, instance and payment case including DPS linkage and due-status rules. **Full Regression** adds the P2 future-month placeholder case.

---

| ID | Test case | Expected | Seam | P | Covers |
|---|---|---|---|---|---|
| TC-FIX-001 | Create a template with name, standard amount, due day and category | Saved and listed | API | P1 | FR-05 |
| TC-FIX-002 | Create a DPS template with no savings account | 422 | API | P1 | FR-05 |
| TC-FIX-003 | Total of `SUGGESTED_FIXED_EXPENSES` | ৳60,732.00 across seven items | Unit | P1 | AC-FIXED-1 |
| TC-FIX-004 | View the current month with three active templates | Three Pending instances, one per template | API | P1 | FR-05 |
| TC-FIX-005 | View the same month again | Still three instances | API | P1 | ADR-0009 |
| TC-FIX-006 | Due day 31 in a 30-day month, and in February | Due on the 30th; due on the month's last day | API | P1 | FR-05 |
| TC-FIX-007 | Add a template on the 20th with due day 15, and one with due day 25 | The first starts next month; the second has an instance this month | API | P1 | FR-05 |
| TC-FIX-008 | View a future month | Placeholders with status future; marking one Paid is refused | API | P2 | architecture §Generated on read |
| TC-FIX-009 | Mark an instance Paid with an actual amount different from the standard | The instance is Paid with that amount and date, and a Transaction of that amount exists | API | P1 | FR-05, GAP-02 |
| TC-FIX-010 | Mark the same instance Paid again | 409 returning the existing Transaction; no second Transaction | API | P1 | rules §6 |
| TC-FIX-011 | Mark a DPS instance Paid | The linked savings balance rises; Total Spending does not | API | P1 | FR-05 |
| TC-FIX-012 | Skip an instance with a note, then reopen it | Skipped with the note; then Pending | API | P1 | FR-05 |
| TC-FIX-013 | Delete the Transaction that paid an instance | The instance is Pending again | API | P1 | FR-04 |
| TC-FIX-014 | Change a template's standard amount when this month is Pending | This month's instance shows the new amount | API | P1 | FR-05 |
| TC-FIX-015 | Change a template's standard amount when this month is Paid | This month's and earlier instances keep their amounts | API | P1 | GAP-19 |
| TC-FIX-016 | Deactivate a template, then view next month | This month's instance remains; next month has none | API | P1 | FR-05 |
| TC-FIX-017 | Instances due in 4 days, in 3 days, today, and yesterday, all Pending | Pending, due soon, due soon, overdue | API | P1 | FR-05 |
| TC-FIX-018 | A month with one Paid (actual ৳9,500), one Pending (standard ৳10,000) and one Skipped instance | Fixed Commitments ৳19,500.00 | API | P1 | architecture §Derived values |
