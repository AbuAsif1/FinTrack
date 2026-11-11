# FinTrack BD — Project Overview

> **Read this first.** This document is the single entry point for any new Claude context working on this project. It tells you what the project is, what has been done, what is in progress, and what every file in the repository is for.

---

## What This Project Is

**FinTrack BD** is a personal finance tracking web application for a salaried professional in Bangladesh. It replaces three manual Excel spreadsheets with a single, mobile-friendly, always-available system.

The three spreadsheets it replaces:

| Sheet | What it tracked |
|-------|----------------|
| `Sheet5` (income/tax) | Monthly salary, profit share, bonuses, TDS deducted, tax slab calculations across fiscal years |
| `Fixed Spent` | Monthly recurring expenses (DPS, rent, internet, electricity) with per-month deadline checkboxes |
| `BorrowLoan` | Money lent to or borrowed from named individuals with running balances per person |

Source Excel files:
- `/Users/abuasif/Downloads/Asif - Finance 2024.xlsx` — income, fixed spending, borrow-loan history
- `/Users/abuasif/Downloads/Bangladesh-Tax-Calculator-Final.xlsx` — Bangladesh NBR tax calculation logic

---

## Current Project Phase

**Phase: Requirements & Design** — not yet in development.

- [x] Business Requirements Document drafted (`docs/brd.md`)
- [x] Domain glossary created (`GLOSSARY.md`)
- [x] Interactive artifact published at https://claude.ai/artifact/7dj3aJthhaLyERWfPS6LU3
- [x] Excel files analyzed for real data patterns and acceptance criteria
- [ ] **Grilling session Round 1 open** — 7 design-tree questions unanswered (see below)
- [ ] ADRs not yet written — awaiting grilling session completion
- [ ] Architecture not finalized
- [ ] Development not started

---

## Repository File Structure

```
Self_Finance/
├── CLAUDE.md                      — agent skill pointers (issue tracker, triage, domain docs)
├── GLOSSARY.md                    — canonical domain terms (17 definitions)
├── docs/
│   ├── project-overview.md        — THIS FILE — start here in every new context
│   ├── brd.md                     — full Business Requirements Document (11 sections)
│   ├── adr/                       — Architectural Decision Records (empty — pending grilling)
│   └── agents/
│       ├── domain.md              — domain doc conventions
│       ├── issue-tracker.md       — issue tracking conventions
│       └── triage-labels.md       — triage label vocabulary
```

---

## Key Domain Concepts

Always read `GLOSSARY.md` before naming a variable, table, or UI label. Critical terms:

**Paisa** — all money stored as integer paisa (1 BDT = 100 paisa). Never use floats for money. Divide by 100 only at the display layer.

**Fiscal Year** — 1 July to 30 June (Bangladesh NBR). Format: "YYYY-YY" (e.g., "2025-26"). Tax calculations use fiscal year. Budgets and spending use calendar month. These are two separate time axes — never mix them.

**In-Hand Income vs. Gross Income** — Gross is what the employer pays. In-Hand is after TDS. Dashboard and budgets use In-Hand. The Tax module uses Gross.

**DPS payment = Transfer, not Spending** — it moves money from cash to a savings account. Does not inflate spending totals. Does count toward tax rebate investment (up to ৳1,20,000/year cap).

**Loan Entry direction is always first-person** — "Given" = money left the user's hands. "Received" = money came to the user. Running Balance sign tells you who owes whom: positive = they owe the user, negative = user owes them.

**Transaction vs. Transfer** — a Transaction is money moving to/from an external party (spending or income). A Transfer is money moving between the user's own accounts (DPS, Sanchaypatra). Transfers do not appear in spending totals.

---

## What the BRD Contains

`docs/brd.md` — 11 sections:

1. Product Overview
2. Problem Statement — pain points vs. desired outcomes
3. Scope — in scope (MVP + V2) vs. out of scope
4. Multi-Role Analysis — BA / architect / developer / QA perspectives
5. Feature Requirements — FR-01 to FR-10 (auth, dashboard, income, spending, fixed expenses, savings/DPS, borrow-loan, history, notifications, budgets)
6. Tax Module — Bangladesh NBR rules: fiscal year, taxable income formula, slab config (data-driven, not hard-coded), rebate formula, TDS reconciliation
7. Data Model — 13 DB entities, fields, and 8 business rules enforced at the data layer
8. Solution Architecture — tech stack, 6 critical engineering decisions, API endpoints, security rules
9. Gap Analysis — 10 gaps identified from the original idea with risk + solution + insight
10. Roadmap — feature priority matrix + 8-sprint MVP plan
11. QA Requirements — acceptance criteria with exact BDT figures from real data, test pyramid, non-functional thresholds

---

## Grilling Session — Round 1 (Open, Unanswered)

A design-tree grilling session was started. **7 questions were posed and not yet answered.** Do not finalize architecture or write ADRs until these are settled.

