# FinTrack BD Phase 2 — Test Cases

> **Status:** not yet written — test cases are written ticket-by-ticket as each Phase 2 feature is implemented.
> When a Phase 2 ticket is started, write its test cases here following the same TDD process as the MVP (`fintrack-bd-mvp/test-cases/README.md`).

---

## Three-suite pattern

Every Phase 2 test file follows the same three-suite structure as the MVP:

| Suite | Purpose | When to run |
|-------|---------|-------------|
| **Smoke** | 1–3 cases per area that prove the feature is not fundamentally broken | Every deploy |
| **Happy Path** | All P1 cases — every primary user story for the feature | Before merging to main |
| **Full Regression** | All P1 + P2 + P3 cases — including edge cases and error paths | Nightly; before release |

Each test case file must have a `## Suite classification` section at the top (identical format to the MVP files) listing which case IDs fall in each suite.

---

## File naming convention

Follow the same pattern as the MVP:

| File | Area prefix | Phase 2 ticket |
|---|---|---|
| `p2-01-admin-tools.md` | `TC-P2ADM` | p2-01 |
| `p2-04-spending-limit.md` | `TC-P2BUD` | p2-04 |
| `p2-05-wallet-net-worth.md` | `TC-P2WAL` | p2-05 |
| `p2-06-savings-goals.md` | `TC-P2GOAL` | p2-06 |
| `p2-07-fixed-expense-cadences.md` | `TC-P2FIX` | p2-07 |
| `p2-08-tags.md` | `TC-P2TAG` | p2-08 |
| `p2-09-tax-planner.md` | `TC-P2TAX` | p2-09 |
| `p2-10-tds-sanchaypatra.md` | `TC-P2TDS` | p2-10 |
| `p2-11-recurring-income.md` | `TC-P2INC` | p2-11 |
| `p2-15-xlsx-import.md` | `TC-P2IMP` | p2-15 |
| `p2-18-push-notifications.md` | `TC-P2NOTIF` | p2-18 |
| `p2-19-offline-queue.md` | `TC-P2OFF` | p2-19 |
| `p2-20-bangla-toggle.md` | `TC-P2I18N` | p2-20 |
| `p2-21-interface-polish.md` | `TC-P2UI` | p2-21 |

ID format: `TC-P2<AREA>-<NNN>` — never reused or renumbered.

---

## Expected structure of each test case file

```markdown
# Test cases: [Feature name]

Phase 2 ticket p2-NN. Read this README first.

## Suite classification

| Suite | Included case IDs |
|-------|------------------|
| **Smoke** | TC-P2XXX-001, ... |
| **Happy Path** | Smoke + TC-P2XXX-002, ... |
| **Full Regression** | All cases above plus TC-P2XXX-NNN, ... |

> Brief rationale for the Smoke selection.

---

| ID | Test case | Expected | Seam | P | Covers |
|---|---|---|---|---|---|
| TC-P2XXX-001 | ... | ... | API | P1 | ... |
```

---

## Cross-phase regression

When Phase 2 features are built, the MVP's Full Regression suite (`fintrack-bd-mvp/test-cases/`) must still pass. Phase 2 work must not break any existing P1 case.

The recommended CI gate: run the MVP Smoke suite on every Phase 2 commit, and the MVP Full Regression suite before any Phase 2 merge to main.
