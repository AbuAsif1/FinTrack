'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────

interface SlabBreakdown {
  rate_bps: number;
  taxable_in_slab: number;
  tax: number;
}

interface InvestmentBreakdown {
  category: string;
  invested: number;
  cap: number | null;
  eligible: number;
}

interface TaxResult {
  fiscal_year: string;
  is_projection: boolean;
  months_entered: number;
  gross_income_paisa: number;
  exemption_paisa: number;
  taxable_income_paisa: number;
  slab_breakdown: SlabBreakdown[];
  gross_tax_paisa: number;
  investment_breakdown: InvestmentBreakdown[];
  eligible_investment_paisa: number;
  tax_rebate_paisa: number;
  minimum_tax_applied: boolean;
  tax_after_rebate_paisa: number;
  early_filing_rebate_applied_paisa: number;
  early_filing_rebate_potential_paisa: number;
  net_tax_payable_paisa: number;
  tds_paisa: number;
  tax_payments_paisa: number;
  tax_paid_paisa: number;
  remaining_tax_paisa: number;
  remaining_salary_months: number;
  suggested_monthly_tds_paisa: number | null;
  further_investment_for_max_rebate_paisa: number;
  is_provisional: boolean;
  is_locked: boolean;
  filed_on: string | null;
}

interface TaxInvestments {
  stocks_paisa: number;
  insurance_paisa: number;
  others_paisa: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(paisa: number) {
  return '৳' + (Math.abs(paisa) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtBps(bps: number) {
  return (bps / 100).toFixed(0) + '%';
}

function currentFYs(): string[] {
  const fy: string[] = [];
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const baseFy = month >= 7 ? year : year - 1;
  for (let i = 0; i < 3; i++) {
    const start = baseFy - i;
    fy.push(`${start}-${String(start + 1).slice(2)}`);
  }
  return fy;
}

// ── Tile ───────────────────────────────────────────────────────────────────

function Tile({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
      <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', marginBottom: 8 }}>{label}</div>
      <div style={{ font: 'var(--t-data)', color: color ?? 'var(--fg-primary)', fontVariantNumeric: 'tabular-nums', marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>{sub}</div>}
    </div>
  );
}

// ── Progress Bar ────────────────────────────────────────────────────────────

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 8, background: 'var(--bg-sunken)', borderRadius: 4, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 4, transition: 'width 0.3s' }} />
    </div>
  );
}

// ── Overview Tab ───────────────────────────────────────────────────────────

