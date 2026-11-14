# 12: Frontend Shell & Auth UI

**What to build:** The app shell every screen plugs into: providers, API client, session handling, login page, navigation, theme, design tokens and the shared UI primitives.

**Blocked by:** 02

**Status:** done

**Test cases:** `test-cases/17-ui.md` §Shell (`TC-UI-001` to `TC-UI-008`) · `test-cases/19-security.md` (`TC-SEC-007`, `TC-SEC-008`)

**Read first:** `rules.md` §10 · `architecture.md` §Frontend, §Authentication and sessions (Client flow, `middleware.ts`) · `design.md` §2, §3, §4, §5, §7.10, §8, §9

- [ ] `app/layout.tsx` with the TanStack Query provider and theme provider; Server Components render the static shell and all data is fetched in Client Components
- [ ] `lib/api.ts`: Axios instance with the Bearer header and one refresh-and-retry on 401; the access token is kept in memory
- [ ] On load, `POST /auth/refresh` restores the session; failure routes to `/login`
- [ ] `middleware.ts` redirects requests for app pages that have no refresh cookie to `/login`; the public account pages are exempt
- [ ] Shared account-page layout from `design.md` §7.10 (centred card, no navigation shell)
- [ ] Sign in page per `design.md` §7.10: email and password form with an error state; attempts a silent refresh before showing the form. The Create account and Forgot password pages are ticket 25.
- [ ] Navigation per `design.md` §8: left sidebar on desktop; on mobile a bottom tab bar (Home, Transactions, Add, Fixed, More) with the remaining sections in the More drawer; top bar with page title and notification bell
- [ ] A route stub for every page listed in `architecture.md` §Frontend
- [ ] Design tokens as CSS custom properties for light and dark; theme choice (Light / Dark / System) stored in `localStorage`; fonts through `next/font`
- [ ] Shared primitives from `design.md` §5: Summary Tile, Status Badge, Progress Bar, Alert Banner, Empty State, Modal and bottom sheet, `Amount` (renders `formatBDT`, right-aligned, tabular numerals) and `MoneyInput` (uses `parseBDT`)
- [ ] PWA manifest and the `next-pwa` service worker stub
- [ ] Tests: `MoneyInput` turns "50000" and "1198.50" into Paisa and rejects three decimals; `Amount` renders the `AC-FMT-1` values; an unauthenticated visit lands on `/login`

---

## Why

Every page in the app shares the same authenticated shell: navigation, top bar, session management, the API client with auto-refresh, and the shared UI primitives (Amount, MoneyInput, Modal, Status Badge, etc.). Building this once — correctly — means later tickets (14, 15, 16, 17, 18, 19, 20) only need to build the content of their page, not re-implement session handling or design primitives. The MoneyInput and Amount components are especially critical: `MoneyInput` must correctly parse Bengali taka amounts (including two-decimal support but rejecting three) and `Amount` must render them consistently in every context.

## User flows

### First visit to the app (unauthenticated)
1. User opens the app URL in their browser.
2. `middleware.ts` checks for a refresh cookie. Finding none, redirects to `/login`.
3. The sign-in page loads (no shell, just the centred account-page card layout).
4. The app silently attempts `POST /auth/refresh` before showing the form. If a valid cookie exists (returning user), the user is redirected to the app without needing to enter credentials.

### Navigating the app after sign-in
1. After sign-in, the user sees the full shell:
   - Desktop: left sidebar with navigation items (Dashboard, Transactions, Fixed, Savings, Loans, Tax, History, Settings, Admin if admin role).
   - Mobile: bottom tab bar with priority items (Home, Transactions, Fixed, More drawer) + global topbar with Add Expenses, Add Income, Mark Fixed Paid quick-action buttons.
2. Clicking a nav item loads the corresponding page. The page title updates in the top bar.

### Theme switching
1. User opens Settings → Appearance.
2. Selects "Dark." Theme switches immediately. The choice is stored in `localStorage`.
3. On next visit, the stored preference is applied before the page renders (no flash).

### Session expiry
1. User leaves the app open for 20 minutes without activity. The access token expires.
2. They interact with any page. `lib/api.ts` intercepts the 401, calls `POST /auth/refresh`, gets a new token, and retries the original request.
3. The user sees no interruption — the page loads normally.

## Scenarios

**Scenario A — mobile bottom tab navigation:** A user on iPhone navigates to Fixed Expenses from the bottom tab bar. The "Fixed" tab is highlighted. They tap "More" to reach the Tax Dashboard (not in the primary tabs). The More drawer shows remaining navigation items.

**Scenario B — MoneyInput validates three decimals:** A user types "৳1,234.567" in a money input. The input shows an error "Too many decimal places." Save is disabled. The correct input is "৳1,234.57."

**Scenario C — Amount renders correctly:** The Amount component receives `125000` Paisa and renders "১,২৫০.০০" with the ৳ symbol, right-aligned with tabular numerals (as in AC-FMT-1). This is the same rendering used in all tiles, tables, and transaction rows across the app.

**Scenario D — API client refresh race:** Two concurrent API calls both get a 401 at the same time. `lib/api.ts` serializes refresh requests — only one `POST /auth/refresh` goes out. Both pending calls wait for the single refresh response and retry with the new token. No duplicate refresh calls.

## Context notes

- The access token is kept in memory inside `lib/api.ts` only. Never store it in `localStorage` or a cookie — that is an XSS vulnerability (ADR-0010).
- Server Components render the static shell. Data fetching happens in Client Components. This is a Next.js App Router constraint — do not add data fetching to `layout.tsx`.
- `MoneyInput` uses `parseBDT` to convert display strings to Paisa. `Amount` uses `formatBDT`. These are the only components that should do money formatting — do not format amounts elsewhere.
- Route stubs: ticket 12 creates a page file for every route listed in `architecture.md` §Frontend. Later tickets fill in the content. If a route stub does not exist, the later ticket must create the page from scratch — always check if a stub exists before creating a new page.
- The notification bell badge count comes from the dashboard summary's `unread_notification_count`. It updates when the dashboard data refreshes. It does not need its own polling endpoint.

## Comments
