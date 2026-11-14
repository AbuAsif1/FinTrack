# The MVP has public registration with email verification

Status: accepted (2026-11-12). Supersedes ADR-0002.

The owner's original plan is an app that several people use, each seeing only their own data, so the MVP includes registration, email verification and password reset by email. This brings back an email provider (Resend) and the risk of fake accounts, which is handled with verification before first sign-in, rate limits, and a deployment setting (`SIGNUP_MODE`) that lets the owner close sign-up.

## Consequences

- A new account is provisioned with starter categories and tax settings copied from data files, and no financial records.
- Tax settings stay per user; centrally managed defaults are a Phase 2 candidate. User accounts are managed by an admin role (ADR-0011); sign-up itself is opened or closed with `SIGNUP_MODE`.
- The suggested Fixed Expenses in `brd.md` FR-05 are the owner's own; they are offered, never created automatically.
