'use client';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="page-hdr">
      <div>
        {eyebrow && (
          <p style={{
            margin: '0 0 4px',
            font: 'var(--t-label)',
            color: 'var(--fg-muted)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            {eyebrow}
          </p>
        )}
        <h1 style={{
          margin: 0,
          font: '700 26px var(--font-space-grotesk, system-ui)',
          color: 'var(--fg-primary)',
          lineHeight: 1.15,
        }}>
          {title}
        </h1>
        {description && (
          <p style={{
            margin: '6px 0 0',
            font: 'var(--t-body)',
            color: 'var(--fg-secondary)',
          }}>
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
          paddingTop: eyebrow ? 20 : 4,
        }}>
          {actions}
        </div>
      )}
    </div>
  );
}
