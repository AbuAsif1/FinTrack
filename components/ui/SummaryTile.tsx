'use client';

import { Amount } from './Amount';

type TileVariant = 'featured' | 'income' | 'spending' | 'savings' | 'neutral' | 'tax';

interface SummaryTileProps {
  label: string;
  paisa: number;
  delta?: { paisa: number; label: string };
  icon?: React.ReactNode;
  variant?: TileVariant;
  className?: string;
  /** Override with a plain string value instead of Amount (e.g. "68%" for rates) */
  valueOverride?: string;
  /** Subtitle below the value */
  subtitle?: string;
}

const variantStyles: Record<TileVariant, React.CSSProperties> = {
  featured: {
    background: '#111827',
    borderColor: 'transparent',
    color: '#F9FAFB',
  },
  income: {
    background: 'var(--bg-surface)',
    borderTopColor: 'var(--income)',
    borderTopWidth: 3,
    borderTopStyle: 'solid',
  },
  spending: {
    background: 'var(--bg-surface)',
    borderTopColor: 'var(--spending)',
    borderTopWidth: 3,
    borderTopStyle: 'solid',
  },
  savings: {
    background: 'var(--bg-surface)',
    borderTopColor: 'var(--savings)',
    borderTopWidth: 3,
    borderTopStyle: 'solid',
  },
  tax: {
    background: 'var(--bg-surface)',
    borderTopColor: 'var(--tax)',
    borderTopWidth: 3,
    borderTopStyle: 'solid',
  },
  neutral: {
    background: 'var(--bg-surface)',
  },
};

export function SummaryTile({ label, paisa, delta, icon, variant = 'neutral', className = '', valueOverride, subtitle }: SummaryTileProps) {
  const isFeatured = variant === 'featured';
  const vStyle = variantStyles[variant];

  const labelColor = isFeatured ? 'rgba(249,250,251,0.6)' : 'var(--fg-secondary)';
  const valueColor = isFeatured ? '#F9FAFB' : 'var(--fg-primary)';
  const iconColor = isFeatured ? 'rgba(249,250,251,0.5)' : 'var(--fg-muted)';

  return (
    <div className={`summary-tile ${className}`} style={{
      borderRadius: 10,
      border: '1px solid var(--border)',
      padding: '20px 20px 16px',
      ...vStyle,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{
          font: 'var(--t-label)',
          color: labelColor,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          {label}
        </span>
        {icon && (
          <span style={{ color: iconColor, fontSize: 16, lineHeight: 1 }}>{icon}</span>
        )}
      </div>

      <span style={{
        font: 'var(--t-data)',
        color: valueColor,
        display: 'block',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {valueOverride ?? <Amount paisa={paisa} />}
      </span>

      {subtitle && (
        <div style={{
          font: 'var(--t-caption)',
          color: isFeatured ? 'rgba(249,250,251,0.5)' : 'var(--fg-muted)',
          marginTop: 4,
        }}>
          {subtitle}
        </div>
      )}

      {delta && (
        <div style={{
          font: 'var(--t-caption)',
          color: delta.paisa >= 0
            ? (isFeatured ? '#4ADE80' : 'var(--ok)')
            : (isFeatured ? '#F87171' : 'var(--danger)'),
          marginTop: subtitle ? 4 : 6,
        }}>
          {delta.paisa >= 0 ? '↑' : '↓'} <Amount paisa={Math.abs(delta.paisa)} /> {delta.label}
        </div>
      )}
    </div>
  );
}
