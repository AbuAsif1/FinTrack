/**
 * Calendar helpers in Asia/Dhaka, the app's time zone (ADR-0004).
 * The workbook's examples are written for November 2026; automation uses the real current
 * month and fiscal year so the suite keeps working in any month.
 */
function dhakaParts(d = new Date()) {
  const s = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  const [y, m, day] = s.split('-').map(Number);
  return { y, m, day };
}

export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Today as YYYY-MM-DD in Dhaka. */
export function today(): string {
  const { y, m, day } = dhakaParts();
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Current month as YYYY-MM in Dhaka. */
export function currentMonth(): string {
  return today().slice(0, 7);
}

/** Fiscal year start year: July–June (FY2026-27 starts 2026). */
export function fyStartYear(month = currentMonth()): number {
  const [y, m] = month.split('-').map(Number);
  return m >= 7 ? y : y - 1;
}

/** Fiscal year label, e.g. "2026-27". */
export function fiscalYear(month = currentMonth()): string {
  const s = fyStartYear(month);
  return `${s}-${String(s + 1).slice(-2)}`;
}

/** First day of the current fiscal year, e.g. "2026-07-01". */
export function fyStartDate(): string {
  return `${fyStartYear()}-07-01`;
}

/** The first `n` months of the current fiscal year as YYYY-MM (July onward). */
export function fyMonths(n: number): string[] {
  const s = fyStartYear();
  return Array.from({ length: n }, (_, i) => {
    const m = 7 + i;
    return m <= 12 ? `${s}-${String(m).padStart(2, '0')}` : `${s + 1}-${String(m - 12).padStart(2, '0')}`;
  });
}
