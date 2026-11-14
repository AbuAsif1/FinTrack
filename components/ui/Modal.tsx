'use client';

import { useEffect, useRef } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className = '' }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    dialog.addEventListener('keydown', handleKeyDown);
    return () => dialog.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Backdrop click: click lands on the <dialog> element itself, not any child
  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className={`modal ${className}`}
      onClose={onClose}
      onClick={handleBackdropClick}
      style={{
        maxWidth: 560,
        width: '90vw',
        borderRadius: 10,
        border: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        color: 'var(--fg-primary)',
        padding: 0,
      }}
    >
      <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ font: 'var(--t-section)', margin: 0 }}>{title}</h2>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 20,
            lineHeight: 1,
            color: 'var(--fg-muted)',
            padding: '4px 8px',
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </dialog>
  );
}
