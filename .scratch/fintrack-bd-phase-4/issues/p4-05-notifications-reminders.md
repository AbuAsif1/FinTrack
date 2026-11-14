# p4-05: Subscription Notifications and Reminders

**Status:** needs-triage
**Phase:** 4
**Moved from:** Phase 3 p3-05
**Spec ref:** Phase 4 — Subscription

**What to build:** Automated emails and in-app banners that warn users before their subscription expires, notify them when it lapses or is restored, and guide trial users toward upgrading. No new visual design is needed for banners — they follow the states defined in p4-04. This ticket owns the triggers, timing, email templates, and the scheduling mechanism.

**Why this exists:** Most subscription churn is passive — users forget to renew, not decide to leave. A well-timed reminder converts a forgetter into a payer. The goal is to be useful and brief: notify exactly when the information is actionable, then stop. A user who renewed should never see another renewal prompt until the next cycle.

**Blocked by:** p4-01 · p4-04 · MVP fully launched

**Depends on (Phase 4):** p4-01, p4-04

---

## Scenario

Tanvir subscribed 11 months ago. He mostly checks FinTrack on weekends. He never thinks about the subscription renewal.

**Day 23 of month 12:** He gets an email: "Your FinTrack subscription renews in 7 days (on [date]). No action needed if your payment is set up." He opens the app and sees a soft blue banner at the top of the dashboard: "Renews on [date]."

**Day 29:** A second email: "Your subscription renews tomorrow."

**Day 30:** His bKash auto-renewal succeeds. No banner, no noise. He receives one receipt email. That is all.

**Contrast — if payment fails on day 30:** Tanvir gets an email within minutes: "Payment failed — your FinTrack subscription has lapsed." He opens the app and sees the amber grace-period banner (p4-04). He tops up bKash and renews. One more email: "You're back — full access restored."

He only got emails when they were directly actionable. He was never asked to do something he had already done.

---

## Use cases

- Trial started → welcome email (once, on registration)
- 7 days before trial ends → reminder email + soft banner
- 1 day before trial ends → reminder email
- Trial ended without payment → lapse email + upgrade prompt on next login
- 7 days before subscription renewal date → reminder email + soft banner
- 1 day before renewal → reminder email
- Renewal succeeded → receipt email (no banner change needed)
- Renewal failed / subscription lapsed → lapse email + amber banner (p4-04)
- Subscription restored after lapse → restoration email + banner dismissed
- Admin confirms manual payment → same restoration email

---

## Notification events and content

| Event | Email subject | In-app | Notes |
|---|---|---|---|
| Trial started | "Welcome to FinTrack — X days free" | — | Sent once on registration |
| 7 days to trial end | "Your trial ends in 7 days" | Soft blue banner | |
| 1 day to trial end | "Your trial ends tomorrow" | Prominent blue banner | |
| Trial ended, unpaid | "Your free trial has ended" | Full-screen upgrade gate on login | |
| 7 days to renewal | "Your subscription renews in 7 days" | Soft blue banner | Only shown if no auto-renewal confirmed yet |
| 1 day to renewal | "Subscription renews tomorrow" | Soft blue banner | |
| Renewal succeeded | Receipt email with amount and paid-until date | Banner dismissed | |
| Lapse (payment failed) | "Payment failed — please renew" | Amber persistent banner (p4-04) | |
| Subscription restored | "You're back — full access restored" | Green toast, banner dismissed | |

Each email is plain-text-compatible HTML using the same template base as the auth emails from MVP ticket 25. No fancy design — legible on mobile, action button prominent, one clear next step.

---

## Scheduling mechanism

ADR-0009 specifies that the MVP generates instances and notifications on read (no background scheduler). Subscription deadline notifications are time-driven: a user may never open the app the day before their trial ends, so a "generate on read" approach will miss them. Phase 4 must revisit ADR-0009 for this feature.

**Two options:**

**Option A — Vercel Cron:** A `GET /cron/subscription-reminders` endpoint secured by a `CRON_SECRET` header, called once per day by Vercel's built-in cron scheduler. The handler queries for accounts needing a notification today and sends emails. Simple, no extra infrastructure.

**Option B — Generate on next authenticated request:** When any authenticated request arrives, check whether a due notification has not been sent. Send it then. This avoids a scheduler entirely but means a user who never opens the app misses the email. Acceptable only if the owner decides email reminders are nice-to-have rather than critical.

The owner must choose. Option A is recommended.

---

## User flow: 7-day renewal reminder (Option A, Vercel Cron)

1. Daily at 08:00 Asia/Dhaka, Vercel Cron calls `GET /cron/subscription-reminders`
2. Handler queries: users with `subscription_until = today + 7 days` AND no `reminder_sent_7d` flag
3. For each: sends email, writes `reminder_sent_7d = true` to prevent duplicates
4. Same logic for 1-day reminder and lapse events
5. On payment confirmation (from p4-02 or p4-03): any pending reminder flags are cleared; restoration email sent immediately (not via cron, via the payment-confirmation handler)

Duplication guard: a `subscription_notifications` table (or nullable columns on `users`) records which emails have been sent for each cycle. When `subscription_until` advances after a renewal, the flags reset for the next cycle.

---

## Impacts to keep in mind

- **Email templates** (5–8 new templates) extend the email infrastructure from MVP ticket 25. If that ticket uses a specific email provider (Resend, SendGrid, etc.), new templates follow the same pattern — no second provider.
- **Vercel Cron** requires the `vercel.json` cron configuration block. The endpoint must be production-only: in development, the cron endpoint can be called manually for testing but should not auto-fire.
- **Phase 2 item p2-18** (browser push notifications) would add a push channel alongside these emails. That is a separate Phase 2 ticket; this ticket covers email and in-app banners only.
- **Idempotency:** the cron handler must be idempotent — calling it twice on the same day must not send duplicate emails. The `reminder_sent` flags are the guard.
- **Opt-out:** the owner must decide whether users can opt out of renewal reminders (probably not for a subscription service, but lapse notices might be desired to remain mandatory).

---

## Open decisions (owner must settle before this moves to ready-for-agent)

- Option A (Vercel Cron) or Option B (on-request) for scheduling?
- Should users be able to opt out of pre-renewal reminder emails?
- What time of day should the daily cron fire in Asia/Dhaka?
- Should the receipt email include a PDF receipt, or is a plain-text email enough?

## Comments

<!-- Append discussion below this line -->
