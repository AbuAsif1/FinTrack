'use client';

import { usePageDescription } from './PageDescriptionContext';

interface PageHeaderProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ description, actions }: PageHeaderProps) {
  usePageDescription(description ?? '');

  if (!description && !actions) return null;

  // Description-only: render a mobile-only paragraph (desktop topbar handles it)
  if (!actions) {
    return (
      <p className="hidden-desktop" style={{ margin: '0 0 20px', font: 'var(--t-body)', color: 'var(--fg-secondary)' }}>
        {description}
      </p>
    );
  }

  return (
    <div className="page-hdr" style={{ marginBottom: 20 }}>
      {/* Description shown only on mobile — desktop topbar renders it */}
      {description && (
        <p className="hidden-desktop" style={{ margin: 0, font: 'var(--t-body)', color: 'var(--fg-secondary)' }}>
          {description}
        </p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 'auto' }}>
        {actions}
      </div>
    </div>
  );
}
