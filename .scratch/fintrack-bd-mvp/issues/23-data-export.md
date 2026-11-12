# 23: Data Export & Backup

**What to build:** A one-action download of all the user's data as JSON, CSV exports for Transactions, income, a person's loan ledger and the monthly summary, and the export buttons on the screens that need them.

**Blocked by:** 11, 17, 19, 20

**Status:** done

**Test cases:** `test-cases/16-export.md` (`TC-EXP`) · `test-cases/19-security.md` (extend `TC-SEC-001` to `TC-SEC-004` for the new endpoints)

**Read first:** `rules.md` §1, §9 · `architecture.md` §Import and export (Export), §API (Export) · `design.md` §7.9 · `brd.md` §5 FR-12, FR-07, FR-08

- [x] `GET /export/full`: one JSON file with `schema_version`, `exported_at` and every table's rows for the user; password hashes and tokens are left out
- [x] `GET /export/transactions?from=&to=`, `GET /export/income?fiscal_year=`, `GET /export/loan-persons/:id`, `GET /export/monthly-summary?from=&to=`
- [x] `transactions` and `income` exports use the column names of the import templates
- [x] CSV amounts through `toDecimalString`; dates as `YYYY-MM-DD`; UTF-8 with BOM (via `﻿` in lib/csv.ts)
- [x] Export page at settings/export with per-export options
- [x] Export CSV button on the History & Analytics page
- [x] Tests: TC-EXP-001, TC-EXP-003, TC-EXP-004, TC-EXP-005, TC-EXP-006, TC-EXP-009

## Comments
