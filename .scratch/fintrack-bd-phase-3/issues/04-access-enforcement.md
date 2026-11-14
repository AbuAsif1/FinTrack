# P3-04: Subscription Access Enforcement

**What to build:** The gate that changes what a subscribed or lapsed user can do. Defines the states, the grace period, the read-only mode, and the visual treatment at each stage. This is what gives the subscription teeth — without it, subscription status is only a label.

**Why this exists:** A paywall that destroys access to a user's own financial records will not motivate payment — it will motivate leaving. The enforcement must be firm enough to convert lapsers into payers but gentle enough to keep them in the app. The design principle: users always have read access to their own data; only write access is gated. No data is ever deleted by the enforcement machine.

**Status:** needs-triage

**Blocked by:** P3-01 (subscription status field and state machine) · MVP fully launched

**Depends on (Phase 3):** P3-01

---

## Scenario

Nadia subscribed to the Basic plan three months ago. This month her bKash balance was low and her renewal failed. The app does not lock her out immediately.

**Day 1 (lapse day):** Nadia opens FinTrack. A persistent amber banner appears at the top of every page: "Your subscription has lapsed. Renew by [date + 7 days] to keep full access." She can still add transactions, edit records, and use every feature normally.

**Day 4:** Nadia is away and misses the banner.

**Day 8 (read-only transition):** Nadia tries to add a transaction. The "Add" button is greyed out. A modal says: "Your account is now read-only. You can view all your data and export it. Renew your subscription to add or edit." She can still view her full transaction history, run reports, and export a CSV. She cannot add, edit, or delete anything.

**Day 8, 10 minutes later:** Nadia tops up her bKash and taps "Renew" in the app. She pays ৳199. Within 30 seconds, the read-only state lifts. The "Add" button is active. She adds the transaction she was trying to enter.

**Day 97 (90 days after read-only began):** If Nadia had not renewed, the admin receives a notification: "Account [name] has been read-only for 90 days." The admin decides to reach out or flag the account — no automatic deletion occurs.

---

## Use cases

- Trial ends → grace period starts (same flow as a lapsed subscription)
- Payment confirmed → full access restored immediately (from any state)
- Subscription lapses → grace period banner appears; write access retained during grace
- Grace period ends → account moves to read-only; reads and exports still work
- User renews while read-only → access restored within 60 seconds
- User cancels subscription intentionally → read-only after `subscription_until` date, same path
- Admin deactivates a user (existing MVP feature) → deactivation overrides subscription state; deactivated users cannot log in regardless of subscription
- Admin marks user as `subscription_exempt` (P3-01) → enforcement skipped entirely for that account

---

## State machine

```
trial ──────────────── payment confirmed ──────────────▶ active
  │                                                        │
  │ trial ends (no payment)                                │ payment fails / renewal not received
  ▼                                                        ▼
grace ◀──────────────────────────────────────────── grace (7-day window)
  │                                                        │
  │ grace period ends (no payment)                         │
  ▼                                                        │
read_only ◀─────────────────────────────────────────────-─┘
  │
  │ 90 days with no renewal
  ▼
read_only (admin notified — no auto-action)
```

Payment confirmed from any state → active.

---

## User flow: lapse → grace → read-only → renewal

1. `subscription_until` date passes without payment confirmation
2. System sets `subscription_status = grace`; `grace_ends_on = subscription_until + 7 days`
3. App shell checks status on every authenticated request
4. All pages show persistent amber banner: "Your subscription has lapsed. Renew by [date]."
5. At `grace_ends_on` without payment: system sets `subscription_status = read_only`, `read_only_since = today`
6. All financial-data write routes return `402 SUBSCRIPTION_REQUIRED`
7. UI: add/edit/delete buttons disabled; tooltip or modal explains read-only state; Export and all read operations work normally
8. User taps "Renew" → payment flow (P3-02 or P3-03) → on confirmation: `subscription_status = active`, `subscription_until = today + billing period`
9. App reloads subscription status (a lightweight re-fetch on payment confirmation) → buttons re-enabled

---

## API enforcement

A `requireActiveSubscription` middleware is applied to every route that mutates financial data. It:

1. Reads `subscription_status` from the user record (cached per request on the JWT or session)
2. If `active` or `trial` or `exempt`: passes through
3. If `grace`: passes through (write access preserved during grace period)
4. If `read_only` or `cancelled`: returns `402 SUBSCRIPTION_REQUIRED` with a JSON body containing `grace_ends_on` (for client UI)

Routes this middleware covers: all `POST`, `PATCH`, `DELETE` under `/transactions`, `/savings-accounts`, `/loans`, `/categories`, `/fixed-expenses`, `/budgets`, `/income`. It does NOT apply to: `GET` routes (reads always work), `/auth/*` (session management), `/admin/*` (admin routes are separately gated by `getAdminUser`), `/webhooks/*` (payment webhooks must not be gated).

---

## Visual treatment per state

| State | Banner | Buttons | Export |
|---|---|---|---|
| `trial` (> 7 days left) | None | Active | Active |
| `trial` (≤ 7 days left) | Soft blue info banner | Active | Active |
| `grace` | Amber warning banner with "Renew" CTA | Active | Active |
| `read_only` | Red banner, persistent, with "Renew" CTA | Disabled (greyed, tooltip on hover) | Active |
| `exempt` | None | Active | Active |

---

## Impacts to keep in mind

- **Every page** that has an add/edit/delete action must handle the disabled state. This is a UI-wide change. A single `useSubscription()` hook returning `{ canWrite: boolean, status }` and consumed in every action component is the cleanest approach.
- **Offline / PWA:** the subscription check happens on the authenticated API request, not on cached local state. If the user is offline and their grace period expires while offline, their cached UI may still show active buttons. On reconnect, the first API call returns `402` and the UI must transition to read-only without a full reload. The service worker must not cache `402` responses as valid.
- **Deactivation vs read-only** are independent states. An admin-deactivated user cannot log in at all (MVP behaviour, ticket 26). A read-only-subscription user can log in and read. These two states do not combine; if an admin deactivates an account, the subscription state is irrelevant until the account is reactivated.
- **rules.md soft-delete constraint** is preserved: the enforcement machine never deletes rows. `read_only` only prevents new writes; it does not touch existing records.

---

## Open decisions (owner must settle before this moves to ready-for-agent)

- Grace period length (7 days assumed above)
- Whether `cancelled` subscriptions get a grace period or go directly to `read_only` at period end
- How long `read_only` lasts before the admin is notified (90 days assumed above)
- Whether auto-deletion ever occurs after a very long dormancy (the owner has not decided; the soft-delete rule in `rules.md` says no data is permanently deleted without explicit action — this should not change)

## Comments

<!-- Append discussion below this line -->
