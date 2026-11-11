# FinTrack BD Phase 3 — Ideas

**Status:** needs-triage
**Created:** 2026-11-12

> **Owns:** ideas beyond Phase 2. Nothing here is specified or ready to build.
> Phase 2 backlog: `.scratch/fintrack-bd-phase-2/spec.md`. MVP scope: `.scratch/docs/brd.md` §3.

---

## 1. Subscription

Users pay to use the app. The owner has said this may be introduced; nothing about it is decided.

- **Builds on:** the admin's manual payment-date log in the MVP (`brd.md` FR-14), which already records date paid, amount and the date a payment covers until.
- **To decide before any work:**
  - Plans and prices, and whether there is a free tier or a trial
  - Payment method: bKash, card, bank transfer, or manual confirmation by the admin
  - What happens when a subscription lapses: reminder only, read-only access, or deactivation
  - Whether existing users are moved onto a plan or exempted
  - Refunds and receipts
- **Constraint to keep:** admins manage accounts and payments and never see users' financial data (ADR-0011).

## Comments

<!-- Append discussion below this line -->
