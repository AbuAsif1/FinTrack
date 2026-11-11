# FinTrack BD — Architecture & Stack

**Read this before implementing any backend service, API endpoint, database query, or frontend data-fetching layer.**

---

## Monorepo Layout

```
fintrack-bd/
├── packages/
│   ├── shared/          # Zod schemas, TypeScript types, formatBDT, fiscalYear
│   └── tax-engine/      # Pure function tax calculator — no I/O, no DB
├── app/                 # Next.js App Router (frontend + API routes in one)
│   ├── api/             # API route handlers (replaces Fastify)
│   │   ├── auth/
│   │   ├── transactions/
│   │   └── ...
│   ├── (dashboard)/     # Frontend pages
│   └── layout.tsx
├── components/          # React components
├── lib/                 # Prisma client, auth helpers, shared utilities
└── pnpm-workspace.yaml
```

**Package manager:** `pnpm` workspaces. Never use `npm` or `yarn` in this repo.

---

## Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 14 (App Router) | Frontend + API routes in one app |
| Language | TypeScript | — |
| Server state | TanStack Query (React Query v5) | In Client Components; no useState for server data |
| Forms | React Hook Form + Zod | Zod schemas from `packages/shared` |
| Charts | Recharts | — |
| API layer | Next.js Route Handlers | `app/api/**/route.ts` — replaces Fastify |
| Validation | Zod | Shared schemas in `packages/shared` |
| ORM | Prisma | Use `@prisma/adapter-neon` for Neon compatibility |
| Database | Neon (serverless PostgreSQL) | Free tier; all money as BIGINT paisa |
| Auth | JWT + HTTP-only cookie | 15 min access token / 30 day refresh cookie |
| Hosting | Vercel (free tier) | Frontend + API routes, single deployment |
| File/Image storage | Cloudinary (free tier) | Profile images if needed; not required for MVP |

---

## Authentication

- **Access token:** JWT, 15-minute TTL, stored in memory (React state / React Query cache) on the client.
- **Refresh token:** HTTP-only cookie, 30-day TTL, `SameSite=Strict`, `Secure` in production.
- **Refresh flow:** `POST /api/auth/refresh` rotates the cookie and returns a new access token.
- **All routes except `/api/auth/*` require a valid JWT.** Return `401` otherwise.
- **Every DB query must filter by `user_id` from the JWT claim.** Extract from token in a shared `getAuthUser(request)` helper in `lib/auth.ts`.
- **Next.js route handler auth pattern:**
```ts
// lib/auth.ts
export async function getAuthUser(req: Request): Promise<User> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) throw new AuthError(401);
  return verifyJwt(token); // throws on invalid/expired
}

// app/api/transactions/route.ts
export async function GET(req: Request) {
  const user = await getAuthUser(req); // 401 if missing
  const data = await prisma.transaction.findMany({ where: { userId: user.id, isDeleted: false } });
  return Response.json(data);
}
```

---

## Database Schema (13 tables)

All monetary columns are `BIGINT` storing Paisa (1 BDT = 100 Paisa). No `FLOAT` or `DECIMAL` for money, ever.

| Table | Purpose |
|---|---|
| `users` | Account credentials and profile |
| `income_entries` | Monthly income by type (salary, bonus, cheer, TDS) |
| `transactions` | All spending/transfer events; soft-delete only |
| `categories` | Category definitions with `routing_type` enum |
| `fixed_expenses` | Recurring expense templates |
| `fixed_expense_instances` | Monthly instance per template (pending/paid/skipped) |
| `savings_accounts` | Savings, DPS, Sanchaypatra accounts |
| `loan_persons` | Named individuals in the borrow-loan ledger |
| `loan_entries` | Per-person loan entries (direction: given/received) |
| `tax_years` | Tax slab config per fiscal year (JSON column, not code) |
| `tax_investments` | Investment amounts for rebate calculation per fiscal year |
| `budgets` | Monthly category spending limits |
| `notifications` | In-app alerts (overdue, over-budget, loan due) |

**Key schema invariants:**
- `savings_accounts` has **no `balance` column** — balance is always computed.
- `transactions` and `loan_entries` have `is_deleted BOOLEAN DEFAULT FALSE` — no hard deletes.
- `transactions.idempotency_key` is a unique UUID (client-generated) to prevent double-submission.
- `tax_years.is_locked = TRUE` after 30 June closes the fiscal year.

---

## Critical Architectural Decisions

### 1. Integer money (Paisa)
All BDT amounts travel as integers. Multiply by 100 on user input. Divide by 100 **only at the display layer**. All SQL aggregations operate on integers. This eliminates the floating-point drift in the existing Excel files.

### 2. Tax engine — pure function in `packages/tax-engine`
```ts
calculateTax(slabs: TaxSlab[], incomeEntries: IncomeEntry[], investments: TaxInvestments): TaxResult
```
- No I/O. No database calls. No side effects.
- Shared between the API endpoint and the frontend "live preview".
- Slabs passed in at call time from `tax_years` DB data — never hardcoded inside the function.
- 100% branch coverage is mandatory on this package.

### 3. Category routing — atomic Prisma transaction
`CategoryRoutingService.apply(transaction, prismaClient)` runs all side-effects in one `prisma.$transaction([...])` call:

| Routing type | Side-effect |
|---|---|
| `DPS_TRANSFER` | Credit linked savings account + credit DPS rebate tracker |
| `SANCHAYPATRA_TRANSFER` | Credit rebate tracker |
| `LOAN_GIVEN` | Create `loan_entries` row (direction: given) |
| `LOAN_RECEIVED` | Create `loan_entries` row (direction: received) |
| `TAX_PAYMENT` | Credit `tax_investments.paid_paisa` |
| `NONE` | No side-effect |

