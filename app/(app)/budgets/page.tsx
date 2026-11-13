'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';

interface Category {
  id: string;
  name: string;
  colorHex: string;
  color_hex: string;
  routing_type: string;
}

interface BudgetItem {
  category_id: string;
  category_name: string;
  monthly_limit_paisa: number;
  spent_paisa: number;
  pct: number;
  state: 'ok' | 'warn' | 'over';
}

function fmt(paisa: number) {
  return '৳' + (paisa / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ categoryId: string; current: number | null } | null>(null);
  const [limitInput, setLimitInput] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: b }, { data: c }] = await Promise.all([
      api.get('/budgets'),
      api.get('/categories'),
    ]);
    setBudgets(Array.isArray(b) ? b : []);
    const cats = Array.isArray(c) ? c : [];
    setCategories(cats.filter((cat: Category) => cat.routing_type === 'NONE'));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveBudget() {
    if (!editing) return;
    setSaving(true);
    const paisa = Math.round(parseFloat(limitInput) * 100);
    if (isNaN(paisa) || paisa <= 0) { setSaving(false); return; }
    await api.put(`/budgets/${editing.categoryId}`, { monthly_limit_paisa: paisa }).catch(() => {});
    setSaving(false);
    setEditing(null);
    load();
  }

  async function removeBudget(categoryId: string) {
    await api.delete(`/budgets/${categoryId}`).catch(() => {});
    load();
  }

  const setBudgetsCount = budgets.length;
  const overCount = budgets.filter((b) => b.state === 'over').length;

  return (
    <div>
      <PageHeader
        eyebrow="Monthly spending limits"
        title="Budgets"
        description="Set limits per category and track how much of each you've used this month."
      />

      {setBudgetsCount > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', marginBottom: 4 }}>BUDGETS SET</div>
            <div style={{ font: 'var(--t-data)', color: 'var(--fg-primary)' }}>{setBudgetsCount}</div>
          </div>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', marginBottom: 4 }}>ON TRACK</div>
            <div style={{ font: 'var(--t-data)', color: 'var(--ok)' }}>{setBudgetsCount - overCount}</div>
          </div>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', marginBottom: 4 }}>OVER BUDGET</div>
            <div style={{ font: 'var(--t-data)', color: overCount > 0 ? 'var(--danger)' : 'var(--fg-muted)' }}>{overCount}</div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-muted)', font: 'var(--t-body)' }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {categories.map((cat) => {
            const b = budgets.find((x) => x.category_id === cat.id);
            const isEditing = editing?.categoryId === cat.id;
            const color = !b ? 'var(--fg-muted)' : b.state === 'over' ? 'var(--danger)' : b.state === 'warn' ? 'var(--warn)' : 'var(--ok)';
            const dot = cat.color_hex ?? cat.colorHex;

            return (
              <div key={cat.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: b ? 10 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: dot }} />
                    <span style={{ font: 'var(--t-body)', fontWeight: 600 }}>{cat.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {b && (
                      <button
                        onClick={() => removeBudget(cat.id)}
                        style={{ font: 'var(--t-caption)', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        Remove
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditing({ categoryId: cat.id, current: b?.monthly_limit_paisa ?? null });
                        setLimitInput(b ? String(b.monthly_limit_paisa / 100) : '');
                      }}
                      style={{ font: 'var(--t-caption)', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {b ? 'Edit' : 'Set limit'}
                    </button>
                  </div>
                </div>

                {b && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>
                        {fmt(b.spent_paisa)} / {fmt(b.monthly_limit_paisa)}
                      </span>
                      <span style={{ font: 'var(--t-caption)', color, fontWeight: 600 }}>{b.pct}%</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--bg-sunken)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(b.pct, 100)}%`, background: color, borderRadius: 4, transition: 'width 0.3s' }} />
                    </div>
                  </>
                )}

                {isEditing && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="number" min="0.01" step="0.01" placeholder="Monthly limit (৳)"
                      value={limitInput} onChange={(e) => setLimitInput(e.target.value)}
                      autoFocus
                      style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--border-focus)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)' }}
                    />
                    <button
                      onClick={saveBudget} disabled={saving}
                      style={{ padding: '7px 14px', background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                    >
                      {saving ? '…' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
