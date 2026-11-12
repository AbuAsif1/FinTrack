'use client';

import { Amount } from './Amount';

interface SummaryTileProps {
  label: string;
  paisa: number;
  delta?: { paisa: number; label: string };
  icon?: React.ReactNode;
  className?: string;
}

export function SummaryTile({ label, paisa, delta, icon, className = '' }: SummaryTileProps) {
  return (
    <div className={`summary-tile ${className}`} style={{
      background: 'var(--bg-surface)',
      borderRadius: 10,
      border: '1px solid var(--border)',
      padding: '20px 20px 16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{
          font: 'var(--t-label)',
          color: 'var(--fg-secondary)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          {label}
        </span>
        {icon && <span style={{ color: 'var(--fg-muted)' }}>{icon}</span>}
      </div>
      <span style={{ font: 'var(--t-data)', display: 'block' }}><Amount paisa={paisa} /></span>
      {delta && (
        <div style={{
          font: 'var(--t-caption)',
          color: delta.paisa >= 0 ? 'var(--ok)' : 'var(--danger)',
          marginTop: 4,
        }}>
          {delta.paisa >= 0 ? '↑' : '↓'} <Amount paisa={Math.abs(delta.paisa)} /> {delta.label}
        </div>
      )}
    </div>
  );
}
