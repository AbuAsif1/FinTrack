# p2-18: Browser Push Notifications and Daily Scheduler

**Status:** needs-triage
**Phase:** 2
**Spec ref:** Phase 2 §18

---

## What to build

Two closely related platform features:

1. **Browser push notifications** — the app can send notifications to the user's device (phone or desktop) even when the app is not open, using the Web Push API. Triggered by a daily background job.

2. **Daily scheduler** — a server-side cron job that runs once per day and dispatches notifications, generates scheduled backups (p2-17), and performs other time-sensitive tasks. The MVP uses an ADR placeholder for this (ADR-0009).

Initial notification types:
- A Fixed Expense is due in 3 days or today
- A loan return is overdue (past the agreed return date)
- A DPS maturity is approaching (7 days out)
- A budget category has exceeded its limit (requires knowing the last check time)

---

## Why

The app's value depends on timely action. A due Fixed Expense that the user misses because they forgot to open the app is a failure. Push notifications bridge the gap between "data the app has" and "awareness the user needs." For a Bangladeshi user who keeps sensitive financial records, being reminded of a due insurance payment or an overdue loan return without opening the app is a significant quality-of-life improvement. The daily scheduler is also the foundation for automatic backups (p2-17) and recurring-payment suggestions (p2-07).

---

## User flows

### Enabling push notifications
1. User opens **Settings → Notifications**.
2. A list of notification types with on/off toggles:
   - Fixed Expenses due soon (default: on, 3 days before)
   - Overdue loan returns (default: on)
   - DPS / savings maturity approaching (default: on, 7 days before)
   - Budget limit reached (default: off)
3. User clicks "Enable notifications."
4. The browser's permission prompt appears: "FinTrack wants to send notifications." User clicks Allow.
5. A push subscription is saved server-side.
6. Settings shows: "Notifications enabled — this device."

### Receiving a notification (device is not in the app)
1. The daily cron runs at 7:00 AM Bangladesh time.
2. For the user's account, the cron checks:
   - Fixed Expenses due in 3 days → "Car Insurance due in 3 days — ৳36,000"
   - Overdue loan returns → "Reza Bhai's return of ৳15,000 is 5 days overdue"
   - DPS maturity in 7 days → "Your DPS at BRAC Bank matures in 7 days — ৳1,20,000"
3. For each triggered condition, a Web Push notification is sent to all subscribed devices for that user.
4. The notification appears as an OS-level alert on the user's phone/desktop.
5. Tapping the notification opens the app to the relevant page.

### Receiving a notification (app is open)
- If the app is open and a push notification fires, an in-app toast/banner is shown instead of an OS alert (the service worker suppresses the system notification when the page is focused).

### Managing devices
1. Settings → Notifications → Devices shows all subscribed devices (name, last seen).
2. User can remove a device (e.g. an old phone they no longer use).

### Disabling notifications
1. User turns off all notification types in Settings → Notifications.
2. Alternatively, they revoke browser permission from the browser's site settings.
3. When the push subscription is no longer valid (revoked in browser), the server cleans up the stored subscription silently.

---

## Scenarios

**Scenario A — car insurance reminder:** The user set up an annual Fixed Expense "Car Insurance" due every June. On 27 May at 7:00 AM, they receive a push: "Car Insurance due in 3 days — ৳36,000." They open their bank app and schedule the payment.

**Scenario B — overdue loan nudge:** The user lent ৳15,000 to a friend on 1 October with a return date of 1 November. On 2 November, they receive: "Reza Bhai's loan return of ৳15,000 is 1 day overdue." They open the app to send a bKash reminder (p2-12).

**Scenario C — user denies permission:** A user dismisses the browser permission prompt. The Settings page shows "Notifications blocked — please enable in browser settings" with guidance. The app works fully without notifications; no functionality is lost.

**Scenario D — multi-device user:** The user has the app on both their phone and work laptop. Both devices receive notifications. When a notification is dismissed on one device, the other still shows it (Web Push does not synchronise dismissal across devices).

---

## Impact areas

- New DB table: `push_subscriptions` (id, user_id, endpoint, auth, p256dh, device_label, created_at, last_active_at)
- New API routes: `POST /push/subscribe`, `DELETE /push/subscribe/:id`, `GET /push/subscriptions`
- Notification preferences: new columns on `users` or a separate `notification_preferences` table (per-type boolean + lead-time settings)
- Daily cron job: a server-side scheduler (Node `node-cron`, Vercel Cron, or a system cron) running at a fixed Bangladesh time (UTC+6)
- Web Push library: `web-push` (Node.js) — requires VAPID key pair generation at setup
- Service worker: a service worker (`public/sw.js`) must be registered to handle incoming push events and show notifications; also handles the notification click → app navigation
- The cron job is shared infrastructure for p2-07 (recurring suggestions), p2-17 (scheduled backups), and future scheduler needs — design it as a dispatching layer, not a monolithic function
- ADR-0009 must be updated to reflect the chosen scheduler implementation

---

## Decisions needed before build

- Scheduler host: where does the cron run? Options: Vercel Cron Jobs (if deploying to Vercel), a system cron on the server (`crontab`), or a managed job queue. This depends on the deployment environment (confirm from `architecture.md`).
- VAPID keys: generate once and store securely as environment variables.
- Maximum notifications per user per day: cap at 5–10 to avoid notification fatigue.
- Should the notification deep-link open the app to the specific page (e.g. the Fixed Expense detail)? Yes — each notification type must carry a URL to the relevant page.
- Should users be able to set custom lead times (e.g. "notify me 7 days before" instead of 3)? Keep it simple for the first version — fixed lead times. Make configurable in a later iteration.

---

## Blocked by

- Ticket 08 (Fixed Expenses API) — due-date data must be available.
- Ticket 05 (Borrow/Loan Ledger) — overdue loan data must be available.
- Ticket 04 (Savings Accounts) — DPS maturity data must be available.

## Comments

<!-- Append discussion below this line -->
