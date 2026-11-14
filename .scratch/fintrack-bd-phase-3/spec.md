# FinTrack BD Phase 3 — Ideas

**Status:** needs-triage
**Created:** 2026-11-12

> **Owns:** ideas beyond Phase 2. Nothing here is specified or ready to build.
> Phase 2 backlog: `.scratch/fintrack-bd-phase-2/spec.md`. MVP scope: `.scratch/docs/brd.md` §3.

---

## Subscription (original Phase 3 idea)

### 1. Subscription plans and payments

Users pay to use the app. The owner has said this may be introduced; nothing about it is decided.

- **Builds on:** the admin's manual payment-date log in the MVP (`brd.md` FR-14), which already records date paid, amount and the date a payment covers until.
- **To decide before any work:**
  - Plans and prices, and whether there is a free tier or a trial
  - Payment method: bKash, card, bank transfer, or manual confirmation by the admin
  - What happens when a subscription lapses: reminder only, read-only access, or deactivation
  - Whether existing users are moved onto a plan or exempted
  - Refunds and receipts
- **Constraint to keep:** admins manage accounts and payments and never see users' financial data (ADR-0011).
- **Issue tickets:** `issues/01-subscription-plans.md` through `issues/06-existing-user-migration.md`

---

## Deferred from Phase 2

The following items were originally in the Phase 2 backlog but moved here because they carry unresolved external dependencies, require significant infrastructure decisions, or are lower priority than other Phase 2 work. Each has a full ticket in `issues/`.

| # | Ticket | Moved from | Reason for deferral |
|---|--------|------------|---------------------|
| p3-07 | [Delete my account and data](issues/07-delete-account-and-data.md) | Phase 2 §2 | Needs ADR for hard-delete exception; lower urgency than active-user features |
| p3-08 | [Passkey / two-factor sign-in](issues/08-passkey-or-two-factor-signin.md) | Phase 2 §3 | Non-trivial auth infrastructure; ship after the core feature set stabilises |
| p3-09 | [Shareable loan statement + reminder](issues/09-shareable-loan-statement-and-reminder.md) | Phase 2 §12 | Requires server-side PDF/image rendering decision |
| p3-10 | [Statement import with column mapping](issues/10-statement-import-with-column-mapping.md) | Phase 2 §13 | Significant extension of the import pipeline; prioritise core money features first |
| p3-11 | [Automatic bank sync](issues/11-automatic-bank-sync.md) | Phase 2 §14 | Hard external dependency: no BD bank API available yet |
| p3-12 | [Receipt photos + document vault](issues/12-receipt-photos-and-document-vault.md) | Phase 2 §16 | Requires file-storage provider and privacy ADR before any work |
| p3-13 | [Restore from export + scheduled backups](issues/13-restore-from-export-and-scheduled-backups.md) | Phase 2 §17 | Depends on p3-12 (vault) and Phase 2 p2-18 (scheduler) |

## Comments

<!-- Append discussion below this line -->
