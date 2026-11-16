'use client';

import { parseBDT } from '@fintrack/shared';
import { useEffect, useState } from 'react';

interface MoneyInputProps {
  value: number | null;
  onChange: (paisa: number | null) => void;
  id?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Called with false while the typed text is not a valid amount, so a form can block saving (F-35). */
  onValidityChange?: (valid: boolean) => void;
}

export function MoneyInput({ value, onChange, id, placeholder = '0.00', className = '', disabled, onValidityChange }: MoneyInputProps) {
  const [rawText, setRawText] = useState(() =>
    value !== null ? String(value / 100) : ''
  );
  const [error, setError] = useState<string | null>(null);

  // Follow a value set from outside after mount (e.g. a pre-filled salary), unless the user is
  // in the middle of typing something invalid.
  useEffect(() => {
    if (error) return;
    let shown: number | null = null;
    try { shown = rawText ? parseBDT(rawText) : null; } catch { shown = null; }
    if (shown !== value) setRawText(value !== null ? String(value / 100) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => { onValidityChange?.(!error); }, [error, onValidityChange]);
  // A field that disappears (e.g. switching Salary ↔ Other Income) no longer blocks saving.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => onValidityChange?.(true), []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    setRawText(text);

    if (!text) {
      setError(null);
      onChange(null);
      return;
    }

    try {
      const paisa = parseBDT(text);
      setError(null);
      onChange(paisa);
    } catch {
      setError('Enter a valid amount (e.g. 1198.50)');
      onChange(null);
    }
  }

  return (
    <div className={`money-input-wrapper ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={rawText}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '10px 12px',
          border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
          borderRadius: 8,
          font: 'var(--t-body)',
          backgroundColor: disabled ? 'var(--bg-raised)' : 'var(--bg-sunken)',
          outline: 'none',
        }}
      />
      {error && (
        <span id={`${id}-error`} role="alert" style={{ color: 'var(--danger)', font: 'var(--t-caption)' }}>
          {error}
        </span>
      )}
    </div>
  );
}
