# FinTrack

A personal finance web application built for a salaried professional in Bangladesh. Replaces three separate Excel sheets — income and tax, fixed monthly spending, borrow-loan ledger — with one mobile-first Progressive Web App that understands Bangladesh-specific financial concepts.

---

## Features

### Authentication & Accounts

- Register with name, email, and password; email must be verified before first sign-in
- Sign in, reset forgotten password by email, and change password while signed in
- Session expires after 30 days of inactivity
- Each user sees only their own data — nothing is shared between users
- First-run checklist guides new users to: enter salary, add savings accounts, set up Fixed Expenses, and import history

### Dashboard

- Period selector: This Month / Last Month / This Tax Year / Last Tax Year / Custom Range
- Summary tiles: In-Hand Income, Total Spending, Net Savings, Savings Rate
- Discretionary Cash and Remaining to Spend (estimated from last month when this month's salary is not yet entered)
- Cash flow chart: income vs. spending for the last 6 months
- Spending by category: donut chart
- Fixed Expenses panel with due-soon (amber) and overdue (red) alerts
- Recent Transactions (last 10)
- Tax snapshot: Tax paid so far, estimated remaining, and suggested monthly TDS
- Borrow-loan summary: "People owe you ৳X · You owe ৳Y"
- Quick actions: Add Spending, Add Income, Mark Fixed Expense Paid

### Income Management

- Entry fields: month, income type, Gross Income, TDS, In-Hand Income (computed), taxable flag, employer name, comment
- Income types: Salary, Cheer / Incentive, Profit Share, Eid Festival Bonus, Leave Encashment, Certification Reimbursement, Holiday Support, Other
- Pre-fills new Salary entries from the previous month
- Year-to-date table per Fiscal Year: one row per month, columns per income component
- Salary history timeline: tracks changes in amount or employer over time
- Holiday Support log: date, days worked, rate type, per-day rate, amount

### Spending & Transactions

- Entry fields: amount, date, description, category, payment method (Cash / bKash / Bank Transfer / Card)
- Category-aware routing:
  - **DPS / Savings / Sanchaypatra** — raises the linked savings account balance; counts toward tax rebate
  - **Savings Withdrawal** — reduces the linked account balance
  - **Savings Interest** — adds to account balance with no cash movement
  - **Loan Given / Received** — creates a Loan Entry on the person's ledger
  - **Tax Payment** — adds to Tax Paid for the chosen Fiscal Year
  - **Groceries, Dining, Transport, Utility, Rent, Entertainment, Health, Shopping, Other** — counts toward spending and budgets
- Transaction list with search and filters: date range, category, payment method, amount range, keywords
- Soft-delete with bulk delete; deleting a Fixed Expense payment returns that instance to Pending
- Custom categories: add, rename, recolour, and archive; a category's kind is fixed once used

### Fixed Recurring Expenses

- Template fields: name, standard amount, due day of month, category, linked savings account
- Suggested defaults: YouTube Premium, DPS installments, Mess Rent, Home Internet, Home Electricity
- One instance per template per calendar month, generated on first view of the month
- Mark as Paid: confirms actual amount and date; creates a linked Transaction automatically
- Skip with an optional note; a Skipped instance can be reopened
- Changing an amount only affects Pending instances from this month forward
- Deactivating a template stops new instances next month; history is preserved
- Monthly grid view: templates as rows, months as columns, amount and status per cell

### Savings & DPS

- Account types: Savings, DPS, Sanchaypatra, Investment, Cash
- DPS-specific fields: monthly installment, maturity date, interest rate
- Balance always computed: opening balance + deposits + interest − withdrawals
- Projected principal at maturity for each DPS (balance + remaining installments)
- Combined progress bar for all DPS deposits this Fiscal Year against the rebate cap
- Transaction history per account
- Accounts can be closed once balance reaches zero

### Borrow-Loan Ledger

- Summary: "People owe me ৳X · I owe people ৳Y · Net ৳Z"
- Per-person card with Running Balance and full transaction history
- Entry from Loans page or directly from a Transaction (both create a single record)
- Return due date alerts: amber when due within 3 days, red when overdue and balance is outstanding
- Settle Up: one entry that brings a person's Running Balance to zero
- Export any person's ledger as CSV

### Bangladesh Tax Module

- Fiscal Year runs 1 July – 30 June, written "YYYY-YY"
- Full 13-step tax calculation: Gross Income → Exemption → Taxable Income → Gross Tax → Rebate (DPS, Sanchaypatra) → Early Filing Rebate → Net Tax Payable
- Per-year editable parameters: tax-free threshold, slabs, exemption fraction and cap, rebate rates and caps, minimum tax, early-filing rebate
- Three Fiscal Years pre-seeded (FY2024-25, FY2025-26, FY2026-27), all marked provisional until confirmed
- Tax Paid = TDS on income entries + manual tax payments
- Remaining Tax and Suggested Monthly TDS updated in real time as income is entered
- Early Filing Rebate shown as a potential saving until the return is marked filed
- Lock a Fiscal Year when filing; unlocking restores editing
- Tax Dashboard: Tax Paid vs. Net Tax Payable, investment progress toward maximum rebate, filing deadline notice

### Budgets

- Monthly spending limit per category
- Progress bar: green below 70%, amber 70–100%, red above 100%
- Changed limits apply from the current month; earlier months keep their original limits
- Budgets reset each month with no rollover

### Notifications

- Types: Fixed Expense due soon, Fixed Expense overdue, loan return due soon, loan return overdue, budget at 80%, budget exceeded, tax settings provisional
- Notification bell with unread count
- Notifications refresh on dashboard load or bell open; clear automatically when the condition resolves

### History & Analytics

- Monthly summary: In-Hand Income, Total Spending, Net Savings, TDS, Savings Rate, Fixed Expense compliance
- Category spending trends over 12 months
- Income trends: salary, bonuses, Profit Share over time
- Savings Rate trend with 20% reference line
- Export selected period as CSV

### Data Import

- Import income, transactions, and loan history from CSV files
- Preview before saving: row count, totals, and all validation errors with reasons
- Nothing saved until confirmed; files with any invalid row cannot be confirmed
- Idempotent: importing the same file twice adds nothing
- Past imports can be fully undone

### Data Export & Backup

- Full JSON export of all user data
- CSV exports: Transactions by date range, income by Fiscal Year, one person's loan ledger, monthly summary for a period

### Settings

- Profile name and password change
- Light and dark theme
- Category management
- Tax Year Settings
- Import and export

### Admin User Management

- Admin accounts are separate from financial data — admins never see another user's transactions, income, loans, savings, tax data, or exports
- User list with search and filter: name, email, role, status, registered date, last sign-in, payment date
- Create user or admin: account created as verified, user receives email to set password
- Update: name, email, promote to admin
- Deactivate for a period (by end date) or until manually reactivated; user is signed out everywhere immediately
- Reactivate at any time
- Delete: permanently removes account and all data after email confirmation; irreversible; admin accounts cannot be deleted
- Account help: resend verification email, send password-reset email
- Payment date log: manual record of date paid, amount, coverage end date, and note
- Full change history: every admin action recorded with who did it and when
- Safeguards: admins cannot operate on their own account via the admin panel; admins cannot modify other admin accounts

### Progressive Web App

- Installable on mobile and desktop (Add to Home Screen)
- Service worker with app-shell caching
- Offline notice when connectivity is lost
- Error boundaries to prevent full-page crashes
- Light and dark themes

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router), TypeScript |
| Database | PostgreSQL 16 (Neon in production) |
| ORM | Prisma |
| Validation | Zod |
| Client state | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Auth | JWT (jose) + opaque refresh cookie |
| Email | Resend |
| PWA | next-pwa |
| Tests | Vitest (integration), Playwright (E2E) |
| Hosting | Vercel |
| Package manager | pnpm workspaces |

