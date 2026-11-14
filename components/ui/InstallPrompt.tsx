'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt({ inline }: { inline?: boolean } = {}) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      // Show prompt after 30 seconds of use, or if the user has visited before
      const visits = parseInt(localStorage.getItem('visit_count') ?? '0', 10) + 1;
      localStorage.setItem('visit_count', String(visits));
      if (visits >= 3) setShown(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferred || !shown) return null;

  const containerStyle = inline
    ? {
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }
    : {
        position: 'fixed' as const,
        bottom: 80,
        left: 16,
        right: 16,
        zIndex: 150,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '16px 20px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      };

  return (
    <div style={containerStyle}>
      <div style={{ flex: 1 }}>
        <div style={{ font: 'var(--t-label)', fontWeight: 600 }}>Install FinTrack</div>
        <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)', marginTop: 2 }}>
          Add to your home screen for quick access
        </div>
      </div>
      <button
        onClick={async () => {
          await deferred.prompt();
          setShown(false);
        }}
        style={{ padding: '8px 16px', borderRadius: 6, background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', cursor: 'pointer', font: 'var(--t-label)', whiteSpace: 'nowrap' }}
      >
        Install
      </button>
      <button
        onClick={() => setShown(false)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', font: 'var(--t-caption)', padding: 4 }}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
