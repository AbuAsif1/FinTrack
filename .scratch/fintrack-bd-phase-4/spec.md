# FinTrack BD Phase 4 — Backlog

**Status:** needs-triage
**Created:** 2026-11-14

> **Owns:** features deferred from Phase 3. Nothing here is specified or ready to build.
> Phase 3 scope: `.scratch/fintrack-bd-phase-3/spec.md`. Phase 2 scope: `.scratch/fintrack-bd-phase-2/spec.md`. MVP scope: `.scratch/docs/brd.md` §3.

## Issue tickets

Each item below has a detailed ticket in `issues/` with user flows, scenarios, and impact notes.

| # | Ticket | Area | Moved from |
|---|--------|------|------------|
| p4-01 | [Subscription Plans and Pricing](issues/p4-01-subscription-plans.md) | Subscription | Phase 3 p3-01 |
| p4-02 | [Automated Payment via bKash or Card](issues/p4-02-payment-bkash-card.md) | Subscription | Phase 3 p3-02 |
| p4-03 | [Manual Bank Transfer Payment Confirmation](issues/p4-03-manual-bank-transfer.md) | Subscription | Phase 3 p3-03 |
| p4-04 | [Subscription Access Enforcement](issues/p4-04-access-enforcement.md) | Subscription | Phase 3 p3-04 |
| p4-05 | [Subscription Notifications and Reminders](issues/p4-05-notifications-reminders.md) | Subscription | Phase 3 p3-05 |
| p4-06 | [Migration of Existing Users to Subscription](issues/p4-06-existing-user-migration.md) | Subscription | Phase 3 p3-06 |
| p4-07 | [Passkey / Two-Factor Sign-in](issues/p4-07-passkey-or-two-factor-signin.md) | Security | Phase 3 p3-08 |
| p4-08 | [Shareable Loan Statement and Reminder](issues/p4-08-shareable-loan-statement-and-reminder.md) | Loans | Phase 3 p3-09 |
| p4-09 | [Statement Import with Column Mapping](issues/p4-09-statement-import-with-column-mapping.md) | Import | Phase 3 p3-10 |
| p4-10 | [Automatic Bank Sync](issues/p4-10-automatic-bank-sync.md) | Import | Phase 3 p3-11 |
| p4-11 | [Receipt Photos and Document Vault](issues/p4-11-receipt-photos-and-document-vault.md) | Storage | Phase 3 p3-12 |

---

## Subscription (Phase 4 primary theme)

The owner intends to introduce a subscription to sustain the app as it grows. Phase 4 defines the full subscription lifecycle — from plan definitions through automated payments, access enforcement, reminders, and the one-time migration of existing users.

**Decision dependency chain:** p4-01 (plans) must be settled before p4-02, p4-03, p4-04, or p4-05 can move to `ready-for-agent`. All five subscription tickets (p4-01 through p4-06) require owner decisions listed in each ticket before work can begin.

### Prerequisite: owner decisions for p4-01 through p4-06

Before any subscription ticket becomes `ready-for-agent`, the owner must decide:

- Trial duration and whether there is a permanent free tier
- Plan names, prices, and feature differences between plans
- Payment method(s) at launch: bKash deep-link only, bKash Business API, or card gateway (SSLCommerz / ShurjoPay)
- Grace period length after a failed payment
- Whether auto-renewal is supported by the chosen payment gateway
- Grandfather window length for existing users at subscription launch

---

## Deferred from Phase 3

The following items were originally in Phase 3 but moved here because they carry unresolved external dependencies, require significant infrastructure decisions before the subscription work, or are lower priority relative to the subscription launch.

| Ticket | Reason for deferral |
|--------|---------------------|
| p4-07 Passkey / 2FA | Non-trivial auth infrastructure; ship after subscription is stable |
| p4-08 Shareable loan statement | Requires server-side PDF/image rendering decision |
| p4-09 Statement import with column mapping | Significant import pipeline extension; lower priority than subscription |
| p4-10 Automatic bank sync | Hard external dependency: no Bangladeshi bank API available yet |
| p4-11 Receipt photos + document vault | Requires file-storage provider decision and privacy ADR |

---

## Comments

<!-- Append discussion below this line -->
