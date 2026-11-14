# 01: Monorepo & Core Foundation

**What to build:** A working monorepo skeleton that every subsequent ticket builds on. An agent picking up any later ticket must be able to run the test suite and get green. The tax engine must pass the exact BDT acceptance-criteria figures from the user's Excel file before any other work starts.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Next.js 14 app with App Router; TypeScript; pnpm workspace with `packages/shared` and `packages/tax-engine`
- [ ] `packages/shared` exports: Zod schemas, `formatBDT(paisa)`, `fiscalYear(date)`
- [ ] `packages/tax-engine`: pure function `calculateTax(slabs, income, investments)`
- [ ] `lib/prisma.ts`: singleton Prisma client using `@prisma/adapter-neon` + `ws`; `DATABASE_URL` with `?sslmode=require`
- [ ] PostgreSQL schema migration via Prisma (all 13 tables, all money as BIGINT paisa)
- [ ] Seed: FY2024-25 and FY2025-26 tax slabs, starter categories with routing types
- [ ] `.env.example` at repo root: `DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`
- [ ] `lib/auth.ts`: `getAuthUser(req: Request)` helper used by all protected route handlers
- [ ] Vitest test helper that calls Next.js route handlers directly against a real Neon test DB
- [ ] Tax engine acceptance test: FY2025-26, Gross ৳20,06,846 → Net Tax ৳1,35,369; remaining ৳2,737
- [ ] Tax engine edge cases: rebate cap hit, TDS exceeds net tax (zero remaining), mid-year salary change
- [ ] fiscalYear() tests: 2025-06-30 → "2024-25"; 2025-07-01 → "2025-26"
- [ ] formatBDT() tests: South Asian grouping verified (৳20,06,846 not ৳2,006,846)
- [ ] CI pipeline (GitHub Actions) runs vitest and exits green
