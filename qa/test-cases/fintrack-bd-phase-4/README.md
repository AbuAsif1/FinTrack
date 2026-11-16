# FinTrack BD Phase 4 — Test Cases

> **Status:** not yet written — Phase 4 items are backlog, not ready to build.
> Test cases are written only when a Phase 4 ticket moves to `ready-for-agent`.

---

## Three-suite pattern

Phase 4 test files follow the same three-suite structure as the MVP, Phase 2, and Phase 3:

| Suite | Purpose | When to run |
|-------|---------|-------------|
| **Smoke** | 1–3 cases per area that prove the feature is not fundamentally broken | Every deploy |
| **Happy Path** | All P1 cases | Before merging to main |
| **Full Regression** | All P1 + P2 + P3 cases | Nightly; before release |

Each test case file must have a `## Suite classification` section at the top.

---

## File naming convention

| Phase 4 ticket | File | Area prefix |
|---|---|---|
| p4-01 Subscription plans | `p4-01-subscription-plans.md` | `TC-P4SUB` |
| p4-02 bKash/card payment | `p4-02-payment.md` | `TC-P4PAY` |
| p4-03 Bank transfer | `p4-03-bank-transfer.md` | `TC-P4BNK` |
| p4-04 Access enforcement | `p4-04-enforcement.md` | `TC-P4ENF` |
| p4-05 Notifications | `p4-05-notifications.md` | `TC-P4NTF` |
| p4-06 User migration | `p4-06-migration.md` | `TC-P4MIG` |
| p4-07 Passkey / 2FA | `p4-07-passkey.md` | `TC-P4AUTH` |
| p4-08 Loan statement | `p4-08-loan-statement.md` | `TC-P4LOAN` |
| p4-09 Statement import | `p4-09-statement-import.md` | `TC-P4IMP` |
| p4-10 Bank sync | `p4-10-bank-sync.md` | `TC-P4SYNC` |
| p4-11 Document vault | `p4-11-vault.md` | `TC-P4VAULT` |

ID format: `TC-P4<AREA>-<NNN>` — never reused or renumbered.

---

## Cross-phase regression

Phase 4 work must not break any MVP, Phase 2, or Phase 3 P1 case. The recommended CI gate: run the MVP + Phase 2 + Phase 3 Smoke suites on every Phase 4 commit, and the full regression suites before any Phase 4 merge to main.
