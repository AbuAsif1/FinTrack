# p4-04: Subscription Access Enforcement

**Status:** needs-triage
**Phase:** 4
**Moved from:** Phase 3 p3-04
**Spec ref:** Phase 4 — Subscription

**What to build:** The gate that changes what a subscribed or lapsed user can do. Defines the states, the grace period, the read-only mode, and the visual treatment at each stage.

**Why this exists:** A paywall that destroys access to a user's own financial records will not motivate payment — it will motivate leaving. The enforcement must be firm enough to convert lapsers into payers but gentle enough to keep them in the app. Users always have read access to their own data; only write access is gated. No data is ever deleted by the enforcement machine.

**Blocked by:** p4-01 · MVP fully launched

**Depends on (Phase 4):** p4-01

---

## Scenario

Nadia subscribed to the Basic plan three months ago. This month her bKash balance was low and her renewal failed. The app does not lock her out immediately.

**Day 1 (lapse day):** Nadia opens FinTrack. A persistent amber banner appears: "Your subscription has lapsed. Renew by [date + 7 days] to keep full access." She can still add transactions normally.

**Day 8 (read-only transition):** Nadia tries to add a transaction. The "Add" button is greyed out. A modal says: "Your account is now read-only. You can view all your data and export it. Renew to add or edit." She can still view her full history and export.

**Day 8, 10 minutes later:** She tops up her bKash and taps "Renew." Within 30 seconds, the read-only state lifts. The "Add" button is active again.

---

## State machine

```
trial ──── payment confirmed ──────▶ active
  │                                     │
  │ trial ends (no payment)              │ payment fails / renewal not received
  ▼                                     ▼
grace ◀──────────────────────── grace (7-day window)
  │
  │ grace period ends (no payment)
  ▼
read_only
  │
  │ 90 days with no renewal
  ▼
read_only (admin notified — no auto-action)
```

Payment confirmed from any state → active.

---

## API enforcement

A `requireActiveSubscription` middleware is applied to every route that mutates financial data:

1. If `active`, `trial`, or `exempt`: passes through
2. If `grace`: passes through (write access preserved during grace)
3. If `read_only` or `cancelled`: returns `402 SUBSCRIPTION_REQUIRED`

Covers all `POST`, `PATCH`, `DELETE` under `/transactions`, `/savings-accounts`, `/loans`, `/categories`, `/fixed-expenses`, `/budgets`, `/income`. Does NOT apply to: `GET` routes, `/auth/*`, `/admin/*`, `/webhooks/*`.

---

## Visual treatment per state

| State | Banner | Buttons | Export |
|---|---|---|---|
| `trial` (> 7 days left) | None | Active | Active |
| `trial` (≤ 7 days left) | Soft blue info banner | Active | Active |
| `grace` | Amber warning banner with "Renew" CTA | Active | Active |
| `read_only` | Red banner, persistent, with "Renew" CTA | Disabled (greyed, tooltip) | Active |
| `exempt` | None | Active | Active |

---

## Impacts to keep in mind

- **Every page** with an add/edit/delete action must handle the disabled state. A single `useSubscription()` hook returning `{ canWrite: boolean, status }` is the cleanest approach.
- **Offline / PWA:** the check happens on the authenticated API request, not on cached local state. The service worker must not cache `402` responses as valid.
- **Deactivation vs read-only** are independent states. An admin-deactivated user cannot log in at all. A read-only-subscription user can log in and read.
- **rules.md soft-delete constraint** is preserved: the enforcement machine never deletes rows.

---

## Open decisions (owner must settle before this moves to ready-for-agent)

- Grace period length (7 days assumed above)
- Whether `cancelled` subscriptions get a grace period or go directly to `read_only` at period end
- How long `read_only` lasts before the admin is notified (90 days assumed)
- Whether auto-deletion ever occurs after a very long dormancy (the soft-delete rule in `rules.md` says no data is permanently deleted without explicit action)

## Comments

<!-- Append discussion below this line -->
