# p2-15: Direct .xlsx Import

**Status:** ready-for-human
**Phase:** 2
**Spec ref:** Phase 2 §15

---

## What to build

Read the owner's existing Excel spreadsheets directly — without first converting to CSV. Each sheet within the workbook may have a different layout (one sheet per month, or separate sheets for income and expenses). Each layout needs its own mapping, saved the same way as the CSV column mapping in p2-13.

---

## Why

The owner has years of financial history in Excel spreadsheets. The existing import (and even the improved p2-13 CSV import) requires the user to save each sheet as a separate CSV first. For a user with 24 sheets across 2 years, that is 24 export operations before a single import. Supporting `.xlsx` directly removes the conversion step and respects the actual format the data lives in.

---

## User flows

### First .xlsx import
1. User opens **Import → Spreadsheet Import** (or the existing import page with an added "Excel file" option).
2. Uploads an `.xlsx` file.
3. The app reads the workbook and lists available sheets: "Sheet 1: Jan 2024, Sheet 2: Feb 2024, …"
4. User selects which sheets to import (all, or a selection).
5. For each distinct layout detected, the column-mapping screen (from p2-13) appears. User maps once per layout.
6. User saves the mapping as "My expense tracker" for future use.
7. The app parses all selected sheets and merges the rows into a single import batch.
8. Preview, commit and undo flow is identical to the CSV import.

### Re-using a saved mapping for a new workbook
1. User uploads next year's workbook.
2. Import screen: "Saved mapping: My expense tracker — apply?" User confirms.
3. If the new workbook's columns match the saved mapping, the user goes straight to preview. If not, the mapping screen reopens with the differences highlighted.

### Mixed-layout workbooks
1. Some workbooks have different layouts for income sheets vs. expense sheets.
2. The app allows mapping different sheets to different saved mappings within a single import session.

---

## Scenarios

**Scenario A — first-time historical import:** The owner has a workbook with one sheet per month for the last 3 years (36 sheets, identical layout). They select all sheets, map the columns once, save the mapping, and import. All 3 years of history lands in one commit.

**Scenario B — dual-sheet workbook:** The workbook has an "Expenses" sheet and an "Income" sheet with different column layouts. The user maps each sheet separately (two mappings). Both are imported in one operation.

**Scenario C — empty or irrelevant sheets:** The workbook has a "Summary" sheet with totals (no transaction rows). The app detects no data rows and skips it, or allows the user to skip it in the sheet-selection step.

---

## Impact areas

- Server-side `.xlsx` parsing library needed (e.g. `xlsx` / SheetJS or `exceljs`); note that `xlsx` has had security advisories — evaluate alternatives
- The import pipeline from p2-13 must be extended to accept worksheet data as input (not just CSV text)
- Sheet-selection UI: a new step in the import flow before column mapping
- A workbook can be large; set a reasonable size limit (recommend 10 MB) and row limit per sheet (5,000)
- The column-mapping engine from p2-13 must be reusable with `.xlsx` row data

---

## Decisions needed before build

- Confirm which `.xlsx` parsing library to use and its security posture (SheetJS / `xlsx` has known vulnerabilities when processing untrusted files — if used, run in a sandboxed worker or use `exceljs`).
- Maximum workbook size and sheet count.
- Should `.xls` (older format) also be supported, or `.xlsx` only? (Recommend `.xlsx` only for the initial implementation — `.xls` is rare now and adds parser complexity.)
- If a sheet has merged cells or complex formatting (charts, pivot tables), how should the parser handle it? (Skip non-data rows, treat merged cells as the top-left value. Document the limitation clearly to the user.)

---

## Blocked by

- **p2-13** (Statement Import with Column Mapping) — the column-mapping engine and the import pipeline it introduces must exist before `.xlsx` support can be layered on top.

## Comments

<!-- Append discussion below this line -->
