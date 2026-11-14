# P3-03: Manual Bank Transfer Payment Confirmation

**What to build:** A flow for users who pay by bank transfer or mobile banking outside the app, and for the admin to confirm those payments and activate the subscription. Builds directly on the payment log that already exists in the MVP (ticket 26, `user_payments` table and admin UI).

**Why this exists:** Not all users will trust or use bKash/card gateways. Some will prefer to send money directly to the owner's bank account — particularly during early adoption, before the automated gateway is set up, or simply by personal preference. The MVP's admin payment log already records date-paid, amount, and paid-until; this ticket connects that log to the subscription state machine so a manual confirmation also activates or renews a subscription.

**Status:** needs-triage

**Blocked by:** P3-01 (plan definitions and `subscription_status` field must exist) · MVP fully launched

**Depends on (Phase 3):** P3-01

---

## Scenario

Karim does not trust digital payment gateways. He opens the FinTrack subscription page and taps "Pay via Bank Transfer." The app shows the owner's bank details (bank name, account number, account name, branch) and the exact amount to send. It also shows a reference code — Karim's username — and asks him to include it in the transfer description so his payment can be matched.

Karim opens his bank's app, initiates a fund transfer, enters the owner's account number and the amount, and types "fintrack-karim" in the description. He takes a screenshot of the transfer confirmation.

Back in FinTrack, he sees a status page: "Payment pending — waiting for admin confirmation." He optionally uploads the screenshot.

The admin opens the admin panel and sees a "Pending manual payments" badge in the sidebar. They review Karim's entry: amount claimed, date, reference, screenshot. They cross-check their bank statement and confirm the amount. The admin taps "Confirm payment" and enters the actual amount received and date. Karim's `subscription_status` moves to `active` immediately. Karim receives an email: "Your payment has been confirmed. You're subscribed until [date]."

---

## Use cases

- User initiates bank transfer → submits claim in app → awaits admin confirmation
- Admin reviews pending queue → confirms payment → subscription activates
- Admin rejects payment (wrong amount, missing reference, unverified) → user is notified with a reason and asked to try again or contact the admin
- Partial payment received (user sent less than the plan price) → admin confirms the partial amount and flags it; system does not activate the subscription until the remainder is received
- User wants to switch from bank transfer to bKash in future → next payment uses P3-02 instead; this ticket handles bank-transfer path only
- Admin logs a payment proactively (user contacted them directly by phone) → same form as the existing MVP payment log, now also updates `subscription_status`

---

## User flow: user side

1. User arrives at plan selection screen → selects plan → taps "Pay via Bank Transfer"
2. App shows:
   - Bank name, account number, account name, branch
   - Exact amount (plan price)
   - Reference code (username or generated code)
   - Instruction: "Include the reference in your transfer description so we can identify your payment."
3. User completes transfer externally (bank app, internet banking, mobile banking)
4. User returns to FinTrack → taps "I have made the payment"
5. Optional: user uploads a photo of the transfer confirmation
6. Status screen shows: "Payment pending — usually confirmed within 1 business day."
7. When admin confirms: push notification (if enabled) + email → user opens app to full access

---

## User flow: admin side

1. Admin panel sidebar shows "Pending" badge on the Users or Payments section
2. Admin opens the pending payments queue — each row shows: user name, plan, amount claimed, date submitted, reference code, screenshot thumbnail
3. Admin cross-checks their bank statement (externally)
4. Admin selects a pending payment → taps "Confirm" or "Reject"
   - **Confirm:** admin enters actual amount received (defaults to claimed amount), date received, optional note → submits
   - **Reject:** admin selects a reason (amount mismatch, reference not found, duplicate) and optionally writes a message to the user → submits
5. On confirm: system writes to `user_payments`, sets `subscription_status = active`, `subscription_until = confirmation_date + billing period`, sends confirmation email to user
6. On reject: system writes a rejected `user_payments` row with the reason, sends rejection email to user
7. Admin action is logged in `admin_actions` (existing MVP mechanism)

---

## Impacts to keep in mind

- **`user_payments` table** (MVP ticket 26) needs: `payment_source` enum extended with `bank_transfer`; `status` enum (`pending`, `confirmed`, `rejected`); `receipt_image_url` nullable; `rejection_reason` nullable. Existing manual entries created by the admin have `status = confirmed` and `payment_source = manual` (backward-compatible migration).
- **Admin UI** (MVP ticket 26) adds a "Pending payments" queue section. The existing "Payments" section on the user detail page is retained — confirmed bank-transfer entries appear there in the same list as direct admin-added entries, with a "Bank transfer" badge and optional screenshot link.
- **Receipt image upload:** requires file storage (S3 or Vercel Blob). This is the same requirement as Phase 2 item 16 (document vault). If Phase 2 item 16 ships first, this ticket reuses that infrastructure; if not, a minimal single-file upload endpoint must be built here.
- **ADR-0011 preserved:** the admin confirms payment and activates the subscription by seeing only the payment claim (amount, date, reference, screenshot). The admin does not see the user's income, transactions, or savings at any point in this flow.
- **Idempotency:** confirming the same pending payment twice must be a no-op (the second confirm returns a 409 `ALREADY_CONFIRMED`), not a double-activation.

---

## Open decisions (owner must settle before this moves to ready-for-agent)

- Is receipt photo upload required, optional, or skipped for the first version?
- Maximum wait time before a pending payment auto-expires (e.g. 7 days with no confirmation → auto-rejected with a "not received" notification)?
- What reference code format makes bank-statement matching easiest for the owner?
- Refund policy: if the admin confirmed the wrong payment, what is the correction process?

## Comments

<!-- Append discussion below this line -->
