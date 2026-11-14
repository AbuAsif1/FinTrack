'use client';

import { useEffect, useState, useCallback } from 'react';
import api, { getAccessToken } from '@/lib/api';
import { Amount } from '@/components/ui/Amount';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonTableRows, SK } from '@/components/ui/Skeleton';

// ── Types ─────────────────────────────────────────────────────────────────

interface MonthRow {
  month: string;
  in_hand_income_paisa: number;
  total_spending_paisa: number;
  net_savings_paisa: number;
  tds_paisa: number;
  savings_rate_bps: number | null;
  fixed_expense_compliance: { paid: number; skipped: number; pending: number };
}

interface CategoryTrendMonth {
  month: string;
  categories: { category_id: string; category_name: string; amount_paisa: number }[];
}

interface IncomeTrendMonth {
  month: string;
  income_entries: { income_type: string; in_hand_paisa: number }[];
}

type Tab = 'monthly' | 'income' | 'spending' | 'savings-rate';

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[parseInt(m, 10) - 1]} ${y}`;
}

function currentFY(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed
  const startYear = m >= 6 ? y : y - 1;
  return `${startYear}-${String(startYear + 1).slice(2)}`;
}

function fyMonths(fy: string): { from: string; to: string } {
  const startYear = parseInt(fy.split('-')[0], 10);
  return { from: `${startYear}-07`, to: `${startYear + 1}-06` };
}

// ── Monthly Summary Tab ────────────────────────────────────────────────

function MonthlySummaryTab({ months, loading }: { months: MonthRow[]; loading: boolean }) {
  if (loading) return <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, marginTop: 16 }}><SkeletonTableRows rows={8} cols={[{ flex: 1 }, { flex: 1, align: 'right' as const }, { flex: 1, align: 'right' as const }, { flex: 1, align: 'right' as const }, { flex: 1, align: 'right' as const }, { flex: 1, align: 'right' as const }, { flex: 1, align: 'right' as const }]} /></div>;
  if (!months.length) return <div style={{ color: 'var(--fg-muted)', font: 'var(--t-body)', padding: '20px 0' }}>No data for this period.</div>;

  const totals = months.reduce(
    (acc, m) => ({
      income: acc.income + m.in_hand_income_paisa,
      spending: acc.spending + m.total_spending_paisa,
      savings: acc.savings + m.net_savings_paisa,
      tds: acc.tds + m.tds_paisa,
    }),
    { income: 0, spending: 0, savings: 0, tds: 0 }
  );

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--t-body)' }}>
        <thead>
          <tr style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', borderBottom: '2px solid var(--border)' }}>
            <th style={{ textAlign: 'left', padding: '8px 12px 8px 0' }}>Month</th>
            <th style={{ textAlign: 'right', padding: '8px 12px' }}>In-Hand</th>
            <th style={{ textAlign: 'right', padding: '8px 12px' }}>Spending</th>
            <th style={{ textAlign: 'right', padding: '8px 12px' }}>Net Savings</th>
            <th style={{ textAlign: 'right', padding: '8px 12px' }}>TDS</th>
            <th style={{ textAlign: 'right', padding: '8px 12px' }}>Savings Rate</th>
            <th style={{ textAlign: 'right', padding: '8px 0' }}>Fixed</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m) => {
            const compliance = m.fixed_expense_compliance;
            const total = compliance.paid + compliance.skipped + compliance.pending;
            return (
              <tr key={m.month} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px 8px 0', whiteSpace: 'nowrap' }}>{formatMonth(m.month)}</td>
                <td style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--income)' }}><Amount paisa={m.in_hand_income_paisa} /></td>
                <td style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--spending)' }}><Amount paisa={m.total_spending_paisa} /></td>
                <td style={{ textAlign: 'right', padding: '8px 12px', color: m.net_savings_paisa >= 0 ? 'var(--ok)' : 'var(--danger)' }}>
                  <Amount paisa={m.net_savings_paisa} />
                </td>
                <td style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--tax)' }}><Amount paisa={m.tds_paisa} /></td>
                <td style={{ textAlign: 'right', padding: '8px 12px' }}>
                  {m.savings_rate_bps != null ? `${(m.savings_rate_bps / 100).toFixed(1)}%` : '—'}
                </td>
                <td style={{ textAlign: 'right', padding: '8px 0', color: 'var(--fg-muted)', font: 'var(--t-caption)' }}>
                  {total > 0 ? `${compliance.paid}/${total}` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 600 }}>
            <td style={{ padding: '8px 12px 8px 0' }}>Total</td>
            <td style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--income)' }}><Amount paisa={totals.income} /></td>
            <td style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--spending)' }}><Amount paisa={totals.spending} /></td>
            <td style={{ textAlign: 'right', padding: '8px 12px', color: totals.savings >= 0 ? 'var(--ok)' : 'var(--danger)' }}>
              <Amount paisa={totals.savings} />
            </td>
            <td style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--tax)' }}><Amount paisa={totals.tds} /></td>
            <td style={{ textAlign: 'right', padding: '8px 12px' }}>—</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Income Trends Tab ──────────────────────────────────────────────────

function IncomeTrendsTab({ months, loading }: { months: IncomeTrendMonth[]; loading: boolean }) {
  if (loading) return <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, marginTop: 16 }}><SkeletonTableRows rows={8} cols={SK.history} /></div>;
  if (!months.length) return <div style={{ color: 'var(--fg-muted)', font: 'var(--t-body)', padding: '20px 0' }}>No income data for this period.</div>;

  // Collect all income types
  const types = Array.from(new Set(months.flatMap((m) => m.income_entries.map((e) => e.income_type))));
  const typeColors: Record<string, string> = {
    SALARY: 'var(--income)',
    BONUS: '#6366f1',
    PROFIT_SHARE: '#06b6d4',
    EID_FESTIVAL_BONUS: '#f59e0b',
    LEAVE_ENCASHMENT: '#10b981',
    CERTIFICATION_REIMBURSEMENT: '#8b5cf6',
    HOLIDAY_SUPPORT: '#ec4899',
    OTHER: '#78716c',
  };

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--t-body)', overflowX: 'auto', display: 'block' }}>
        <caption style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', textAlign: 'left', paddingBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'table-caption' }}>
          Income by type
        </caption>
        <thead>
          <tr style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', borderBottom: '2px solid var(--border)' }}>
            <th style={{ textAlign: 'left', padding: '8px 12px 8px 0' }}>Month</th>
            {types.map((t) => (
              <th key={t} style={{ textAlign: 'right', padding: '8px 12px', color: typeColors[t] ?? 'var(--fg-secondary)' }}>
                {t.replace(/_/g, ' ')}
              </th>
            ))}
            <th style={{ textAlign: 'right', padding: '8px 0' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m) => {
            const byType = Object.fromEntries(m.income_entries.map((e) => [e.income_type, e.in_hand_paisa]));
            const total = m.income_entries.reduce((s, e) => s + e.in_hand_paisa, 0);
            return (
              <tr key={m.month} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px 8px 0', whiteSpace: 'nowrap' }}>{formatMonth(m.month)}</td>
                {types.map((t) => (
                  <td key={t} style={{ textAlign: 'right', padding: '8px 12px' }}>
                    {byType[t] != null ? <Amount paisa={byType[t]} /> : '—'}
                  </td>
                ))}
                <td style={{ textAlign: 'right', padding: '8px 0', fontWeight: 600 }}><Amount paisa={total} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Spending Trends Tab ────────────────────────────────────────────────

function SpendingTrendsTab({ months, loading }: { months: CategoryTrendMonth[]; loading: boolean }) {
  if (loading) return <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, marginTop: 16 }}><SkeletonTableRows rows={8} cols={SK.history} /></div>;
  if (!months.length) return <div style={{ color: 'var(--fg-muted)', font: 'var(--t-body)', padding: '20px 0' }}>No spending data for this period.</div>;

  // Top 5 categories by total
  const catTotals: Record<string, { name: string; total: number }> = {};
  for (const m of months) {
    for (const c of m.categories) {
      if (!catTotals[c.category_id]) catTotals[c.category_id] = { name: c.category_name, total: 0 };
      catTotals[c.category_id].total += c.amount_paisa;
    }
  }
  const top5 = Object.entries(catTotals)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 5);

  const palette = ['var(--spending)', 'var(--income)', 'var(--tax)', 'var(--savings)', 'var(--accent)'];

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--t-body)', overflowX: 'auto', display: 'block' }}>
        <caption style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', textAlign: 'left', paddingBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'table-caption' }}>
          Spending by category (top 5)
        </caption>
        <thead>
          <tr style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', borderBottom: '2px solid var(--border)' }}>
            <th style={{ textAlign: 'left', padding: '8px 12px 8px 0' }}>Month</th>
            {top5.map(([id, cat], i) => (
              <th key={id} style={{ textAlign: 'right', padding: '8px 12px', color: palette[i] }}>
                {cat.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {months.map((m) => {
            const byId = Object.fromEntries(m.categories.map((c) => [c.category_id, c.amount_paisa]));
            return (
              <tr key={m.month} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px 8px 0', whiteSpace: 'nowrap' }}>{formatMonth(m.month)}</td>
                {top5.map(([id]) => (
                  <td key={id} style={{ textAlign: 'right', padding: '8px 12px' }}>
                    {byId[id] != null ? <Amount paisa={byId[id]} /> : '—'}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Savings Rate Tab ────────────────────────────────────────────────────

function SavingsRateTab({ months, loading }: { months: MonthRow[]; loading: boolean }) {
  if (loading) return <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, marginTop: 16 }}><SkeletonTableRows rows={8} cols={[{ flex: 1 }, { flex: 1, align: 'right' as const }, { flex: 1, align: 'right' as const }, { flex: 1, align: 'right' as const }]} /></div>;
  const withRate = months.filter((m) => m.savings_rate_bps != null);
  if (!withRate.length) return <div style={{ color: 'var(--fg-muted)', font: 'var(--t-body)', padding: '20px 0' }}>No income data for this period.</div>;

  const max = Math.max(...withRate.map((m) => m.savings_rate_bps! / 100), 20, 5);
  const chartH = 120;

  return (
    <div>
      {/* Line chart */}
      <div style={{ position: 'relative', height: chartH + 24, marginBottom: 16 }} aria-hidden="true">
        <svg width="100%" height={chartH} viewBox={`0 0 ${withRate.length * 60} ${chartH}`} preserveAspectRatio="none">
          {/* 20% reference line */}
          <line
            x1={0} y1={chartH - (20 / max) * chartH}
            x2={withRate.length * 60} y2={chartH - (20 / max) * chartH}
            stroke="var(--accent)" strokeDasharray="4 4" strokeWidth={1}
          />
          {/* Area under line */}
          <polyline
            fill="var(--savings)"
            fillOpacity={0.2}
            stroke="none"
            points={`0,${chartH} ${withRate.map((m, i) => `${i * 60 + 30},${chartH - ((m.savings_rate_bps ?? 0) / 100 / max) * chartH}`).join(' ')} ${(withRate.length - 1) * 60 + 30},${chartH}`}
          />
          {/* Line */}
          <polyline
            fill="none"
            stroke="var(--savings)"
            strokeWidth={2}
            points={withRate.map((m, i) => `${i * 60 + 30},${chartH - ((m.savings_rate_bps ?? 0) / 100 / max) * chartH}`).join(' ')}
          />
          {/* Dots */}
          {withRate.map((m, i) => (
            <circle
              key={m.month}
              cx={i * 60 + 30}
              cy={chartH - ((m.savings_rate_bps ?? 0) / 100 / max) * chartH}
              r={3}
              fill="var(--savings)"
            />
          ))}
        </svg>
        {/* X-axis labels */}
        <div style={{ display: 'flex', justifyContent: 'space-around', font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>
          {withRate.map((m) => <span key={m.month}>{formatMonth(m.month).slice(0, 3)}</span>)}
        </div>
        {/* Endpoint label */}
        {withRate.length > 0 && withRate[withRate.length - 1].savings_rate_bps != null && (
          <div style={{ position: 'absolute', right: 0, top: chartH - ((withRate[withRate.length - 1].savings_rate_bps ?? 0) / 100 / max) * chartH - 20, font: 'var(--t-caption)', color: 'var(--savings)' }}>
            {((withRate[withRate.length - 1].savings_rate_bps ?? 0) / 100).toFixed(1)}%
          </div>
        )}
      </div>
      {/* Text table fallback */}
      <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--t-caption)' }}>
        <thead>
          <tr style={{ color: 'var(--fg-secondary)', borderBottom: '1px solid var(--border)' }}>
            <th style={{ textAlign: 'left', padding: '4px 8px 4px 0' }}>Month</th>
            <th style={{ textAlign: 'right', padding: '4px 8px' }}>In-Hand</th>
            <th style={{ textAlign: 'right', padding: '4px 0' }}>Savings Rate</th>
          </tr>
        </thead>
        <tbody>
          {withRate.map((m) => (
            <tr key={m.month} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '4px 8px 4px 0' }}>{formatMonth(m.month)}</td>
              <td style={{ textAlign: 'right', padding: '4px 8px' }}><Amount paisa={m.in_hand_income_paisa} /></td>
              <td style={{ textAlign: 'right', padding: '4px 0', color: (m.savings_rate_bps ?? 0) >= 2000 ? 'var(--ok)' : 'var(--fg-primary)' }}>
                {((m.savings_rate_bps ?? 0) / 100).toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', marginTop: 8 }}>
        — dashed line = 20% target
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [fy, setFy] = useState(currentFY());
  const [tab, setTab] = useState<Tab>('monthly');
  const [monthlyData, setMonthlyData] = useState<MonthRow[]>([]);
  const [incomeData, setIncomeData] = useState<IncomeTrendMonth[]>([]);
  const [spendingData, setSpendingData] = useState<CategoryTrendMonth[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (fiscalYear: string) => {
    setLoading(true);
    try {
      const { from, to } = fyMonths(fiscalYear);
      const [monthly, income, spending] = await Promise.all([
        api.get<{ months: MonthRow[] }>(`/analytics/monthly?from=${from}&to=${to}`).then((r) => r.data.months),
        api.get<{ months: IncomeTrendMonth[] }>(`/analytics/income-trend?fiscal_year=${fiscalYear}`).then((r) => r.data.months),
        api.get<{ months: CategoryTrendMonth[] }>('/analytics/category-trend?months=12').then((r) => r.data.months),
      ]);
      setMonthlyData(monthly);
      setIncomeData(income);
      setSpendingData(spending);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(fy); }, [fy, load]);

  // Fiscal year options (current + 2 back)
  const now = new Date();
  const baseYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const fyOptions = [0, 1, 2].map((i) => {
    const y = baseYear - i;
    return `${y}-${String(y + 1).slice(2)}`;
  });

  const tabs: { id: Tab; label: string }[] = [
    { id: 'monthly', label: 'Monthly Summary' },
    { id: 'income', label: 'Income Trends' },
    { id: 'spending', label: 'Spending Trends' },
    { id: 'savings-rate', label: 'Savings Rate' },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Trends and summaries"
        title="History & Analytics"
        description="Monthly breakdown and multi-year trends across your fiscal years."
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={fy}
              onChange={(e) => setFy(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--fg-primary)', font: 'var(--t-label)' }}
              aria-label="Fiscal year"
            >
              {fyOptions.map((y) => (
                <option key={y} value={y}>FY{y}</option>
              ))}
            </select>
            <button
              onClick={() => {
                const { from, to } = fyMonths(fy);
                const token = getAccessToken();
                fetch(`/api/v1/export/monthly-summary?from=${from}&to=${to}`, { headers: { Authorization: `Bearer ${token ?? ''}` } })
                  .then((r) => r.blob()).then((blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = `monthly_summary_${fy}.csv`; a.click();
                    URL.revokeObjectURL(url);
                  });
              }}
              className="btn-secondary"
            >
              Export CSV
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border)' }}>
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              padding: '8px 20px',
              border: 'none',
              borderBottom: tab === id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -2,
              background: 'transparent',
              color: tab === id ? 'var(--accent)' : 'var(--fg-secondary)',
              font: tab === id ? 'var(--t-label)' : 'var(--t-body)',
              cursor: 'pointer',
              fontWeight: tab === id ? 600 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === 'monthly' && <MonthlySummaryTab months={monthlyData} loading={loading} />}
        {tab === 'income' && <IncomeTrendsTab months={incomeData} loading={loading} />}
        {tab === 'spending' && <SpendingTrendsTab months={spendingData} loading={loading} />}
        {tab === 'savings-rate' && <SavingsRateTab months={monthlyData} loading={loading} />}
      </div>
    </div>
  );
}
