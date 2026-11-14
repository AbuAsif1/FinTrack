import { describe, it, expect } from 'vitest';
import { formatBDT, parseBDT, toDecimalString, roundHalfUp, toPaisa, paisaSchema } from './money';

describe('formatBDT', () => {
  it('TC-FND-001 formatBDT(200684600) → ৳20,06,846.00', () => {
    expect(formatBDT(200684600)).toBe('৳20,06,846.00');
  });

  it('TC-FND-002 formatBDT(-314542) → −৳3,145.42 with U+2212', () => {
    const result = formatBDT(-314542);
    expect(result).toBe('−৳3,145.42');
    expect(result.codePointAt(0)).toBe(0x2212); // U+2212 minus sign
  });

  it('TC-FND-003 formatBDT(0) → ৳0.00', () => {
    expect(formatBDT(0)).toBe('৳0.00');
  });

  it('TC-FND-004 one lakh and one crore', () => {
    expect(formatBDT(10000000)).toBe('৳1,00,000.00');  // 1 lakh BDT = 100,000 × 100 Paisa
    expect(formatBDT(1000000000)).toBe('৳1,00,00,000.00'); // 1 crore BDT = 10,000,000 × 100 Paisa
  });

  it('TC-FND-005 below one thousand', () => {
    expect(formatBDT(50000)).toBe('৳500.00');
    expect(formatBDT(99)).toBe('৳0.99');
  });
});

describe('parseBDT', () => {
  it('TC-FND-006 valid inputs', () => {
    expect(parseBDT('1198.50')).toBe(119850);
    expect(parseBDT('50000')).toBe(5000000);
    expect(parseBDT('0.5')).toBe(50);
  });

  it('TC-FND-007 invalid inputs are rejected', () => {
    expect(() => parseBDT('12.345')).toThrow();
    expect(() => parseBDT('1e3')).toThrow();
    expect(() => parseBDT('')).toThrow();
    expect(() => parseBDT('abc')).toThrow();
    expect(() => parseBDT('-5')).toThrow();
  });
});

describe('toDecimalString', () => {
  it('TC-FND-008 Paisa to decimal string', () => {
    expect(toDecimalString(119850)).toBe('1198.50');
    expect(toDecimalString(5000000)).toBe('50000.00');
  });
});

describe('roundHalfUp', () => {
  it('TC-FND-009 half rounds up, below half rounds down', () => {
    // 3% of 150 Paisa: 150 × 0.03 = 4.5 → 5
    expect(roundHalfUp(150 * 3 / 100)).toBe(5);
    // 3% of 149 Paisa: 149 × 0.03 = 4.47 → 4
    expect(roundHalfUp(149 * 3 / 100)).toBe(4);
  });
});

describe('toPaisa', () => {
  it('TC-FND-010 safe bigint → number; unsafe → error', () => {
    expect(toPaisa(BigInt(100))).toBe(100);
    expect(toPaisa(BigInt(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER);
    expect(() => toPaisa(BigInt(Number.MAX_SAFE_INTEGER) + 1n)).toThrow();
  });
});

describe('paisaSchema', () => {
  it('TC-FND-011 rejects float, numeric string, unsafe integer', () => {
    expect(() => paisaSchema.parse(1.5)).toThrow();
    expect(() => paisaSchema.parse('100' as unknown as number)).toThrow();
    expect(() => paisaSchema.parse(Number.MAX_SAFE_INTEGER + 1)).toThrow();
    // Valid
    expect(paisaSchema.parse(100)).toBe(100);
    expect(paisaSchema.parse(0)).toBe(0);
  });
});
