'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'UNVERIFIED' | 'DEACTIVATED' | 'DEACTIVATED_UNTIL';
  created_at: string;
  last_login_at: string | null;
  last_payment: { paid_on: string; covers_until: string } | null;
};

const statusColors: Record<string, string> = {
  ACTIVE: 'var(--success, #22c55e)',
  UNVERIFIED: 'var(--warning, #f59e0b)',
  DEACTIVATED: 'var(--danger, #ef4444)',
  DEACTIVATED_UNTIL: 'var(--danger, #ef4444)',
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createRole, setCreateRole] = useState('USER');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (status) params.set('status', status);
  if (role) params.set('role', role);
  params.set('page', String(page));

  const { data, refetch } = useQuery({
    queryKey: ['admin-users', q, status, role, page],
    queryFn: () => api.get<{ data: UserRow[]; total: number; page: number; page_size: number }>(
      `/admin/users?${params}`
    ).then((r) => r.data),
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      await api.post('/admin/users', { name: createName, email: createEmail, role: createRole });
      setShowCreate(false);
      setCreateName(''); setCreateEmail(''); setCreateRole('USER');
      refetch();
    } catch (err: any) {
      setCreateError(err.response?.data?.code ?? 'Error creating user');
    } finally {
      setCreating(false);
    }
  }

  const total = data?.total ?? 0;
  const pageSize = data?.page_size ?? 20;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ font: 'var(--t-page)', margin: 0, color: 'var(--fg-primary)' }}>Users</h1>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: '10px 20px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: 'var(--accent-fg)',
            font: 'var(--t-body)', cursor: 'pointer',
          }}
        >
          Create user
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="search"
          placeholder="Search name or email"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)', font: 'var(--t-body)' }}
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)', font: 'var(--t-body)' }}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="UNVERIFIED">Unverified</option>
          <option value="DEACTIVATED">Deactivated</option>
        </select>
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)', font: 'var(--t-body)' }}
        >
          <option value="">All roles</option>
          <option value="USER">User</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-scroll" style={{ background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Name', 'Email', 'Role', 'Status', 'Joined', 'Last payment'].map((h) => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', font: 'var(--t-label)', color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.data.map((user) => (
              <tr
                key={user.id}
                onClick={() => router.push(`/admin/users/${user.id}`)}
                style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-raised)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '12px 16px', font: 'var(--t-body)', color: 'var(--fg-primary)' }}>{user.name}</td>
                <td style={{ padding: '12px 16px', font: 'var(--t-body)', color: 'var(--fg-secondary)' }}>{user.email}</td>
                <td style={{ padding: '12px 16px', font: 'var(--t-body)', color: 'var(--fg-secondary)' }}>{user.role}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 12, font: 'var(--t-caption)',
                    background: `${statusColors[user.status]}22`,
                    color: statusColors[user.status],
                  }}>
                    {user.status.replace('_', ' ')}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: '12px 16px', font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>
                  {user.last_payment ? user.last_payment.covers_until : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--fg-primary)', cursor: 'pointer' }}>
            Prev
          </button>
          <span style={{ padding: '6px 14px', font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>
            {page} / {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--fg-primary)', cursor: 'pointer' }}>
            Next
          </button>
        </div>
      )}

      {/* Create user modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'var(--bg-surface)', borderRadius: 16, padding: 32, width: 400, border: '1px solid var(--border)' }}>
            <h2 style={{ margin: '0 0 20px', font: 'var(--t-section)', color: 'var(--fg-primary)' }}>Create user</h2>
            <form onSubmit={handleCreate}>
              {[
                { label: 'Name', value: createName, setter: setCreateName, type: 'text' },
                { label: 'Email', value: createEmail, setter: setCreateEmail, type: 'email' },
              ].map(({ label, value, setter, type }) => (
                <div key={label} style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', font: 'var(--t-label)', color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</label>
                  <input type={type} value={value} onChange={(e) => setter(e.target.value)} required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)', font: 'var(--t-body)', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', font: 'var(--t-label)', color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Role</label>
                <select value={createRole} onChange={(e) => setCreateRole(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)', font: 'var(--t-body)' }}
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              {createError && <div style={{ color: 'var(--danger)', font: 'var(--t-caption)', marginBottom: 12 }}>{createError}</div>}
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => setShowCreate(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-primary)', font: 'var(--t-body)', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'var(--accent-fg)', font: 'var(--t-body)', cursor: 'pointer' }}>
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
