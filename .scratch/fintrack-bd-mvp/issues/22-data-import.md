# 22: Data Import (CSV)

**What to build:** Import of income, Transaction and loan history from CSV templates, with a preview that explains every invalid row, an all-or-nothing commit, and undo. This is how the user's spreadsheet history gets into the app.

**Blocked by:** 06, 07, 12

**Status:** done

**Test cases:** `test-cases/15-import.md` (`TC-IMP`) · `test-cases/19-security.md` (extend `TC-SEC-001` to `TC-SEC-004` for the new endpoints)

**Read first:** `rules.md` §1, §3, §5, §6 · `architecture.md` §Import and export, §Database schema (`import_batches`), §API (Import) · `design.md` §7.9 · `brd.md` §5 FR-11

- [x] `GET /imports/templates/:dataset` for `INCOME`, `TRANSACTIONS` and `LOAN_ENTRIES`, with the columns in `architecture.md`
- [x] `POST /imports/preview`: parses and validates every row (limits: 2 MB, 5,000 rows), stores a `PREVIEWED` batch, and returns row counts, totals, per-row errors and the rows already imported
- [x] `POST /imports/:id/commit`: writes every row through the same services as manual entry, in one database transaction; a batch with any error is 422
- [x] Each row's `idempotency_key` is derived as SHA-256 of (userId:dataset:canonical_row:occurrence), so importing the same file twice adds nothing
- [x] `POST /imports/:id/undo` soft-deletes the batch's rows; `GET /imports` lists past imports
- [x] Import page per `design.md` §7.9: three dataset cards, upload, preview with error rows first, Import button disabled while errors remain, history with Undo
- [x] Tests: TC-IMP-001 to TC-IMP-009, TC-IMP-011, TC-IMP-014, TC-IMP-016

## Why

The owner has years of personal finance history in spreadsheets — salary records, expense logs, loan ledgers. Without an import path, the app starts with a blank slate and loses its value as a longitudinal view of the owner's money. Import is the on-ramp: it converts a years-long spreadsheet into the same data model as manually entered records, so analytics and tax calculations work from day one. The all-or-nothing commit and row-level error previews mean the user can trust the import: they see exactly what will be loaded before anything is written, and a single bad row does not corrupt the whole batch.

---

## User flows

### First-time history import
1. User opens **Settings → Import** (or the Import page from the sidebar).
2. Three dataset cards are shown: Transactions, Income, Loan entries.
3. User downloads the CSV template for Transactions.
4. User fills the template with their spreadsheet data (or pastes existing columns into the template layout).
5. User uploads the filled CSV via the upload area.
6. The app parses the file and shows a preview: total rows, valid rows, error rows (shown first with the error reason beside each row).
7. If there are errors, the Import button remains disabled. User downloads the error list, fixes the CSV, and re-uploads.
8. When all rows are valid, user clicks **Import**. The app commits all rows in one transaction.
9. A success banner shows the count of records added. User is returned to the Import page.

### Re-importing after correction
1. User corrects the CSV (fixes the invalid rows).
2. Re-uploads the same file. Because each row's idempotency key is derived from its content, unchanged rows are recognised as duplicates and skipped — only the previously-errored rows are written.
3. The preview shows "already imported" rows in a separate count.

### Undoing an import
1. User opens **Settings → Import → History**.
2. Each past import is listed with dataset, date, record count, and an Undo button.
3. User clicks Undo on the most recent import.
4. A confirmation modal warns that records added by this import will be soft-deleted.
5. User confirms. The batch's rows are soft-deleted. The user's balances and totals update immediately.

---

## Scenarios

**Scenario A — first use, years of salary history:** The owner's spreadsheet has 36 months of salary entries. They fill the Income CSV template with 36 rows. The preview shows all 36 valid. After importing, the Tax Dashboard immediately shows 3 years of income history and accurate tax calculations.

**Scenario B — transaction import with bad rows:** 200 transaction rows are uploaded. 3 rows have an unrecognised category name and 1 has a date outside the allowed range. The preview shows 4 error rows at the top. The user fixes the CSV and re-uploads; the previously-failing rows are now included and the previously-valid rows are shown as duplicates (skipped). Net result: all 200 rows are in the app.

**Scenario C — importing the same file twice:** The user imports a 50-row Income CSV, then accidentally uploads the same file again. The second preview shows "50 rows already imported, 0 new." The Import button is still active but clicking it writes nothing. No duplicates are created.

**Scenario D — loan import with a new person:** The user imports a Loan Entries CSV that includes a lender named "Karim Bhai" who does not yet exist as a Loan Person. The import creates the person automatically, then creates the loan entry linked to them. After import, Karim Bhai appears in the Loans page with the imported ledger.

---

## Context notes

- Idempotency keys are derived as SHA-256 of `userId:dataset:canonical_row:occurrence` — importing the same file multiple times is always safe.
- The 2 MB / 5,000-row limits apply per upload request; the user can split a larger history into multiple batches.
- Import uses the same service layer (CategoryRoutingService, etc.) as manual entry, so all validation, derived totals, and routing side-effects apply — an import cannot create records that manual entry would reject.
- Undo is a soft delete; it does not delete the `import_batches` row. The import stays in history with a "Undone" status so the user knows it happened.
- Ticket 06 (CategoryRoutingService) must be done first, since every Transaction row is routed through it on commit.
- Phase 2 ticket p3-10 (Statement import with column mapping) would extend this to support arbitrary bank statement formats without requiring the owner's template layout.

## Comments
