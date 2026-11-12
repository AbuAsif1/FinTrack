/** Return the Bangladesh Fiscal Year string ("YYYY-YY") for a calendar date string. */
export function fiscalYear(dateStr: string): string {
  const [yearStr, monthStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (month >= 7) {
    // July–December: FY is year→year+1
    const nextYY = (year + 1) % 100;
    return `${year}-${String(nextYY).padStart(2, '0')}`;
  } else {
    // January–June: FY is (year-1)→year
    const curYY = year % 100;
    return `${year - 1}-${String(curYY).padStart(2, '0')}`;
  }
}

/** Return the start and end date strings for a Fiscal Year (e.g. "2025-26" → {from:"2025-07-01", to:"2026-06-30"}). */
export function fiscalYearRange(fy: string): { from: string; to: string } {
  const startYear = parseInt(fy.split('-')[0], 10);
  return {
    from: `${startYear}-07-01`,
    to: `${startYear + 1}-06-30`,
  };
}

/** Return today's date as a "YYYY-MM-DD" string in the Asia/Dhaka timezone. */
export function todayInDhaka(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Convert a "YYYY-MM-DD" string to a Date at UTC midnight for Prisma @db.Date columns. */
export function toDbDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/** Convert a Prisma @db.Date (Date at UTC midnight) back to a "YYYY-MM-DD" string. */
export function fromDbDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
