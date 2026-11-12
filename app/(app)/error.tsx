'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log to Sentry if configured
    if (typeof window !== 'undefined' && (window as unknown as { Sentry?: { captureException: (e: unknown) => void } }).Sentry) {
      (window as unknown as { Sentry: { captureException: (e: unknown) => void } }).Sentry.captureException(error);
    }
  }, [error]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        gap: 16,
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div style={{ font: 'var(--t-section)', fontSize: 48 }}>⚠️</div>
      <h2 style={{ font: 'var(--t-section)', margin: 0 }}>Something went wrong</h2>
      <p style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)', maxWidth: 400, margin: 0 }}>
        An unexpected error occurred. Your data is safe — please try again.
      </p>
      <button
        onClick={reset}
        style={{
          padding: '10px 24px',
          borderRadius: 8,
          background: 'var(--accent)',
          color: 'var(--accent-fg)',
          border: 'none',
          cursor: 'pointer',
          font: 'var(--t-label)',
          fontWeight: 600,
        }}
      >
        Try again
      </button>
    </div>
  );
}
