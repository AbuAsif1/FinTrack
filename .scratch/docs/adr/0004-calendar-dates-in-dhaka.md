# Business dates are calendar dates in Asia/Dhaka, not instants

Status: accepted (2026-11-11).

Transaction dates, due dates and months are stored as `DATE` and sent as `"YYYY-MM-DD"` or `"YYYY-MM"` strings, and "today" is always evaluated in Asia/Dhaka. Vercel runs in UTC, six hours behind Dhaka, so treating a date as a timestamp would put an entry made at 00:30 on 1 July into the previous fiscal year. `fiscalYear()` therefore takes a date string and never a `Date` object. Only audit timestamps (`created_at`, `updated_at`, `deleted_at`) are UTC instants.
