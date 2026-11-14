# 07: Income Management

**What to build:** Monthly income entry API covering salary, profit share (PS), bonuses, festival bonuses, Cheer payments, and TDS. Income is the source of truth for the tax engine and In-Hand Income calculations.

**Blocked by:** 02 (Authentication)

**Status:** ready-for-agent

- [ ] POST /income: create an income entry (type: salary|profit_share|bonus|festival_bonus|cheer|leave_encashment, gross_paisa, tds_paisa, fiscal_year, calendar_month, earned_period)
- [ ] GET /income: list by fiscal year and/or calendar month
- [ ] PATCH /income/:id: update an income entry
- [ ] In-Hand Income = gross_paisa − tds_paisa (computed on read, not stored)
- [ ] Cheer entries carry payer_name and earned_period separately from received_month
- [ ] Integration tests: create salary + TDS, verify in-hand calculation; create multiple income types in FY2025-26, verify fiscal year grouping; acceptance test: current salary ৳1,53,383/month from Apr 2026, previous ৳1,22,700/month
