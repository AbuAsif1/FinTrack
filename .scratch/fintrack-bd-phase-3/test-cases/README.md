# FinTrack BD Phase 3 — Test Cases

> **Status:** not yet written — Phase 3 items are ideas, not ready to build.
> Test cases are written only when a Phase 3 ticket moves to `ready-for-agent`.

---

## Three-suite pattern

Phase 3 test files follow the same three-suite structure as the MVP and Phase 2:

| Suite | Purpose | When to run |
|-------|---------|-------------|
| **Smoke** | 1–3 cases per area that prove the feature is not fundamentally broken | Every deploy |
| **Happy Path** | All P1 cases | Before merging to main |
| **Full Regression** | All P1 + P2 + P3 cases | Nightly; before release |

Each test case file must have a `## Suite classification` section at the top.

---

## File naming convention

| Phase 3 ticket | File | Area prefix |
|---|---|---|
| p3-07 Delete account | `p3-07-delete-account.md` | `TC-P3DEL` |
| p3-08 Passkey / 2FA | `p3-08-passkey.md` | `TC-P3AUTH` |
| p3-09 Loan statement | `p3-09-loan-statement.md` | `TC-P3LOAN` |
| p3-10 Statement import | `p3-10-statement-import.md` | `TC-P3IMP` |
| p3-11 Bank sync | `p3-11-bank-sync.md` | `TC-P3SYNC` |
| p3-12 Document vault | `p3-12-vault.md` | `TC-P3VAULT` |
| p3-13 Restore / backups | `p3-13-restore.md` | `TC-P3REST` |
| p3-01..06 Subscriptions | `p3-01-subscriptions.md` | `TC-P3SUB` |

ID format: `TC-P3<AREA>-<NNN>` — never reused or renumbered.

---

## Cross-phase regression

Phase 3 work must not break any MVP or Phase 2 P1 case. The recommended CI gate: run the MVP + Phase 2 Smoke suites on every Phase 3 commit, and the MVP + Phase 2 Full Regression suites before any Phase 3 merge to main.
