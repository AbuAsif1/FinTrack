'use client';

import { useEffect } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warn';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  const isDanger = variant === 'danger';
  const accentColor = isDanger ? 'var(--danger)' : 'var(--warn)';
  const iconBg = isDanger ? 'rgba(239,68,68,0.1)' : 'rgba(234,179,8,0.1)';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(10,15,30,0.55)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 14,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.12)',
          padding: '28px 28px 24px',
          width: '100%',
          maxWidth: 400,
          border: '1px solid var(--border)',
          animation: 'dialog-pop 0.15s ease',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        {/* Icon */}
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: iconBg, border: `1.5px solid ${accentColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 16,
        }}>
          {isDanger ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5L15 15M15 5L5 15" stroke={accentColor} strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 6v5M10 14h.01" stroke={accentColor} strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="10" cy="10" r="8" stroke={accentColor} strokeWidth="1.8" />
            </svg>
          )}
        </div>

        {/* Text */}
        <div id="confirm-title" style={{ font: '600 16px var(--font-space-grotesk, system-ui)', color: 'var(--fg-primary)', marginBottom: 8 }}>
          {title}
        </div>
        <div style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)', lineHeight: 1.55, marginBottom: 24 }}>
          {message}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '8px 18px', borderRadius: 7, cursor: 'pointer',
              border: '1px solid var(--border)', background: 'var(--bg-raised)',
              color: 'var(--fg-secondary)', font: 'var(--t-body)', fontWeight: 500,
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '8px 18px', borderRadius: 7, cursor: 'pointer',
              border: 'none', background: accentColor,
              color: '#fff', font: 'var(--t-body)', fontWeight: 600,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
