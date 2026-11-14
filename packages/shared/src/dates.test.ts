import { describe, it, expect, vi, afterEach } from 'vitest';
import { fiscalYear, fiscalYearRange, todayInDhaka, toDbDate, fromDbDate } from './dates';

describe('fiscalYear', () => {
  it('TC-FND-012 fiscal year boundary cases', () => {
    expect(fiscalYear('2025-06-30')).toBe('2024-25');
    expect(fiscalYear('2025-07-01')).toBe('2025-26');
    expect(fiscalYear('2026-01-15')).toBe('2025-26');
  });
});

describe('fiscalYearRange', () => {
  it('TC-FND-013 returns July 1 to June 30', () => {
    expect(fiscalYearRange('2025-26')).toEqual({
      from: '2025-07-01',
      to: '2026-06-30',
    });
  });
});

describe('todayInDhaka', () => {
  afterEach(() => vi.useRealTimers());

  it('TC-FND-014 2026-06-30 18:30 UTC → 2026-07-01 in Dhaka (UTC+6)', () => {
    // 18:30 UTC = 00:30+06:00 on 2026-07-01
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-30T18:30:00.000Z'));
    expect(todayInDhaka()).toBe('2026-07-01');
  });
});

describe('toDbDate / fromDbDate', () => {
  it('TC-FND-015 round-trips a date string through DB representation', () => {
    const dateStr = '2026-07-01';
    const dbDate = toDbDate(dateStr);
    expect(fromDbDate(dbDate)).toBe(dateStr);
  });
});
