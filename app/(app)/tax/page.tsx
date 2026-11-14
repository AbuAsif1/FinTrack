'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';

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
  universal_pension_paisa: number;
}

interface TaxYearConfig {
  slabs: Array<{ width_paisa: number | null; rate_bps: number }>;
  salary_exemption: { numerator: number; denominator: number; cap_paisa: number };
  rebate: { income_rate_bps: number; investment_rate_bps: number; max_paisa: number };
  investment_caps_paisa: { dps: number | null; sanchaypatra: number | null; stocks: number | null; insurance: number | null; others: number | null; universal_pension?: number | null };
  minimum_tax_paisa: number;
  early_filing: { rate_bps: number; max_paisa: number; deadline_mmdd: string } | null;
}

interface TaxYearRecord {
  id: string;
  fiscal_year: string;
  config: TaxYearConfig;
  is_provisional: boolean;
  filed_on: string | null;
  is_locked: boolean;
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
  const [invEdit, setInvEdit] = useState<{ stocks: string; insurance: string; others: string; universal_pension: string } | null>(null);
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
      universal_pension_paisa: Math.round(parseFloat(invEdit.universal_pension || '0') * 100),
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

        {/* Net tax */}
        <Row label="Net Tax Payable" value={fmt(result.net_tax_payable_paisa)} bold />

