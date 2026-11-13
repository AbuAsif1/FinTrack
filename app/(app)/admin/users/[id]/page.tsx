'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

type UserDetail = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  email_verified_at: string | null;
  last_login_at: string | null;
  deactivated_at: string | null;
  deactivated_until: string | null;
  created_at: string;
  last_payment: { paid_on: string; covers_until: string } | null;
};

type Payment = {
  id: string;
  paid_on: string;
  amount_paisa: number;
  covers_until: string;
  note: string | null;
  created_at: string;
};

export default function AdminUserDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const qc = useQueryClient();

  const isAdmin = (u: UserDetail) => u.role === 'ADMIN';

  const { data: user, isLoading } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: () => api.get<UserDetail>(`/admin/users/${id}`).then((r) => r.data),
  });

  const { data: payments, refetch: refetchPayments } = useQuery({
    queryKey: ['admin-user-payments', id],
    queryFn: () => api.get<Payment[]>(`/admin/users/${id}/payments`).then((r) => r.data),
  });

  // Name/email edit
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editError, setEditError] = useState('');
  const [editing, setEditing] = useState(false);

  // Deactivate
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [deactivateMode, setDeactivateMode] = useState<'until' | 'indefinite'>('indefinite');
  const [deactivateUntil, setDeactivateUntil] = useState('');
  const [deactivateReason, setDeactivateReason] = useState('');

  // Delete
  const [showDelete, setShowDelete] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Add payment
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [pmtPaidOn, setPmtPaidOn] = useState('');
  const [pmtAmount, setPmtAmount] = useState('');
  const [pmtCoversUntil, setPmtCoversUntil] = useState('');
  const [pmtNote, setPmtNote] = useState('');
  const [pmtError, setPmtError] = useState('');
  const [addingPmt, setAddingPmt] = useState(false);

  if (isLoading || !user) {
    return <div style={{ color: 'var(--fg-muted)' }}>Loading…</div>;
  }

  const readOnly = isAdmin(user);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setEditError('');
    setEditing(true);
    try {
      await api.patch(`/admin/users/${id}`, {
        ...(editName && { name: editName }),
        ...(editEmail && { email: editEmail }),
      });
      qc.invalidateQueries({ queryKey: ['admin-user', id] });
      setEditName(''); setEditEmail('');
    } catch (err: any) {
      setEditError(err.response?.data?.code ?? 'Error updating user');
    } finally {
      setEditing(false);
    }
  }

  async function handleDeactivate() {
    try {
      await api.post(`/admin/users/${id}/deactivate`, {
        ...(deactivateMode === 'until' && { until: deactivateUntil }),
        ...(deactivateReason && { reason: deactivateReason }),
      });
      qc.invalidateQueries({ queryKey: ['admin-user', id] });
      setShowDeactivate(false);
    } catch (err: any) {
      alert(err.response?.data?.code ?? 'Error deactivating');
    }
  }

  async function handleReactivate() {
    try {
      await api.post(`/admin/users/${id}/reactivate`, {});
      qc.invalidateQueries({ queryKey: ['admin-user', id] });
    } catch (err: any) {
      alert(err.response?.data?.code ?? 'Error reactivating');
    }
  }

  async function handleResendVerify() {
    try {
      await api.post(`/admin/users/${id}/resend-verification`, {});
      alert('Verification email sent');
    } catch (err: any) {
      alert(err.response?.data?.code ?? 'Error');
    }
  }

  async function handleSendPwReset() {
    try {
      await api.post(`/admin/users/${id}/send-password-reset`, {});
      alert('Password reset email sent');
    } catch (err: any) {
      alert(err.response?.data?.code ?? 'Error');
    }
  }

  async function handleDelete() {
    if (deleteEmail !== user?.email) {
      setDeleteError('Email does not match');
      return;
    }
    setDeleting(true);
    try {
      await api.delete(`/admin/users/${id}`, { data: { email: deleteEmail } });
      router.push('/admin/users');
    } catch (err: any) {
      setDeleteError(err.response?.data?.code ?? 'Error deleting user');
      setDeleting(false);
    }
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    setPmtError('');
    setAddingPmt(true);
    try {
      await api.post(`/admin/users/${id}/payments`, {
        paid_on: pmtPaidOn,
        amount_paisa: parseInt(pmtAmount, 10),
        covers_until: pmtCoversUntil,
        note: pmtNote || undefined,
      });
      setShowAddPayment(false);
      setPmtPaidOn(''); setPmtAmount(''); setPmtCoversUntil(''); setPmtNote('');
      refetchPayments();
      qc.invalidateQueries({ queryKey: ['admin-user', id] });
    } catch (err: any) {
      setPmtError(err.response?.data?.code ?? 'Error');
    } finally {
      setAddingPmt(false);
    }
  }

  const isDeactivated = !!user.deactivated_at;
  const statusColor = {
    ACTIVE: 'var(--success, #22c55e)',
    UNVERIFIED: 'var(--warning, #f59e0b)',
    DEACTIVATED: 'var(--danger, #ef4444)',
    DEACTIVATED_UNTIL: 'var(--danger, #ef4444)',
  }[user.status] ?? 'var(--fg-muted)';

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', font: 'var(--t-body)' }}>
          ← Back
        </button>
        <h1 style={{ font: 'var(--t-page)', margin: 0, color: 'var(--fg-primary)' }}>{user.name}</h1>
        <span style={{ padding: '2px 8px', borderRadius: 12, font: 'var(--t-caption)', background: `${statusColor}22`, color: statusColor }}>
          {user.status.replace('_', ' ')}
        </span>
      </div>

      {readOnly && (
        <div style={{ padding: 12, background: 'var(--bg-raised)', borderRadius: 8, marginBottom: 20, font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>
          This is an admin account. All fields and actions are read-only.
        </div>
      )}

      {/* Account info */}
      <section style={{ background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 24, marginBottom: 20 }}>
        <h2 style={{ font: 'var(--t-section)', margin: '0 0 16px', color: 'var(--fg-primary)' }}>Account</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div><div style={{ font: 'var(--t-label)', color: 'var(--fg-muted)' }}>Email</div><div style={{ font: 'var(--t-body)', color: 'var(--fg-primary)' }}>{user.email}</div></div>
          <div><div style={{ font: 'var(--t-label)', color: 'var(--fg-muted)' }}>Role</div><div style={{ font: 'var(--t-body)', color: 'var(--fg-primary)' }}>{user.role}</div></div>
          <div><div style={{ font: 'var(--t-label)', color: 'var(--fg-muted)' }}>Joined</div><div style={{ font: 'var(--t-body)', color: 'var(--fg-primary)' }}>{new Date(user.created_at).toLocaleDateString()}</div></div>
          <div><div style={{ font: 'var(--t-label)', color: 'var(--fg-muted)' }}>Last sign-in</div><div style={{ font: 'var(--t-body)', color: 'var(--fg-primary)' }}>{user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : '—'}</div></div>
        </div>
        {!readOnly && (
          <form onSubmit={handleUpdate} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <input placeholder="New name" value={editName} onChange={(e) => setEditName(e.target.value)}
              style={{ flex: 1, minWidth: 150, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)', font: 'var(--t-body)' }} />
            <input type="email" placeholder="New email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)}
              style={{ flex: 1, minWidth: 150, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)', font: 'var(--t-body)' }} />
            <button type="submit" disabled={editing || (!editName && !editEmail)}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'var(--accent-fg)', font: 'var(--t-body)', cursor: 'pointer' }}>
              {editing ? 'Saving…' : 'Save'}
            </button>
            {editError && <div style={{ width: '100%', color: 'var(--danger)', font: 'var(--t-caption)' }}>{editError}</div>}
          </form>
        )}
      </section>

      {/* Access */}
      {!readOnly && (
        <section style={{ background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 24, marginBottom: 20 }}>
          <h2 style={{ font: 'var(--t-section)', margin: '0 0 16px', color: 'var(--fg-primary)' }}>Access</h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {isDeactivated ? (
              <button onClick={handleReactivate}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--fg-primary)', font: 'var(--t-body)', cursor: 'pointer' }}>
                Reactivate
              </button>
            ) : (
              <button onClick={() => setShowDeactivate(true)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--danger, #ef4444)', color: 'var(--danger, #ef4444)', background: 'transparent', font: 'var(--t-body)', cursor: 'pointer' }}>
                Deactivate
              </button>
            )}
            {!user.email_verified_at && (
              <button onClick={handleResendVerify}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--fg-primary)', font: 'var(--t-body)', cursor: 'pointer' }}>
                Resend verification
              </button>
            )}
            <button onClick={handleSendPwReset}
              style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--fg-primary)', font: 'var(--t-body)', cursor: 'pointer' }}>
              Send password reset
            </button>
          </div>
        </section>
      )}

      {/* Payments */}
      {!readOnly && (
        <section style={{ background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ font: 'var(--t-section)', margin: 0, color: 'var(--fg-primary)' }}>Payments</h2>
            <button onClick={() => setShowAddPayment(true)}
              style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'var(--accent-fg)', font: 'var(--t-caption)', cursor: 'pointer' }}>
              Add
            </button>
          </div>
          {payments?.length === 0 && <p style={{ color: 'var(--fg-muted)', font: 'var(--t-body)' }}>No payments recorded.</p>}
          {payments?.map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ font: 'var(--t-body)', color: 'var(--fg-primary)' }}>৳{(p.amount_paisa / 100).toFixed(2)}</div>
                <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>{p.paid_on} → covers until {p.covers_until}</div>
                {p.note && <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>{p.note}</div>}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Danger zone */}
      {!readOnly && (
        <section style={{ background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--danger, #ef4444)', padding: 24 }}>
          <h2 style={{ font: 'var(--t-section)', margin: '0 0 12px', color: 'var(--danger, #ef4444)' }}>Danger zone</h2>
          <p style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)', margin: '0 0 16px' }}>
            Permanently delete this account and all its data. This cannot be undone.
          </p>
          <button onClick={() => setShowDelete(true)}
            style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--danger, #ef4444)', color: '#fff', font: 'var(--t-body)', cursor: 'pointer' }}>
            Delete account
          </button>
        </section>
      )}

      {/* Deactivate modal */}
      {showDeactivate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'var(--bg-surface)', borderRadius: 16, padding: 32, width: 400, border: '1px solid var(--border)' }}>
            <h2 style={{ margin: '0 0 20px', font: 'var(--t-section)', color: 'var(--fg-primary)' }}>Deactivate account</h2>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              {(['indefinite', 'until'] as const).map((m) => (
                <button key={m} onClick={() => setDeactivateMode(m)}
                  style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${deactivateMode === m ? 'var(--accent)' : 'var(--border)'}`, background: deactivateMode === m ? 'var(--bg-raised)' : 'transparent', color: 'var(--fg-primary)', font: 'var(--t-body)', cursor: 'pointer' }}>
                  {m === 'indefinite' ? 'Until I reactivate' : 'Until a date'}
                </button>
              ))}
            </div>
            {deactivateMode === 'until' && (
              <input type="date" value={deactivateUntil} onChange={(e) => setDeactivateUntil(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)', font: 'var(--t-body)', marginBottom: 16, boxSizing: 'border-box' }}
              />
            )}
            <input placeholder="Reason (optional)" value={deactivateReason} onChange={(e) => setDeactivateReason(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)', font: 'var(--t-body)', marginBottom: 20, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowDeactivate(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-primary)', font: 'var(--t-body)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDeactivate} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--danger, #ef4444)', color: '#fff', font: 'var(--t-body)', cursor: 'pointer' }}>Deactivate</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {showDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'var(--bg-surface)', borderRadius: 16, padding: 32, width: 400, border: '1px solid var(--border)' }}>
            <h2 style={{ margin: '0 0 12px', font: 'var(--t-section)', color: 'var(--fg-primary)' }}>Delete account</h2>
            <p style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)', margin: '0 0 20px' }}>
              Type <strong>{user.email}</strong> to confirm deletion.
            </p>
            <input
              type="email"
              value={deleteEmail}
              onChange={(e) => setDeleteEmail(e.target.value)}
              placeholder={user.email}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)', font: 'var(--t-body)', marginBottom: 12, boxSizing: 'border-box' }}
            />
            {deleteError && <div style={{ color: 'var(--danger)', font: 'var(--t-caption)', marginBottom: 12 }}>{deleteError}</div>}
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => { setShowDelete(false); setDeleteEmail(''); setDeleteError(''); }} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-primary)', font: 'var(--t-body)', cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleteEmail !== user.email || deleting}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: deleteEmail === user.email ? 'var(--danger, #ef4444)' : 'var(--bg-raised)', color: deleteEmail === user.email ? '#fff' : 'var(--fg-muted)', font: 'var(--t-body)', cursor: deleteEmail === user.email ? 'pointer' : 'not-allowed' }}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add payment modal */}
      {showAddPayment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'var(--bg-surface)', borderRadius: 16, padding: 32, width: 400, border: '1px solid var(--border)' }}>
            <h2 style={{ margin: '0 0 20px', font: 'var(--t-section)', color: 'var(--fg-primary)' }}>Add payment</h2>
            <form onSubmit={handleAddPayment}>
              {[
                { label: 'Paid on', type: 'date', value: pmtPaidOn, setter: setPmtPaidOn },
                { label: 'Amount (paisa)', type: 'number', value: pmtAmount, setter: setPmtAmount },
                { label: 'Covers until', type: 'date', value: pmtCoversUntil, setter: setPmtCoversUntil },
              ].map(({ label, type, value, setter }) => (
                <div key={label} style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', font: 'var(--t-label)', color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</label>
                  <input type={type} value={value} onChange={(e) => setter(e.target.value)} required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)', font: 'var(--t-body)', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', font: 'var(--t-label)', color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Note (optional)</label>
                <input value={pmtNote} onChange={(e) => setPmtNote(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)', font: 'var(--t-body)', boxSizing: 'border-box' }}
                />
              </div>
              {pmtError && <div style={{ color: 'var(--danger)', font: 'var(--t-caption)', marginBottom: 12 }}>{pmtError}</div>}
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => setShowAddPayment(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-primary)', font: 'var(--t-body)', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={addingPmt} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'var(--accent-fg)', font: 'var(--t-body)', cursor: 'pointer' }}>{addingPmt ? 'Adding…' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
