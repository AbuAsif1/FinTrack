# FinTrack BD — Project Overview

> **Owns:** current status, the file map, the release plan and open items. Read this first.
> Everything else is one hop away: the table in `CLAUDE.md` says which doc owns which topic.

---

## What this project is

**FinTrack BD** is a personal finance web application for a salaried professional in Bangladesh. It replaces three Excel sheets (income and tax, fixed monthly spending, borrow-loan ledger) with one mobile-first PWA that understands the Bangladesh Fiscal Year, TDS, tax rebate on DPS and Sanchaypatra, and informal loans between friends.

---

## Status

**Phase: Sprint 1 — in development.**

> **Development hold lifted 2026-11-12** by the owner. Sprint 1 is in progress on branch `ticket/01-monorepo-core-foundation`.

- [x] BRD v1.1, architecture, rules, design and glossary aligned on one stack and one data model
- [x] Decisions recorded as ADR-0001 to ADR-0011
- [x] MVP broken into 25 agent tickets and 1 owner ticket
- [x] Regression test matrix written for every MVP feature; each ticket names its cases
- [x] Phase 2 backlog and Phase 3 idea captured
- [ ] Owner confirms the tax parameters (ticket 24)
- [x] Owner lifts the development hold
- [ ] Development (Sprint 1 in progress)

---

## Release plan

### MVP (current release)

Tickets are in `.scratch/fintrack-bd-mvp/issues/`. Sprint order:

| Sprint | Focus | Tickets |
|---|---|---|
| 1 | Foundation: repo, schema, tax engine, auth, app shell, registration | 01, 02, 12, 25 |
| 2 | Ledger core: Transactions, savings accounts, loans, category routing; admin user management | 03, 04, 05, 06, 26 |
| 3 | Income and savings screens | 07, 14 |
| 4 | Fixed Expenses | 08, 16 |
| 5 | Budgets and notifications; Transactions and Loans screens | 10, 15, 17 |
| 6 | Tax API and Tax Dashboard | 09, 18 |
| 7 | Dashboard, analytics, notifications and settings screens | 11, 13, 19, 20 |
| 8 | Import, export, PWA polish, UAT and production | 22, 23, 21 |

Ticket 24 is `ready-for-human`: the owner confirms tax parameters against NBR rules. It blocks nothing.

### Phase 2

`.scratch/fintrack-bd-phase-2/spec.md`, status `needs-triage`. Scope summary: `brd.md` §3.

### Phase 3

`.scratch/fintrack-bd-phase-3/spec.md`, status `needs-triage`: a possible subscription feature.

---

## File map

```
FinTrack/
├── CLAUDE.md                          — routing: which doc owns which topic
├── GLOSSARY.md                        — domain terms
└── .scratch/
    ├── docs/
    │   ├── project-overview.md        — this file
    │   ├── rules.md                   — constraints for every change
    │   ├── architecture.md            — stack, schema, API, routing, derived values, testing, deploy
    │   ├── brd.md                     — scope, feature rules, tax module, acceptance fixtures
    │   ├── design.md                  — tokens, components, page wireframes
    │   ├── adr/                       — 0001–0011, one decision each
    │   └── agents/                    — issue-tracker, triage-label and domain-doc conventions
    ├── fintrack-bd-mvp/
    │   ├── spec.md                    — user stories and test seams
    │   ├── issues/                    — 01–26
    │   └── test-cases/                — regression test matrix, 19 files of TC-… cases
    ├── fintrack-bd-phase-2/
    │   └── spec.md                    — Phase 2 backlog
    └── fintrack-bd-phase-3/
        └── spec.md                    — Phase 3 ideas (subscription)
```

---

## Decisions already made

Read the ADR before reopening any of these.

| ADR | Decision |
|---|---|
| 0001 | One Next.js app on Vercel with Neon PostgreSQL; installable PWA, no native app |
| 0002 | Superseded by 0010 |
| 0003 | Money is integer Paisa end to end, as JSON numbers |
| 0004 | Business dates are calendar dates in Asia/Dhaka |
| 0005 | Balances and tax totals are derived, never stored |
| 0006 | Savings deposits are Transfers, not Spending |
| 0007 | Calendar months for cash, Fiscal Years for tax |
| 0008 | Tax rules are per-Fiscal-Year data, provisional until confirmed |
| 0009 | Instances and notifications are generated on read; no scheduler |
| 0010 | Public registration with email verification in the MVP; every user sees only their own data |
| 0011 | Admins manage user accounts and never see financial data |

The seven questions of grilling Round 1 are settled by these ADRs and the glossary: PWA (0001), cloud hosting (0001), multiple users each scoped by `user_id` (0010, the owner's choice), DPS as a Transfer (0006), calendar months for budgets (0007), In-Hand Income as the dashboard figure (0007), loan direction from the user's side (`GLOSSARY.md`, Loan Entry). The owner can reopen any of them.

---

## Open items

| Item | Where |
|---|---|
| Rebate investment rate, tax-free threshold and exemption caps differ between the user's spreadsheet and published summaries | Ticket 24; `brd.md` §6 FR-TAX-03 |
| The spreadsheet's FY2025-26 net tax (৳1,35,225) is ৳144.20 below the documented formula's result | Ticket 24; `brd.md` §11 AC-TAX-1 |
| Payment dates are a manual admin log in the MVP; a subscription feature is only an idea for Phase 3 | `brd.md` §5 FR-14; `.scratch/fintrack-bd-phase-3/spec.md` |
| The suggested Fixed Expenses are the owner's personal ones, and every new user is offered them | `brd.md` §5 FR-05 |
| The two source spreadsheets are not in the repository | Owner's machine: `Asif - Finance 2024.xlsx`, `Bangladesh-Tax-Calculator-Final.xlsx` |

---

## Working agreements

1. Check the Status section above for a development hold before starting work.
2. Read `rules.md` for every ticket, then the sections named on the ticket's **Read first** line. Use the matching installed skill for the kind of work (`CLAUDE.md` §Skills).
3. Work test-first from the ticket's **Test cases** line: one case, one failing test, then the code that passes it.
4. Use `GLOSSARY.md` terms in code, comments, names and UI text.
5. When two docs disagree, the owning doc wins; fix the other in the same change and note it under the ticket's `## Comments`.
6. Record a new hard-to-reverse decision as the next ADR.
