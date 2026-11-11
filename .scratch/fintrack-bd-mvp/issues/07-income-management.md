# 07: Income Management

**What to build:** The Income Entry API (salary, Profit Share, bonuses, Cheer, Holiday Support, TDS) and the Holiday Support log. Income Entries are the source for In-Hand Income and for the tax engine.

**Blocked by:** 02

**Status:** ready-for-agent

**Test cases:** `test-cases/10-income.md` (`TC-INC`) · `test-cases/19-security.md` (extend `TC-SEC-001` to `TC-SEC-004` for the new endpoints)

**Read first:** `rules.md` §2, §3, §6 · `architecture.md` §Database schema (`income_entries`, `holiday_support_entries`), §API (Income, Holiday Support) · `brd.md` §5 FR-03 and §11 `AC-TAX-2`

- [ ] `POST /income-entries`: month, income type, gross, TDS, taxable flag (default by type), employer name, comment and `idempotency_key`; Cheer adds payer name and earned period
- [ ] `fiscal_year` is set from the month on every write; TDS outside 0 to gross is 422
- [ ] `GET /income-entries` by `fiscal_year` or `month`, with In-Hand Income computed on read
- [ ] `PATCH /income-entries/:id` and `DELETE /income-entries/:id` (soft delete); a write to a locked Fiscal Year is 409 `TAX_YEAR_LOCKED`
- [ ] `GET /income-entries/summary?fiscal_year=`: twelve month rows from July to June with per-type amounts, TDS, In-Hand Income and Entered or Pending; year totals; the salary history timeline; the latest Salary entry for pre-fill
- [ ] Holiday Support log endpoints: `rate_paisa` pre-filled from the latest entry of the same rate type and stored on the entry; `amount_paisa` is days × rate; the month's total is returned for pre-filling a Holiday Support Income Entry
- [ ] Tests: In-Hand Income calculation; `AC-TAX-2`; June and July entries fall in different Fiscal Years; Certification Reimbursement defaults to not taxable; a duplicate key returns the original; a later Holiday Support rate leaves earlier entries' amounts unchanged; a locked year rejects writes

## Comments
