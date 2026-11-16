# 12: React Frontend Shell & Auth UI

**What to build:** The React app shell with routing, theme, navigation structure, and login screen. Every subsequent frontend ticket plugs into this shell.

**Blocked by:** 02 (Authentication)

**Status:** ready-for-agent

- [ ] Next.js 14 App Router; `app/layout.tsx` wraps everything in React Query provider and theme provider
- [ ] All interactive components marked `'use client'`; static/data-only pages use Server Components
- [ ] React Query configured as data-fetching layer; Axios instance in `lib/api.ts` with JWT Bearer header injection
- [ ] Next.js middleware (`middleware.ts`) redirects unauthenticated users to `/login`
- [ ] Login page (`app/login/page.tsx`): email/password form, error state, redirects to dashboard on success
- [ ] App shell: bottom navigation bar (Dashboard, Transactions, Savings, Loans, Tax); top header with page title + notification bell
- [ ] Design tokens wired: Space Grotesk headings, Inter body, Bangladesh flag blue accent (#3A5FCD), 4px spacing grid (from `.scratch/docs/design.md`)
- [ ] Dark/light mode toggle using CSS custom properties
- [ ] Responsive layout: mobile-first, bottom nav collapses to sidebar on tablet+
- [ ] Auth token refresh: React Query global error handler retries on 401 by calling `/api/auth/refresh`
- [ ] PWA manifest (`public/manifest.json`) and service worker stub via `next-pwa` plugin
