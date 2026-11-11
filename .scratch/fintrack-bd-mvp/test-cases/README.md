# FinTrack BD MVP — Regression Test Matrix

> **Owns:** the list of behaviours the MVP must keep, one test case per row. Development is test-first against this matrix.
> Expected figures come from the fixtures in `.scratch/docs/brd.md` §11. Seams and tooling: `.scratch/docs/architecture.md` §Testing.

---

## How to use it (TDD)

Work one case at a time. Writing the tests for a whole file before any implementation is the wrong order: it tests imagined behaviour.

1. Take the next case for your ticket from the file named on the ticket's **Test cases** line.
2. Write one automated test for it, at the seam in the case's `Seam` column, with the case id at the start of the test title: `it('TC-TXN-004 a repeated idempotency key returns the original record', …)`.
3. Run it and see it fail (red).
4. Write only enough code to make it pass (green). Then take the next case.
5. A ticket is done when every case on its Test cases line has a passing test.

Assert what a user or API client can observe: the HTTP response, the rendered text. Expected values are the literals in this matrix and in `brd.md` §11, never a value recomputed in the test the way the code computes it.

---

## Where test code lives

| Seam | Location | Covers |
|---|---|---|
| `Unit` | `packages/shared/src/**/*.test.ts`, next to the helper | Money, date and schema helpers |
| `Engine` | `packages/tax-engine/src/**/*.test.ts` | `calculateTax`, `forecastTax` |
| `API` | `tests/api/<area>.test.ts`, one file per matrix file | Route handlers against PostgreSQL 16 |
| `UI` | next to the component, `components/**/*.test.tsx` | Component behaviour with Testing Library |
| `E2E` | `e2e/*.spec.ts` | Playwright journeys through the built app |
| `Check` | recorded in ticket 21's UAT checklist | Things measured or inspected rather than asserted in code |

Shared test helpers and factories live in `tests/helpers/`. `pnpm test:matrix` lists every case id in this folder that has no test with that id in its title; ticket 21 makes an empty list for `P1` cases a CI gate.

---

## Reading a case

| Column | Meaning |
|---|---|
| ID | `TC-<AREA>-<NNN>`; never reused or renumbered |
| Test case | The situation |
| Expected | What must be observed |
| Seam | Where the test runs (table above) |
| P | `P1` must never regress; `P2` important; `P3` nice to have |
| Covers | The requirement, fixture or rule it protects |

---

## Files

| File | Area prefix | Tickets |
|---|---|---|
| `01-foundation.md` | `TC-FND` | 01 |
| `02-tax-engine.md` | `TC-TAXE` | 01 |
| `03-auth.md` | `TC-AUTH` | 02 |
| `04-registration.md` | `TC-REG` | 25 |
| `05-admin.md` | `TC-ADM` | 26 |
| `06-transactions.md` | `TC-TXN` | 03 |
| `07-savings.md` | `TC-SAV` | 04 |
| `08-loans.md` | `TC-LOAN` | 05 |
| `09-routing.md` | `TC-ROUTE` | 06 |
| `10-income.md` | `TC-INC` | 07 |
| `11-fixed-expenses.md` | `TC-FIX` | 08 |
| `12-tax-api.md` | `TC-TAX` | 09 |
| `13-budgets-notifications.md` | `TC-BUD`, `TC-NOTIF` | 10 |
| `14-dashboard-analytics.md` | `TC-DASH` | 11 |
| `15-import.md` | `TC-IMP` | 22 |
| `16-export.md` | `TC-EXP` | 23 |
| `17-ui.md` | `TC-UI` | 12 to 20 |
| `18-non-functional.md` | `TC-NFR` | 21 |
| `19-security.md` | `TC-SEC` | every ticket that adds an endpoint |

---

## Changing the matrix

- A new behaviour gets a new case with the next free number in its area, in the same change as the code.
- A changed requirement updates the case's Expected text and its test together.
- A removed behaviour has its row struck through with the reason, so the id is never reused.
- A bug found later gets a case first, then the fix.
