'use client';

type BadgeVariant = 'ok' | 'warn' | 'danger' | 'neutral';

interface StatusBadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const styles: Record<BadgeVariant, React.CSSProperties> = {
  ok:      { color: 'var(--ok)',      background: 'var(--ok-bg)' },
  warn:    { color: 'var(--warn)',    background: 'var(--warn-bg)' },
  danger:  { color: 'var(--danger)',  background: 'var(--danger-bg)' },
  neutral: { color: 'var(--neutral)', background: 'var(--neutral-bg)' },
};

export function StatusBadge({ variant, children, className = '' }: StatusBadgeProps) {
  return (
    <span
      className={`status-badge status-badge--${variant} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 999,
        font: 'var(--t-label)',
        ...styles[variant],
      }}
    >
      {children}
    </span>
  );
}
