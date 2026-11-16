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
  /** Reduced height/padding for inline use */
  compact?: boolean;
  className?: string;
}

export function AlertBanner({
  variant,
  children,
  title,
  body,
  action,
  onDismiss,
  compact = false,
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
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: compact ? '5px 10px 5px 12px' : '12px 16px',
        background: bg,
        border: `1px solid ${borderSubtle}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 6,
        gap: 10,
      }}
    >
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: compact ? 8 : 0, flexWrap: compact ? 'nowrap' : undefined }}>
        {title ? (
          compact ? (
            <span style={{ font: 'var(--t-caption)', fontWeight: 600, color }}>{title}</span>
          ) : (
            <>
              <div style={{ font: 'var(--t-body)', fontWeight: 600, color, marginBottom: body ? 3 : 0 }}>
                {title}
              </div>
              {body && (
                <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>{body}</div>
              )}
            </>
          )
        ) : (
          <span style={{ color: 'var(--fg-primary)', font: compact ? 'var(--t-caption)' : 'var(--t-body)' }}>{children}</span>
        )}
        {compact && body && (
          <span style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)', marginLeft: 2 }}>{body}</span>
        )}
      </div>

      {action && <span style={{ flexShrink: 0 }}>{action}</span>}

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
            fontSize: compact ? 12 : 15,
            padding: '0 2px',
            flexShrink: 0,
            lineHeight: 1,
            opacity: 0.7,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
