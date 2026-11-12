import { z } from 'zod';

function formatSouthAsian(n: number): string {
  const str = String(n);
  if (str.length <= 3) return str;
  const last3 = str.slice(-3);
  const rest = str.slice(0, -3);
  const groups: string[] = [];
  let remaining = rest;
  while (remaining.length > 2) {
    groups.unshift(remaining.slice(-2));
    remaining = remaining.slice(0, -2);
  }
  if (remaining.length > 0) groups.unshift(remaining);
  return groups.join(',') + ',' + last3;
}

/** Format integer Paisa as ৳ with South Asian grouping (e.g. 200684600 → "৳20,06,846.00"). */
export function formatBDT(paisa: number): string {
  const isNegative = paisa < 0;
  const abs = Math.abs(paisa);
  const bdt = Math.floor(abs / 100);
  const p = abs % 100;
  const prefix = isNegative ? '−৳' : '৳'; // U+2212 minus or nothing, then ৳ U+09F3
  return `${prefix}${formatSouthAsian(bdt)}.${String(p).padStart(2, '0')}`;
}

/** Parse a BDT decimal string to integer Paisa. Throws on invalid input. */
export function parseBDT(text: string): number {
  if (!text) throw new Error('Empty input');
  if (/[eE]/.test(text)) throw new Error('Exponent not allowed');
  if (text.startsWith('-')) throw new Error('Negative amounts are not supported here');
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) throw new Error(`Invalid BDT format: "${text}"`);
  const integer = parseInt(match[1], 10);
  const decimal = match[2] ? match[2].padEnd(2, '0') : '00';
  return integer * 100 + parseInt(decimal, 10);
}

/** Convert integer Paisa to a decimal BDT string without grouping (e.g. 119850 → "1198.50"). */
export function toDecimalString(paisa: number): string {
  const abs = Math.abs(paisa);
  const bdt = Math.floor(abs / 100);
  const p = abs % 100;
  return `${paisa < 0 ? '-' : ''}${bdt}.${String(p).padStart(2, '0')}`;
}

/** Convert a Prisma bigint Paisa value to a safe JS number. Throws if out of range. */
export function toPaisa(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(-Number.MAX_SAFE_INTEGER)) {
    throw new RangeError('Paisa value exceeds safe integer range');
  }
  return Number(value);
}

/** Round a floating-point Paisa value half-up to the nearest integer. */
export function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5);
}

/** Zod schema for integer Paisa: must be an integer within the safe range. */
export const paisaSchema = z.number().int('Must be an integer Paisa').safe('Amount exceeds safe integer range');
