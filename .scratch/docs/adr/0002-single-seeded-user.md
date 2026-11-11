# The MVP has one seeded user and no public registration

Status: superseded by ADR-0010 (2026-11-12). Originally accepted 2026-11-11, superseding FR-01 of BRD v1.0 (register, verify email, reset password by email).

The MVP serves one person, so the account is created by a seed script from environment variables and there are no registration, email-verification or password-reset-by-email endpoints. This removes the need for an email provider and stops strangers signing up to a personal finance app. Every table still carries `user_id` and every query filters on it, so multi-user sign-up can be added in Phase 2 without a schema change. A forgotten password is reset with a CLI script run against the database.
