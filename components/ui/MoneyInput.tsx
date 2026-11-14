'use client';

import { parseBDT } from '@fintrack/shared';
import { useState } from 'react';

interface MoneyInputProps {
  value: number | null;
  onChange: (paisa: number | null) => void;
  id?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MoneyInput({ value, onChange, id, placeholder = '0.00', className = '', disabled }: MoneyInputProps) {
  const [rawText, setRawText] = useState(() =>
    value !== null ? String(value / 100) : ''
  );
  const [error, setError] = useState<string | null>(null);

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
    <div className={`money-input-wrapper ${className}`}>
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
      />
      {error && (
        <span id={`${id}-error`} role="alert" style={{ color: 'var(--danger)', fontSize: '12px' }}>
          {error}
        </span>
      )}
    </div>
  );
}
