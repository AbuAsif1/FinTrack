# Business requirements — FinTrack BD

All business documents live here. Test cases that verify them live in [`../qa/`](../qa/README.md); technical design (architecture, rules, design system, ADRs) lives in `../.scratch/docs/`.

| Path | Contents |
|---|---|
| `brd.md` | Business Requirements Document: product, scope, feature requirements FR-01 to FR-10, tax module FR-TAX-01 to 06, data model, gap analysis, roadmap, acceptance criteria |
| `fintrack-bd-mvp/spec.md` | MVP specification: 83 user stories (US-1 to US-83) and implementation decisions |
| `fintrack-bd-mvp/issues/` | MVP tickets 01–26 (ticket 24 = open tax-parameter decisions) |
| `fintrack-bd-phase-2/` | Phase 2 backlog spec and tickets p2-01 to p2-22 |
| `fintrack-bd-phase-3/` | Phase 3 spec and tickets |
| `fintrack-bd-phase-4/` | Phase 4 spec and tickets (subscriptions, payments, sync) |

Each ticket carries a `Status:` line (`needs-triage`, `ready-for-agent`, …) — conventions in `../.scratch/docs/agents/issue-tracker.md`. Requirement IDs used in the QA traceability matrix: `FR-xx` / `FR-TAX-xx` / `GAP-xx` / `AC-…` → `brd.md`; `US-xx` → MVP spec; `T-xx` → MVP ticket xx; `P2-xx` → phase-2 ticket.
