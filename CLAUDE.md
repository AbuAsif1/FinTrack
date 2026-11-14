## Start here

Read `.scratch/docs/project-overview.md` first. One read gives you project scope, file map, domain rules, and what is still open.

---

## Which docs to read before implementing

| If your ticket is… | Read these docs |
|---|---|
| Any ticket | `.scratch/docs/rules.md` — strict constraints every agent must obey |
| Backend (API, DB, service layer) | `rules.md` + `.scratch/docs/architecture.md` |
| Frontend (React components, forms, charts) | `rules.md` + `.scratch/docs/design.md` + `.scratch/docs/architecture.md` §Frontend |
| Tax module (any ticket touching tax) | above + `.scratch/docs/brd.md` §6 Tax Module |
| Data model / DB schema | `.scratch/docs/architecture.md` §Database Schema |
| A new ticket or spec | `.scratch/docs/brd.md` for full requirements |

**Shortcut for most tickets:** `rules.md` + `architecture.md` cover 90% of what you need.

---

## Doc index (all under `.scratch/docs/`)

| File | One-line purpose |
|---|---|
| `project-overview.md` | Scope, phases, file map, open decisions — read first |
| `rules.md` | Paisa rule, formatBDT, soft-delete, routing — non-negotiable constraints |
| `architecture.md` | Stack, DB schema, API contracts, security, deploy |
| `design.md` | Color tokens, typography, component wireframes, Bangladesh display rules |
| `brd.md` | Full business requirements, all feature specs |
| `adr/` | Architecture decision records (append when making a new arch decision) |
| `agents/` | Issue-tracker conventions, triage labels, domain doc layout |

---

## Issue tracker

Tickets live under `.scratch/fintrack-bd-mvp/issues/`. Pick the lowest-numbered `ready-for-agent` ticket whose blockers are all done. See `.scratch/docs/agents/issue-tracker.md` for the full convention.

Triage labels: `needs-triage` · `needs-info` · `ready-for-agent` · `ready-for-human` · `wontfix`

---

## Domain

`GLOSSARY.md` at repo root defines all domain terms. Use glossary vocabulary in code, comments, and variable names. ADRs go in `.scratch/docs/adr/`.
