# p4-03: Manual Bank Transfer Payment Confirmation

**Status:** needs-triage
**Phase:** 4
**Moved from:** Phase 3 p3-03
**Spec ref:** Phase 4 — Subscription

**What to build:** A flow for users who pay by bank transfer or mobile banking outside the app, and for the admin to confirm those payments and activate the subscription. Builds directly on the payment log that already exists in the MVP (ticket 26, `user_payments` table and admin UI).

**Why this exists:** Not all users will trust or use bKash/card gateways. Some will prefer to send money directly to the owner's bank account. The MVP's admin payment log already records date-paid, amount, and paid-until; this ticket connects that log to the subscription state machine so a manual confirmation also activates or renews a subscription.

**Blocked by:** p4-01 · MVP fully launched

**Depends on (Phase 4):** p4-01

---

## Scenario

Karim does not trust digital payment gateways. He opens the FinTrack subscription page and taps "Pay via Bank Transfer." The app shows the owner's bank details and a reference code. Karim completes the transfer via his bank app. Back in FinTrack, he sees: "Payment pending — waiting for admin confirmation." The admin reviews the pending queue, cross-checks their bank statement, confirms the payment, and Karim's subscription activates immediately. Karim receives a confirmation email.

---

## Use cases

- User initiates bank transfer → submits claim in app → awaits admin confirmation
- Admin reviews pending queue → confirms payment → subscription activates
- Admin rejects payment (wrong amount, missing reference, unverified) → user is notified with a reason
- Partial payment received → admin flags it; subscription does not activate until remainder is received
- Admin logs a payment proactively (user contacted them directly) → same form as existing MVP payment log

---

## User flow: user side

1. User arrives at plan selection screen → selects plan → taps "Pay via Bank Transfer"
2. App shows bank name, account number, account name, branch, exact amount, and reference code
3. User completes transfer externally
4. User returns to FinTrack → taps "I have made the payment"
5. Optional: user uploads a photo of the transfer confirmation
6. Status screen shows: "Payment pending — usually confirmed within 1 business day."
7. When admin confirms: push notification (if enabled) + email → user opens app to full access

---

## User flow: admin side

1. Admin panel sidebar shows "Pending" badge on the Users or Payments section
2. Admin opens the pending payments queue
3. Admin cross-checks their bank statement (externally)
4. Admin selects a pending payment → taps "Confirm" or "Reject"
5. On confirm: system writes to `user_payments`, sets `subscription_status = active`, sends confirmation email
6. On reject: system writes a rejected `user_payments` row, sends rejection email to user
7. Admin action is logged in `admin_actions`

---

## Impacts to keep in mind

- **`user_payments` table** needs: `payment_source` enum extended with `bank_transfer`; `status` enum (`pending`, `confirmed`, `rejected`); `receipt_image_url` nullable; `rejection_reason` nullable
- **Admin UI** adds a "Pending payments" queue section
- **Receipt image upload:** requires file storage (S3 or Vercel Blob). If p4-11 ships first, this ticket reuses that infrastructure
- **Idempotency:** confirming the same pending payment twice returns `409 ALREADY_CONFIRMED`
- **ADR-0011 preserved:** the admin confirms payment and activates the subscription by seeing only the payment claim; no financial data is exposed

---

## Open decisions (owner must settle before this moves to ready-for-agent)

- Is receipt photo upload required, optional, or skipped for the first version?
- Maximum wait time before a pending payment auto-expires?
- What reference code format makes bank-statement matching easiest for the owner?
- Refund policy if the admin confirmed the wrong payment

## Comments

<!-- Append discussion below this line -->
