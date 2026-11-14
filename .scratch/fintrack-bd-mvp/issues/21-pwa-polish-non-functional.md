# 21: PWA Polish & Non-Functional Requirements

**What to build:** The final sprint — installable PWA, offline splash, error/empty/loading states throughout, mobile pass, performance, and production deployment.

**Blocked by:** 13 (Dashboard UI), 14 (Income & Savings UI), 15 (Transactions & Budget UI), 16 (Fixed Expenses UI), 17 (Borrow-Loan UI), 18 (Tax Dashboard UI), 19 (History & Analytics UI), 20 (Notifications & Profile UI)

**Status:** ready-for-agent

- [ ] PWA: web app manifest with app name, icons (192px + 512px), theme_color (#3A5FCD), display: standalone
- [ ] Service worker: cache app shell for offline; offline splash screen when no connection
- [ ] Add to Home Screen prompt: defer and show at appropriate moment
- [ ] Error boundaries: React error boundary on each route; friendly error card with retry action
- [ ] Loading skeletons: skeleton UI for every list and card while data loads
- [ ] Empty states: verified for all screens (no transactions, no loans, no income)
- [ ] Mobile viewport pass: test all screens at 375px and 390px; no horizontal scroll, no truncated buttons
- [ ] Performance: Lighthouse mobile score ≥ 80; no layout shift on data load
- [ ] Production deployment: single Vercel deployment (Next.js app + API routes + Neon DB); all env vars in `.env.example` confirmed working in Vercel dashboard
- [ ] `app/api/health/route.ts` returns `200 OK` — smoke test endpoint for UAT
- [ ] Vercel–Neon integration connected in Vercel dashboard (auto-injects `DATABASE_URL`)
- [ ] UAT checklist: all acceptance-criteria figures from real data pass end-to-end (Mithun balance, tax remaining, monthly fixed commitments total)
