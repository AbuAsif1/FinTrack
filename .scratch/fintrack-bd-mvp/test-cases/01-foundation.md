# Test cases: Foundation and shared helpers

Ticket 01. Read `README.md` in this folder first.

| ID | Test case | Expected | Seam | P | Covers |
|---|---|---|---|---|---|
| TC-FND-001 | `formatBDT(200684600)` | `৳20,06,846.00` | Unit | P1 | AC-FMT-1 |
| TC-FND-002 | `formatBDT(-314542)` | `−৳3,145.42`, with U+2212 before the ৳ | Unit | P1 | AC-FMT-1 |
| TC-FND-003 | `formatBDT(0)` | `৳0.00` | Unit | P1 | AC-FMT-1 |
| TC-FND-004 | `formatBDT` of one lakh and one crore (10000000 and 1000000000 Paisa) | `৳1,00,000.00` and `৳1,00,00,000.00` | Unit | P1 | rules §1 |
| TC-FND-005 | `formatBDT` below one thousand (50000 and 99 Paisa) | `৳500.00` and `৳0.99` | Unit | P2 | rules §1 |
| TC-FND-006 | `parseBDT` of `"1198.50"`, `"50000"` and `"0.5"` | 119850, 5000000 and 50 | Unit | P1 | AC-FMT-1 |
| TC-FND-007 | `parseBDT` of `"12.345"`, `"1e3"`, `""`, `"abc"` and `"-5"` | Each is rejected as invalid | Unit | P1 | rules §1 |
| TC-FND-008 | `toDecimalString(119850)` and `toDecimalString(5000000)` | `"1198.50"` and `"50000.00"` | Unit | P1 | rules §1 |
| TC-FND-009 | `roundHalfUp` on exactly half a Paisa and just below it (3% of 150 and of 149 Paisa) | 5 and 4 | Unit | P1 | brd FR-TAX-02 |
| TC-FND-010 | `toPaisa` of a safe `bigint` and of one above the safe-integer range | The number; an error | Unit | P1 | ADR-0003 |
| TC-FND-011 | `paisaSchema` given a float, a numeric string and an unsafe integer | Each is rejected | Unit | P1 | rules §1 |
| TC-FND-012 | `fiscalYear("2025-06-30")`, `fiscalYear("2025-07-01")`, `fiscalYear("2026-01-15")` | `"2024-25"`, `"2025-26"`, `"2025-26"` | Unit | P1 | AC-FMT-1 |
| TC-FND-013 | `fiscalYearRange("2025-26")` | from `2025-07-01` to `2026-06-30` | Unit | P1 | rules §2 |
| TC-FND-014 | `todayInDhaka()` when the clock reads 2026-06-30 18:30 UTC | `"2026-07-01"` | Unit | P1 | ADR-0004 |
| TC-FND-015 | `toDbDate` then `fromDbDate` on `"2026-07-01"` | `"2026-07-01"` | Unit | P1 | ADR-0004 |
| TC-FND-016 | `TaxYearConfig` schema given a config with no remainder slab, and one with a negative rate | Each is rejected | Unit | P2 | architecture §Tax engine |
| TC-FND-017 | `GET /health` with no token | 200 | API | P1 | architecture §API |
| TC-FND-018 | Run the seed on an empty database | One verified `ADMIN` account with 16 starter categories, three provisional tax years and no financial records | API | P1 | ADR-0010, ADR-0011 |
| TC-FND-019 | Run the seed a second time | Nothing new is created | API | P2 | architecture §Database schema |
| TC-FND-020 | `provisionNewUser` for a new user | Exactly the 16 starter categories and the three provisional tax years exist for that user | API | P1 | ADR-0010 |
