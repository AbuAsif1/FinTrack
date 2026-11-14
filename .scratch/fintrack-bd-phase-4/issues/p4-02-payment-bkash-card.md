# p4-02: Automated Payment via bKash or Card

**Status:** needs-triage
**Phase:** 4
**Moved from:** Phase 3 p3-02
**Spec ref:** Phase 4 — Subscription

**What to build:** An in-app payment flow so users can subscribe and renew without contacting the admin. bKash is the primary path in Bangladesh; card (via a gateway such as SSLCommerz or ShurjoPay) is secondary. Successful payment directly activates or renews the subscription without admin involvement.

**Why this exists:** Manual bank-transfer confirmations (p4-03) require the admin to act on every payment. As user count grows, that does not scale. Automated payment removes the bottleneck, reduces churn from payment friction, and gives users instant confirmation. bKash covers most users in Bangladesh; card covers the rest.

**Blocked by:** p4-01 (plan definitions must exist before amounts can be charged) · Owner decisions (see Open decisions)

**Depends on (Phase 4):** p4-01

---

## Scenario

Fatema's trial ends tomorrow. She opens FinTrack and sees the plan selection screen. She picks the Basic plan. She taps "Pay with bKash." The app shows the merchant number, the amount (৳199), and a unique reference code (her user ID). It also offers a bKash deep-link button labelled "Open bKash." She taps it; her bKash app opens with the merchant pre-filled and the amount ready. She confirms the payment using her PIN. Within 30 seconds, FinTrack receives a confirmation webhook, her `subscription_status` moves to `active`, and the plan selection screen is replaced by the dashboard. She receives a receipt email. The admin's payment log gains one automatic entry marked "bKash — ৳199 — confirmed by gateway."

A second user, Rafiq, prefers a debit card. He selects card payment and is taken to the SSLCommerz checkout page (embedded iframe or redirect). He enters his card number and completes 3DS verification. Payment captured → subscription active → receipt email. Same outcome, different entry point.

---

## Use cases

- User pays for the first time (trial → active)
- User renews manually before auto-renewal fires
- Auto-renewal fires on `subscription_until` date (if the gateway supports recurring charges)
- Payment fails (wrong PIN, insufficient balance, card declined) → user sees clear error, can retry
- User switches payment method (was on bank transfer, now wants bKash)
- User requests a refund within the refund window → admin handles via admin panel (this ticket handles payment initiation only; refunds are a manual admin action)

---

## User flow: bKash payment

1. User arrives at plan selection screen (from trial-end gate or "Manage subscription" in profile)
2. Selects plan → taps "Pay with bKash"
3. App shows:
   - Merchant number (the owner's bKash business number)
   - Amount
   - Reference code (user's ID or username, to match the payment to the account)
   - "Open bKash" deep-link button
4. User opens bKash (deep-link or manually) → Send Money / Merchant Payment → enters merchant number, amount, reference → confirms with PIN
5. App polls for confirmation (or receives webhook push) — 60-second timeout
6. On success: `subscription_status = active`, `subscription_until` set, receipt email sent, admin payment log entry created automatically
7. On timeout: "Payment not yet confirmed. Check your bKash history. If the payment went through, it will appear here within a few minutes." — user can manually trigger a re-check
8. On failure: "Payment failed. Please try again or use a different payment method."

## User flow: card payment

1. User taps "Pay with Card"
2. App renders the gateway's checkout (embedded iframe preferred; redirect if iframe is unavailable)
3. User enters card details → 3DS prompt if required → confirms
4. Gateway calls the FinTrack webhook → subscription activated same as bKash success path
5. Receipt email sent; admin payment log gains an automatic entry marked "Card — ৳199 — confirmed by gateway"

---

## Impacts to keep in mind

- **Webhook endpoint** must be added to the API (`POST /webhooks/payment-gateway`). This endpoint is unauthenticated by the user session; it must be verified by the gateway's signature header to prevent spoofing.
- **`user_payments` table** (from MVP ticket 26) needs two new columns: `payment_source` (enum: `manual`, `bkash`, `card`) and `gateway_reference` (the transaction ID from the gateway). These columns are null for existing manual records.
- **Admin payment log** (MVP ticket 26 UI) must display gateway-originated entries as read-only. The admin can still add a note.
- **Card data never touches the FinTrack server.** The gateway iframe or redirect handles card entry. FinTrack only stores the gateway's transaction ID and status.
- **bKash Business API availability:** the bKash deep-link approach works without an API key. The full bKash Business API requires a business agreement with BRAC Bank. If the API is not available at launch, the deep-link + user-triggered re-check flow is the fallback.
- **ADR-0011 preserved:** the gateway webhook handler updates `subscription_status` and `user_payments` only.

---

## Open decisions (owner must settle before this moves to ready-for-agent)

- Which gateway for bKash: deep-link only (no API key needed) or bKash Business API (requires BRAC Bank agreement)?
- Which gateway for card: SSLCommerz, ShurjoPay, Stripe, or another?
- Does the gateway support recurring/subscription charges, or is renewal always manual?
- Refund policy and time window
- What reference code format is used to match the bKash payment to the account?

## Comments

<!-- Append discussion below this line -->