If any step throws, the entire DB transaction rolls back. Frontend receives either complete success or error with no partial state.

### 4. Computed savings balance
`savings_accounts` has no `balance` column. Always compute:
```sql
SELECT sa.opening_balance_paisa + COALESCE(SUM(t.amount_paisa), 0) AS balance_paisa
FROM savings_accounts sa
LEFT JOIN transactions t
  ON t.linked_entity_id = sa.id
  AND t.linked_entity_type = 'savings_account'
  AND t.is_deleted = FALSE
WHERE sa.id = $1
```

### 5. Fiscal year utility
One function, one place in `packages/shared`:
```ts
export function fiscalYear(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-indexed
  return m >= 6
    ? `${y}-${String(y + 1).slice(-2)}`
    : `${y - 1}-${String(y).slice(-2)}`;
}
// fiscalYear(new Date("2025-07-01")) === "2025-26"
// fiscalYear(new Date("2025-06-30")) === "2024-25"
```
Never compute fiscal year inline in feature code. Always import this function.

### 6. Idempotent transaction creation
Client generates a UUID before POST. Backend stores it in `transactions.idempotency_key` (UNIQUE constraint). Duplicate key returns `409` with the already-created record body. Network retries are safe.

### 7. Soft delete only
Never `DELETE FROM transactions` or `loan_entries`. Set `is_deleted = TRUE`. All balance and spending aggregate queries must include `WHERE is_deleted = FALSE`.

### 8. Two-time-axis design
| Axis | Used for |
|---|---|
| Calendar month | Spending, budgets, fixed expenses, dashboard summaries |
| Fiscal year (Jul–Jun) | Tax module, annual income totals |

Never mix these axes in a single query. Use `fiscalYear()` for tax axis; use `DATE_TRUNC('month', date)` for calendar axis.

---

## API Design Conventions

- Base path: `/api/v1/`
- All money values in JSON: integers (Paisa), field names ending in `_paisa`
- Timestamps: ISO 8601 UTC strings
- Fiscal year strings: `"YYYY-YY"` format (e.g. `"2025-26"`)
- Error shape: `{ error: string, code: string }`
- Auth error: `401 { error: "Unauthorized" }`
- Validation error: `422 { error: "...", fields: { field: "message" } }`
- Idempotency conflict: `409 { error: "Duplicate", existing: <record> }`

**Route handler file location:** `app/api/<resource>/route.ts` for collection endpoints, `app/api/<resource>/[id]/route.ts` for single-resource endpoints.

**Full endpoint list:** see `.scratch/docs/brd.md` §8 Architecture → API Endpoint Summary.

---

## Security Requirements

1. All routes except `/auth/*` verify JWT; return `401` if missing or expired.
2. Every Prisma query includes `where: { userId: req.user.id }`.
3. Store only last 4 digits of bank account numbers. Never log full numbers.
4. HTTPS only in production. No financial data in response-body logs.
5. `SameSite=Strict; HttpOnly; Secure` on refresh cookie.
6. Parameterised queries via Prisma only. No raw string interpolation in SQL.
7. Rate limit: 10 login attempts per IP per 15 minutes.

---

## Frontend Architecture

- **`'use client'`** required on any component using React Query, hooks, or browser APIs. Server Components fetch DB directly via Prisma when no interactivity needed.
- **React Query** manages all server state in Client Components. No `useState` for server data.
- **Zod schemas from `packages/shared`** reused directly in forms — no duplicate schemas.
- **Bottom nav bar** with 5 tabs: Dashboard, Transactions, Savings, Loans, Tax.
- **`formatBDT(paisa: number): string`** on every monetary display — see `.scratch/docs/rules.md`.
- **PWA manifest** at `/public/manifest.json`; `theme_color: "#3A5FCD"`.
- **`next.config.ts`** must enable PWA via `next-pwa` plugin.
- Design tokens, color palette, typography: `.scratch/docs/design.md` is authoritative.

---

## Deployment

### Current (free tier — development & staging)

| Component | Platform | Notes |
|---|---|---|
| Next.js app (frontend + API) | **Vercel** free tier | Single deployment; auto-deploys on push to `main` |
| PostgreSQL | **Neon** free tier | Serverless PostgreSQL; Vercel has official Neon integration |
| File storage | **Cloudinary** free tier | For any user-uploaded images; not required for MVP |

### Environment variables (Vercel dashboard + `.env.local` for local dev)

```
DATABASE_URL=postgresql://...@...neon.tech/fintrack?sslmode=require
JWT_SECRET=
REFRESH_TOKEN_SECRET=
```

All vars also documented in `.env.example` at repo root. No `VITE_API_BASE_URL` needed — API routes are co-located in the same Next.js app.

### Neon-specific Prisma setup
Neon requires the serverless driver. In `lib/prisma.ts`:
```ts
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaNeon(pool);

export const prisma = new PrismaClient({ adapter });
```
Import `prisma` from `lib/prisma` everywhere. Never instantiate `PrismaClient` directly in a route handler.

### Future (production migration)
When ready to scale:
- **App:** upgrade Vercel to Pro, or migrate to a VPS running Next.js with `next start`
- **DB:** upgrade Neon to paid tier (no code changes — just a bigger plan)
- Zero application code changes — only hosting plan upgrades.
