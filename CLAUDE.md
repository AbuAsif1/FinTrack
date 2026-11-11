## Start here

Read `.scratch/docs/project-overview.md` first. It gives the current status (including any development hold), the file map, the release plan and open items.

---

## Which doc owns what

Each topic has one owning doc. Read the owner; other docs only point to it.

| You need… | Read |
|---|---|
| Constraints every change must obey: money, dates, soft delete, idempotency, security | `.scratch/docs/rules.md` — for **every** ticket |
| Stack, DB schema, API endpoints, auth, category routing, derived totals, testing, deploy | `.scratch/docs/architecture.md` |
| What a feature must do (FR-xx); MVP vs Phase 2 scope | `.scratch/docs/brd.md` §5, §3 |
| Tax formulas and per-year tax parameters | `.scratch/docs/brd.md` §6 |
| Acceptance fixtures (`AC-…` ids with exact figures) | `.scratch/docs/brd.md` §11 |
| Test cases to write first (`TC-…` ids, the regression matrix) | `.scratch/fintrack-bd-mvp/test-cases/` — start at its `README.md` |
| Colours, typography, components, page wireframes | `.scratch/docs/design.md` |
| Domain terms for code, comments, names and UI text | `GLOSSARY.md` |
| Why a decision was made, before reversing or re-deciding it | `.scratch/docs/adr/` |
| MVP user stories and test seams | `.scratch/fintrack-bd-mvp/spec.md` |
| Phase 2 backlog and Phase 3 ideas (not ready to build) | `.scratch/fintrack-bd-phase-2/spec.md`, `.scratch/fintrack-bd-phase-3/spec.md` |

**By ticket type:** backend → `rules.md` + `architecture.md`. Frontend → `rules.md` + `design.md` + `architecture.md` §Frontend. Tax → add `brd.md` §6. Every ticket also has a **Read first** line naming the exact sections it needs and a **Test cases** line naming the cases to implement test-first.

**When two docs disagree:** the owning doc in this table wins. Fix the other doc in the same change and note it under the ticket's `## Comments`.

---

## Issue tracker

Tickets live under `.scratch/fintrack-bd-mvp/issues/`. Work through the sprints in `project-overview.md` §Release plan in order; within a sprint, pick the lowest-numbered `ready-for-agent` ticket whose blockers are all `done`. Set `**Status:** in-progress` when you start and `**Status:** done` when every checkbox is ticked and every case on the ticket's Test cases line has a passing test. `ready-for-human` tickets belong to the owner. Conventions: `.scratch/docs/agents/issue-tracker.md`.

Triage labels: `needs-triage` · `needs-info` · `ready-for-agent` · `ready-for-human` · `wontfix`

---

## Skills

Pick the installed skill that matches the work and invoke it without being asked. When two skills cover the same work, use one.

| Work | Skill |
|---|---|
| Implementing a ticket or fixing a bug | `tdd`: one test case from the matrix at a time, red then green |
| A failing test, error or unexpected behaviour | `diagnosing-bugs` |
| Building or restyling UI | `frontend-design`, with `design.md` as the authority |
| Checking UI in a browser, accessibility or performance | `chrome-devtools` skills |
| Library or framework API questions | `context7` |
| Editing `GLOSSARY.md` or writing an ADR | `domain-modeling` |
| Editing `CLAUDE.md` or any doc agents read | `writing-for-agents` |
| Before calling work done | `verification-before-completion`, then `code-review` |
| Writing a PR description | `pr` |

---

## Domain

`GLOSSARY.md` at the repo root defines all domain terms. ADRs go in `.scratch/docs/adr/`, numbered from the highest existing one, as one short paragraph each.
