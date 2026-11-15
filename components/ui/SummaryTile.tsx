'use client';

import { Amount } from './Amount';

type TileVariant = 'featured' | 'income' | 'spending' | 'savings' | 'neutral' | 'tax' | 'danger' | 'warn';

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

const variantDot: Record<TileVariant, string> = {
  featured: 'var(--accent)',
  income:   'var(--income)',
  spending: 'var(--spending)',
  savings:  'var(--savings)',
  tax:      'var(--tax)',
  neutral:  'var(--fg-muted)',
  danger:   'var(--danger)',
  warn:     'var(--warn)',
};

export function SummaryTile({ label, paisa, delta, icon, variant = 'neutral', className = '', valueOverride, subtitle }: SummaryTileProps) {
  const dot = variantDot[variant];

  return (
    <div className={`summary-tile ${className}`} style={{
      background: 'var(--bg-surface)',
      borderRadius: 12,
      border: '1px solid var(--border)',
      padding: '16px 18px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{
          font: 'var(--t-label)',
          color: 'var(--fg-secondary)',
          fontSize: 11,
          letterSpacing: '0.03em',
        }}>
          {label}
        </span>
        {icon
          ? <span style={{ color: 'var(--fg-muted)', fontSize: 15, lineHeight: 1 }}>{icon}</span>
          : <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0 }} />
        }
      </div>

      <span style={{
        font: 'var(--t-data)',
        color: 'var(--fg-primary)',
        display: 'block',
        fontVariantNumeric: 'tabular-nums',
        fontSize: 22,
      }}>
        {valueOverride ?? <Amount paisa={paisa} />}
      </span>

      {subtitle && (
        <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', marginTop: 4 }}>
          {subtitle}
        </div>
      )}

      {delta && (
        <div style={{
          font: 'var(--t-caption)',
          color: delta.paisa >= 0 ? 'var(--ok)' : 'var(--danger)',
          marginTop: subtitle ? 4 : 6,
          display: 'flex', alignItems: 'center', gap: 3,
        }}>
          <span>{delta.paisa >= 0 ? '↑' : '↓'}</span>
          <Amount paisa={Math.abs(delta.paisa)} />
          <span style={{ color: 'var(--fg-muted)', marginLeft: 2 }}>{delta.label}</span>
        </div>
      )}
    </div>
  );
}
