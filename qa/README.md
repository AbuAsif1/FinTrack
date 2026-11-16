# QA — FinTrack BD

Everything test-related lives here: test cases, automation, results and tooling.
Business requirements the tests trace to live in [`../requirements/`](../requirements/README.md).

```
qa/
├── test-cases/
│   ├── FinTrack-BD_Test-Cases.xlsx   ← MASTER manual test cases (money flow) — start here
│   └── fintrack-bd-mvp/ …phase-2/3/4/ ← TC-xxx case matrices that the automated tests carry in their titles
├── automation/
│   ├── e2e/        ← Playwright browser journeys (smoke, happy-path, regression specs)
│   ├── api/        ← Vitest API tests against PostgreSQL
│   ├── helpers/    ← createTestContext, router, factories
│   └── setup.ts    ← Vitest global setup
├── results/        ← every report, trace, screenshot and coverage file (git-ignored)
└── tools/          ← generator for the master workbook
```

Component and package unit tests stay next to their code (`components/**/*.test.tsx`, `app/**/*.test.tsx`, `packages/*/src/**/*.test.ts`) because they import the file beside them.

---

## The master workbook

`test-cases/FinTrack-BD_Test-Cases.xlsx` holds 108 manual, business-centric cases. Each starts from **Add Expenses** or **Add Income** and states where the money must appear on every screen.

| Sheet | Contents |
|---|---|
| Test Cases | Steps, test data, four expected-result columns (Bank & Wallet · Dashboard · Tax · Other screens), Suites, Sanity Area, requirement IDs, and yellow columns to record a run |
| Traceability Matrix | 118 requirements (BRD, user stories, tickets, ADRs, derived-value rules) → test cases, with live pass / fail / coverage counts |
| Baseline & Legend | The starting data every case assumes (B0, B1, T1, F1), tax parameters used, suite rules, how to record results |
| Business Findings | Places where the business rule and the app (or two documents) disagree |

**Changing cases:** edit `tools/tc_data.py`, close the workbook in Excel, then run `pnpm qa:cases`. Recorded results (Execution Status, Actual Result, Defect ID, Tested By / Date) are carried over by TC ID, so a rebuild never erases a run.

---

## Test suites

Filter the workbook's **Suites** column to build a manual run. The automated commands run the matching code.

| Suite | When | Manual (workbook) | Automated |
|---|---|---|---|
| **Smoke** | Every build or deploy: is it testable at all? | 5 core money paths (cash spend, bank spend, DPS, salary, tax payment) | `pnpm test:smoke` — login, page loads, health, security |
| **Sanity** | After a fix or small change, in the affected area only | P1 cases of one **Sanity Area**: Spending, DPS & Investment, Withdrawal & Interest, Loans, Tax Payment, Fixed Expenses, Transfer, Income, End-to-End | `pnpm test:api -- -t "<area keyword>"` or the area's API file, e.g. `pnpm test:api qa/automation/api/loans.test.ts` |
| **Happy Path** | Before every release | 45 cases: every positive P1 path plus both end-to-end journeys | `pnpm test:happy` |
| **Regression** | Before a major release | All 108 cases | `pnpm test` (API + unit) and `pnpm test:regression` (e2e) |

### Money-flow automation (`automation/e2e/money-flow/`)

Playwright journeys built from the workbook. Each test is titled with its `MF-…` ID and tagged from the workbook's Suites column (via `test-cases/suites.json`), so `--grep` picks exactly the suite:

| Command | Runs |
|---|---|
| `pnpm test:mf:smoke` | `@smoke` |
| `pnpm test:mf:sanity` | `@sanity` (add `--grep @area-loans` etc. for one area) |
| `pnpm test:mf:happy` | `@happy` |
| `pnpm test:mf:regression` | `@regression` (everything automated) |
| `pnpm test:mf --grep MF-EXP-020` | one case |
| `pnpm test:mf:report` | open the last HTML report (`results/money-flow/report/`) |

**Serial or parallel — choose per run.** Every test creates its own verified user (deleted afterwards) and builds its own baseline, so tests never share data:

```
pnpm test:mf:smoke                 # 1 worker (default — easiest on the shared Neon DB and the dev server)
pnpm test:mf:smoke --workers=4     # 4 tests at a time
MF_WORKERS=4 pnpm test:mf:regression
```

Each test: baseline via API (B0 / B1 / T1, same as the workbook) → the action through the real UI → every affected screen checked (Bank & Wallet balances and tiles, Dashboard tiles, Tax rows, Transactions) → exact figures cross-checked via API. Expected values are the workbook's literals.

Layout: `support/` holds the fixtures (fresh user + API client), baselines, page objects and the workbook link (`cases.ts`); specs sit beside it (`smoke.spec.ts`, more per area to come). The config is `playwright.money-flow.config.ts`; it reuses a running app on `:3000` or starts `pnpm dev`.

**Do not run `pnpm test` / `pnpm test:api` at the same time against the same database** — the API suite's cleanup deletes every non-seed user, including the money-flow test users.

Automated so far: the 5 Smoke cases. A test that fails because the app breaks a business rule stays red on purpose and is listed on the workbook's Business Findings sheet (e.g. F-21).

---

## Running

| Command | Runs | Results |
|---|---|---|
| `pnpm test` | All Vitest tests (API + unit/component) | console |
| `pnpm test:api` | API tests in `automation/api/` only | console |
| `pnpm test:coverage` | Vitest with coverage | `results/coverage/` |
| `pnpm test:smoke` | Playwright smoke | `results/smoke/report/` |
| `pnpm test:happy` | Playwright happy path | `results/happy-path/report/` |
| `pnpm test:regression` | Playwright regression | `results/regression/report/` |
| `pnpm test:matrix` | Lists `TC-xxx` cases in `test-cases/fintrack-bd-mvp/` with no automated test | console |
| `pnpm qa:cases` | Rebuilds the master workbook from `tools/tc_data.py` | `test-cases/FinTrack-BD_Test-Cases.xlsx` |

Open a Playwright report with `npx playwright show-report qa/results/<suite>/report`. Failure screenshots and traces are in `results/<suite>/artifacts/`.

API tests need `TEST_DATABASE_URL` (or `DATABASE_URL`) in `.env.local`; they run one file at a time against a shared database. Playwright needs the app running at `APP_URL` (default `http://localhost:3000`) and seeds its user with `pnpm seed:e2e`.
