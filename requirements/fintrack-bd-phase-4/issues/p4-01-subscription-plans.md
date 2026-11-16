# p4-01: Subscription Plans and Pricing

**Status:** needs-triage
**Phase:** 4
**Moved from:** Phase 3 p3-01
**Spec ref:** Phase 4 — Subscription

**What to build:** The subscription model — what plans exist, what each plan includes, and how plan limits are enforced across the app. This ticket defines the data shape and rules; payment flows are p4-02 and p4-03; access enforcement is p4-04.

**Why this exists:** FinTrack is currently free to use. The owner intends to introduce a subscription to sustain the app as it grows. Without a plan structure, there is nothing to sell or enforce. Every other Phase 4 subscription ticket depends on this one.

**Blocked by:** Owner decisions (see Open decisions below) · MVP fully launched

**Depends on (Phase 4):** None — this is the foundation for p4-02 through p4-06

---

## Scenario

Reza hears about FinTrack from a colleague. He signs up and starts entering his income and expenses. The app works without restriction for 30 days. On day 23 a soft banner appears: "Your trial ends in 7 days." On day 28 the banner becomes prominent. On day 30 Reza sees a plan selection screen on login: a Basic plan at ৳199/month and a Premium plan at ৳399/month. The Basic plan covers everything he uses. He chooses Basic and taps "Pay with bKash." After confirming payment he is returned to the dashboard — the banner is gone and his data is untouched. He never loses any records; the subscription only controls whether he can add new ones.

A second user, Farzana, signs up after subscriptions are live. She chooses the trial. At the end of the trial she decides the app is not for her. She exports her data and stops using it. Her account goes read-only. Her data is retained for 90 days in case she returns.

---

## Use cases

- New user signs up → trial starts automatically, no payment required
- Trial ends, user wants to subscribe → sees plan selection, proceeds to payment
- Trial ends, user does not subscribe → account moves to grace period (p4-04)
- User on Basic wants to upgrade to Premium → upgrade path applies at next renewal cycle
- User wants to cancel → subscription ends at current period's end, account moves to read-only after that
- Admin creates a user account manually (provisioned) → owner decides whether provisioned accounts start on trial or active

---

## User flow: trial → plan selection → payment

1. User registers → `subscription_status = trial`, `trial_ends_on = registration_date + 30 days`
2. Each app load: system checks `trial_ends_on`; at ≤ 7 days remaining, soft blue banner appears in the shell
3. At ≤ 2 days remaining, banner becomes a prominent call-to-action
4. At `trial_ends_on`: on next login, user sees a plan selection screen before the dashboard
5. User reviews plans → selects one → continues to payment flow (p4-02 or p4-03)
6. Payment confirmed → `subscription_status = active`, `subscription_until = today + billing period`
7. Banner dismissed; user lands on dashboard

---

## Data shape

The following fields are added to the `users` table. No financial table is touched.

| Field | Type | Notes |
|---|---|---|
| `subscription_status` | enum | `trial`, `active`, `grace`, `read_only`, `cancelled`, `exempt` |
| `trial_ends_on` | date | Set at registration; null for provisioned accounts if owner decides differently |
| `subscription_plan` | enum or FK | `basic`, `premium`, or null during trial |
| `subscription_until` | date | Last day of the current paid period; null during trial |
| `subscription_exempt` | boolean | True for accounts the owner exempts permanently (see p4-06) |

Subscription status is an account property, not financial data. Admins can view and edit it without violating ADR-0011.

---

## Impacts to keep in mind

- **Every authenticated write route** must check `subscription_status`; a middleware added on all financial-data write routes returns `402 SUBSCRIPTION_REQUIRED` for `grace` and `read_only` accounts. Ticket p4-04 specifies the exact gate.
- **Admin user management** (MVP ticket 26, `user_payments` table) already stores payment records. This ticket adds the subscription state machine on top of that log.
- **Registration flow** (MVP ticket 25) must set `subscription_status = trial` and `trial_ends_on` for every new self-registered user.
- **Dashboard and all pages** must handle the read-only state: disabled add/edit buttons and informational banners. Ticket p4-04 owns the visual rules.
- **Existing users** at the time subscriptions launch must not be gated immediately; ticket p4-06 specifies the migration window.

---

## Open decisions (owner must settle before this moves to ready-for-agent)

- Trial duration (30 days is assumed above; owner may prefer 14 or 60)
- Plan names and prices
- Plan feature differences (is Premium meaningfully different from Basic in the MVP, or is there only one paid plan to start?)
- Whether there is a permanent free tier with feature limits, or only a time-limited trial
- Whether admin-provisioned accounts start on trial or on a gifted active period

## Comments

<!-- Append discussion below this line -->
