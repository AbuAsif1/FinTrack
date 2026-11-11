# 23: Data Export & Backup

**What to build:** A one-action download of all the user's data as JSON, CSV exports for Transactions, income, a person's loan ledger and the monthly summary, and the export buttons on the screens that need them.

**Blocked by:** 11, 17, 19, 20

**Status:** ready-for-agent

**Test cases:** `test-cases/16-export.md` (`TC-EXP`) · `test-cases/19-security.md` (extend `TC-SEC-001` to `TC-SEC-004` for the new endpoints)

**Read first:** `rules.md` §1, §9 · `architecture.md` §Import and export (Export), §API (Export) · `design.md` §7.9 · `brd.md` §5 FR-12, FR-07, FR-08

- [ ] `GET /export/full`: one JSON file with `schema_version`, `exported_at` and every table's rows for the user; password hashes and tokens are left out; soft-deleted rows are included with their flag
- [ ] `GET /export/transactions.csv?from=&to=`, `GET /export/income.csv?fiscal_year=`, `GET /export/loan-persons/:id.csv`, `GET /export/monthly-summary.csv?from=&to=`
- [ ] `transactions.csv` and `income.csv` use the column names of the import templates, so an export can be re-imported
- [ ] CSV amounts through `toDecimalString`; dates as `YYYY-MM-DD`; UTF-8 with a byte-order mark so Excel reads Bangla text and ৳
- [ ] Export page per `design.md` §7.9
- [ ] Export CSV button on the History & Analytics page and on a Loan Person's detail panel
- [ ] Tests: the full export contains every seeded record and no secrets; an exported `transactions.csv` re-imported into an empty account reproduces the totals; another user's data never appears in any export

## Comments
