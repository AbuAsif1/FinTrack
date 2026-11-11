# 01: Monorepo & Core Foundation

**What to build:** The repository skeleton every later ticket builds on: the Next.js app, the two workspace packages, the full database schema with seed data, the test helper and CI. The tax engine must pass every `AC-TAX-…` fixture before other work starts.

**Blocked by:** None

**Status:** ready-for-agent

**Test cases:** `test-cases/01-foundation.md` (`TC-FND`) · `test-cases/02-tax-engine.md` (`TC-TAXE`)

**Read first:** `rules.md` (all) · `architecture.md` §Stack, §Repository layout, §Environment variables, §Database schema, §Tax engine, §Testing · `brd.md` §6 FR-TAX-02, FR-TAX-03, FR-TAX-05 and §11 (`AC-TAX-1` to `AC-TAX-6`, `AC-FMT-1`)

- [ ] Next.js 14 App Router with TypeScript; pnpm workspace containing `packages/shared` and `packages/tax-engine`
- [ ] `@fintrack/shared`: all enums; Zod schemas including `paisaSchema` and the `TaxYearConfig` schema; helpers `formatBDT`, `parseBDT`, `toDecimalString`, `toPaisa`, `roundHalfUp`, `fiscalYear`, `fiscalYearRange`, `todayInDhaka`, `toDbDate`, `fromDbDate`
- [ ] `@fintrack/tax-engine`: `calculateTax(input)` and `forecastTax(input)` implementing `brd.md` §6 FR-TAX-02 and FR-TAX-05, with no constants, I/O or clock
- [ ] `lib/prisma.ts`: the single Prisma client; Neon adapter only when the host is Neon
- [ ] Prisma schema and migration for all 20 tables with the unique constraints and indexes in `architecture.md`
- [ ] Data files in `prisma/defaults/`: the 16 starter categories with their routing types, and the tax settings for FY2024-25, FY2025-26 and FY2026-27 from `brd.md` §6 FR-TAX-03
- [ ] `provisionNewUser(userId)`: creates the starter categories and the three provisional `tax_years` rows for a user, and nothing else
- [ ] Seed: the owner's account from `SEED_USER_*`, with role `ADMIN`, already verified, provisioned with `provisionNewUser`
- [ ] `.env.example` listing every variable in `architecture.md` §Environment variables
- [ ] `GET /health` returns 200 without auth
- [ ] `createTestContext()` test helper in `tests/helpers/`, as described in `architecture.md` §Testing
- [ ] `pnpm test:matrix`: lists every `TC-…` id in `.scratch/fintrack-bd-mvp/test-cases/` that has no test with that id in its title
- [ ] Tax engine tests: `AC-TAX-1` to `AC-TAX-6` pass to the Paisa; plus a rebate limited by the income rate, a non-taxable entry excluded from Gross Income, Taxable Income at the threshold (no tax and no Minimum Tax), and an Early Filing Rebate limited by its maximum
- [ ] 100% branch coverage on `packages/tax-engine`, enforced in CI
- [ ] Shared helper tests: `AC-FMT-1`; `formatBDT` for lakh and crore values; `parseBDT` rejects more than two decimals, exponents and empty input; `fiscalYear` on both sides of 30 June and 1 July
- [ ] CI (GitHub Actions) with a `postgres:16` service: lint, typecheck, Vitest

## Comments
