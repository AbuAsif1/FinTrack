# Money is integer paisa end to end, sent as JSON numbers

Status: accepted (2026-11-11).

Every amount is `BIGINT` paisa in PostgreSQL and a plain integer number in JSON and TypeScript; decimals exist only in `formatBDT` output and `parseBDT` input. Floating-point drift corrupted totals in the source spreadsheets. Prisma `bigint` values are converted to `number` at the data-access boundary, rejecting anything outside the safe-integer range (about ৳90 trillion), instead of being sent as strings: string amounts would force parsing at every call site, and `BigInt` does not serialise to JSON. Percentages are integer basis points for the same reason.
