# 09: Tax Dashboard API

**What to build:** The tax calculation API endpoint that ties income entries to the pure calculateTax() engine and returns a full breakdown: gross income, exemption, taxable income, slab-by-slab tax, rebate, TDS paid, net tax, remaining tax, and suggested monthly TDS.

**Blocked by:** 07 (Income Management), 06 (Category Routing Service — for rebate-eligible investments)

**Status:** ready-for-agent

- [ ] GET /tax/summary?fiscal_year=2025-26: returns full tax breakdown for the fiscal year
- [ ] Calls calculateTax(slabs, income, investments) — no I/O inside the tax engine
- [ ] Tax slabs loaded from DB (data-driven, not hard-coded)
- [ ] Rebate-eligible investments pulled from DPS and Sanchaypatra transfer records for the fiscal year
- [ ] Suggested monthly TDS = MAX(0, net_tax − tds_paid_so_far) / remaining_months_in_fiscal_year
- [ ] Acceptance test: FY2025-26, Gross ৳20,06,846 → Net Tax ৳1,35,369; TDS paid ৳1,32,488; remaining ৳2,737
- [ ] Integration test: mid-year salary change reflected correctly in gross income total; rebate cap enforced
