# Test cases: Data import

Ticket 22. Read `README.md` in this folder first.

## Suite classification

| Suite | Included case IDs |
|-------|------------------|
| **Smoke** | TC-IMP-018 |
| **Happy Path** | Smoke + TC-IMP-002, TC-IMP-003, TC-IMP-005, TC-IMP-006, TC-IMP-007, TC-IMP-009, TC-IMP-010, TC-IMP-011, TC-IMP-012, TC-IMP-015, TC-IMP-017, TC-IMP-019 |
| **Full Regression** | All cases above plus TC-IMP-001, TC-IMP-004, TC-IMP-008, TC-IMP-013, TC-IMP-014, TC-IMP-016 |

> **Smoke** runs the full E2E import journey (upload → preview → commit → see in list). **Happy Path** covers every P1 validation, commit, undo and idempotency case. **Full Regression** adds P2/P3 template download, locked-year error, duplicate rows, file-size limits and history list.

---

| ID | Test case | Expected | Seam | P | Covers |
|---|---|---|---|---|---|
| TC-IMP-001 | Download the template for each dataset | A CSV with the columns in `architecture.md` and one example row | API | P2 | FR-11 |
| TC-IMP-002 | Preview a valid Transactions file | Row count and total are reported; nothing is saved yet | API | P1 | FR-11 |
| TC-IMP-003 | Preview a file with a bad date, an unknown category, an unknown savings account and a malformed amount | Each bad row is listed with its reason | API | P1 | FR-11 |
| TC-IMP-004 | Preview an income file where TDS exceeds gross | That row is listed with its reason | API | P2 | FR-03 |
| TC-IMP-005 | Commit a valid preview | Every row exists; totals match the preview | API | P1 | FR-11 |
| TC-IMP-006 | Commit a preview that has an error | 422; nothing is saved | API | P1 | FR-11 |
| TC-IMP-007 | Import the same file a second time | Nothing is added; the rows are reported as already imported | API | P1 | FR-11 |
| TC-IMP-008 | A file with two identical rows | Both are imported | API | P2 | architecture §Import and export |
| TC-IMP-009 | Undo an import | Its rows leave every list and total; the import shows as undone | API | P1 | FR-11 |
| TC-IMP-010 | Import the `AC-LOAN-1` loan history | The `AC-LOAN-1` balances; unknown people are created | API | P1 | AC-LOAN-1 |
| TC-IMP-011 | A row with amount `1198.50` | Stored as exactly ৳1,198.50 | API | P1 | rules §1 |
| TC-IMP-012 | A DPS row in a Transactions file | The named savings account's balance rises | API | P1 | FR-11 |
| TC-IMP-013 | An income row for a locked Fiscal Year | Listed as an error in the preview | API | P2 | FR-TAX-01 |
| TC-IMP-014 | A file over 2 MB, and one over 5,000 rows | Rejected with a clear message | API | P2 | architecture §Import and export |
| TC-IMP-015 | A failure part-way through a commit | Nothing from the file is saved | API | P1 | rules §5 |
| TC-IMP-016 | List past imports | Date, file name, row count and status for each | API | P3 | FR-11 |
| TC-IMP-017 | Upload a file with errors on the Import page | Error rows come first with reasons; the Import button is disabled | UI | P1 | design §7.9 |
| TC-IMP-018 | Upload a CSV, review the preview and confirm | The imported Transactions appear in the Transactions list | E2E | P1 | FR-11 |
| TC-IMP-019 | Upload a CSV with 10 valid rows and 2 error rows; fix the 2 errors and re-upload | The 10 original rows are reported as already imported and skipped; the 2 fixed rows are added; total row count in the app is 12 | API | P1 | FR-11 |