| # | Question | Recommended answer |
|---|----------|--------------------|
| Q1 | Platform — PWA or native app? | PWA (mobile-first web, one codebase, installable) |
| Q2 | Hosting — cloud or self-hosted? | Cloud-hosted (Railway + Vercel) |
| Q3 | User base — single-user or multi-tenant? | Single-user V1, DB scaffolded for multi-user later |
| Q4 | DPS modelled as Transfer (not Spending)? | Yes |
| Q5 | Budget/spending views use calendar month (not fiscal month)? | Yes — fiscal year only in Tax module |
| Q6 | In-Hand Income as the primary dashboard figure (not Gross)? | Yes |
| Q7 | Loan entry direction always from user's first-person perspective? | Yes — Given = money out, Received = money in |

When the user answers, record settled decisions as ADRs in `docs/adr/` where appropriate (hard to reverse, surprising without context, result of a real trade-off), then ask Round 2.

---

## Tax Calculation Rules (Bangladesh NBR FY2025-26)

Derived from the user's tax calculator Excel. The tax engine must implement these exactly:

```
Gross Annual   = Σ(all income entries for Jul–Jun)
Exemption      = MIN(Gross / 3, 500,000)
Taxable        = Gross − Exemption

Slabs (FY2025-26):
  0%  on first ৳3,75,000
  10% on next  ৳3,00,000
  15% on next  ৳4,00,000
  20% on next  ৳5,00,000
  25% on next  ৳20,00,000
  30% on remaining

Investment rebate caps: DPS ৳1,20,000 · Sanchaypatra ৳5,00,000 · Stocks ৳5,00,000 · Insurance no cap · Others no cap

Rebate = MIN(Taxable × 0.03, TotalEligibleInvestment × 0.10, 1,000,000)
Net Tax = Gross Tax − Rebate − FirstQuarterDiscount (5% if filed before Sep 30)

Monthly suggested TDS = MAX(0, Net Tax − TDS paid so far) / remaining months in fiscal year
```

---

## Real Data Acceptance Criteria

Exact figures from the user's Excel files — these must pass as QA acceptance tests:

| Data point | Value |
|-----------|-------|
| Mithun loan balance | ৳9,841 (Mithun owes user — green) |
| Amait loan balance | ৳1,198.50 (Amait owes user — green) |
| Sohel loan balance | ৳-3,145.42 (user owes Sohel — red) |
| Total borrow-loan balance | ৳13,894.08 |
| Current monthly salary | ৳1,53,383 (from Apr 2026) |
| Previous monthly salary | ৳1,22,700 (Jul 2025 – Mar 2026) |
| FY2025-26 net tax payable | ৳1,35,225 |
| FY2025-26 TDS paid | ৳1,32,488 |
| FY2025-26 remaining tax | ৳2,737 |
| Monthly fixed commitments | ~৳60,732 (DPS ৳50,000 + rent + internet + electricity + YouTube) |

---

## Recommended Tech Stack (from BRD, not yet confirmed)

| Layer | Choice |
|-------|--------|
| Frontend | React + TypeScript (Vite) |
| State | React Query |
| Charts | Recharts |
| Backend | Node.js + Fastify |
| Validation | Zod (shared frontend/backend schemas) |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT (15 min access) + HTTP-only refresh cookie (30 days) |
| Hosting | Railway (backend + DB) + Vercel (frontend) |
| PWA | Vite PWA plugin |

---

## Sprint Plan (MVP = 8 × 2-week sprints)

| Sprint | Focus |
|--------|-------|
| 1 | Foundation — DB schema, auth API, React shell, deployment pipeline |
| 2 | Transactions Core — CRUD, category routing service, transaction list |
| 3 | Income & Savings — monthly income entry, savings accounts, DPS flow |
| 4 | Fixed Expenses — templates, monthly instances, mark-as-paid, dashboard banner |
| 5 | Borrow-Loan Ledger — per-person CRUD, running balance, Settle Up action |
| 6 | Tax Dashboard — slab config, tax engine, TDS reconciliation, investment entry |
| 7 | Dashboard & Notifications — period selector, summary cards, charts, notifications |
| 8 | Polish & Launch — mobile pass, error/empty/loading states, UAT, production |

---

## Working Instructions for Any New Context

1. **Read `GLOSSARY.md` before naming anything.** The domain model is precise and intentional.
2. **Do not start sprint work** until grilling Round 1 is answered and decisions are recorded as ADRs.
3. **Money = integer paisa everywhere.** A float for a BDT amount is always a bug.
4. **Tax calculation must use actual monthly entries**, never annualize a single salary figure.
5. **Category routing side-effects must be atomic** — one DB transaction, all-or-nothing.
6. **Soft delete only** for transactions and loan entries — financial history is never destroyed.
7. **Check `docs/adr/`** before any hard-to-reverse decision — it may already be settled.
8. **The grilling session drives Round 2** — do not ask the user questions that belong in the grilling tree; check this doc first.
