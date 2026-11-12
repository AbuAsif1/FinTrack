'use client';

type AlertVariant = 'warn' | 'danger';

interface AlertBannerProps {
  variant: AlertVariant;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function AlertBanner({ variant, children, action, className = '' }: AlertBannerProps) {
  const color = variant === 'danger' ? 'var(--danger)' : 'var(--warn)';
  const bg = variant === 'danger' ? 'var(--danger-bg)' : 'var(--warn-bg)';

  return (
    <div
      role="alert"
      className={`alert-banner alert-banner--${variant} ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: bg,
        borderLeft: `4px solid ${color}`,
        borderRadius: 4,
        gap: 12,
      }}
    >
      <span style={{ color: 'var(--fg-primary)', font: 'var(--t-body)' }}>{children}</span>
      {action && <span>{action}</span>}
    </div>
  );
}
