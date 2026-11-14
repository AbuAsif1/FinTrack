# p3-08: Passkey or Two-Factor Sign-in

**Status:** needs-triage
**Phase:** 3
**Moved from:** Phase 2 §3
**Spec ref:** Phase 3 — Deferred features

---

## What to build

A second authentication factor for sign-in, using either:

- **TOTP (Time-based One-Time Password)** via an authenticator app (e.g. Google Authenticator, Authy), or
- **Passkey** (WebAuthn / FIDO2) using the device's biometric or PIN.

Both are opt-in. Users who do not enable either factor sign in as today. Recovery codes must be provided when 2FA is enabled.

---

## Why

FinTrack holds a user's complete financial picture — every transaction, every loan, every tax year. A leaked password is the only barrier to full data access. Adding a second factor means a stolen password alone is not enough. For the target user (a salaried professional in Bangladesh who keeps real financial records), this is table-stakes security for anything beyond a demo app.

---

## User flows

### Enabling TOTP
1. User opens **Settings → Security → Two-factor authentication**.
2. "Enable authenticator app" shows a QR code and the raw TOTP secret.
3. User scans the QR code with their authenticator app and types the current 6-digit code to verify.
4. App confirms the code, marks 2FA as active, and shows **10 single-use recovery codes** in a modal. User is instructed to save them somewhere safe. Recovery codes are shown only once.
5. Future sign-ins add a "Enter your 6-digit code" step after the password check.

### Enabling a Passkey
1. User opens **Settings → Security → Passkeys**.
2. "Add a passkey" triggers the browser/OS WebAuthn flow (Face ID, fingerprint, Windows Hello, etc.).
3. On success, the passkey is saved server-side. The user names it (e.g. "iPhone 15" or "Work laptop").
4. Future sign-ins on a device with a registered passkey offer "Sign in with passkey" as an alternative to email + password.

### Sign-in with TOTP active
1. User enters email + password → credentials verified.
2. A "Two-factor authentication" screen prompts for the 6-digit code.
3. Correct code → session created. Invalid code → error. Three consecutive failures → 15-minute lockout.

### Sign-in with a passkey
1. User clicks "Sign in with passkey" on the sign-in page.
2. Browser WebAuthn flow completes (biometric / PIN).
3. Session created.

### Using a recovery code
1. On the TOTP screen, user clicks "Use a recovery code."
2. Types one of their 10 recovery codes.
3. Correct → session created and that code is consumed (cannot be reused).
4. If fewer than 3 recovery codes remain, a banner prompts the user to generate a new set.

### Disabling 2FA
1. User opens **Settings → Security**.
2. "Disable two-factor authentication" requires the current TOTP code (or a recovery code) plus the account password before removal.
3. Passkeys can be removed individually by name from the passkeys list; removing the last passkey with no TOTP active leaves the account without a second factor.

---

## Scenarios

**Scenario A — travel security:** A user is at an airport and signs in on a shared device. TOTP means that even if someone watched them type their password, the TOTP code expires in 30 seconds and cannot be reused.

**Scenario B — lost phone:** A user's phone (with the authenticator app) is stolen. They use a recovery code to sign in, then disable and re-enable 2FA with their new phone.

**Scenario C — passkey on two devices:** A user registers both their laptop and phone as passkeys. They can sign in on either without typing a password at all.

**Scenario D — shared family device:** A user deliberately does not enable 2FA so that signing in on the family tablet remains quick.

---

## Impact areas

- New DB tables: `totp_credentials` (secret, enabled, verified_at), `recovery_codes` (hashed, consumed), `passkeys` (credential_id, public_key, counter, name, created_at)
- Sign-in API (`POST /auth/token`): must check for active 2FA after password verification and return a partial `mfa_required` state rather than a full session token
- New API routes: `POST /auth/mfa/totp/setup`, `POST /auth/mfa/totp/verify`, `DELETE /auth/mfa/totp`, `GET/POST/DELETE /auth/mfa/passkeys`, `POST /auth/mfa/recovery-codes/regenerate`
- WebAuthn requires HTTPS everywhere — confirm the production deployment satisfies this
- Rate-limiting on the TOTP verification endpoint (3 attempts → 15-minute lockout)
- Recovery codes must be stored hashed (bcrypt or Argon2), displayed in plaintext only on generation
- TOTP library needed (e.g. `otplib`); WebAuthn library needed (e.g. `@simplewebauthn/server`)

---

## Decisions needed before build

- Offer both TOTP and passkey from the start, or phase them (TOTP first as it is simpler server-side)? Recommend TOTP first.
- Minimum number of recovery codes (spec implies 10; confirm).
- Whether passkey sign-in replaces or supplements the email+password flow (additive — passkey is an alternative, not a replacement, until the user chooses to remove their password).
- ADR needed for the MFA architecture choice.

---

## Blocked by

- Ticket 02 (Authentication) — the sign-in flow this extends must be fully stable first.

## Comments

<!-- Append discussion below this line -->
