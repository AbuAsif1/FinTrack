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

## Why

The owner's financial data must never be locked inside the app. Export gives the user a full copy of their data in open formats (JSON for a machine-readable backup, CSV for spreadsheet use), so they can audit the numbers in Excel, file taxes with help from an accountant, or move to a different tool later. The full JSON export is also the disaster-recovery artefact: if the server is lost, a user with a recent export can restore their history (Phase 3 ticket p3-13). For Bangladesh tax filing, a CSV of all income entries for a fiscal year is exactly what an accountant or the user needs to prepare the IT return.

---

## User flows

### Downloading a full backup
1. User opens **Settings → Export**.
2. The page shows available export types: Full backup (JSON), Transactions (CSV), Income (CSV), Loan ledger for a person (CSV), Monthly summary (CSV).
3. User clicks **Download full backup**.
4. The browser downloads a `.json` file named `fintrack-export-YYYY-MM-DD.json`.
5. The file contains all tables (transactions, income entries, loan persons, loan entries, savings accounts, fixed expenses, tax years, etc.) with no password hashes or tokens.

### Exporting income for tax filing
1. User clicks **Income (CSV)** and selects fiscal year FY 2025–26.
2. The browser downloads `income-fy2025-26.csv` with column headers matching the import template.
3. The user opens it in Excel and shares it with their accountant.

### Exporting a person's loan ledger
1. User navigates to **Loans → Karim Bhai**.
2. An **Export** button is visible in the loan person header.
3. User clicks it. The browser downloads `loan-karim-bhai.csv` with all entries, running balances, and the final outstanding amount.
4. The user shares it with Karim Bhai as a statement.

### Exporting transactions for a date range
1. User opens **History & Analytics**.
2. An **Export CSV** button appears at the top.
3. User clicks it. The app exports all transactions matching the current view's date filter.
4. The browser downloads `transactions-2026-01-01-to-2026-10-31.csv`.

---

## Scenarios

**Scenario A — before switching devices:** The owner is moving from a self-hosted instance to a cloud instance. They download the full JSON export, create a new account on the new instance, and use the restore flow (p3-13) to populate all their data.

**Scenario B — accountant review:** It is September (tax filing season). The user exports Income CSV for FY 2025–26 and sends it to their CA. The CA uses the gross, TDS, and taxable columns to verify the app's tax calculation against the NBR return.

**Scenario C — monthly reconciliation in Excel:** The user exports the monthly summary CSV for the past 6 months. They open it in Excel and compare the app's totals against their bank statements to check for missing entries.

**Scenario D — loan statement dispute:** A friend claims the user repaid ৳20,000 more than the app shows. The user exports the loan ledger for that person and shares the CSV. Each entry has a date and amount; the two parties can reconcile entry by entry.

---

## Context notes

- Amounts in CSV exports use `toDecimalString` (e.g. `৳3,200.00`), not raw paisa integers — the file is human-readable and matches the import template format.
- Dates are always `YYYY-MM-DD` in exports, regardless of display locale.
- UTF-8 with BOM (`﻿`) is prepended to CSV files so Excel on Windows opens them correctly without a character-encoding wizard.
- The full JSON export's `schema_version` field must be incremented whenever the export format changes (Phase 3 p3-13 restore depends on this being stable and versioned).
- Password hashes, refresh tokens, and password-reset tokens are explicitly excluded from the JSON export.
- Ticket 11 (Dashboard Aggregates API) and tickets 17–20 (various UI pages) must be done first because the monthly summary and in-app export buttons depend on those pages existing.

## Comments
