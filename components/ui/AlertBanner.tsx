'use client';

type AlertVariant = 'warn' | 'danger';

interface AlertBannerProps {
  variant: AlertVariant;
  /** Free-form content (used when title/body are not set) */
  children?: React.ReactNode;
  /** Bold first line */
  title?: string;
  /** Muted second line */
  body?: string;
  /** Right-side action element */
  action?: React.ReactNode;
  /** Show a dismiss (✕) button on the right */
  onDismiss?: () => void;
  className?: string;
}

export function AlertBanner({
  variant,
  children,
  title,
  body,
  action,
  onDismiss,
  className = '',
}: AlertBannerProps) {
  const color = variant === 'danger' ? 'var(--danger)' : 'var(--warn)';
  const bg    = variant === 'danger' ? 'var(--danger-bg)' : 'var(--warn-bg)';
  const borderSubtle = variant === 'danger'
    ? 'rgba(185,28,28,0.18)'
    : 'rgba(180,83,9,0.18)';

  return (
    <div
      role="alert"
      className={`alert-banner alert-banner--${variant} ${className}`}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: bg,
        border: `1px solid ${borderSubtle}`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 8,
        gap: 12,
      }}
    >
      <div style={{ flex: 1 }}>
        {title ? (
          <>
            <div style={{ font: 'var(--t-body)', fontWeight: 600, color, marginBottom: body ? 3 : 0 }}>
              {title}
            </div>
            {body && (
              <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>{body}</div>
            )}
          </>
        ) : (
          <span style={{ color: 'var(--fg-primary)', font: 'var(--t-body)' }}>{children}</span>
        )}
      </div>

      {action && <span style={{ flexShrink: 0, alignSelf: 'center' }}>{action}</span>}

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color,
            fontSize: 15,
            padding: '0 2px',
            flexShrink: 0,
            lineHeight: 1,
            alignSelf: 'flex-start',
            opacity: 0.8,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
