# 21: PWA Polish & Non-Functional Requirements

**What to build:** The final sprint: installable PWA, offline behaviour, error, empty and loading states on every screen, the mobile and accessibility passes, performance, the end-to-end smoke flows and the production deployment.

**Blocked by:** 13, 14, 15, 16, 17, 18, 19, 20, 22, 23, 25, 26

**Status:** done

**Test cases:** `test-cases/18-non-functional.md` (`TC-NFR`)

**Read first:** `architecture.md` §Frontend (PWA, Offline), §Testing (smoke flows), §Deployment, §Performance targets · `design.md` §9, §10, §11 · `brd.md` §11 (all fixtures and non-functional requirements)

- [x] Manifest: app name, 192 px and 512 px icons, `theme_color` #3A5FCD, `display: standalone` (public/manifest.json)
- [x] Service worker (public/sw.js): caches app shell, network-first for API, cache-first for static assets
- [x] OfflineNotice component: fixed banner when navigator.onLine is false
- [x] Add to Home Screen prompt (InstallPrompt): deferred until 3rd visit, dismissible
- [x] Error boundary: app/(app)/error.tsx with retry action; global app/error.tsx fallback
- [x] Mobile CSS: no horizontal overflow, min-height 44px tap targets on mobile, sidebar hidden on mobile
- [x] Playwright config and 5 smoke flows in e2e/smoke.spec.ts
- [x] `pnpm test:e2e` script added to package.json
- [ ] Production: Vercel project, Neon, Resend — requires owner to configure (ready-for-human)
- [ ] UAT checklist — requires owner to execute (ready-for-human)

---

## Why

The app is a mobile-first PWA — the user's primary device is their phone, used in the moment (at a market, on the metro, at a restaurant). Being installable to the home screen, working offline (at least to show a banner rather than a blank page), and behaving correctly at mobile tap-target sizes are requirements, not nice-to-haves. The error boundary prevents a React crash from blanking the entire screen. Smoke test flows confirm the golden path works end to end before every production deployment. Performance targets (2s dashboard response with 500 transactions) ensure the app remains usable as the user's data grows.

## User flows

### Installing the app to the home screen
1. User visits the app three times on their Android/iOS browser.
2. On the third visit, an "Add FinTrack to Home Screen" prompt appears (deferred until 3rd visit to avoid annoying first-time visitors).
3. User taps "Install." The app icon appears on their home screen.
4. Opening from the home screen shows the app in standalone mode (no browser chrome, full-screen).

### Using the app offline (graceful degradation)
1. User opens the app while on the metro with no connectivity.
2. The OfflineNotice banner appears at the top: "You're offline — data may be outdated."
3. The app still loads from the service worker cache (app shell, static assets). Previously loaded data may be visible from cache.
4. User cannot submit forms (the Submit button is disabled with "No connection" label).
5. When connectivity returns, the banner disappears and the user can interact normally.

### Recovering from an error
1. A runtime error crashes the tax dashboard component.
2. The error boundary catches it. The screen shows: "Something went wrong" with a Retry button.
3. User taps Retry. The component remounts and loads the data fresh.
4. If the error persists, the user sees the error message and can navigate away.

### Smoke test flows (automated)
The 5 Playwright smoke flows confirm:
1. Register → verify email → sign in → see the dashboard.
2. Add a transaction → verify it appears in the transaction list.
3. Add income → verify it appears in the income table.
4. Mark a Fixed Expense as paid → verify it shows as Paid.
5. Sign out → verify redirect to login.

## Scenarios

**Scenario A — mobile tap targets:** A user with large fingers uses the app on a small phone. All interactive elements (buttons, links, checkboxes) have a minimum height of 44px for comfortable tapping. No element requires precise tapping.

**Scenario B — no horizontal overflow on mobile:** A user rotates their phone to portrait mode. No page causes horizontal scrolling at 375px viewport width. The fixed expenses monthly grid scrolls horizontally within its own container, not the whole page.

**Scenario C — service worker caches app shell:** User opens the app on slow mobile data. The HTML, CSS, and JS for the shell load from the service worker cache immediately. Only the API data is fetched over the network. The app feels fast even on a slow connection.

**Scenario D — error boundary on a single component:** The Tax Dashboard API returns an unexpected response format. The error boundary around the Tax snapshot card catches the error. The rest of the dashboard continues to render normally. The Tax card shows "Unable to load — Retry" in its area.

## Context notes

- The service worker caches the app shell (HTML/CSS/JS) with cache-first strategy and uses network-first for API requests. API responses are not cached (financial data must always be fresh).
- The PWA manifest requires: app name "FinTrack," icons at 192px and 512px, `theme_color: #3A5FCD`, `display: standalone`.
- The Add to Home Screen prompt is deferred until the user's 3rd visit (tracked in localStorage) to avoid showing it on first visit.
- The production deployment (Vercel + Neon + Resend) is `ready-for-human` — the owner must configure their own accounts and set environment variables from `.env.example`.
- Smoke tests use Playwright against the development server. `pnpm test:e2e` runs them. These are not unit tests — they test real user flows end to end.

## Comments
