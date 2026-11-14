# 18: Tax Dashboard UI

**What to build:** The Tax Dashboard (Overview, Investments, Forecast, Compare Years) and the Tax Year Settings page where every tax parameter can be edited, confirmed, and the return marked filed.

**Blocked by:** 09, 12

**Status:** done

**Test cases:** `test-cases/17-ui.md` §Tax Dashboard (`TC-UI-120` to `TC-UI-126`)

**Read first:** `rules.md` §7, §11 · `design.md` §7.7, §7.9 (Tax Year Settings) · `brd.md` §6 (all) and §11 `AC-TAX-1`, `AC-TAX-6`

- [ ] Fiscal Year selector listing every year from `GET /tax-years`; data-completeness bar
- [ ] Overview tab: the three tiles, Taxable Income breakdown, slab breakdown, and TDS reconciliation with Remaining Tax or Overpaid, remaining salary months, Suggested Monthly TDS and a Record Tax Payment action
- [ ] The four notices in `design.md` §7.7: provisional settings, early filing saving, overpaid, filed and locked
- [ ] Investments tab: invested, cap and eligible per category; the three rebate candidates; further investment for the maximum rebate; stocks, insurance and others are editable, DPS and Sanchaypatra are read-only because they come from deposits
- [ ] Forecast tab, with every figure labelled Projected; Compare Years tab with three columns
- [ ] Tax Year Settings page at `/settings/tax-years`: edit every parameter, Save, Confirm settings, Mark return filed, Reopen; read-only while the year is locked
- [ ] Live preview: editing settings or investments recalculates in the browser with `calculateTax` before saving
- [ ] The test state shows `AC-TAX-1`; marking the return filed on 2026-09-15 shows `AC-TAX-6`

---

## Why

The tax calculation is one of the main reasons the owner built this app — they were tired of maintaining a separate Excel spreadsheet to calculate their annual income tax. The Tax Dashboard makes this calculation visual, explainable (slab breakdown, TDS reconciliation), and actionable (suggesting monthly TDS, showing remaining tax, calculating the Early Filing Rebate). The Settings subpage gives the owner control over the tax parameters so they can confirm them against the official Finance Act without needing a code change. Filing the return locks the year and stores the definitive calculation as a permanent record.

## User flows

### Reviewing the current fiscal year's tax picture
1. User opens the Tax Dashboard. FY2026-27 is selected (current year).
2. Overview tab:
   - Three tiles: Total Tax Liability ৳2,06,369, TDS Paid ৳1,32,488, Remaining ৳73,881.
   - Taxable Income breakdown: Gross Income ৳10,20,000 | One-third exemption -৳3,40,000 | Standard deduction -৳4,50,000 | Taxable Income ৳2,30,000.
   - Slab breakdown table: First ৳3,75,000 at 0%, Next ৳1,00,000 at 5% = ৳5,000, etc.
   - TDS reconciliation: TDS paid ৳1,32,488 | Tax payable ৳2,06,369 | Remaining: ৳73,881.
   - Remaining salary months: 7. Suggested Monthly TDS: ৳10,554.
3. A "Record Tax Payment" button opens the Add Transaction form with routing type TAX_PAYMENT pre-filled.

### Viewing investments and rebate
1. User opens the Investments tab.
2. DPS Deposits (read-only, from savings): ৳1,20,000 / ৳1,20,000 cap (100% ✓).
3. Sanchaypatra (read-only, from savings): ৳5,00,000 / ৳5,00,000 cap (100% ✓).
4. Life Insurance (editable): ৳36,000. Stocks (editable): ৳0. Others (editable): ৳0.
5. Total rebate-eligible investment: ৳6,56,000. Rebate at 10%: ৳65,600.
6. "To maximise the rebate: invest ৳3,44,000 more in eligible instruments" (if below the ceiling).
7. User updates Life Insurance to ৳48,000. The rebate recalculates in the browser using `calculateTax` before saving.

### Forecast tab
1. User opens Forecast tab.
2. All figures are labelled "Projected." Income projection: 7 more months at ৳85,000 = additional ৳5,95,000.
3. Projected annual income, projected net tax, projected remaining TDS for the year.

### Confirming tax settings
1. Owner opens Settings → Tax Year Settings for FY2026-27.
2. Sees the full config: tax-free threshold ৳3,75,000, rebate rate 10%, minimum tax ৳5,000, etc.
3. All fields are editable. After confirming with the Finance Act, they tap "Confirm settings."
4. The year is marked confirmed. The "Provisional" banner disappears from the Tax Dashboard.

### Filing the return
1. User files their return on 2026-09-15 (before the 30 September deadline for Early Filing Rebate).
2. On Tax Dashboard, they tap "Mark return filed."
3. Modal: "Filed on 2026-09-15. Early Filing Rebate applies: ৳10,318. Confirm?"
4. User confirms. The year is locked. All income entries for FY2025-26 now reject edits with "Year is filed."

## Scenarios

**Scenario A — provisional banner:** FY2026-27 config has not been confirmed. The dashboard shows a yellow banner: "Tax parameters provisional — confirm against the Finance Act in Tax Year Settings." The tax calculation is shown but all figures have an asterisk.

**Scenario B — overpaid tax:** After multiple voluntary advance tax payments, TDS Paid exceeds Tax Payable by ৳5,420. The dashboard shows the tile in green: "Overpaid ৳5,420 — you may be eligible for a refund."

**Scenario C — live preview in settings:** While editing the tax-free threshold from ৳3,75,000 to ৳4,00,000 in Tax Year Settings, the browser recalculates using `calculateTax` with the new config. The tax liability on the preview card drops by ৳5,000 immediately — before the user saves. This confirms the change is correct before committing.

**Scenario D — compare years:** User opens the Compare Years tab. Three columns show FY2024-25, FY2025-26, and FY2026-27 side by side: income, gross tax, rebate, net tax, TDS paid, remaining. FY2024-25 shows "Filed" label. FY2025-26 shows the stored snapshot. FY2026-27 shows the current projection.

## Context notes

- DPS and Sanchaypatra totals in the Investments tab are read-only — they come from savings deposits (ticket 04), not from a user-editable field. The user cannot override them. If they are wrong, the savings account transactions must be corrected.
- Live preview in Tax Year Settings uses `calculateTax` from `@fintrack/tax-engine` running in the browser — no API call. This is why the tax engine has no I/O or side effects.
- Filing the return stores a snapshot of the `TaxResult`. After locking, `GET /tax/summary` returns the stored snapshot, not a fresh calculation. The snapshot must include the Early Filing Rebate if applicable.
- The four notices (`design.md` §7.7) must all render: (1) provisional settings, (2) early-filing saving (if filing by 30 September), (3) overpaid, (4) filed and locked. Each has distinct visual treatment.
- Remaining salary months = months from current month to June (end of fiscal year). Used in Suggested Monthly TDS = Remaining Tax / Remaining months. If it's June, Suggested Monthly TDS = Remaining Tax.

## Comments
