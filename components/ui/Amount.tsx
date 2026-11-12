'use client';

import { formatBDT } from '@fintrack/shared';

interface AmountProps {
  paisa: number;
  className?: string;
  /** Show a + prefix for positive values */
  showPlus?: boolean;
}

export function Amount({ paisa, className = '', showPlus = false }: AmountProps) {
  const formatted = formatBDT(paisa);
  const withPlus = showPlus && paisa > 0 ? `+${formatted}` : formatted;

  return (
    <span
      className={`amount ${paisa < 0 ? 'amount--negative' : ''} ${className}`}
      style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}
    >
      {withPlus}
    </span>
  );
}
