# Monthly instances and notifications are generated on read, not by a scheduler

Status: accepted (2026-11-11).

Fixed Expense instances for a month, the configuration row for a new Fiscal Year, and notifications are created idempotently by the request that needs them, guarded by unique keys. The serverless host has no always-on process and its free-tier cron is coarse; generating on read needs no extra infrastructure and cannot be missed. A daily cron is deferred to Phase 2, where browser push notifications need it.
