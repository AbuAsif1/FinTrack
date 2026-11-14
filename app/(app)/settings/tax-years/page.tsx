'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────

interface Slab { width_paisa: number | null; rate_bps: number }
interface TaxConfig {
  slabs: Slab[];
  salary_exemption: { numerator: number; denominator: number; cap_paisa: number };
  rebate: { income_rate_bps: number; investment_rate_bps: number; max_paisa: number };
  investment_caps_paisa: { dps: number | null; sanchaypatra: number | null; stocks: number | null; insurance: number | null; others: number | null; universal_pension?: number | null };
  minimum_tax_paisa: number;
  early_filing: { rate_bps: number; max_paisa: number; deadline_mmdd: string } | null;
}
interface TaxYear {
  id: string;
  fiscal_year: string;
  config: TaxConfig;
  config_confirmed_at: string | null;
  is_provisional: boolean;
  filed_on: string | null;
  is_locked: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function taka(paisa: number | null): string {
  if (paisa === null) return 'Unlimited';
  return '৳' + (paisa / 100).toLocaleString('en-BD');
}
function pct(bps: number): string {
  return (bps / 100).toFixed(1) + '%';
}
function fyLabel(fy: string): string {
  const [y] = fy.split('-');
  const start = parseInt(y, 10);
  return `FY ${fy}  (Jul ${start} – Jun ${start + 1})`;
}
function statusOf(ty: TaxYear): { label: string; color: string } {
  if (ty.is_locked)     return { label: 'Locked / Filed', color: 'var(--accent)' };
  if (ty.filed_on)      return { label: 'Filed',          color: 'var(--accent)' };
  if (!ty.is_provisional) return { label: 'Confirmed',    color: 'var(--ok, #22c55e)' };
  return                       { label: 'Provisional',    color: 'var(--warn, #f59e0b)' };
}

// ── Sub-components ────────────────────────────────────────────────────────

function StatusBadge({ ty }: { ty: TaxYear }) {
  const { label, color } = statusOf(ty);
  return (
    <span style={{ padding: '2px 10px', borderRadius: 12, font: 'var(--t-caption)', background: color + '22', color }}>
      {label}
    </span>
  );
}

function SlabsTable({ slabs }: { slabs: Slab[] }) {
  let floor = 0;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--t-caption)', marginTop: 8 }}>
      <thead>
        <tr style={{ color: 'var(--fg-secondary)' }}>
          <th style={{ textAlign: 'left', paddingBottom: 4 }}>Income range</th>
          <th style={{ textAlign: 'right', paddingBottom: 4 }}>Rate</th>
        </tr>
      </thead>
      <tbody>
        {slabs.map((slab, i) => {
          const from = floor;
          const to = slab.width_paisa !== null ? floor + slab.width_paisa : null;
          floor = to ?? floor;
          return (
            <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
              <td style={{ padding: '5px 0' }}>
                {taka(from)} – {to !== null ? taka(to) : 'above'}
              </td>
              <td style={{ textAlign: 'right', fontWeight: 600, color: slab.rate_bps === 0 ? 'var(--ok, #22c55e)' : 'var(--fg-primary)' }}>
                {pct(slab.rate_bps)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ConfigCard({ config }: { config: TaxConfig }) {
  const { salary_exemption: se, rebate, investment_caps_paisa: ic, minimum_tax_paisa, early_filing } = config;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 16 }}>

      {/* Slabs */}
      <div>
        <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
          Tax Slabs
        </div>
        <SlabsTable slabs={config.slabs} />
      </div>

      {/* Key numbers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        <div style={{ background: 'var(--bg-raised)', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>Minimum tax</div>
          <div style={{ font: 'var(--t-body)', fontWeight: 600, marginTop: 2 }}>{taka(minimum_tax_paisa)}</div>
        </div>
        <div style={{ background: 'var(--bg-raised)', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>Salary exemption</div>
          <div style={{ font: 'var(--t-body)', fontWeight: 600, marginTop: 2 }}>
            {se.numerator}/{se.denominator} of salary, max {taka(se.cap_paisa)}
          </div>
        </div>
        <div style={{ background: 'var(--bg-raised)', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>Rebate</div>
          <div style={{ font: 'var(--t-body)', fontWeight: 600, marginTop: 2 }}>
            {pct(rebate.investment_rate_bps)} on investment, max {taka(rebate.max_paisa)}
          </div>
        </div>
        {early_filing && (
          <div style={{ background: 'var(--bg-raised)', borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>Early filing bonus</div>
            <div style={{ font: 'var(--t-body)', fontWeight: 600, marginTop: 2 }}>
              {pct(early_filing.rate_bps)} rebate, max {taka(early_filing.max_paisa)} (by {early_filing.deadline_mmdd})
            </div>
          </div>
        )}
      </div>

      {/* Investment caps */}
      <div>
        <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Investment Caps (rebate-eligible)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
          {([
            ['DPS',                     ic.dps],
            ['Sanchaypatra',            ic.sanchaypatra],
            ['Stocks',                  ic.stocks],
            ['Insurance',               ic.insurance],
            ['Others',                  ic.others],
            ['Universal Pension Scheme', ic.universal_pension ?? null],
          ] as [string, number | null][]).map(([label, cap]) => (
            <div key={label} style={{ background: 'var(--bg-raised)', borderRadius: 6, padding: '8px 12px' }}>
              <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>{label}</div>
              <div style={{ font: 'var(--t-body)', marginTop: 2 }}>{taka(cap)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── TaxYearCard ───────────────────────────────────────────────────────────

function TaxYearCard({ ty, onUpdate }: { ty: TaxYear; onUpdate: (updated: TaxYear) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function confirm() {
    setBusy(true); setErr('');
    try {
      const { data } = await api.post<TaxYear>(`/tax-years/${ty.fiscal_year}/confirm`, {});
      onUpdate(data);
    } catch { setErr('Failed to confirm.'); }
    finally { setBusy(false); }
  }

  async function reopen() {
    setBusy(true); setErr('');
    try {
      const { data } = await api.post<TaxYear>(`/tax-years/${ty.fiscal_year}/reopen`, {});
      onUpdate(data);
    } catch { setErr('Failed to reopen.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="table-scroll" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
      {/* Header row */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ font: 'var(--t-body)', fontWeight: 600, flex: 1, color: 'var(--fg-primary)' }}>
          {fyLabel(ty.fiscal_year)}
        </span>
        <StatusBadge ty={ty} />
        <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </div>

      {/* Expanded body */}
      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px' }}>
          <ConfigCard config={ty.config} />

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
            {ty.is_provisional && !ty.is_locked && (
              <button
                onClick={confirm}
                disabled={busy}
                style={{ padding: '8px 18px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: 'var(--accent-fg)', font: 'var(--t-label)', cursor: 'pointer' }}
              >
                {busy ? 'Confirming…' : 'Confirm settings'}
              </button>
            )}
            {!ty.is_provisional && !ty.is_locked && (
              <button
                onClick={reopen}
                disabled={busy}
                style={{ padding: '8px 18px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-primary)', font: 'var(--t-label)', cursor: 'pointer' }}
              >
                {busy ? 'Reopening…' : 'Mark provisional'}
              </button>
            )}
            {ty.filed_on && (
              <span style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', alignSelf: 'center' }}>
                Filed {ty.filed_on}
              </span>
            )}
          </div>
          {err && <p style={{ color: 'var(--danger)', font: 'var(--t-caption)', marginTop: 8 }}>{err}</p>}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function TaxYearsPage() {
  const [years, setYears] = useState<TaxYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data } = await api.get<TaxYear[]>('/tax-years');
      // If no years yet, seed the current FY by touching it
      if (data.length === 0) {
        const now = new Date();
        const m = now.getMonth(); // 0-indexed; July=6
        const y = now.getFullYear();
        const fy = m >= 6 ? `${y}-${String(y + 1).slice(2)}` : `${y - 1}-${String(y).slice(2)}`;
        const { data: seeded } = await api.get<TaxYear>(`/tax-years/${fy}`);
        setYears([seeded]);
      } else {
        setYears(data);
      }
    } catch { setError('Failed to load tax years.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleUpdate(updated: TaxYear) {
    setYears(prev => prev.map(y => y.fiscal_year === updated.fiscal_year ? updated : y));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ font: 'var(--t-page)', margin: 0 }}>Tax Year Settings</h1>
        <span style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>Bangladesh NBR · fiscal year Jul–Jun</span>
      </div>

      <div style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)', background: 'var(--bg-surface)', borderRadius: 8, padding: '12px 16px', border: '1px solid var(--border)' }}>
        <strong>Provisional</strong> means tax calculations are estimates. <strong>Confirm</strong> when you have verified the slabs against the NBR Finance Act for that year.
      </div>

      {loading && (
        <div style={{ color: 'var(--fg-muted)', font: 'var(--t-body)' }}>Loading…</div>
      )}
      {error && (
        <div style={{ color: 'var(--danger)', font: 'var(--t-body)' }}>{error}</div>
      )}
      {!loading && !error && years.map(ty => (
        <TaxYearCard key={ty.fiscal_year} ty={ty} onUpdate={handleUpdate} />
      ))}
    </div>
  );
}