---

## Setup Guide

### Prerequisites

Install the following tools before cloning the project. See `requirements.txt` for exact version requirements.

| Tool | Minimum version | Install |
|---|---|---|
| **Node.js** | 20.x LTS | https://nodejs.org |
| **pnpm** | 9.x | `npm install -g pnpm` |
| **PostgreSQL** | 14.x | https://postgresql.org — or use [Neon](https://neon.tech) (free) |

> **Windows users:** Use [nvm-windows](https://github.com/coreybutler/nvm-windows) to manage Node versions. Make sure PostgreSQL's `bin` folder is on your PATH or use pgAdmin to create databases.

---

### Step 1 — Clone the repository

```bash
git clone https://github.com/AbuAsif1/FinTrack.git
cd FinTrack
```

---

### Step 2 — Install dependencies

```bash
pnpm install
```

This installs all packages for the main app and the internal `packages/` workspace (tax-engine, shared types).

---

### Step 3 — Create the database

**Option A — Local PostgreSQL**

```sql
-- Run in psql or pgAdmin
CREATE DATABASE fintrack;
CREATE DATABASE fintrack_test;   -- for running tests
```

**Option B — Neon (hosted, free tier)**

1. Sign up at https://neon.tech
2. Create a project — Neon gives you one database with a connection string.
3. Create a second branch or database named `fintrack_test` for tests.

---

### Step 4 — Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in every value:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string — e.g. `postgresql://user:pass@localhost:5432/fintrack` |
| `TEST_DATABASE_URL` | For tests | Separate DB used by Vitest and Playwright — e.g. `postgresql://user:pass@localhost:5432/fintrack_test` |
| `JWT_SECRET` | Yes | Any long random string — e.g. run `openssl rand -hex 32` |
| `APP_URL` | Yes | `http://localhost:3000` for local dev |
| `RESEND_API_KEY` | For emails | Get a free key at https://resend.com — set to `disabled` to skip emails locally |
| `EMAIL_FROM` | For emails | Sender address — e.g. `FinTrack <noreply@yourdomain.com>` |
| `SIGNUP_MODE` | Yes | `open` lets anyone register; `closed` blocks registration (use `open` for local dev) |
| `SEED_USER_EMAIL` | Yes | Email for the first admin account created by the seed script |
| `SEED_USER_PASSWORD` | Yes | Password for the seed admin (min 10 characters) |
| `SEED_USER_NAME` | Yes | Display name for the seed admin |
| `SENTRY_DSN` | Optional | Error tracking — leave commented out for local dev |

**Tip — generate a JWT secret on Windows (PowerShell):**
```powershell
-join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
```

---

### Step 5 — Run database migrations and seed

```bash
# Apply all Prisma migrations to your database
pnpm db:migrate

# Seed: creates the admin account and three default Fiscal Years
pnpm db:seed
```

After seeding, the admin account uses the email and password you set in `SEED_USER_EMAIL` / `SEED_USER_PASSWORD`.

---

### Step 6 — Start the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Sign in with your seed credentials. If email verification is required (Resend key is set), check your inbox; otherwise the seed account is pre-verified.

---

### Step 7 — (Optional) Create additional users

```bash
# Interactive prompt: name, email, password, role
pnpm user:create
```

---

## Running Tests

### Integration tests (Vitest)

```bash
pnpm test                  # run all unit and integration tests
pnpm test:watch            # watch mode
pnpm test:coverage         # with coverage report
pnpm test:tax              # tax-engine package only
```

> Requires `TEST_DATABASE_URL` to be set in `.env.local`.

### End-to-end tests (Playwright)

```bash
# First time only: download browser binaries
pnpm exec playwright install

# Run all E2E tests
pnpm test:e2e

# Happy-path smoke suite only
pnpm test:e2e:happy
```

---

## Useful Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Start dev server on http://localhost:3000 |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build locally |
| `pnpm typecheck` | TypeScript type-check without emitting |
| `pnpm lint` | ESLint |
| `pnpm db:migrate` | Apply pending Prisma migrations (dev) |
| `pnpm db:migrate:deploy` | Apply migrations in production (no prompt) |
| `pnpm db:seed` | Create seed admin and default fiscal years |
| `pnpm db:generate` | Re-generate Prisma client after schema changes |
| `pnpm user:create` | Create a new user/admin interactively |
| `pnpm user:reset-password` | Reset any user's password from the CLI |
| `pnpm user:set-role` | Promote or demote a user to/from admin |

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `TEST_DATABASE_URL` | Separate database for tests |
| `JWT_SECRET` | Signs access tokens (HS256 JWT) |
| `APP_URL` | Base URL used in email links |
| `RESEND_API_KEY` | Sending emails via Resend |
| `EMAIL_FROM` | Sender address for emails |
| `SIGNUP_MODE` | `open` or `closed` (closed returns 403 on registration) |
| `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` / `SEED_USER_NAME` | Owner account created by seed |
| `SENTRY_DSN` | Optional error tracking |

---

## Roadmap

**Phase 2** (specified, not yet built): overall monthly budget, wallet balances per payment method, savings goals, quarterly Fixed Expenses, transaction tags, what-if tax planner, bank statement import with column mapping, browser push notifications, Bangla language toggle.

**Phase 3** (idea only): subscription feature building on the admin payment-date log.
