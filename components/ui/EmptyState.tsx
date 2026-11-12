'use client';

interface EmptyStateProps {
  icon?: React.ReactNode;
  heading: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, heading, body, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`empty-state ${className}`}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px', textAlign: 'center' }}
    >
      {icon && (
        <span style={{ fontSize: 48, color: 'var(--fg-muted)', marginBottom: 16 }}>{icon}</span>
      )}
      <h3 style={{ font: 'var(--t-section)', color: 'var(--fg-primary)', margin: '0 0 8px' }}>{heading}</h3>
      {body && <p style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)', margin: '0 0 16px' }}>{body}</p>}
      {action}
    </div>
  );
}
