# 18: Tax Dashboard UI

**What to build:** The tax module screen showing fiscal year summary, slab-by-slab breakdown, investment rebate details, TDS reconciliation, and suggested monthly TDS going forward.

**Blocked by:** 09 (Tax Dashboard API), 12 (React Frontend Shell)

**Status:** ready-for-agent

- [ ] Fiscal year selector: switch between FY2024-25 and FY2025-26
- [ ] Summary card: Gross Income → Taxable Income → Gross Tax → Rebate → Net Tax → TDS Paid → Remaining (all with formatBDT())
- [ ] Tax slab breakdown table: each slab row shows slab range, applicable income, rate, and tax amount
- [ ] Rebate detail: investments by type (DPS, Sanchaypatra, etc.) with amounts and cap indicators
- [ ] TDS timeline: monthly TDS deducted vs cumulative progress toward net tax
- [ ] Suggested TDS strip: "Pay ৳X/month for remaining N months" (or "৳0 remaining" if fully paid)
- [ ] Investment entry: add DPS / Sanchaypatra / other investment amounts manually (links to rebate calculation)
- [ ] Real acceptance data visible: FY2025-26 Net Tax ৳1,35,369; TDS paid ৳1,32,488; remaining ৳2,737
- [ ] Bangladesh TDS vocabulary enforced: use "TDS" not "withholding tax"
