/** Money helpers. All amounts in these tests are integer Paisa (1 BDT = 100 Paisa), like the app. */

/** ৳ amount to Paisa: tk(1_80_000) === 18_000_000. Accepts decimals: tk(3145.42) === 314_542. */
export function tk(bdt: number): number {
  return Math.round(bdt * 100);
}

/**
 * Parses a displayed amount into Paisa. Handles "৳1,80,000.00", "৳180,000.00", "−৳1,500.00",
 * "+৳5,500.00" and a plain "-1500". Throws when the text holds no number, so a missing value
 * fails loudly instead of reading as zero.
 */
export function parsePaisa(text: string | null | undefined): number {
  if (text == null) throw new Error('No amount text found');
  const t = text.replace(/−/g, '-').replace(/[৳,\s]/g, '').replace(/^\+/, '');
  const m = t.match(/-?\d+(\.\d+)?/);
  if (!m) throw new Error(`Not an amount: "${text}"`);
  return Math.round(parseFloat(m[0]) * 100);
}

/** Paisa to the BDT string a tester reads, for messages: 18000000 → "৳1,80,000.00". */
export function bdt(paisa: number): string {
  const neg = paisa < 0;
  const [int, dec] = (Math.abs(paisa) / 100).toFixed(2).split('.');
  const last3 = int.slice(-3);
  const rest = int.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${neg ? '−' : ''}৳${rest ? rest + ',' : ''}${last3}.${dec}`;
}