        {/* Already Paid breakdown */}
        <div style={{ margin: '10px 0 4px', padding: '10px 12px', borderRadius: 8, background: 'var(--bg-sunken)', border: '1px solid var(--border)' }}>
          <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', marginBottom: 8 }}>ALREADY PAID</div>
          <Row label="TDS deducted from salary" value={fmt(result.tds_paisa)} color={result.tds_paisa > 0 ? 'var(--ok)' : 'var(--fg-muted)'} />
          <Row label="Advance / self-assessment tax" value={fmt(result.tax_payments_paisa)} color={result.tax_payments_paisa > 0 ? 'var(--ok)' : 'var(--fg-muted)'} />
          <div style={{ borderTop: '1px solid var(--border)', margin: '6px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ font: 'var(--t-body)', fontWeight: 600 }}>Total Paid</span>
            <span style={{ font: 'var(--t-data)', fontVariantNumeric: 'tabular-nums', color: 'var(--ok)', fontWeight: 600 }}>{fmt(result.tax_paid_paisa)}</span>
          </div>
          <ProgressBar pct={tdsProgress} color={remaining < 0 ? 'var(--ok)' : tdsProgress >= 90 ? 'var(--ok)' : tdsProgress >= 70 ? 'var(--warn)' : 'var(--accent)'} />
          <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', marginTop: 4 }}>
            {tdsProgress}% of net tax covered
          </div>
        </div>

        {/* Remaining */}
        <div style={{ marginTop: 10 }}>
          {remaining < 0 ? (
            <Row label="Overpaid (refundable)" value={`+${fmt(Math.abs(remaining))}`} color="var(--ok)" bold />
          ) : (
            <Row label="Remaining to Pay" value={fmt(remaining)} color={remaining > 0 ? 'var(--warn)' : 'var(--ok)'} bold />
          )}
        </div>

        {result.remaining_salary_months > 0 && result.suggested_monthly_tds_paisa != null && result.suggested_monthly_tds_paisa > 0 && (
          <div style={{ marginTop: 8, font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>
            {result.remaining_salary_months} salary month{result.remaining_salary_months > 1 ? 's' : ''} remaining · Suggested TDS/mo: {fmt(result.suggested_monthly_tds_paisa)}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>INVESTMENTS</div>
          {!result.is_locked && !invEdit && (
            <button
              onClick={() => setInvEdit({
                stocks: String(investments.stocks_paisa / 100),
                insurance: String(investments.insurance_paisa / 100),
                others: String(investments.others_paisa / 100),
                universal_pension: String(investments.universal_pension_paisa / 100),
              })}
              style={{ font: 'var(--t-caption)', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Edit
            </button>
          )}
        </div>
        <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', marginBottom: 10 }}>
          Recorded via Add Expenses → Investment. Edit to adjust totals if needed.
        </div>
        {invEdit ? (
          <div>
            <div style={{ font: 'var(--t-caption)', color: 'var(--warn)', marginBottom: 8, padding: '6px 10px', background: 'rgba(234,179,8,0.08)', borderRadius: 6 }}>
              These totals include amounts already recorded via Add Expenses. Editing replaces the full total — do not re-enter amounts you already recorded.
            </div>
            {(['stocks', 'insurance', 'others', 'universal_pension'] as const).map((k) => (
              <label key={k} style={{ display: 'block', marginBottom: 8 }}>
                <div style={{ font: 'var(--t-label)', marginBottom: 4, textTransform: 'capitalize' }}>{k.replace('_', ' ')} (৳)</div>
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
            <Row label="Universal Pension Scheme" value={fmt(investments.universal_pension_paisa)} />
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

const COL_INV = '1fr 1fr 150px 130px';
const COL_INV_MIN = 580;

interface InvTransaction {
  id: string;
  description: string;
  amount_paisa: number;
  date: string;
  created_at: string;
  payment_method: string;
}

// Groups investment transactions by label (strips the "Investment — " prefix)
function groupInvTx(txs: InvTransaction[]): { label: string; total: number; rows: InvTransaction[] }[] {
  const map = new Map<string, { total: number; rows: InvTransaction[] }>();
  for (const tx of txs) {
    const label = tx.description.replace(/^Investment\s*[—\-]\s*/i, '') || tx.description;
    const existing = map.get(label) ?? { total: 0, rows: [] };
    existing.total += tx.amount_paisa;
    existing.rows.push(tx);
    map.set(label, existing);
  }
  return Array.from(map.entries()).map(([label, v]) => ({ label, ...v }));
}

function InvestmentsTab({ result, fy }: { result: TaxResult; fy: string }) {
  const rebate_pct = result.tax_rebate_paisa > 0 ? (result.tax_rebate_paisa / result.eligible_investment_paisa * 100).toFixed(0) : '0';
  const [invTxs, setInvTxs] = useState<InvTransaction[]>([]);

  useEffect(() => {
    api.get(`/investments?fiscal_year=${fy}`)
      .then(({ data }) => setInvTxs(data.transactions ?? []))
      .catch(() => {});
  }, [fy]);

  const grouped = groupInvTx(invTxs);

  return (
    <div>
      <div className="table-scroll" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: COL_INV, gap: 0, padding: '10px 16px', background: 'var(--bg-raised)', borderBottom: '2px solid var(--border)', minWidth: COL_INV_MIN }}>
          <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>INVESTMENT</div>
          <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>INVESTED / CAP</div>
          <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', textAlign: 'right' }}>ELIGIBLE</div>
          <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', textAlign: 'right' }}>REBATE (10%)</div>
        </div>
        {result.investment_breakdown.map((inv) => {
          const investedCap = `${fmt(inv.invested)}${inv.cap ? ` / ${fmt(inv.cap)}` : ' / no cap'}`;
          return (
            <div key={inv.category} style={{ display: 'grid', gridTemplateColumns: COL_INV, padding: '12px 16px', borderBottom: '1px solid var(--border)', minWidth: COL_INV_MIN, alignItems: 'center' }}>
              <div style={{ font: 'var(--t-body)', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={inv.category.replace(/_/g, ' ')}>
                {inv.category.replace(/_/g, ' ')}
              </div>
              <div style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={investedCap}>
                {investedCap}
              </div>
              <div style={{ font: 'var(--t-data)', fontVariantNumeric: 'tabular-nums', textAlign: 'right', whiteSpace: 'nowrap' }} title={fmt(inv.eligible)}>
                {fmt(inv.eligible)}
              </div>
              <div style={{ font: 'var(--t-data)', color: 'var(--ok)', fontVariantNumeric: 'tabular-nums', textAlign: 'right', whiteSpace: 'nowrap' }} title={fmt(Math.round(inv.eligible * 0.1))}>
                {fmt(Math.round(inv.eligible * 0.1))}
              </div>
            </div>
          );
        })}
        <div style={{ display: 'grid', gridTemplateColumns: COL_INV, padding: '12px 16px', borderTop: '2px solid var(--border)', background: 'var(--bg-raised)', minWidth: COL_INV_MIN }}>
          <div style={{ font: 'var(--t-body)', fontWeight: 600 }}>Total Eligible</div>
          <div />
          <div style={{ font: 'var(--t-data)', fontWeight: 600, fontVariantNumeric: 'tabular-nums', textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(result.eligible_investment_paisa)}</div>
          <div style={{ font: 'var(--t-data)', color: 'var(--ok)', fontWeight: 600, fontVariantNumeric: 'tabular-nums', textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(result.tax_rebate_paisa)}</div>
        </div>
      </div>
      <div style={{ marginTop: 12, font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>
        Rebate = MIN(Gross Income × 3%, Eligible Investment × 10%, ৳10,00,000) = {fmt(result.tax_rebate_paisa)} · {rebate_pct}%
      </div>

      {/* Investment transaction records (from Add Expenses > Investment) */}
      {grouped.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', marginBottom: 10 }}>INVESTMENT RECORDS THIS YEAR</div>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            {grouped.map((g, gi) => (
              <div key={g.label}>
                {/* Group header */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 16px',
                  background: gi % 2 === 0 ? 'var(--bg-raised)' : 'var(--bg-surface)',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <div style={{ font: 'var(--t-body)', fontWeight: 600 }}>{g.label}</div>
                  <div style={{ font: 'var(--t-data)', fontVariantNumeric: 'tabular-nums', color: 'var(--accent)' }}>
                    {fmt(g.total)}
                  </div>
                </div>
                {/* Individual rows */}
                {g.rows.map((tx) => (
                  <div key={tx.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '7px 16px 7px 32px',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--bg-sunken)',
                  }}>
                    <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>
                      {new Date(tx.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {' · '}{tx.payment_method}
                    </div>
                    <div style={{ font: 'var(--t-data)', fontVariantNumeric: 'tabular-nums', color: 'var(--fg-primary)' }}>
                      {fmt(tx.amount_paisa)}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
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
      <div style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)', padding: '8px 14px', borderRadius: 8, marginBottom: 16, font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>
        {forecast.months_entered === 0
          ? 'No salary entries yet — enter at least one month to see a forecast.'
          : forecast.months_entered === 1
          ? `Based on 1 salary month × 12 (projected full year)`
          : `Based on avg of ${forecast.months_entered} salary months × 12 (projected full year)`}
        {' '}· Rebate uses your actual investments.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <Tile label="PROJECTED GROSS TAX" value={fmt(forecast.gross_tax_paisa)} />
        <Tile label="PROJECTED REBATE" value={fmt(forecast.tax_rebate_paisa)} color="var(--ok)" />
        <Tile label="PROJECTED NET TAX" value={fmt(forecast.net_tax_payable_paisa)} color={forecast.net_tax_payable_paisa > 0 ? 'var(--warn)' : 'var(--ok)'} />
      </div>
      <div style={{ marginTop: 16, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
        <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', marginBottom: 8 }}>FULL-YEAR BREAKDOWN</div>
        <Row label="Projected Gross Income (12 mo)" value={fmt(forecast.gross_income_paisa)} />
        <Row label="− Salary Exemption" value={`−${fmt(forecast.exemption_paisa)}`} color="var(--ok)" />
        <Row label="Taxable Income" value={fmt(forecast.taxable_income_paisa)} bold />
        <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0' }} />
        <Row label="Gross Tax" value={fmt(forecast.gross_tax_paisa)} />
        <Row label="− Investment Rebate" value={`−${fmt(forecast.tax_rebate_paisa)}`} color="var(--ok)" />
        <Row label="Net Tax Payable" value={fmt(forecast.net_tax_payable_paisa)} bold />
        <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0' }} />
        <Row label="TDS projected (12 mo)" value={fmt(forecast.tds_paisa)} color="var(--ok)" />
        <Row
          label="Projected Remaining to Pay"
          value={fmt(forecast.remaining_tax_paisa)}
          color={forecast.remaining_tax_paisa < 0 ? 'var(--ok)' : 'var(--warn)'}
          bold
        />
        {forecast.suggested_monthly_tds_paisa != null && forecast.suggested_monthly_tds_paisa > 0 && (
          <div style={{ marginTop: 8, font: 'var(--t-caption)', color: 'var(--accent)' }}>
            Suggested TDS/month to cover remaining: {fmt(forecast.suggested_monthly_tds_paisa)}
          </div>
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

// ── Settings Tab ────────────────────────────────────────────────────────────

type SlabEdit = { width_taka: string; rate_pct: string };
type ParamsEdit = {
  exemption_num: string; exemption_den: string; exemption_cap: string;
  rebate_income_pct: string; rebate_inv_pct: string; rebate_max: string;
  cap_dps: string; cap_sanch: string; cap_stocks: string; cap_insurance: string; cap_others: string; cap_ups: string;
  min_tax: string;
  has_ef: boolean; ef_rate_pct: string; ef_max: string; ef_deadline: string;
};

function configToEdit(cfg: TaxYearConfig): { slabs: SlabEdit[]; params: ParamsEdit } {
  return {
    slabs: cfg.slabs.map(s => ({
      width_taka: s.width_paisa === null ? '' : String(s.width_paisa / 100),
      rate_pct: String(s.rate_bps / 100),
    })),
    params: {
      exemption_num: String(cfg.salary_exemption.numerator),
      exemption_den: String(cfg.salary_exemption.denominator),
      exemption_cap: String(cfg.salary_exemption.cap_paisa / 100),
      rebate_income_pct: String(cfg.rebate.income_rate_bps / 100),
      rebate_inv_pct: String(cfg.rebate.investment_rate_bps / 100),
      rebate_max: String(cfg.rebate.max_paisa / 100),
      cap_dps: cfg.investment_caps_paisa.dps === null ? '' : String(cfg.investment_caps_paisa.dps / 100),
      cap_sanch: cfg.investment_caps_paisa.sanchaypatra === null ? '' : String(cfg.investment_caps_paisa.sanchaypatra / 100),
      cap_stocks: cfg.investment_caps_paisa.stocks === null ? '' : String(cfg.investment_caps_paisa.stocks / 100),
      cap_insurance: cfg.investment_caps_paisa.insurance === null ? '' : String(cfg.investment_caps_paisa.insurance / 100),
      cap_others: cfg.investment_caps_paisa.others === null ? '' : String(cfg.investment_caps_paisa.others / 100),
      cap_ups: (() => { const v = (cfg.investment_caps_paisa as Record<string, number | null | undefined>).universal_pension; return v == null ? '' : String(v / 100); })(),
      min_tax: String(cfg.minimum_tax_paisa / 100),
      has_ef: cfg.early_filing !== null,
      ef_rate_pct: cfg.early_filing ? String(cfg.early_filing.rate_bps / 100) : '0.5',
      ef_max: cfg.early_filing ? String(cfg.early_filing.max_paisa / 100) : '2000',
      ef_deadline: cfg.early_filing?.deadline_mmdd ?? '09-30',
    },
  };
}

function editToConfig(slabs: SlabEdit[], p: ParamsEdit): TaxYearConfig {
  const toPaisa = (s: string) => s === '' ? null : Math.round(parseFloat(s) * 100);
  const toBps = (s: string) => Math.round(parseFloat(s) * 100);
  return {
    slabs: slabs.map((s, i) => ({
      width_paisa: i === slabs.length - 1 ? null : Math.round(parseFloat(s.width_taka) * 100),
      rate_bps: toBps(s.rate_pct),
    })),
    salary_exemption: {
      numerator: parseInt(p.exemption_num, 10),
      denominator: parseInt(p.exemption_den, 10),
      cap_paisa: Math.round(parseFloat(p.exemption_cap) * 100),
    },
    rebate: {
      income_rate_bps: toBps(p.rebate_income_pct),
      investment_rate_bps: toBps(p.rebate_inv_pct),
      max_paisa: Math.round(parseFloat(p.rebate_max) * 100),
    },
    investment_caps_paisa: {
      dps: toPaisa(p.cap_dps),
      sanchaypatra: toPaisa(p.cap_sanch),
      stocks: toPaisa(p.cap_stocks),
      insurance: toPaisa(p.cap_insurance),
      others: toPaisa(p.cap_others),
      universal_pension: toPaisa(p.cap_ups),
    },
    minimum_tax_paisa: Math.round(parseFloat(p.min_tax) * 100),
    early_filing: p.has_ef ? {
      rate_bps: toBps(p.ef_rate_pct),
      max_paisa: Math.round(parseFloat(p.ef_max) * 100),
      deadline_mmdd: p.ef_deadline,
    } : null,
  };
}

function SettingsInput({
  label, value, onChange, suffix, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; suffix?: string; placeholder?: string }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', marginBottom: 3 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type="number" min="0" step="any" value={value} placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          style={{ width: '100%', padding: '6px 9px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)', boxSizing: 'border-box' }}
        />
        {suffix && <span style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>{suffix}</span>}
      </div>
    </label>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, marginTop: 20, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
      {children}
    </div>
  );
}

function SettingsTab({
  fy,
  taxYear,
  onSaved,
}: {
  fy: string;
  taxYear: TaxYearRecord | null;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editSlabs, setEditSlabs] = useState<SlabEdit[]>([]);
  const [editParams, setEditParams] = useState<ParamsEdit | null>(null);

  if (!taxYear) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-muted)' }}>No settings found for FY{fy}.</div>;

  const cfg = taxYear.config;
  const locked = taxYear.is_locked;

  function startEdit() {
    const { slabs, params } = configToEdit(cfg);
    setEditSlabs(slabs);
    setEditParams(params);
    setEditing(true);
    setError(null);
  }

  function cancelEdit() {
    setEditing(false);
    setError(null);
  }

  async function save() {
    if (!editParams) return;
    setSaving(true);
    setError(null);
    try {
      await api.put(`/tax-years/${fy}`, editToConfig(editSlabs, editParams));
      setEditing(false);
      onSaved();
    } catch {
      setError('Save failed — check the values and try again.');
    } finally {
      setSaving(false);
    }
  }

  function setParam<K extends keyof ParamsEdit>(key: K, val: ParamsEdit[K]) {
    setEditParams(p => p ? { ...p, [key]: val } : p);
  }

  function setSlab(i: number, field: keyof SlabEdit, val: string) {
    setEditSlabs(slabs => slabs.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  }

  function addSlab() {
    setEditSlabs(slabs => [
      ...slabs.slice(0, -1),
      { width_taka: '', rate_pct: '0' },
      slabs[slabs.length - 1],
    ]);
  }

  function removeSlab(i: number) {
    if (editSlabs.length <= 2) return;
    setEditSlabs(slabs => slabs.filter((_, idx) => idx !== i));
  }

  // ── Slab range display helper ─────────────────────────────────────────────
  function slabRangeLabel(slabs: Array<{ width_paisa: number | null }>, idx: number) {
    let floor = 0;
    for (let i = 0; i < idx; i++) floor += slabs[i].width_paisa ?? 0;
    const to = slabs[idx].width_paisa;
    const fromStr = floor === 0 ? '৳0' : '৳' + (floor / 100).toLocaleString('en-IN');
    const toStr = to !== null ? '৳' + ((floor + to) / 100).toLocaleString('en-IN') : 'above';
    return `${fromStr} – ${toStr}`;
  }

  if (editing && editParams) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)' }}>Editing FY{fy} tax parameters</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={cancelEdit} style={{ padding: '7px 14px', border: '1px solid var(--border)', borderRadius: 7, background: 'transparent', cursor: 'pointer', font: 'var(--t-body)' }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ padding: '7px 14px', border: 'none', borderRadius: 7, background: 'var(--accent)', color: 'var(--accent-fg)', cursor: 'pointer', font: 'var(--t-body)' }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
        {error && <div style={{ color: 'var(--danger)', font: 'var(--t-caption)', marginBottom: 10 }}>{error}</div>}

        {/* ── Tax Slabs ─────────────────────────────────────────────────── */}
        <SectionLabel>Tax Slabs</SectionLabel>
        <div className="table-scroll" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 32px', gap: 0, padding: '8px 14px', background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
            {['Slab width (৳)', 'Rate (%)', ''].map(h => (
              <div key={h} style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>{h}</div>
            ))}
          </div>
          {editSlabs.map((s, i) => {
            const isLast = i === editSlabs.length - 1;
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 160px 32px', gap: 8, padding: '8px 14px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                {isLast ? (
                  <div style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)' }}>Remaining income</div>
                ) : (
                  <input
                    type="number" min="1" step="1" value={s.width_taka} placeholder="Width in ৳"
                    onChange={e => setSlab(i, 'width_taka', e.target.value)}
                    style={{ padding: '6px 9px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)', width: '100%', boxSizing: 'border-box' }}
                  />
                )}
                <input
                  type="number" min="0" max="100" step="0.5" value={s.rate_pct}
                  onChange={e => setSlab(i, 'rate_pct', e.target.value)}
                  style={{ padding: '6px 9px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)', boxSizing: 'border-box' }}
                />
                {!isLast && editSlabs.length > 2 ? (
                  <button onClick={() => removeSlab(i)} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', font: '14px/1 sans-serif' }}>✕</button>
                ) : <div />}
              </div>
            );
          })}
          <div style={{ padding: '8px 14px' }}>
            <button onClick={addSlab} style={{ font: 'var(--t-caption)', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>+ Add slab</button>
          </div>
        </div>

        {/* ── Salary Exemption ──────────────────────────────────────────── */}
        <SectionLabel>Salary Exemption</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <SettingsInput label="Numerator" value={editParams.exemption_num} onChange={v => setParam('exemption_num', v)} />
          <SettingsInput label="Denominator" value={editParams.exemption_den} onChange={v => setParam('exemption_den', v)} />
          <SettingsInput label="Cap" value={editParams.exemption_cap} onChange={v => setParam('exemption_cap', v)} suffix="৳" />
        </div>

        {/* ── Tax Rebate ────────────────────────────────────────────────── */}
        <SectionLabel>Tax Rebate on Investment</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <SettingsInput label="Income rate" value={editParams.rebate_income_pct} onChange={v => setParam('rebate_income_pct', v)} suffix="% of gross income" />
          <SettingsInput label="Investment rate" value={editParams.rebate_inv_pct} onChange={v => setParam('rebate_inv_pct', v)} suffix="% of investment" />
          <SettingsInput label="Maximum rebate" value={editParams.rebate_max} onChange={v => setParam('rebate_max', v)} suffix="৳" />
        </div>

        {/* ── Investment Caps ───────────────────────────────────────────── */}
        <SectionLabel>Investment Caps for Rebate (৳, blank = no cap)</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <SettingsInput label="DPS" value={editParams.cap_dps} onChange={v => setParam('cap_dps', v)} placeholder="No cap" />
          <SettingsInput label="Sanchaypatra" value={editParams.cap_sanch} onChange={v => setParam('cap_sanch', v)} placeholder="No cap" />
          <SettingsInput label="Stocks" value={editParams.cap_stocks} onChange={v => setParam('cap_stocks', v)} placeholder="No cap" />
          <SettingsInput label="Insurance" value={editParams.cap_insurance} onChange={v => setParam('cap_insurance', v)} placeholder="No cap" />
          <SettingsInput label="Others" value={editParams.cap_others} onChange={v => setParam('cap_others', v)} placeholder="No cap" />
          <SettingsInput label="Universal Pension Scheme" value={editParams.cap_ups} onChange={v => setParam('cap_ups', v)} placeholder="No cap" />
        </div>

        {/* ── Minimum Tax & Early Filing ────────────────────────────────── */}
        <SectionLabel>Other Parameters</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <SettingsInput label="Minimum tax" value={editParams.min_tax} onChange={v => setParam('min_tax', v)} suffix="৳" />
        </div>
        <div style={{ marginTop: 14 }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={editParams.has_ef} onChange={e => setParam('has_ef', e.target.checked)} />
            <span style={{ font: 'var(--t-body)' }}>Early filing rebate</span>
          </label>
          {editParams.has_ef && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 10 }}>
              <SettingsInput label="Rebate rate" value={editParams.ef_rate_pct} onChange={v => setParam('ef_rate_pct', v)} suffix="% of net tax" />
              <SettingsInput label="Maximum" value={editParams.ef_max} onChange={v => setParam('ef_max', v)} suffix="৳" />
              <label style={{ display: 'block' }}>
                <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', marginBottom: 3 }}>Deadline (MM-DD)</div>
                <input
                  type="text" value={editParams.ef_deadline} placeholder="09-30"
                  onChange={e => setParam('ef_deadline', e.target.value)}
                  style={{ width: '100%', padding: '6px 9px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)', boxSizing: 'border-box' }}
                />
              </label>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Read-only view ─────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)' }}>
          {taxYear.is_provisional ? '⚠ Provisional — confirm after verifying with NBR Finance Act' : '✓ Confirmed'}
        </div>
        {!locked && (
          <button onClick={startEdit} style={{ font: 'var(--t-caption)', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>Edit</button>
        )}
      </div>

      <SectionLabel>Tax Slabs</SectionLabel>
      <div className="table-scroll" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', padding: '8px 16px', background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>Income range</div>
          <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', textAlign: 'right' }}>Rate</div>
        </div>
        {cfg.slabs.map((slab, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 100px', padding: '10px 16px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
            <div style={{ font: 'var(--t-body)' }}>{slabRangeLabel(cfg.slabs, i)}</div>
            <div style={{ font: 'var(--t-data)', textAlign: 'right', fontWeight: 600, color: slab.rate_bps === 0 ? 'var(--ok)' : 'var(--fg-primary)' }}>
              {(slab.rate_bps / 100).toFixed(0)}%
            </div>
          </div>
        ))}
      </div>

      <SectionLabel>Key Parameters</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {[
          ['Salary exemption', `${cfg.salary_exemption.numerator}/${cfg.salary_exemption.denominator} of salary, max ৳${(cfg.salary_exemption.cap_paisa / 100).toLocaleString('en-IN')}`],
          ['Rebate on investment', `${(cfg.rebate.investment_rate_bps / 100).toFixed(0)}%, max ৳${(cfg.rebate.max_paisa / 100).toLocaleString('en-IN')}`],
          ['Minimum tax', `৳${(cfg.minimum_tax_paisa / 100).toLocaleString('en-IN')}`],
          cfg.early_filing
            ? ['Early filing rebate', `${(cfg.early_filing.rate_bps / 100).toFixed(1)}% up to ৳${(cfg.early_filing.max_paisa / 100).toLocaleString('en-IN')} by ${cfg.early_filing.deadline_mmdd}`]
            : ['Early filing rebate', 'None'],
        ].map(([label, value]) => (
          <div key={label} style={{ background: 'var(--bg-raised)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)', marginBottom: 4 }}>{label}</div>
            <div style={{ font: 'var(--t-body)', fontWeight: 500 }}>{value}</div>
          </div>
        ))}
      </div>

      <SectionLabel>Investment Caps for Rebate</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
        {([
          ['DPS', cfg.investment_caps_paisa.dps],
          ['Sanchaypatra', cfg.investment_caps_paisa.sanchaypatra],
          ['Stocks', cfg.investment_caps_paisa.stocks],
          ['Insurance', cfg.investment_caps_paisa.insurance],
          ['Others', cfg.investment_caps_paisa.others],
          ['Universal Pension Scheme', (cfg.investment_caps_paisa as Record<string, number | null | undefined>).universal_pension ?? null],
        ] as [string, number | null][]).map(([label, cap]) => (
          <div key={label} style={{ background: 'var(--bg-raised)', borderRadius: 6, padding: '10px 12px' }}>
            <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)', marginBottom: 2 }}>{label}</div>
            <div style={{ font: 'var(--t-body)' }}>
              {cap === null ? 'No cap' : '৳' + (cap / 100).toLocaleString('en-IN')}
            </div>
          </div>
        ))}
      </div>

      {locked && (
        <div style={{ marginTop: 16, font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>
          Settings are locked because this fiscal year has been filed.
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Investments', 'Forecast', 'Compare Years', 'Settings'] as const;
type Tab = typeof TABS[number];

export default function TaxPage() {
  const fys = currentFYs();
  const [fy, setFy] = useState(fys[0]);
  const [tab, setTab] = useState<Tab>('Overview');
  const [result, setResult] = useState<TaxResult | null>(null);
  const [investments, setInvestments] = useState<TaxInvestments>({ stocks_paisa: 0, insurance_paisa: 0, others_paisa: 0, universal_pension_paisa: 0 });
  const [taxYear, setTaxYear] = useState<TaxYearRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [filing, setFiling] = useState(false);
  const [reopening, setReopening] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [sumRes, invRes, tyRes] = await Promise.all([
      api.get(`/tax/summary?fiscal_year=${fy}`).catch(() => null),
      api.get(`/tax-investments/${fy}`).catch(() => null),
      api.get(`/tax-years/${fy}`).catch(() => null),
    ]);
    if (sumRes) setResult(sumRes.data);
    if (invRes) setInvestments(invRes.data);
    if (tyRes) setTaxYear(tyRes.data);
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
      <PageHeader
        eyebrow="Bangladesh NBR · fiscal year Jul–Jun"
        title="Tax Dashboard"
        description={`Data: ${months}/${totalMonths} months · ${dataProgress}% complete`}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <select
              value={fy} onChange={(e) => setFy(e.target.value)}
              style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, font: 'var(--t-body)', background: 'var(--bg-sunken)' }}
            >
              {fys.map((f) => <option key={f} value={f}>FY{f}</option>)}
            </select>
            {result && !result.is_locked && result.is_provisional && (
              <button onClick={confirm} disabled={confirming} className="btn-secondary" style={{ borderColor: 'var(--warn)', color: 'var(--warn)', background: 'var(--warn-bg)' }}>
                {confirming ? '…' : 'Confirm Settings'}
              </button>
            )}
            {result && !result.is_locked && (
              <button onClick={fileReturn} disabled={filing} className="btn-primary">
                {filing ? 'Filing…' : 'Mark Filed'}
              </button>
            )}
            {result?.is_locked && (
              <button onClick={reopen} disabled={reopening} className="btn-secondary">
                {reopening ? '…' : 'Reopen'}
              </button>
            )}
          </div>
        }
      />

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
      ) : tab === 'Settings' ? (
        <SettingsTab fy={fy} taxYear={taxYear} onSaved={load} />
      ) : !result ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--fg-muted)' }}>No tax data for this year yet.</div>
      ) : (
        <>
          {tab === 'Overview' && (
            <OverviewTab result={result} investments={investments} fy={fy} onInvestmentsChange={load} />
          )}
          {tab === 'Investments' && <InvestmentsTab result={result} fy={fy} />}
          {tab === 'Forecast' && <ForecastTab fy={fy} />}
          {tab === 'Compare Years' && <CompareTab fy={fy} />}
        </>
      )}
    </div>
  );
}
