# p4-09: Statement Import with Column Mapping

**Status:** needs-triage
**Phase:** 4
**Moved from:** Phase 3 p3-10
**Spec ref:** Phase 4 — Deferred features

**What to build:** Import a bank or bKash statement CSV **as it comes** from the institution — no manual reformatting required. The user maps the institution's column headers to the app's fields once. After mapping, the import runs the same preview-and-commit flow as the existing template-based import (MVP ticket 22).

Additional capabilities on top of the MVP import:

- **Needs review queue** — uncategorised rows (where no rule matches) land in a queue for the user to categorise manually.
- **Categorisation rules** — "if the description contains X, assign category Y." Rules are saved and applied automatically on future imports.
- **Duplicate warning** — if an imported row matches an existing transaction on date + amount + description, the user is warned before committing.

**Why this exists:** The MVP import requires the user to reformat their bank CSV into a predefined template (specific column names and order). Real bank and bKash CSVs from BRAC Bank, Dutch-Bangla, Standard Chartered, and bKash have different and inconsistent column layouts. Forcing the user to reformat each time defeats the purpose of import. This ticket makes the import work from the raw CSV the bank provides, reducing the work of ingesting months of history from zero.

**Blocked by:** MVP ticket 22 (Data Import CSV) — the existing import infrastructure (preview, commit, undo, `import_batches`) must be in place.

---

## User flows

### First import from a new institution
1. User opens **Import → Statement Import**.
2. Uploads a CSV file (e.g. BRAC Bank statement).
3. The app reads the first row as headers and the first 5 data rows as preview.
4. A **column-mapping screen** appears with a table:
   - Left column: the CSV's headers (e.g. "Value Date", "Narration", "Debit Amount", "Credit Amount", "Balance")
   - Right column: a dropdown for each — the app's field (Date, Description, Amount, Credit amount, Debit amount, Ignore)
5. User maps: "Value Date → Date", "Narration → Description", "Debit Amount → Debit", "Credit Amount → Credit."
6. User clicks "Save mapping as 'BRAC Bank'" for future use.
7. The app parses the full file using the mapping.

### Reviewing parsed rows
8. A preview table shows all parsed rows. Rows with errors (unparseable date, missing required field) are highlighted in red and must be resolved before committing.
9. Rows without a matching category rule land in the "Needs review" section — the user assigns a category to each, or skips rows they do not want to import.
10. The duplicate-detection step flags any row that matches an existing transaction (same date ± 1 day, same amount, same description prefix). The user can keep or skip each flagged row.

### Committing the import
11. User reviews the summary: N rows to import, M rows with errors (blocked), K duplicates to decide.
12. Clicks "Import." All rows in one transaction; partial failures roll back.
13. The import batch is recorded in history with an Undo button.

### Re-using a saved mapping
1. User uploads another BRAC Bank CSV next month.
2. Import screen shows: "Saved mappings: BRAC Bank." User selects it.
3. Column mapping is pre-applied. User goes straight to the preview step.

### Managing categorisation rules
1. Settings → Import Rules shows all saved rules: "Description contains 'Meena Bazar' → Category: Groceries."
2. User can add, edit or delete rules.
3. Rules are applied in order; first match wins.

### Needs review queue
1. After import, a "Needs review" badge appears on the Import nav item if any rows were imported without a category.
2. User opens the queue, sees rows with their descriptions, and assigns a category to each. The transaction is updated.
3. Optionally, the user creates a rule from the queue: "Always categorise 'MEENA BAZAR' as Groceries." This clears future imports automatically.

---

## Scenarios

**Scenario A — first bKash statement import:** A user exports their bKash statement. The columns are "Date", "Transaction Type", "Amount", "Reference". They map these to the app's fields, and bKash debits become Spending transactions while credits become Income. They create two rules: "Transaction Type = Cash Out → Withdrawal" and "Transaction Type = Mobile Recharge → Mobile & Internet."

**Scenario B — importing 12 months of history:** A user is new to the app and imports 12 months of BRAC Bank statements one month at a time. The saved mapping applies instantly from the second file. The duplicate-detection catches the overlap when two files share the same week.

**Scenario C — many uncategorised rows:** 40% of imported rows have no matching rule. They land in the Needs review queue. The user works through them over two sessions, creating rules as they go. By the third import, most rows are auto-categorised.

**Scenario D — balance column present:** Some bank CSVs include a running balance. The app ignores the balance column (it is not imported) but could use it in a future balance-reconciliation feature.

---

## Impact areas

- New DB table: `import_mappings` (user_id, name, source_format, column_map JSONB) — saves the mapping by institution name
- New DB table: `categorisation_rules` (user_id, field, operator, value, category_id, priority)
- New DB table or status on `import_batches`: `needs_review_count`, rows with `status = NEEDS_REVIEW`
- Import API (`/imports/preview`, `/imports/:id/commit`) must be extended to accept a `mapping_id` and apply rules
- Duplicate detection logic: query existing transactions for each imported row; a match threshold must be defined precisely
- Import page UI (MVP ticket 22's page) is significantly extended: mapping step, rules management, needs-review queue
- Builds on the MVP template-based import — the existing preview/commit/undo flow is reused, not replaced
- Must handle CSV encoding issues common with Bangladeshi bank exports (UTF-8, CP1252, BOM)

---

## Decisions needed before build

- Should the duplicate threshold be: exact match (date + amount + description) or fuzzy (date ± 1 day, amount exact, description ≥ 80% similarity)? Fuzzy matching is safer but more complex. Recommend exact for initial implementation.
- Should rules apply retroactively to already-imported uncategorised rows, or only to future imports? (Recommend: rules apply when a user processes them from the Needs review queue — a "Re-apply rules to uncategorised" button.)
- Maximum file size and row count for a statement import: same as MVP (2 MB, 5,000 rows) or higher? (Bank statements can be large; consider 5 MB, 10,000 rows for this feature.)
- Should saved mappings be shareable (e.g. a community "BRAC Bank mapping") or strictly per-user? (Per-user for now; a shared library is a future idea.)

## Comments

<!-- Append discussion below this line -->
