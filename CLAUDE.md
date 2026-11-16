## Start here

Read `.scratch/docs/project-overview.md` first. One read gives you project scope, file map, domain rules, and what is still open.

---

## Which docs to read before implementing

| If your ticket is… | Read these docs |
|---|---|
| Any ticket | `.scratch/docs/rules.md` — strict constraints every agent must obey |
| Backend (API, DB, service layer) | `rules.md` + `.scratch/docs/architecture.md` |
| Frontend (React components, forms, charts) | `rules.md` + `.scratch/docs/design.md` + `.scratch/docs/architecture.md` §Frontend |
| Tax module (any ticket touching tax) | above + `requirements/brd.md` §6 Tax Module |
| Data model / DB schema | `.scratch/docs/architecture.md` §Database Schema |
| A new ticket or spec | `requirements/brd.md` for full requirements |

**Shortcut for most tickets:** `rules.md` + `architecture.md` cover 90% of what you need.

---

## Doc index

Three homes: business documents in `requirements/`, everything test-related in `qa/`, technical docs in `.scratch/docs/`.

| Path | One-line purpose |
|---|---|
| `requirements/brd.md` | Full business requirements, all feature specs |
| `requirements/<feature>/spec.md` + `issues/` | Per-phase spec and its tickets (`fintrack-bd-mvp`, `fintrack-bd-phase-2` … `-4`) |
| `qa/README.md` | Test suites (smoke, sanity, happy path, regression), how to run them, where results go |
| `qa/test-cases/` | Master manual workbook `FinTrack-BD_Test-Cases.xlsx` + per-phase `TC-xxx` matrices |
| `qa/automation/` | Playwright `e2e/`, Vitest `api/` tests and shared `helpers/` |
| `.scratch/docs/project-overview.md` | Scope, phases, file map, open decisions — read first |
| `.scratch/docs/rules.md` | Paisa rule, formatBDT, soft-delete, routing — non-negotiable constraints |
| `.scratch/docs/architecture.md` | Stack, DB schema, API contracts, security, deploy |
| `.scratch/docs/design.md` | Color tokens, typography, component wireframes, Bangladesh display rules |
| `.scratch/docs/adr/` | Architecture decision records (append when making a new arch decision) |
| `.scratch/docs/agents/` | Issue-tracker conventions, triage labels, domain doc layout |

Component and package unit tests stay next to their code (`components/**/*.test.tsx`, `packages/*/src/**/*.test.ts`).

---

## Issue tracker

Tickets live under `requirements/fintrack-bd-mvp/issues/` (and the other `requirements/<feature>/issues/` folders). Pick the lowest-numbered `ready-for-agent` ticket whose blockers are all done. See `.scratch/docs/agents/issue-tracker.md` for the full convention.

Triage labels: `needs-triage` · `needs-info` · `ready-for-agent` · `ready-for-human` · `wontfix`

---

## Domain

`GLOSSARY.md` at repo root defines all domain terms. Use glossary vocabulary in code, comments, and variable names. ADRs go in `.scratch/docs/adr/`.
