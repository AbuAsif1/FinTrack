'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { DatePicker } from '@/components/ui/DatePicker';

// ── Types ──────────────────────────────────────────────────────────────────

interface LoanPerson {
  id: string;
  name: string;
  running_balance_paisa: number;
}

interface LoanEntry {
  id: string;
  direction: 'GIVEN' | 'RECEIVED';
  amount_paisa: number;
  date: string;
  description: string;
  payment_method: string;
  reason?: string | null;
  return_due_date?: string | null;
  running_balance_paisa: number;
  is_settlement: boolean;
  loan_person_id: string;
}

interface LoanSummary {
  owed_to_me_paisa: number;
  i_owe_paisa: number;
  net_paisa: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(paisa: number) {
  return '৳' + (Math.abs(paisa) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function balanceColor(paisa: number) {
  if (paisa > 0) return 'var(--ok)';
  if (paisa < 0) return 'var(--danger)';
  return 'var(--neutral)';
}

function balanceBg(paisa: number) {
  if (paisa > 0) return 'var(--ok-bg)';
  if (paisa < 0) return 'var(--danger-bg)';
  return 'var(--neutral-bg)';
}

function balanceLabel(person: LoanPerson) {
  const b = person.running_balance_paisa;
  if (b > 0) return `${person.name} owes you ${fmt(b)}`;
  if (b < 0) return `You owe ${person.name} ${fmt(b)}`;
  return 'Settled';
}

function dueSoonStatus(returnDueDate?: string | null): 'overdue' | 'due_soon' | null {
  if (!returnDueDate) return null;
  const today = new Date(todayIso());
  const due = new Date(returnDueDate);
  const diff = Math.floor((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return 'overdue';
  if (diff <= 3) return 'due_soon';
  return null;
}

// ── Add Entry Modal ────────────────────────────────────────────────────────

function AddEntryModal({
  persons,
  personId,
  onClose,
  onSaved,
}: {
  persons: LoanPerson[];
  personId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    person_name: personId ? (persons.find((p) => p.id === personId)?.name ?? '') : '',
    direction: 'GIVEN' as 'GIVEN' | 'RECEIVED',
    amount: '',
    date: todayIso(),
    reason: '',
    return_due_date: '',
    payment_method: 'CASH',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const amountPaisa = Math.round(parseFloat(form.amount) * 100);
    if (isNaN(amountPaisa) || amountPaisa <= 0) {
      setError('Enter a valid amount.');
      setSaving(false);
      return;
    }

    const existing = persons.find((p) => p.name.toLowerCase() === form.person_name.trim().toLowerCase());
    let loanPersonId = existing?.id ?? null;

    if (!loanPersonId) {
      const createRes = await api.post('/loan-persons', { name: form.person_name.trim() }).catch(() => null);
      if (!createRes) {
        setError('Failed to create person.');
        setSaving(false);
        return;
      }
      loanPersonId = createRes.data.id;
    }

    const description = form.reason
      || (form.direction === 'GIVEN' ? `Loan given to ${form.person_name.trim()}` : `Loan received from ${form.person_name.trim()}`);
    const body: Record<string, unknown> = {
      direction: form.direction,
      amount_paisa: amountPaisa,
      date: form.date,
      description,
      payment_method: form.payment_method,
      idempotency_key: crypto.randomUUID(),
    };
    if (form.reason) body.reason = form.reason;
    if (form.return_due_date) body.return_due_date = form.return_due_date;

    const entryRes = await api.post(`/loan-persons/${loanPersonId}/entries`, body).catch((err) => {
      const msg = err?.response?.data?.error ?? 'Failed to save entry.';
      setError(msg);
      setSaving(false);
      return null;
    });
    if (!entryRes) return;
    onSaved();
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: 28, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <h2 style={{ font: 'var(--t-section)', marginBottom: 20 }}>Add Loan Entry</h2>

        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <label>
              <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Person</div>
              <input
                type="text" required placeholder="Name (creates if new)"
                value={form.person_name} onChange={set('person_name')}
                list="persons-list"
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)', boxSizing: 'border-box' }}
              />
              <datalist id="persons-list">
                {persons.map((p) => <option key={p.id} value={p.name} />)}
              </datalist>
            </label>
            <label>
              <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Direction</div>
              <select
                value={form.direction} onChange={set('direction')}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)', boxSizing: 'border-box' }}
              >
                <option value="GIVEN">I gave</option>
                <option value="RECEIVED">I received</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <label>
              <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Amount (৳)</div>
              <input
                type="number" step="0.01" min="0.01" required
                value={form.amount} onChange={set('amount')}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)', boxSizing: 'border-box' }}
              />
            </label>
            <label>
              <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Date</div>
              <DatePicker value={form.date} onChange={(v) => set('date')({ target: { value: v } } as React.ChangeEvent<HTMLInputElement>)} />
            </label>
          </div>

          <label style={{ display: 'block', marginBottom: 12 }}>
            <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Reason (optional)</div>
            <input
              type="text"
              value={form.reason} onChange={set('reason')}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)', boxSizing: 'border-box' }}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <label>
              <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Return due date (optional)</div>
              <DatePicker value={form.return_due_date} onChange={(v) => set('return_due_date')({ target: { value: v } } as React.ChangeEvent<HTMLInputElement>)} />
            </label>
            <label>
              <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Payment Method</div>
              <select
                value={form.payment_method} onChange={set('payment_method')}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)', boxSizing: 'border-box' }}
              >
                {['CASH', 'BANK', 'BKASH', 'NAGAD', 'ROCKET', 'CARD'].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
          </div>

          {error && <div style={{ color: 'var(--danger)', font: 'var(--t-caption)', marginBottom: 10 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 20px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ padding: '8px 20px', background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', borderRadius: 6, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Settle Up Confirm ──────────────────────────────────────────────────────

function SettleUpModal({
  person,
  onClose,
  onSettled,
}: {
  person: LoanPerson;
  onClose: () => void;
  onSettled: () => void;
}) {
  const [settling, setSettling] = useState(false);
  const direction = person.running_balance_paisa > 0 ? 'RECEIVED' : 'GIVEN';
  const absAmount = Math.abs(person.running_balance_paisa);

  async function settle() {
    setSettling(true);
    await api.post(`/loan-persons/${person.id}/settle`, {
      amount_paisa: absAmount,
      direction,
      date: todayIso(),
      payment_method: 'CASH',
      idempotency_key: crypto.randomUUID(),
    }).catch(() => null);
    onSettled();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
      <div style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: 28, maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <h3 style={{ font: 'var(--t-section)', marginBottom: 12 }}>Settle Up with {person.name}</h3>
        <p style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)', marginBottom: 8 }}>
          This will create a settlement entry of {fmt(absAmount)}.
        </p>
        <div style={{ background: 'var(--bg-raised)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, font: 'var(--t-body)' }}>
          <div>Direction: <strong>{direction === 'RECEIVED' ? `${person.name} pays you` : `You pay ${person.name}`}</strong></div>
          <div>Amount: <strong style={{ color: 'var(--ok)' }}>{fmt(absAmount)}</strong></div>
          <div>Date: <strong>{todayIso()}</strong></div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', cursor: 'pointer' }}>Cancel</button>
          <button onClick={settle} disabled={settling} style={{ padding: '8px 16px', background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            {settling ? 'Settling…' : 'Confirm Settle Up'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Entry Modal ───────────────────────────────────────────────────────

function EditEntryModal({
  entry,
  personId,
  onClose,
  onSaved,
}: {
  entry: LoanEntry;
  personId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    amount: (entry.amount_paisa / 100).toFixed(2),
    date: entry.date.slice(0, 10),
    description: entry.description ?? '',
    payment_method: entry.payment_method ?? 'CASH',
    reason: entry.reason ?? '',
    return_due_date: entry.return_due_date?.slice(0, 10) ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    const amountPaisa = Math.round(parseFloat(form.amount) * 100);
    if (isNaN(amountPaisa) || amountPaisa <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    setSaving(true); setError('');
    try {
      await api.patch(`/loan-persons/${personId}/entries/${entry.id}`, {
        amount_paisa: amountPaisa,
        date: form.date,
        description: form.description || undefined,
        payment_method: form.payment_method,
        reason: form.reason || null,
        return_due_date: form.return_due_date || null,
      });
      onSaved();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to save.';
      setError(msg);
    } finally { setSaving(false); }
  }

  async function del() {
    if (!confirm('Delete this loan entry?')) return;
    setSaving(true);
    try {
      await api.delete(`/loan-persons/${personId}/entries/${entry.id}`);
      onSaved();
    } catch { setError('Failed to delete.'); setSaving(false); }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6,
    font: 'var(--t-body)', background: 'var(--bg-sunken)', boxSizing: 'border-box',
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: 28, maxWidth: 520, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <h3 style={{ font: 'var(--t-section)', marginBottom: 20 }}>Edit Loan Entry</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <label>
            <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Amount (৳)</div>
            <input type="number" step="0.01" min="0.01" required value={form.amount} onChange={set('amount')} style={inputStyle} />
          </label>
          <label>
            <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Date</div>
            <DatePicker value={form.date} onChange={(v) => set('date')({ target: { value: v } } as React.ChangeEvent<HTMLInputElement>)} />
          </label>
        </div>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Description</div>
          <input type="text" value={form.description} onChange={set('description')} style={inputStyle} />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <label>
            <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Payment method</div>
            <select value={form.payment_method} onChange={set('payment_method')} style={inputStyle}>
              {['CASH', 'BANK', 'BKASH', 'NAGAD', 'ROCKET', 'CARD'].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label>
            <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Return due date</div>
            <DatePicker value={form.return_due_date} onChange={(v) => set('return_due_date')({ target: { value: v } } as React.ChangeEvent<HTMLInputElement>)} />
          </label>
        </div>

        <label style={{ display: 'block', marginBottom: 20 }}>
          <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Reason (optional)</div>
          <input type="text" value={form.reason} onChange={set('reason')} style={inputStyle} />
        </label>

        {error && <div style={{ color: 'var(--danger)', font: 'var(--t-caption)', marginBottom: 10 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
          <button onClick={del} disabled={saving} style={{ padding: '8px 14px', background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            Delete
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', cursor: 'pointer' }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ padding: '8px 14px', background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', borderRadius: 6, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Detail Panel ───────────────────────────────────────────────────────────

function DetailPanel({
  person,
  onAddEntry,
  onRefresh,
}: {
  person: LoanPerson;
  onAddEntry: () => void;
  onRefresh: () => void;
}) {
  const [entries, setEntries] = useState<LoanEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [editEntry, setEditEntry] = useState<LoanEntry | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const res = await api.get(`/loan-persons/${person.id}/entries`).catch(() => null);
    if (!res) { setLoading(false); return; }
    const data = res.data;
    setEntries(Array.isArray(data) ? data : data.entries ?? []);
    setLoading(false);
  }, [person.id]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {/* Person header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ font: 'var(--t-section)', marginBottom: 4 }}>{person.name}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: balanceBg(person.running_balance_paisa), color: balanceColor(person.running_balance_paisa), padding: '4px 12px', borderRadius: 999, font: 'var(--t-caption)', fontWeight: 600 }}>
            {person.running_balance_paisa >= 0 ? '+' : '−'}{fmt(person.running_balance_paisa)} · {balanceLabel(person)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {person.running_balance_paisa !== 0 && (
            <button
              onClick={() => setSettling(true)}
              style={{ padding: '7px 14px', background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', borderRadius: 8, cursor: 'pointer', font: 'var(--t-body)' }}
            >
              Settle Up
            </button>
          )}
          <button
            onClick={onAddEntry}
            style={{ padding: '7px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', font: 'var(--t-body)' }}
          >
            + Add Entry
          </button>
        </div>
      </div>

      {/* Entry table */}
      <div className="table-scroll" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-muted)', font: 'var(--t-body)' }}>Loading…</div>
        ) : entries.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-muted)', font: 'var(--t-body)' }}>No entries yet.</div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '90px 100px 100px 1fr 100px 44px', padding: '10px 16px', background: 'var(--bg-raised)', borderBottom: '2px solid var(--border)' }}>
              {['DATE', 'DIRECTION', 'AMOUNT', 'REASON', 'BALANCE', ''].map((h) => (
                <div key={h} style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>{h}</div>
              ))}
            </div>

            {entries.map((entry) => {
              const dueStatus = dueSoonStatus(entry.return_due_date);
              return (
                <div key={entry.id} style={{ display: 'grid', gridTemplateColumns: '90px 100px 100px 1fr 100px 44px', padding: '12px 16px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                  <div style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)' }}>
                    {fmtDate(entry.date)}
                    {dueStatus && (
                      <div style={{ marginTop: 2 }}>
                        <span style={{
                          font: 'var(--t-caption)', fontSize: 10,
                          color: dueStatus === 'overdue' ? 'var(--danger)' : 'var(--warn)',
                          background: dueStatus === 'overdue' ? 'var(--danger-bg)' : 'var(--warn-bg)',
                          padding: '1px 6px', borderRadius: 999,
                        }}>
                          {dueStatus === 'overdue' ? '✕ Overdue' : '⚠ Due soon'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{ font: 'var(--t-body)', color: entry.direction === 'GIVEN' ? 'var(--danger)' : 'var(--ok)' }}>
                    {entry.direction === 'GIVEN' ? 'Given' : 'Received'}
                  </div>
                  <div style={{ font: 'var(--t-data)', color: entry.direction === 'GIVEN' ? 'var(--danger)' : 'var(--ok)', fontVariantNumeric: 'tabular-nums' }}>
                    {entry.direction === 'GIVEN' ? '−' : '+'}{fmt(entry.amount_paisa)}
                  </div>
                  <div style={{ font: 'var(--t-body)', color: entry.is_settlement ? 'var(--ok)' : 'var(--fg-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={entry.is_settlement ? 'Settlement' : (entry.reason ?? undefined)}>
                    {entry.is_settlement ? '✓ Settlement' : (entry.reason ?? '—')}
                  </div>
                  <div style={{ font: 'var(--t-data)', color: balanceColor(entry.running_balance_paisa), fontVariantNumeric: 'tabular-nums' }}>
                    {entry.running_balance_paisa >= 0 ? '+' : '−'}{fmt(entry.running_balance_paisa)}
                  </div>
                  <div>
                    {!entry.is_settlement && (
                      <button
                        onClick={() => setEditEntry(entry)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 4, display: 'flex', alignItems: 'center' }}
                        title="Edit"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z"/></svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {settling && (
        <SettleUpModal
          person={person}
          onClose={() => setSettling(false)}
          onSettled={() => { setSettling(false); onRefresh(); loadEntries(); }}
        />
      )}
      {editEntry && (
        <EditEntryModal
          entry={editEntry}
          personId={person.id}
          onClose={() => setEditEntry(null)}
          onSaved={() => { setEditEntry(null); onRefresh(); loadEntries(); }}
        />
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function LoansPage() {
  const [summary, setSummary] = useState<LoanSummary | null>(null);
  const [persons, setPersons] = useState<LoanPerson[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForPersonId, setAddForPersonId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [sumRes, persRes] = await Promise.all([
      api.get('/loans/summary').catch(() => null),
      api.get('/loan-persons').catch(() => null),
    ]);
    if (sumRes) setSummary(sumRes.data);
    if (persRes) {
      const list: LoanPerson[] = Array.isArray(persRes.data) ? persRes.data : [];
      setPersons(list);
      if (!selectedPersonId && list.length > 0) setSelectedPersonId((list as LoanPerson[])[0].id);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectedPerson = persons.find((p) => p.id === selectedPersonId) ?? null;

  return (
    <div>
      <PageHeader
        eyebrow="Informal loans, clearly tracked"
        title="Borrow & Loans"
        description="Per-person running balances for informal lending between friends."
      />

      {/* Summary Tiles */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          <SummaryTile
            label="THEY OWE ME"
            value={fmt(summary.owed_to_me_paisa)}
            sub={`${persons.filter(p => p.running_balance_paisa > 0).length} people`}
            color="var(--ok)"
          />
          <SummaryTile
            label="I OWE THEM"
            value={fmt(summary.i_owe_paisa)}
            sub={`${persons.filter(p => p.running_balance_paisa < 0).length} people`}
            color="var(--danger)"
          />
          <SummaryTile
            label="NET POSITION"
            value={(summary.net_paisa >= 0 ? '+' : '−') + fmt(summary.net_paisa)}
            sub="net"
            color={summary.net_paisa >= 0 ? 'var(--ok)' : 'var(--danger)'}
          />
        </div>
      )}

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--fg-muted)', font: 'var(--t-body)' }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          {/* Person List */}
          <div style={{ width: 300, flexShrink: 0 }}>
            <div className="table-scroll" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
              {persons.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-muted)', font: 'var(--t-body)' }}>
                  No loan records yet.
                </div>
              ) : (
                persons.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPersonId(p.id)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      background: selectedPersonId === p.id ? 'var(--bg-raised)' : 'transparent',
                      borderLeft: selectedPersonId === p.id ? '3px solid var(--accent)' : '3px solid transparent',
                    }}
                  >
                    <div>
                      <div style={{ font: 'var(--t-body)', fontWeight: 600 }}>{p.name}</div>
                    </div>
                    <span style={{
                      font: 'var(--t-caption)', fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                      background: balanceBg(p.running_balance_paisa),
                      color: balanceColor(p.running_balance_paisa),
                    }}>
                      {p.running_balance_paisa === 0 ? '৳0.00' : (p.running_balance_paisa > 0 ? '+' : '−') + fmt(p.running_balance_paisa)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Detail Panel */}
          {selectedPerson ? (
            <DetailPanel
              key={selectedPerson.id}
              person={selectedPerson}
              onAddEntry={() => { setAddForPersonId(selectedPerson.id); setShowAddModal(true); }}
              onRefresh={load}
            />
          ) : (
            <div style={{ flex: 1, padding: 60, textAlign: 'center', color: 'var(--fg-muted)', font: 'var(--t-body)' }}>
              Select a person to see their entries.
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <AddEntryModal
          persons={persons}
          personId={addForPersonId}
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); load(); }}
        />
      )}
    </div>
  );
}

function SummaryTile({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
      <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', marginBottom: 8 }}>{label}</div>
      <div style={{ font: 'var(--t-data)', color, fontVariantNumeric: 'tabular-nums', marginBottom: 4 }}>{value}</div>
      <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>{sub}</div>
    </div>
  );
}
