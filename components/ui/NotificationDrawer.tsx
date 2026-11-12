'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

interface Notification {
  id: string;
  type: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  resolved_at: string | null;
  created_at: string;
}

function notificationLink(n: Notification): string | null {
  if (!n.entity_type || !n.entity_id) return null;
  if (n.entity_type === 'FixedExpenseInstance') return '/fixed-expenses';
  if (n.entity_type === 'LoanEntry') return '/loans';
  if (n.entity_type === 'Budget') return '/transactions#budgets';
  if (n.entity_type === 'TaxYear') return '/settings/tax-years';
  return null;
}

interface Props {
  unreadCount: number;
  onCountChange: (count: number) => void;
}

export function NotificationBell({ unreadCount, onCountChange }: Props) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Notification[]>('/notifications');
      setNotifications(data);
      onCountChange(data.filter((n) => !n.is_read && !n.resolved_at).length);
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  async function markRead(id: string) {
    await api.post(`/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    onCountChange(notifications.filter((n) => !n.is_read && !n.resolved_at && n.id !== id).length);
  }

  async function markAllRead() {
    await api.post('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    onCountChange(0);
  }

  const unread = notifications.filter((n) => !n.is_read && !n.resolved_at);
  const read = notifications.filter((n) => n.is_read || n.resolved_at);

  return (
    <div style={{ position: 'relative' }}>
      <button
        aria-label={`Notifications, ${unreadCount} unread`}
        onClick={() => setOpen((v) => !v)}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          color: 'var(--fg-secondary)',
          font: '18px/1 inherit',
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: 2,
            right: 2,
            background: 'var(--danger)',
            color: '#fff',
            borderRadius: '50%',
            width: 16,
            height: 16,
            font: 'var(--t-caption)',
            fontSize: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            onClick={() => setOpen(false)}
          />
          {/* Drawer */}
          <div style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            width: 340,
            maxHeight: 480,
            overflowY: 'auto',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 100,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ font: 'var(--t-label)', fontWeight: 600 }}>Notifications</span>
              {unread.length > 0 && (
                <button
                  onClick={markAllRead}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'var(--t-caption)', color: 'var(--accent)' }}
                >
                  Mark all read
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ padding: 20, color: 'var(--fg-muted)', font: 'var(--t-body)' }}>Loading…</div>
            ) : unread.length === 0 && read.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-muted)', font: 'var(--t-body)' }}>
                You&apos;re all caught up
              </div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {[...unread, ...read].map((n) => {
                  const link = notificationLink(n);
                  return (
                    <li
                      key={n.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        padding: '12px 16px',
                        background: n.is_read ? 'transparent' : 'var(--bg-raised)',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ font: 'var(--t-body)', color: n.is_read ? 'var(--fg-secondary)' : 'var(--fg-primary)' }}>
                          {link ? (
                            <Link href={link} onClick={() => setOpen(false)} style={{ color: 'inherit', textDecoration: 'none' }}>
                              {n.message}
                            </Link>
                          ) : n.message}
                        </div>
                        <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', marginTop: 2 }}>
                          {new Date(n.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      {!n.is_read && (
                        <button
                          onClick={() => markRead(n.id)}
                          aria-label="Mark as read"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', font: 'var(--t-caption)', whiteSpace: 'nowrap' }}
                        >
                          Mark read
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
