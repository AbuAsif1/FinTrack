'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';

// ── Types ─────────────────────────────────────────────────────────────────

interface Me {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Category {
  id: string;
  name: string;
  color_hex: string;
  routing_type: string;
  _count?: { transactions: number };
}

// ── Helpers ───────────────────────────────────────────────────────────────

const ROUTING_LABELS: Record<string, string> = {
  NONE: 'Spending',
  SAVINGS_DEPOSIT: 'Savings Deposit',
  SAVINGS_WITHDRAWAL: 'Savings Withdrawal',
  SAVINGS_INTEREST: 'Savings Interest',
  LOAN_GIVEN: 'Loan Given',
  LOAN_RECEIVED: 'Loan Received',
  TAX_PAYMENT: 'Tax Payment',
};

function RoutingChip({ type }: { type: string }) {
  const bg = type === 'NONE' ? 'var(--spending)' : type.startsWith('SAVINGS') ? 'var(--savings)' : type.startsWith('LOAN') ? 'var(--warn)' : 'var(--tax)';
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 4,
      background: bg,
      color: '#fff',
      font: 'var(--t-caption)',
      fontSize: 11,
    }}>
      {ROUTING_LABELS[type] ?? type}
    </span>
  );
}

// ── Profile Section ────────────────────────────────────────────────────────

