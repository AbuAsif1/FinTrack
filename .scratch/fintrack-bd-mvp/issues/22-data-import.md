# 22: Data Import (CSV)

**What to build:** Import of income, Transaction and loan history from CSV templates, with a preview that explains every invalid row, an all-or-nothing commit, and undo. This is how the user's spreadsheet history gets into the app.

**Blocked by:** 06, 07, 12

**Status:** ready-for-agent

**Test cases:** `test-cases/15-import.md` (`TC-IMP`) · `test-cases/19-security.md` (extend `TC-SEC-001` to `TC-SEC-004` for the new endpoints)

**Read first:** `rules.md` §1, §3, §5, §6 · `architecture.md` §Import and export, §Database schema (`import_batches`), §API (Import) · `design.md` §7.9 · `brd.md` §5 FR-11

- [ ] `GET /imports/templates/:dataset` for `INCOME`, `TRANSACTIONS` and `LOAN_ENTRIES`, with the columns in `architecture.md`
- [ ] `POST /imports/preview`: parses and validates every row (limits: 2 MB, 5,000 rows), stores a `PREVIEWED` batch, and returns row counts, totals, per-row errors and the rows already imported
- [ ] `POST /imports/:id/commit`: writes every row through the same services as manual entry, in one database transaction; a batch with any error is 422
- [ ] Each row's `idempotency_key` is derived as described in `architecture.md`, so importing the same file twice adds nothing
- [ ] `POST /imports/:id/undo` soft-deletes the batch's rows; `GET /imports` lists past imports
- [ ] Import page per `design.md` §7.9: three dataset cards, upload, preview with error rows first, Import button disabled while errors remain, history with Undo
- [ ] Tests: a valid file commits and the totals match; one bad row blocks the commit and nothing is written; re-importing adds nothing; undo removes the rows from every total; imported loan rows produce `AC-LOAN-1`; an amount of `1198.50` arrives as exactly 119850 Paisa; an unknown category or savings account is reported on its row

## Comments
