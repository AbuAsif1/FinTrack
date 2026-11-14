'use client';

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  'aria-label'?: string;
}

export function ProgressBar({ value, max = 100, className = '', 'aria-label': ariaLabel }: ProgressBarProps) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const fillColor = pct >= 100 ? 'var(--danger)' : pct >= 70 ? 'var(--warn)' : 'var(--ok)';

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemax={max}
      aria-label={ariaLabel}
      className={`progress-bar ${className}`}
      style={{
        height: 6,
        borderRadius: 3,
        background: 'var(--bg-sunken)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${pct}%`,
          background: fillColor,
          borderRadius: 3,
          transition: 'width 0.2s ease',
        }}
      />
    </div>
  );
}
