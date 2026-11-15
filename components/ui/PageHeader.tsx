'use client';

interface PageHeaderProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ description, actions }: PageHeaderProps) {
  if (!description && !actions) return null;
  return (
    <div className="page-hdr" style={{ marginBottom: 20 }}>
      {description && (
        <p style={{ margin: 0, font: 'var(--t-body)', color: 'var(--fg-secondary)' }}>
          {description}
        </p>
      )}
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 'auto' }}>
          {actions}
        </div>
      )}
    </div>
  );
}
