# Tax rules are per-fiscal-year data, provisional until the user confirms them

Status: accepted (2026-11-11).

Every tax parameter (slabs, salary exemption, rebate rates and caps, minimum tax, early-filing rebate) is stored per Fiscal Year in `tax_years.config_json` and passed into the pure tax engine; the engine contains no constants. NBR rules change with each Finance Act, and published sources disagreed with each other and with the user's spreadsheet when this was written. Seeded values therefore follow the user's own tax spreadsheet, are flagged provisional, and can be corrected in the app without a deployment.

## Consequences

- A Fiscal Year whose configuration has not been confirmed shows a "provisional" notice on the Tax Dashboard.
- Acceptance tests for the engine pass the configuration explicitly, so a later correction of seeded values does not break them.
- The open questions are tracked in `.scratch/fintrack-bd-mvp/issues/24-confirm-tax-parameters.md`.
