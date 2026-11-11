# Test cases: Tax API and Tax Year Settings

Ticket 09. Read `README.md` in this folder first.

| ID | Test case | Expected | Seam | P | Covers |
|---|---|---|---|---|---|
| TC-TAX-001 | Summary for FY2025-26 with Income Entries, DPS deposits of ৳8,00,000, a Sanchaypatra purchase of ৳1,00,000 and others of ৳1,90,000 | The `AC-TAX-1` figures | API | P1 | AC-TAX-1 |
| TC-TAX-002 | Summary for a year whose settings are unconfirmed | `is_provisional` is true | API | P1 | FR-TAX-01 |
| TC-TAX-003 | Confirm the year's settings | `is_provisional` is false | API | P1 | FR-TAX-08 |
| TC-TAX-004 | Save a changed slab rate | The summary changes accordingly and the year is provisional again | API | P1 | FR-TAX-08 |
| TC-TAX-005 | Save settings with no remainder slab | 422; the old settings stay | API | P1 | FR-TAX-08 |
| TC-TAX-006 | List tax years; get one | The three seeded years; that year's full settings | API | P2 | FR-TAX-08 |
| TC-TAX-007 | Forecast with three months of Salary entered | Projected full-year figures, marked as a projection | API | P1 | FR-TAX-05 |
| TC-TAX-008 | Compare Years for FY2025-26 with Gross Income ৳20,06,846 | This year's settings: Gross Tax ৳1,76,369.20; last year's settings: ৳1,61,369.20; plus last year's own result | API | P1 | FR-TAX-06, AC-TAX-4 |
| TC-TAX-009 | Mark the return filed on 2026-09-15 | The `AC-TAX-6` figures; the year is locked | API | P1 | AC-TAX-6 |
| TC-TAX-010 | Change settings, investments or an Income Entry of a locked year | 409 `TAX_YEAR_LOCKED` each time | API | P1 | FR-TAX-01 |
| TC-TAX-011 | Summary of a filed year | The figures saved at filing | API | P1 | FR-TAX-01 |
| TC-TAX-012 | Reopen a filed year, then add an Income Entry | Accepted; the summary reflects it | API | P1 | FR-TAX-01 |
| TC-TAX-013 | Save stocks, insurance and others for a year | Returned as saved and used in the rebate | API | P1 | FR-TAX-04 |
| TC-TAX-014 | Try to save a DPS or Sanchaypatra amount directly | Not accepted; those totals come only from deposits | API | P1 | FR-TAX-04 |
| TC-TAX-015 | A Tax Payment dated September 2026 assigned to FY2025-26 | Counted in FY2025-26's Tax Paid and not in FY2026-27's | API | P1 | FR-04 |
| TC-TAX-016 | A deleted Income Entry | Left out of the summary | API | P1 | rules §3 |
| TC-TAX-017 | Summary for a Fiscal Year that has no settings yet | The year is created as a provisional copy of the latest earlier year | API | P1 | ADR-0009 |
| TC-TAX-018 | Summary response time with a full year of data | Under 300 ms, warm | Check | P2 | architecture §Performance targets |
