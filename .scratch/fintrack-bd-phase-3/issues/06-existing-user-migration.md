# P3-06: Migration of Existing Users to Subscription

**What to build:** The one-time process of moving users who registered before subscriptions existed onto the new subscription model — without disrupting their access or destroying their trust. Covers the database migration, the admin controls, the communication sequence, and the enforcement timeline.

**Why this exists:** When subscriptions launch, the database already has users who signed up under the assumption the app was free. Applying P3-04 enforcement to them on launch day would immediately lock some of them out without warning. That is a trust-destroying move that cannot be reversed. This ticket is about making the transition fair, transparent, and owner-controlled.

**Status:** needs-triage

**Blocked by:** P3-01 · P3-04 · P3-05 · Owner decisions (see Open decisions) · MVP fully launched

**Depends on (Phase 3):** P3-01, P3-04, P3-05

---

## Scenario

The MVP has been live for eight months. There are 42 registered users. The owner decides to launch subscriptions.

The owner opens the admin settings and sees a "Launch subscriptions" section. They set:
- Grandfather window: 60 days from today
- Reminder emails at: 15 days before end, 7 days before end, 1 day before end

The owner clicks "Launch." The system:
1. Sets every existing user's `subscription_status = grandfathered`, `grandfather_until = today + 60 days`
2. Sends a migration email to all 42 users: "FinTrack is moving to a subscription. You have 60 days of free access — until [date] — with no action needed. After that, a Basic plan is ৳199/month."
3. The app continues working for everyone exactly as before.

At day 45, reminder emails go out. At day 53, in-app banners appear.

At day 60, the system transitions all `grandfathered` accounts to `grace` (the same 7-day grace period as a lapsed subscription, ticket P3-04). 7 days later, any unpaid account goes to `read_only`.

Three of the 42 users subscribed on the launch email. Twelve more subscribed during the grandfather window. Twenty moved through the grace period into read-only over the following weeks. Seven subscribed from read-only after seeing they still had their data. The remaining 13 lapsed.

The owner can see all 42 on the admin user list, filtered by subscription status, and decide individually whether to extend access or reach out.

---

## Use cases

- Owner launches subscriptions → all existing users receive grandfather window
- Existing user reads migration email → subscribes proactively → `subscription_status = active` from that moment
- Existing user ignores emails → grandfather window ends → grace period (P3-04) → read-only
- Owner wants to exempt one user permanently (early adopter, internal tester, friend) → marks account `subscription_exempt = true`; enforcement never applies to them
- Owner wants to extend the grandfather window for all users → updates `grandfather_until` in bulk
- Owner wants to extend access for one specific user → edits that user's `subscription_until` or `grandfather_until` in the admin panel
- New user registers after subscriptions are live → standard trial (P3-01), not grandfather window
- Owner wants to roll back (cancel subscriptions entirely) → all users reset to `trial` or exempt; this must be a supported admin action

---

## User flow: existing user receiving the migration

1. User gets the migration email: subject "FinTrack is introducing a subscription — here's what changes for you"
2. Email explains: free access until [date], what the plans cost, what happens after [date], that their data is safe no matter what
3. User opens the app: a soft blue informational banner in the shell: "FinTrack will move to a subscription on [date]. Your access is free until then."
4. The app works exactly as before for the entire grandfather window
5. At `grandfather_until - 15 days`: reminder email (same as P3-05 pre-renewal reminder)
6. At `grandfather_until - 7 days`: reminder email + banner becomes prominent
7. At `grandfather_until - 1 day`: final reminder email
8. At `grandfather_until`: system transitions to grace (P3-04 state machine takes over from here)
9. If user subscribes at any point during the grandfather window: `subscription_status = active`, grandfather status cleared, standard renewal cycle begins

---

## Admin flow: launching subscriptions

1. Admin (owner) opens admin settings → "Subscriptions" section
2. Sees: "Subscriptions are not yet enabled. Enable to start billing users."
3. Sets grandfather window length (days)
4. Sets reminder schedule (days before grandfather end to send reminders — defaults: 15, 7, 1)
5. Optionally marks specific accounts as exempt before launch
6. Taps "Enable subscriptions" → confirmation modal: "This will email all [N] active users and begin the grandfather window. This cannot be undone." → owner types "CONFIRM" → submits
7. System runs the migration (see below) → admin sees success confirmation with count of users emailed

---

## Database migration required at launch

When the owner enables subscriptions, a migration query runs:

```sql
UPDATE users
SET subscription_status = 'grandfathered',
    grandfather_until = CURRENT_DATE + <window_days>
WHERE subscription_status IS NULL
  AND deleted_at IS NULL
  AND role = 'USER';
```

New registrations after this point receive `subscription_status = 'trial'` and `trial_ends_on` from the registration flow (P3-01). The two paths never mix.

The `subscription_exempt = true` flag set before launch is preserved and skips enforcement for those accounts permanently.

---

## Impacts to keep in mind

- **This ticket is a one-time transition.** Once subscriptions are launched, it cannot be re-run. The admin "Launch" action is irreversible (or at minimum requires a full rollback path the owner consciously chooses).
- **`users` table** gains `grandfather_until` date column (nullable; only populated during the migration window). This column becomes unused after the last grandfathered user transitions out but should not be dropped — it is audit history.
- **Email volume spike:** sending migration emails to all existing users at once may hit provider rate limits. The email sender must batch if user count is large. For early adoption numbers (tens of users) this is not a concern; at hundreds it is.
- **Communication tone matters:** the migration email is the owner's most important trust moment. The email must be honest (subscriptions are starting), reassuring (data is safe regardless), and clear (exact date, exact price, what happens). An agent writing this email must not bury the price or the enforcement date.
- **P3-05 cron** handles the reminder emails during the grandfather window using the same mechanism as renewal reminders, but driven by `grandfather_until` instead of `subscription_until`.
- **ADR-0011 preserved:** the owner sees subscription status and grandfather dates in the admin panel; they do not see the users' financial data at any point in this process.
- **Roll-back path:** if the owner decides to cancel subscriptions entirely after launching, all accounts should be resettable to a free or exempt state. This must be a supported admin action, not a database hotfix.

---

## Open decisions (owner must settle before this moves to ready-for-agent)

- Grandfather window length
- Whether there is a permanent free tier (if yes, grandfathered users could stay on it rather than needing to subscribe — this changes the migration outcome entirely)
- Reminder schedule (days before grandfather end)
- Whether the owner's own account is automatically exempt
- Roll-back policy: if the owner reverses the subscription decision after launch, what happens to users who already paid?
- Whether the "Launch subscriptions" action is per-environment (staging vs production must behave consistently)

## Comments

<!-- Append discussion below this line -->
