# Test cases: Data export

Ticket 23. Read `README.md` in this folder first.

| ID | Test case | Expected | Seam | P | Covers |
|---|---|---|---|---|---|
| TC-EXP-001 | Full export for a user with data in every area | One JSON file with `schema_version`, `exported_at` and every record the user owns | API | P1 | FR-12 |
| TC-EXP-002 | Deleted Transactions and Income Entries in the full export | Present, flagged as deleted | API | P2 | FR-12 |
| TC-EXP-003 | Password hashes and tokens in the full export | Absent | API | P1 | rules §9 |
| TC-EXP-004 | Full export when a second user has data | None of the second user's data appears | API | P1 | rules §9 |
| TC-EXP-005 | Transactions CSV for a date range | Only Transactions in the range, with the import template's columns | API | P1 | FR-12 |
| TC-EXP-006 | Income CSV for a Fiscal Year | Only that year's entries, with the import template's columns | API | P1 | FR-12 |
| TC-EXP-007 | A Loan Person's CSV | Every entry with date, direction, amount, reason and Running Balance | API | P1 | FR-07 |
| TC-EXP-008 | Monthly summary CSV for a period | One row per month with the monthly summary figures | API | P2 | FR-08 |
| TC-EXP-009 | Amount and date cells in any CSV | Amounts like `1198.50` with no grouping; dates as `YYYY-MM-DD` | API | P1 | rules §1 |
| TC-EXP-010 | A CSV containing Bangla text opened as bytes | UTF-8 with a byte-order mark | API | P2 | ticket 23 |
| TC-EXP-011 | Export Transactions as CSV, then import that file into an empty account | The same Transaction count and totals | API | P1 | FR-12 |
| TC-EXP-012 | Export buttons on the History page and on a Loan Person's panel | Each downloads the matching CSV | UI | P2 | FR-07, FR-08 |
