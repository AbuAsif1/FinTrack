# 18: Tax Dashboard UI

**What to build:** The Tax Dashboard (Overview, Investments, Forecast, Compare Years) and the Tax Year Settings page where every tax parameter can be edited, confirmed, and the return marked filed.

**Blocked by:** 09, 12

**Status:** ready-for-agent

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

## Comments