function OverviewTab({
  result,
  investments,
  fy,
  onInvestmentsChange,
}: {
  result: TaxResult;
  investments: TaxInvestments;
  fy: string;
  onInvestmentsChange: () => void;
}) {
  const [invEdit, setInvEdit] = useState<{ stocks: string; insurance: string; others: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const remaining = result.remaining_tax_paisa;
  const tdsProgress = result.tax_paid_paisa > 0
    ? Math.round((result.tax_paid_paisa / Math.max(result.net_tax_payable_paisa, 1)) * 100)
    : 0;

  async function saveInvestments() {
    if (!invEdit) return;
    setSaving(true);
    await api.put(`/tax-investments/${fy}`, {
      stocks_paisa: Math.round(parseFloat(invEdit.stocks || '0') * 100),
      insurance_paisa: Math.round(parseFloat(invEdit.insurance || '0') * 100),
      others_paisa: Math.round(parseFloat(invEdit.others || '0') * 100),
    }).catch(() => {});
    setSaving(false);
    setInvEdit(null);
    onInvestmentsChange();
  }

  return (
    <div>
      {/* Three Tax Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <Tile label="GROSS TAX" value={fmt(result.gross_tax_paisa)} />
        <Tile label="TOTAL REBATE" value={fmt(result.tax_rebate_paisa)} color="var(--ok)" />
        <Tile
          label="NET TAX PAYABLE"
          value={fmt(result.net_tax_payable_paisa)}
          color={remaining < 0 ? 'var(--ok)' : 'var(--fg-primary)'}
          sub={result.minimum_tax_applied ? '⚠ Minimum tax applied' : undefined}
        />
      </div>

      {/* Taxable Income Breakdown + Slab Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
          <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', marginBottom: 12 }}>TAXABLE INCOME BREAKDOWN</div>
          <Row label="Gross Annual Income" value={fmt(result.gross_income_paisa)} />
          <Row label="− Salary Exemption" value={`−${fmt(result.exemption_paisa)}`} color="var(--ok)" />
          <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0' }} />
          <Row label="Taxable Income" value={fmt(result.taxable_income_paisa)} bold />
        </div>

        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
          <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', marginBottom: 12 }}>SLAB BREAKDOWN</div>
          {result.slab_breakdown.map((s, i) => (
            <Row key={i} label={`${fmtBps(s.rate_bps)} slab`} value={s.tax > 0 ? fmt(s.tax) : '৳0.00'} />
          ))}
          <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0' }} />
          <Row label="Gross Tax" value={fmt(result.gross_tax_paisa)} bold />
        </div>
      </div>

      {/* TDS Reconciliation */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 24 }}>
        <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', marginBottom: 12 }}>TAX SITUATION</div>
        <Row label="Net Tax Payable" value={fmt(result.net_tax_payable_paisa)} bold />
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)' }}>TDS + Tax Payments</span>
            <span style={{ font: 'var(--t-data)', fontVariantNumeric: 'tabular-nums' }}>{fmt(result.tax_paid_paisa)}</span>
          </div>
          <ProgressBar pct={tdsProgress} color={remaining < 0 ? 'var(--ok)' : tdsProgress >= 90 ? 'var(--ok)' : tdsProgress >= 70 ? 'var(--warn)' : 'var(--accent)'} />
        </div>
        <div style={{ marginTop: 8 }}>
          {remaining < 0 ? (
            <Row label="Overpaid" value={`+${fmt(Math.abs(remaining))}`} color="var(--ok)" bold />
          ) : (
            <Row label="Remaining Tax" value={fmt(remaining)} color={remaining > 0 ? 'var(--warn)' : 'var(--ok)'} bold />
          )}
        </div>
        {result.remaining_salary_months > 0 && result.suggested_monthly_tds_paisa != null && result.suggested_monthly_tds_paisa > 0 && (
          <div style={{ marginTop: 8, font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>
            {result.remaining_salary_months} salary month{result.remaining_salary_months > 1 ? 's' : ''} remaining · Suggested TDS: {fmt(result.suggested_monthly_tds_paisa)}/mo
          </div>
        )}
        {result.early_filing_rebate_applied_paisa > 0 && (
          <div style={{ marginTop: 8, font: 'var(--t-caption)', color: 'var(--ok)' }}>
            ✓ Early filing rebate applied: {fmt(result.early_filing_rebate_applied_paisa)}
          </div>
        )}
        {result.early_filing_rebate_applied_paisa === 0 && result.early_filing_rebate_potential_paisa > 0 && !result.is_locked && (
          <div style={{ marginTop: 8, font: 'var(--t-caption)', color: 'var(--accent)' }}>
            File before 30 Sep to save {fmt(result.early_filing_rebate_potential_paisa)}
          </div>
        )}
      </div>

      {/* Investments (manual entry) */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>MANUAL INVESTMENTS</div>
          {!result.is_locked && !invEdit && (
            <button
              onClick={() => setInvEdit({
                stocks: String(investments.stocks_paisa / 100),
                insurance: String(investments.insurance_paisa / 100),
                others: String(investments.others_paisa / 100),
              })}
              style={{ font: 'var(--t-caption)', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Edit
            </button>
          )}
        </div>
        {invEdit ? (
          <div>
            {(['stocks', 'insurance', 'others'] as const).map((k) => (
              <label key={k} style={{ display: 'block', marginBottom: 8 }}>
                <div style={{ font: 'var(--t-label)', marginBottom: 4, textTransform: 'capitalize' }}>{k} (৳)</div>
                <input
                  type="number" min="0" step="0.01"
                  value={invEdit[k]}
                  onChange={(e) => setInvEdit((f) => f ? { ...f, [k]: e.target.value } : f)}
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)', boxSizing: 'border-box' }}
                />
              </label>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={saveInvestments} disabled={saving} style={{ padding: '7px 14px', background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                {saving ? '…' : 'Save'}
              </button>
              <button onClick={() => setInvEdit(null)} style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <Row label="Stocks" value={fmt(investments.stocks_paisa)} />
            <Row label="Insurance" value={fmt(investments.insurance_paisa)} />
            <Row label="Other Investments" value={fmt(investments.others_paisa)} />
            {result.further_investment_for_max_rebate_paisa > 0 && (
              <div style={{ marginTop: 10, font: 'var(--t-caption)', color: 'var(--accent)' }}>
                Need {fmt(result.further_investment_for_max_rebate_paisa)} more for maximum rebate
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
      <span style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)', fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span style={{ font: 'var(--t-data)', color: color ?? 'var(--fg-primary)', fontVariantNumeric: 'tabular-nums', fontWeight: bold ? 600 : 400 }}>{value}</span>
    </div>
  );
}

// ── Investments Tab ─────────────────────────────────────────────────────────

function InvestmentsTab({ result }: { result: TaxResult }) {
  const rebate_pct = result.tax_rebate_paisa > 0 ? (result.tax_rebate_paisa / result.eligible_investment_paisa * 100).toFixed(0) : '0';

  return (
    <div>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 100px 100px 100px', gap: 0, padding: '10px 16px', background: 'var(--bg-raised)', borderBottom: '2px solid var(--border)' }}>
          {['INVESTMENT', 'INVESTED / CAP', 'ELIGIBLE', 'REBATE'].map((h) => (
            <div key={h} style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>{h}</div>
          ))}
        </div>
        {result.investment_breakdown.map((inv) => (
          <div key={inv.category} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 100px 100px', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ font: 'var(--t-body)', textTransform: 'capitalize' }}>{inv.category.replace('_', ' ')}</div>
            <div style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)' }}>
              {fmt(inv.invested)}{inv.cap ? ` / ${fmt(inv.cap)}` : ' / no cap'}
            </div>
            <div style={{ font: 'var(--t-data)', fontVariantNumeric: 'tabular-nums' }}>{fmt(inv.eligible)}</div>
            <div style={{ font: 'var(--t-data)', color: 'var(--ok)', fontVariantNumeric: 'tabular-nums' }}>
              {fmt(Math.round(inv.eligible * 0.1))}
            </div>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 100px 100px', padding: '12px 16px', borderTop: '2px solid var(--border)', background: 'var(--bg-raised)' }}>
          <div style={{ font: 'var(--t-body)', fontWeight: 600 }}>Total Eligible</div>
          <div />
          <div style={{ font: 'var(--t-data)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(result.eligible_investment_paisa)}</div>
          <div style={{ font: 'var(--t-data)', color: 'var(--ok)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(result.tax_rebate_paisa)}</div>
        </div>
      </div>
      <div style={{ marginTop: 12, font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>
        Rebate = MIN(Gross Income × 3%, Eligible Investment × 10%, ৳10,00,000) = {fmt(result.tax_rebate_paisa)} · {rebate_pct}%
      </div>
    </div>
  );
}

// ── Forecast Tab ────────────────────────────────────────────────────────────

function ForecastTab({ fy }: { fy: string }) {
  const [forecast, setForecast] = useState<TaxResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/tax/forecast?fiscal_year=${fy}`)
      .then(({ data }) => setForecast(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fy]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-muted)' }}>Loading…</div>;
  if (!forecast) return null;

  return (
    <div>
      <div style={{ background: 'var(--accent)', color: 'var(--accent-fg)', padding: '8px 14px', borderRadius: 8, marginBottom: 16, font: 'var(--t-caption)' }}>
        📊 Projected full-year figures based on {forecast.months_entered} month{forecast.months_entered !== 1 ? 's' : ''} entered
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <Tile label="PROJECTED GROSS TAX" value={fmt(forecast.gross_tax_paisa)} />
        <Tile label="PROJECTED REBATE" value={fmt(forecast.tax_rebate_paisa)} color="var(--ok)" />
        <Tile label="PROJECTED NET TAX" value={fmt(forecast.net_tax_payable_paisa)} />
      </div>
      <div style={{ marginTop: 16 }}>
        <Row label="Projected Gross Income" value={fmt(forecast.gross_income_paisa)} />
        <Row label="Projected Taxable Income" value={fmt(forecast.taxable_income_paisa)} />
        <Row label="Projected Remaining Tax" value={fmt(forecast.remaining_tax_paisa)} color={forecast.remaining_tax_paisa < 0 ? 'var(--ok)' : 'var(--warn)'} />
        {forecast.suggested_monthly_tds_paisa != null && forecast.suggested_monthly_tds_paisa > 0 && (
          <Row label="Suggested Monthly TDS" value={fmt(forecast.suggested_monthly_tds_paisa)} color="var(--accent)" />
        )}
      </div>
    </div>
  );
}

// ── Compare Tab ─────────────────────────────────────────────────────────────

function CompareTab({ fy }: { fy: string }) {
  const [compare, setCompare] = useState<{
    this_year: TaxResult | null;
    this_year_under_last_year_config: TaxResult | null;
    last_year: TaxResult | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/tax/compare?fiscal_year=${fy}`)
      .then(({ data }) => setCompare(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fy]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-muted)' }}>Loading…</div>;
  if (!compare) return null;

  const cols = [
    { label: `${fy} (this year)`, r: compare.this_year },
    { label: `${fy} under last year settings`, r: compare.this_year_under_last_year_config },
    { label: 'Last year actual', r: compare.last_year },
  ].filter((c) => c.r != null);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols.length}, 1fr)`, gap: 16 }}>
      {cols.map((col) => (
        <div key={col.label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
          <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', marginBottom: 12 }}>{col.label}</div>
          <Row label="Gross Tax" value={fmt(col.r!.gross_tax_paisa)} />
          <Row label="Rebate" value={fmt(col.r!.tax_rebate_paisa)} />
          <Row label="Net Tax" value={fmt(col.r!.net_tax_payable_paisa)} bold />
          <Row label="Remaining" value={fmt(col.r!.remaining_tax_paisa)} color={col.r!.remaining_tax_paisa < 0 ? 'var(--ok)' : 'var(--warn)'} />
        </div>
      ))}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Investments', 'Forecast', 'Compare Years'] as const;
type Tab = typeof TABS[number];

export default function TaxPage() {
  const fys = currentFYs();
  const [fy, setFy] = useState(fys[0]);
  const [tab, setTab] = useState<Tab>('Overview');
  const [result, setResult] = useState<TaxResult | null>(null);
  const [investments, setInvestments] = useState<TaxInvestments>({ stocks_paisa: 0, insurance_paisa: 0, others_paisa: 0 });
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [filing, setFiling] = useState(false);
  const [reopening, setReopening] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [sumRes, invRes] = await Promise.all([
      api.get(`/tax/summary?fiscal_year=${fy}`).catch(() => null),
      api.get(`/tax-investments/${fy}`).catch(() => null),
    ]);
    if (sumRes) setResult(sumRes.data);
    if (invRes) setInvestments(invRes.data);
    setLoading(false);
  }, [fy]);

  useEffect(() => { load(); }, [load]);

  async function confirm() {
    setConfirming(true);
    await api.post(`/tax-years/${fy}/confirm`, {}).catch(() => {});
    setConfirming(false);
    load();
  }

  async function fileReturn() {
    setFiling(true);
    const today = new Date().toISOString().slice(0, 10);
    await api.post(`/tax-years/${fy}/file`, { filed_on: today }).catch(() => {});
    setFiling(false);
    load();
  }

  async function reopen() {
    setReopening(true);
    await api.post(`/tax-years/${fy}/reopen`, {}).catch(() => {});
    setReopening(false);
    load();
  }

  const months = result?.months_entered ?? 0;
  const totalMonths = 12;
  const dataProgress = Math.round((months / totalMonths) * 100);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ font: 'var(--t-page)', margin: '0 0 4px' }}>Tax Dashboard</h1>
          <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>
            Data: {months}/{totalMonths} months
            <div style={{ display: 'inline-block', width: 100, height: 6, background: 'var(--bg-sunken)', borderRadius: 3, marginLeft: 8, verticalAlign: 'middle' }}>
              <div style={{ height: '100%', width: `${dataProgress}%`, background: 'var(--accent)', borderRadius: 3 }} />
            </div>
            {' '}{dataProgress}%
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <select
            value={fy} onChange={(e) => setFy(e.target.value)}
            style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, font: 'var(--t-body)', background: 'var(--bg-sunken)' }}
          >
            {fys.map((f) => <option key={f} value={f}>FY{f}</option>)}
          </select>
          {result && !result.is_locked && result.is_provisional && (
            <button onClick={confirm} disabled={confirming} style={{ padding: '7px 14px', border: '1px solid var(--warn)', borderRadius: 8, background: 'var(--warn-bg)', color: 'var(--warn)', cursor: 'pointer', font: 'var(--t-caption)' }}>
              {confirming ? '…' : 'Confirm Settings'}
            </button>
          )}
          {result && !result.is_locked && (
            <button onClick={fileReturn} disabled={filing} style={{ padding: '7px 14px', background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', borderRadius: 8, cursor: 'pointer', font: 'var(--t-body)' }}>
              {filing ? 'Filing…' : 'Mark Filed'}
            </button>
          )}
          {result?.is_locked && (
            <button onClick={reopen} disabled={reopening} style={{ padding: '7px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', cursor: 'pointer', font: 'var(--t-caption)' }}>
              {reopening ? '…' : 'Reopen'}
            </button>
          )}
        </div>
      </div>

      {/* Notices */}
      {result?.is_provisional && !result.is_locked && (
        <div style={{ background: 'var(--warn-bg)', borderLeft: '4px solid var(--warn)', padding: '10px 14px', borderRadius: 6, marginBottom: 12, font: 'var(--t-body)', color: 'var(--warn)' }}>
          ⚠ Tax settings for FY{fy} are provisional. Confirm them to lock in the parameters.
        </div>
      )}
      {result?.is_locked && result.filed_on && (
        <div style={{ background: 'var(--neutral-bg)', borderLeft: '4px solid var(--neutral)', padding: '10px 14px', borderRadius: 6, marginBottom: 12, font: 'var(--t-body)', color: 'var(--neutral)' }}>
          ✓ Filed on {result.filed_on} · figures locked
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border)', marginBottom: 24 }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -2,
              cursor: 'pointer',
              font: 'var(--t-body)',
              color: tab === t ? 'var(--accent)' : 'var(--fg-secondary)',
              fontWeight: tab === t ? 600 : 400,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--fg-muted)' }}>Loading…</div>
      ) : !result ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--fg-muted)' }}>No tax data for this year yet.</div>
      ) : (
        <>
          {tab === 'Overview' && (
            <OverviewTab result={result} investments={investments} fy={fy} onInvestmentsChange={load} />
          )}
          {tab === 'Investments' && <InvestmentsTab result={result} />}
          {tab === 'Forecast' && <ForecastTab fy={fy} />}
          {tab === 'Compare Years' && <CompareTab fy={fy} />}
        </>
      )}
    </div>
  );
}