function ProfileSection({ me, onSignOut }: { me: Me | null; onSignOut: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(me?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function saveName() {
    setSaving(true);
    setError('');
    try {
      await api.patch('/me', { name });
      setEditing(false);
    } catch {
      setError('Failed to save name.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ font: 'var(--t-section)', margin: 0 }}>Profile</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        <div>
          <label style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', display: 'block', marginBottom: 4 }}>Name</label>
          {editing ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)' }}
              />
              <button onClick={saveName} disabled={saving} style={{ padding: '8px 14px', borderRadius: 6, background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', cursor: 'pointer', font: 'var(--t-label)' }}>
                Save
              </button>
              <button onClick={() => setEditing(false)} style={{ padding: '8px 14px', borderRadius: 6, background: 'var(--bg-raised)', color: 'var(--fg-primary)', border: 'none', cursor: 'pointer', font: 'var(--t-label)' }}>
                Cancel
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ font: 'var(--t-body)' }}>{me?.name ?? '—'}</span>
              <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', font: 'var(--t-caption)' }}>Edit</button>
            </div>
          )}
          {error && <p style={{ color: 'var(--danger)', font: 'var(--t-caption)', marginTop: 4 }}>{error}</p>}
        </div>
        <div>
          <label style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', display: 'block', marginBottom: 4 }}>Email</label>
          <span style={{ font: 'var(--t-body)', color: 'var(--fg-muted)' }}>{me?.email ?? '—'}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/settings/change-password" style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--fg-primary)', font: 'var(--t-label)', textDecoration: 'none' }}>
          Change Password
        </Link>
        <button
          onClick={onSignOut}
          style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--danger)', background: 'transparent', color: 'var(--danger)', font: 'var(--t-label)', cursor: 'pointer' }}
        >
          Sign Out
        </button>
      </div>
    </section>
  );
}

// ── Appearance Section ────────────────────────────────────────────────────

function AppearanceSection() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark' | 'system') ?? 'system';
    }
    return 'system';
  });

  function applyTheme(t: 'light' | 'dark' | 'system') {
    setTheme(t);
    localStorage.setItem('theme', t);
    const html = document.documentElement;
    if (t === 'dark') html.setAttribute('data-theme', 'dark');
    else if (t === 'light') html.removeAttribute('data-theme');
    else html.removeAttribute('data-theme'); // system: rely on CSS prefers-color-scheme
  }

  return (
    <section style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 24 }}>
      <h2 style={{ font: 'var(--t-section)', margin: '0 0 16px' }}>Appearance</h2>
      <div style={{ display: 'flex', gap: 8 }}>
        {(['light', 'dark', 'system'] as const).map((t) => (
          <button
            key={t}
            onClick={() => applyTheme(t)}
            style={{
              padding: '8px 20px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: theme === t ? 'var(--accent)' : 'var(--bg-raised)',
              color: theme === t ? 'var(--accent-fg)' : 'var(--fg-primary)',
              font: 'var(--t-label)',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>
    </section>
  );
}

// ── Categories Section ────────────────────────────────────────────────────

function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3A5FCD');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Category[]>('/categories').then(({ data }) => {
      setCategories(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function addCategory() {
    if (!newName.trim()) return;
    setError('');
    try {
      const { data } = await api.post<Category>('/categories', { name: newName.trim(), color_hex: newColor, routing_type: 'NONE' });
      setCategories((prev) => [...prev, data]);
      setNewName('');
      setAdding(false);
    } catch {
      setError('Failed to add category.');
    }
  }

  async function saveEdit(cat: Category) {
    setError('');
    try {
      await api.patch(`/categories/${cat.id}`, { name: editName, color_hex: editColor });
      setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, name: editName, color_hex: editColor } : c));
      setEditId(null);
    } catch {
      setError('Failed to save.');
    }
  }

  if (loading) return <div style={{ color: 'var(--fg-muted)' }}>Loading…</div>;

  return (
    <section style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ font: 'var(--t-section)', margin: 0 }}>Categories</h2>
        <button
          onClick={() => setAdding(true)}
          style={{ padding: '6px 14px', borderRadius: 6, background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', cursor: 'pointer', font: 'var(--t-label)' }}
        >
          + Add
        </button>
      </div>

      {error && <p style={{ color: 'var(--danger)', font: 'var(--t-caption)', marginBottom: 8 }}>{error}</p>}

      {adding && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Category name"
            style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)' }}
          />
          <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} style={{ width: 36, height: 36, border: 'none', cursor: 'pointer', borderRadius: 4 }} />
          <button onClick={addCategory} style={{ padding: '8px 14px', borderRadius: 6, background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', cursor: 'pointer', font: 'var(--t-label)' }}>Save</button>
          <button onClick={() => setAdding(false)} style={{ padding: '8px 14px', borderRadius: 6, background: 'var(--bg-raised)', color: 'var(--fg-primary)', border: 'none', cursor: 'pointer', font: 'var(--t-label)' }}>Cancel</button>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--t-body)' }}>
        <thead>
          <tr style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', borderBottom: '1px solid var(--border)' }}>
            <th style={{ textAlign: 'left', padding: '6px 0' }}>Name</th>
            <th style={{ textAlign: 'left', padding: '6px 12px' }}>Kind</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <tr key={cat.id} style={{ borderBottom: '1px solid var(--border)' }}>
              {editId === cat.id ? (
                <>
                  <td style={{ padding: '8px 0' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={{ flex: 1, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 4, font: 'var(--t-body)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)' }}
                      />
                      <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} style={{ width: 28, height: 28, border: 'none', cursor: 'pointer' }} />
                    </div>
                  </td>
                  <td style={{ padding: '8px 12px' }}><RoutingChip type={cat.routing_type} /></td>
                  <td style={{ padding: '8px 0', textAlign: 'right' }}>
                    <button onClick={() => saveEdit(cat)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', font: 'var(--t-caption)', marginRight: 8 }}>Save</button>
                    <button onClick={() => setEditId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', font: 'var(--t-caption)' }}>Cancel</button>
                  </td>
                </>
              ) : (
                <>
                  <td style={{ padding: '10px 0' }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: cat.color_hex, marginRight: 8 }} />
                    {cat.name}
                  </td>
                  <td style={{ padding: '10px 12px' }}><RoutingChip type={cat.routing_type} /></td>
                  <td style={{ padding: '10px 0', textAlign: 'right' }}>
                    {cat.routing_type === 'NONE' ? (
                      <button
                        onClick={() => { setEditId(cat.id); setEditName(cat.name); setEditColor(cat.color_hex); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', font: 'var(--t-caption)' }}
                      >
                        Edit
                      </button>
                    ) : (
                      <span style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>Read-only</span>
                    )}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    api.get<Me>('/me').then(({ data }) => setMe(data)).catch(() => { });
  }, []);

  async function signOut() {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    router.replace('/login');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        eyebrow="Preferences and data"
        title="Settings"
        description="Profile, appearance, categories, tax years, import and export."
      />

      <ProfileSection me={me} onSignOut={signOut} />
      <AppearanceSection />
      <CategoriesSection />

      {/* Links to other settings pages */}
      <section style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 24 }}>
        <h2 style={{ font: 'var(--t-section)', margin: '0 0 16px' }}>More</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { href: '/settings/tax-years', label: 'Tax Year Settings', desc: 'Slabs, exemptions, filing status' },
            { href: '/settings/import', label: 'Import Data', desc: 'Upload income, transactions, or loan history' },
            { href: '/settings/export', label: 'Export Data', desc: 'Download your data as CSV or JSON' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                textDecoration: 'none',
                color: 'var(--fg-primary)',
              }}
            >
              <div>
                <div style={{ font: 'var(--t-label)', fontWeight: 600 }}>{item.label}</div>
                <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)', marginTop: 2 }}>{item.desc}</div>
              </div>
              <span style={{ color: 'var(--fg-muted)' }}>→</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
