# 01: Monorepo & Core Foundation

**What to build:** The repository skeleton every later ticket builds on: the Next.js app, the two workspace packages, the full database schema with seed data, the test helper and CI. The tax engine must pass every `AC-TAX-…` fixture before other work starts.

**Blocked by:** None

**Status:** done

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

---

## Why

FinTrack BD requires a stack that runs on a single Vercel deployment, uses Paisa as the integer money unit, understands the Bangladesh Fiscal Year (July–June), and can call a pure, testable tax engine from both the API and the browser. Without a stable foundation — schema, test helpers, CI, shared helpers and a passing tax engine — every later ticket risks diverging on the money format or fiscal-year boundary. The tax engine must be verified against the owner's real spreadsheet (AC-TAX-1 to AC-TAX-6) before any money logic builds on top of it.

## User flows

This ticket has no user-visible flow — it lays the technical foundation. The developer-facing flows are:

### Setting up a fresh development environment
1. Clone the repo. Run `pnpm install`.
2. Copy `.env.example` to `.env` and fill in the Neon and other variables.
3. Run `pnpm prisma migrate dev` to create the database with all 20 tables.
4. Run `pnpm db:seed` to create the owner's admin account with starter categories and three provisional tax years.
5. Run `pnpm test` — all tests pass, including AC-TAX-1 to AC-TAX-6 at exact Paisa values.
6. Run `pnpm test:matrix` — zero missing TC-… ids.

### Verifying a tax calculation in the engine
1. Call `calculateTax({ income, investments, taxYear })` from any service or test.
2. The function returns a full `TaxResult` with no I/O, no clock, no constants embedded — all rates and thresholds come from the `taxYear` input.
3. `forecastTax` does the same thing for a partial year with projected remaining income.

## Scenarios

**Scenario A — first agent picks up the repo:** An agent runs `pnpm test:matrix` and sees zero gaps. It knows every TC-… case in the test-cases directory is covered. It runs `pnpm test` and all tax-engine fixtures pass to the Paisa.

**Scenario B — wrong money format caught early:** An agent accidentally writes `amount * 100` instead of `toPaisa(amount)`. The `paisaSchema` Zod validator rejects non-integer values at the API boundary, and the test for `parseBDT` catches the formatting regression.

**Scenario C — fiscal-year boundary:** `fiscalYear('2025-07-01')` returns `'2025-26'`. `fiscalYear('2025-06-30')` returns `'2024-25'`. The helpers ensure July is always the start of a new fiscal year throughout the app.

**Scenario D — CI catches a tax regression:** An agent changes a tax rate constant. CI runs `pnpm test` and AC-TAX-1 fails at the Paisa level. The agent must fix the engine or update the fixture with the confirmed new value from ticket 24.

## Context notes

- Money is always integer Paisa end to end (ADR-0003). Never store or pass decimal BDT amounts. `toPaisa` and `fromDbDate`/`toDbDate` are the only conversions.
- Fiscal Year is July–June (ADR-0007). `fiscalYear(date)` is the single source of truth.
- The tax engine (`packages/tax-engine`) must have 100% branch coverage and must import no constants — all tax parameters come from `config_json` in the `tax_years` table.
- `provisionNewUser(userId)` runs inside the same DB transaction as registration (ticket 25). It must be safe to call twice (idempotent) and must not leave partial state if the outer transaction rolls back.
- `pnpm test:matrix` is a CI requirement: every TC-… id in the test-cases directory must have a matching test. When you add a test file, run this to confirm coverage.

## Comments
