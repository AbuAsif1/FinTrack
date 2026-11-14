import { toDecimalString } from '@fintrack/shared';

// UTF-8 BOM so Excel reads Bangla text correctly
const BOM = '﻿';

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined): string => {
    const s = v === null || v === undefined ? '' : String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [headers.map(escape).join(',')];
  for (const row of rows) lines.push(row.map(escape).join(','));
  return BOM + lines.join('\r\n') + '\r\n';
}

export function paisaToBdt(paisa: bigint | number): string {
  return toDecimalString(typeof paisa === 'bigint' ? Number(paisa) : paisa);
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
