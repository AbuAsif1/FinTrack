'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { SummaryTile } from '@/components/ui/SummaryTile';
import { Amount } from '@/components/ui/Amount';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { ProgressBar } from '@/components/ui/ProgressBar';

// ── Types ─────────────────────────────────────────────────────────────────

interface DashboardData {
  tiles: {
    in_hand_income_paisa: number;
    in_hand_income_change_paisa: number | null;
    total_spending_paisa: number;
    total_spending_change_paisa: number | null;
    net_savings_paisa: number;
    net_savings_change_paisa: number | null;
    savings_rate_bps: number | null;
    savings_rate_change_bps: number | null;
  };
  current_month: {
    month: string;
    fixed_commitments_paisa: number;
    discretionary_cash_paisa: number;
    remaining_to_spend_paisa: number;
    income_is_estimated: boolean;
  };
  spending_by_category: { category_id: string; category_name: string; color: string; amount_paisa: number }[];
  six_month_trend: { month: string; in_hand_income_paisa: number; total_spending_paisa: number }[];
  fixed_expense_panel: {
    id: string;
    name: string;
    category: string;
    status: string;
    standard_amount_paisa: number;
    actual_amount_paisa: number | null;
    due_date: string;
    is_due_soon: boolean;
    is_overdue: boolean;
  }[];
  recent_transactions: {
    id: string;
    date: string;
    amount_paisa: number;
    description: string;
    type: string;
    category_name: string | null;
  }[];
  loan_summary: { owed_to_me_paisa: number; i_owe_paisa: number; net_paisa: number };
  tax_snapshot: {
    fiscal_year: string;
    tax_paid_paisa: number;
    remaining_tax_paisa: number;
    suggested_monthly_tds_paisa: number | null;
    is_provisional: boolean;
  };
  unread_notification_count: number;
}

type Period = 'this-month' | 'last-month' | 'this-fy' | 'last-30' | 'custom';

function periodDates(p: Period): { from: string; to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  if (p === 'this-month') {
    const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const to = new Date(year, month + 1, 0).toISOString().slice(0, 10);
    return { from, to };
  }
  if (p === 'last-month') {
    const lm = month === 0 ? 12 : month;
    const ly = month === 0 ? year - 1 : year;
    const from = `${ly}-${String(lm).padStart(2, '0')}-01`;
    const to = new Date(ly, lm, 0).toISOString().slice(0, 10);
    return { from, to };
  }
  if (p === 'this-fy') {
    // BD fiscal year: July 1 – June 30
    const fyStart = month >= 6 ? year : year - 1;
    return { from: `${fyStart}-07-01`, to: `${fyStart + 1}-06-30` };
  }
  // last-30
  const to = now.toISOString().slice(0, 10);
  const f = new Date(now.getTime() - 30 * 86400000);
  return { from: f.toISOString().slice(0, 10), to };
}

function statusIcon(status: string, isOverdue: boolean, isDueSoon: boolean) {
  if (status === 'PAID') return '✓';
  if (status === 'SKIPPED') return '—';
  if (isOverdue) return '⚠';
  if (isDueSoon) return '⚠';
  return '●';
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[parseInt(m, 10) - 1]} ${y}`;
}

// ── Components ────────────────────────────────────────────────────────────

function SkeletonTile() {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, height: 90, animation: 'pulse 1.4s ease infinite' }} />
  );
}

function FirstRunChecklist() {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 24 }}>
      <h2 style={{ font: 'var(--t-heading)', marginBottom: 16 }}>Welcome to FinTrack BD</h2>
      <p style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)', marginBottom: 20 }}>Complete these steps to get started:</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { label: 'Add this month\'s income', href: '/income' },
          { label: 'Add savings accounts', href: '/savings' },
          { label: 'Set up Fixed Expenses', href: '/fixed-expenses' },
          { label: 'Import history', href: '/settings/import' },
        ].map((item) => (
          <li key={item.href}>
            <Link href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent)', font: 'var(--t-body)', textDecoration: 'none' }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>+</span>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SixMonthChart({ trend }: { trend: DashboardData['six_month_trend'] }) {
  if (!trend.length) return null;
  const max = Math.max(...trend.map((m) => Math.max(m.in_hand_income_paisa, m.total_spending_paisa)), 1);

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>
        <caption style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', textAlign: 'left', paddingBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Income vs Spending</caption>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', paddingBottom: 4 }}>Month</th>
            <th style={{ textAlign: 'right' }}>Income</th>
            <th style={{ textAlign: 'right' }}>Spending</th>
          </tr>
        </thead>
        <tbody>
          {trend.map((m) => (
            <tr key={m.month}>
              <td style={{ paddingRight: 12 }}>{formatMonth(m.month)}</td>
              <td style={{ textAlign: 'right', color: 'var(--income)' }}><Amount paisa={m.in_hand_income_paisa} /></td>
              <td style={{ textAlign: 'right', color: 'var(--spending)' }}><Amount paisa={m.total_spending_paisa} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Bar chart */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginTop: 12, height: 80 }} aria-hidden="true">
        {trend.map((m) => (
          <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', height: 72 }}>
              <div style={{ flex: 1, background: 'var(--income)', borderRadius: '2px 2px 0 0', height: `${(m.in_hand_income_paisa / max) * 72}px` }} />
              <div style={{ flex: 1, background: 'var(--spending)', borderRadius: '2px 2px 0 0', height: `${(m.total_spending_paisa / max) * 72}px` }} />
            </div>
            <span style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', fontSize: 9 }}>{formatMonth(m.month).slice(0, 3)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SpendingDonut({ categories, totalPaisa }: { categories: DashboardData['spending_by_category']; totalPaisa: number }) {
  if (!categories.length) return <span style={{ color: 'var(--fg-muted)', font: 'var(--t-caption)' }}>No spending data</span>;

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--t-caption)' }} aria-label="Spending by category">
        <caption style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', textAlign: 'left', paddingBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Spending by Category</caption>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Category</th>
            <th style={{ textAlign: 'right' }}>Amount</th>
            <th style={{ textAlign: 'right' }}>%</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c.category_id}>
              <td style={{ paddingRight: 8 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: c.color, marginRight: 6 }} />
                {c.category_name}
              </td>
              <td style={{ textAlign: 'right' }}><Amount paisa={c.amount_paisa} /></td>
              <td style={{ textAlign: 'right', color: 'var(--fg-muted)' }}>
                {totalPaisa > 0 ? Math.round((c.amount_paisa / totalPaisa) * 100) : 0}%
              </td>
            </tr>
          ))}
          <tr>
            <td style={{ paddingTop: 4, fontWeight: 600 }}>Total</td>
            <td style={{ textAlign: 'right', paddingTop: 4, fontWeight: 600 }}><Amount paisa={totalPaisa} /></td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>('this-month');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async (p: Period) => {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = periodDates(p);
      const { data: d } = await api.get<DashboardData>(`/dashboard/summary?from=${from}&to=${to}`);
      setData(d);
    } catch {
      setError('Failed to load dashboard. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard(period);
  }, [period, fetchDashboard]);

  const hasData = data && (
    data.tiles.in_hand_income_paisa > 0 ||
    data.tiles.total_spending_paisa > 0 ||
    data.recent_transactions.length > 0
  );

  // Alerts for overdue / due-soon
  const alertInstances = data?.fixed_expense_panel.filter((i) => i.is_overdue || i.is_due_soon) ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Alert banners */}
      {alertInstances.map((inst) => (
        <AlertBanner key={inst.id} variant={inst.is_overdue ? 'danger' : 'warn'}>
          {inst.is_overdue ? 'Overdue:' : 'Due soon:'} {inst.name} — <Amount paisa={inst.standard_amount_paisa} />
          {' '}
          <Link href="/fixed-expenses" style={{ color: 'inherit', fontWeight: 600, marginLeft: 8 }}>Mark Paid →</Link>
        </AlertBanner>
      ))}

      {/* Period selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {([
          ['this-month', 'This Month'],
          ['last-month', 'Last Month'],
          ['this-fy', 'This Tax Year'],
          ['last-30', 'Last 30 Days'],
        ] as [Period, string][]).map(([p, label]) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: period === p ? 'var(--accent)' : 'var(--bg-surface)',
              color: period === p ? 'var(--accent-fg)' : 'var(--fg-primary)',
              font: 'var(--t-label)',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Summary tiles or first-run checklist */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {[0, 1, 2, 3].map((i) => <SkeletonTile key={i} />)}
        </div>
      ) : error ? (
        <div style={{ color: 'var(--danger)', font: 'var(--t-body)' }}>{error}</div>
      ) : !hasData ? (
        <FirstRunChecklist />
      ) : data ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          <SummaryTile
            label="In-Hand Income"
            paisa={data.tiles.in_hand_income_paisa}
            delta={data.tiles.in_hand_income_change_paisa != null ? { paisa: data.tiles.in_hand_income_change_paisa, label: 'vs prev' } : undefined}
          />
          <SummaryTile
            label="Total Spending"
            paisa={data.tiles.total_spending_paisa}
            delta={data.tiles.total_spending_change_paisa != null ? { paisa: data.tiles.total_spending_change_paisa, label: 'vs prev' } : undefined}
          />
          <SummaryTile
            label="Net Savings"
            paisa={data.tiles.net_savings_paisa}
            delta={data.tiles.net_savings_change_paisa != null ? { paisa: data.tiles.net_savings_change_paisa, label: 'vs prev' } : undefined}
          />
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 20px 16px' }}>
            <span style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Savings Rate</span>
            <div style={{ font: 'var(--t-data)', marginTop: 8 }}>
              {data.tiles.savings_rate_bps != null ? `${(data.tiles.savings_rate_bps / 100).toFixed(1)}%` : '—'}
            </div>
            {data.tiles.savings_rate_change_bps != null && (
              <div style={{ font: 'var(--t-caption)', color: data.tiles.savings_rate_change_bps >= 0 ? 'var(--ok)' : 'var(--danger)', marginTop: 4 }}>
                {data.tiles.savings_rate_change_bps >= 0 ? '↑' : '↓'} {Math.abs(data.tiles.savings_rate_change_bps / 100).toFixed(1)}pp vs prev
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Main grid: charts + panels */}
      {data && hasData && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          {/* Cash flow chart */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
            <SixMonthChart trend={data.six_month_trend} />
          </div>

          {/* Tax snapshot */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
            <span style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Tax This Year</span>
            {data.tax_snapshot.is_provisional && (
              <div style={{ font: 'var(--t-caption)', color: 'var(--warn)', marginTop: 4 }}>
                Settings provisional —{' '}
                <Link href="/settings/tax-years" style={{ color: 'var(--warn)' }}>Update →</Link>
              </div>
            )}
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <span style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>Paid so far</span>
                <div style={{ font: 'var(--t-body)', fontWeight: 600 }}><Amount paisa={data.tax_snapshot.tax_paid_paisa} /></div>
              </div>
              <div>
                <span style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>Est. remaining</span>
                <div style={{ font: 'var(--t-body)', color: data.tax_snapshot.remaining_tax_paisa < 0 ? 'var(--ok)' : 'var(--fg-primary)' }}>
                  <Amount paisa={data.tax_snapshot.remaining_tax_paisa} />
                </div>
              </div>
              {data.tax_snapshot.suggested_monthly_tds_paisa != null && (
                <div>
                  <span style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>Suggested TDS/mo</span>
                  <div style={{ font: 'var(--t-body)' }}><Amount paisa={data.tax_snapshot.suggested_monthly_tds_paisa} /></div>
                </div>
              )}
            </div>
            <Link href="/tax" style={{ display: 'block', marginTop: 12, font: 'var(--t-caption)', color: 'var(--accent)' }}>Go to Tax Dashboard →</Link>
          </div>
        </div>
      )}

      {/* Fixed expenses + loan summary */}
      {data && hasData && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Fixed expense panel */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
            <span style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Upcoming This Month</span>
            {data.fixed_expense_panel.length === 0 ? (
              <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', marginTop: 12 }}>No fixed expenses set up.</div>
            ) : (
              <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse', font: 'var(--t-body)' }}>
                <tbody>
                  {data.fixed_expense_panel.slice(0, 7).map((inst) => (
                    <tr key={inst.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px 0', color: inst.is_overdue ? 'var(--danger)' : inst.is_due_soon ? 'var(--warn)' : 'var(--fg-muted)' }}>
                        {statusIcon(inst.status, inst.is_overdue, inst.is_due_soon)}
                      </td>
                      <td style={{ padding: '6px 8px' }}>{inst.name}</td>
                      <td style={{ textAlign: 'right' }}><Amount paisa={inst.actual_amount_paisa ?? inst.standard_amount_paisa} /></td>
                      <td style={{ textAlign: 'right', color: 'var(--fg-muted)', font: 'var(--t-caption)', paddingLeft: 8 }}>
                        Day {inst.due_date.slice(8)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <Link href="/fixed-expenses" style={{ display: 'block', marginTop: 12, font: 'var(--t-caption)', color: 'var(--accent)' }}>View all →</Link>
          </div>

          {/* Loan summary */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
            <span style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Loans</span>
            {data && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <span style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>People owe you</span>
                  <div style={{ font: 'var(--t-body)', color: 'var(--ok)', fontWeight: 600 }}><Amount paisa={data.loan_summary.owed_to_me_paisa} /></div>
                </div>
                <div>
                  <span style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>You owe</span>
                  <div style={{ font: 'var(--t-body)', color: data.loan_summary.i_owe_paisa > 0 ? 'var(--danger)' : 'var(--fg-primary)', fontWeight: 600 }}>
                    <Amount paisa={data.loan_summary.i_owe_paisa} />
                  </div>
                </div>
              </div>
            )}
            <Link href="/loans" style={{ display: 'block', marginTop: 12, font: 'var(--t-caption)', color: 'var(--accent)' }}>Go to Loans →</Link>
          </div>
        </div>
      )}

      {/* Spending by category + recent transactions */}
      {data && hasData && (
        <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 20 }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
            <SpendingDonut categories={data.spending_by_category} totalPaisa={data.tiles.total_spending_paisa} />
          </div>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
            <span style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Recent Transactions</span>
            {data.recent_transactions.length === 0 ? (
              <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', marginTop: 12 }}>No transactions yet.</div>
            ) : (
              <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse', font: 'var(--t-body)' }}>
                <thead>
                  <tr style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>
                    <th style={{ textAlign: 'left', paddingBottom: 4 }}>Date</th>
                    <th style={{ textAlign: 'left' }}>Description</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_transactions.map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '5px 8px 5px 0', color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
                        {tx.date.slice(5).replace('-', ' ')}
                      </td>
                      <td style={{ padding: '5px 8px' }}>{tx.description}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}><Amount paisa={-tx.amount_paisa} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <Link href="/transactions" style={{ display: 'block', marginTop: 12, font: 'var(--t-caption)', color: 'var(--accent)' }}>View all →</Link>
          </div>
        </div>
      )}

      {/* Cash This Month panel */}
      {data && hasData && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
          <span style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Cash This Month</span>
          {data.current_month.income_is_estimated && (
            <span style={{
              display: 'inline-block', marginLeft: 8, padding: '1px 8px', borderRadius: 4,
              background: 'var(--neutral-bg)', color: 'var(--neutral)', font: 'var(--t-caption)',
            }}>
              estimated
            </span>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 16 }}>
            <div>
              <span style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>Discretionary Cash</span>
              <div style={{ font: 'var(--t-data)', marginTop: 4 }}>
                <Amount paisa={data.current_month.discretionary_cash_paisa} />
              </div>
              <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', marginTop: 2 }}>
                ৳{(data.current_month.fixed_commitments_paisa / 100).toFixed(2)} fixed
              </div>
            </div>
            <div>
              <span style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>Remaining to Spend</span>
              <div style={{
                font: 'var(--t-data)', marginTop: 4,
                color: data.current_month.remaining_to_spend_paisa < 0 ? 'var(--danger)' : 'var(--fg-primary)',
              }}>
                <Amount paisa={data.current_month.remaining_to_spend_paisa} />
              </div>
            </div>
          </div>
          {data.current_month.fixed_commitments_paisa > 0 && (
            <div style={{ marginTop: 12 }}>
              <ProgressBar
                value={data.current_month.fixed_commitments_paisa}
                max={data.current_month.fixed_commitments_paisa + Math.max(data.current_month.remaining_to_spend_paisa, 0)}
                aria-label="Committed vs remaining"
              />
              <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', marginTop: 4 }}>
                {data.current_month.fixed_commitments_paisa > 0
                  ? `${Math.round((data.current_month.fixed_commitments_paisa / (data.current_month.fixed_commitments_paisa + Math.max(data.current_month.remaining_to_spend_paisa, 0))) * 100)}% committed`
                  : ''}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/transactions?action=add" style={{
          padding: '10px 20px', background: 'var(--accent)', color: 'var(--accent-fg)',
          borderRadius: 8, font: 'var(--t-label)', textDecoration: 'none',
        }}>+ Add Spending</Link>
        <Link href="/income?action=add" style={{
          padding: '10px 20px', background: 'var(--bg-surface)', color: 'var(--accent)',
          border: '1px solid var(--accent)', borderRadius: 8, font: 'var(--t-label)', textDecoration: 'none',
        }}>+ Add Income</Link>
        <Link href="/fixed-expenses?action=mark-paid" style={{
          padding: '10px 20px', background: 'var(--bg-surface)', color: 'var(--fg-primary)',
          border: '1px solid var(--border)', borderRadius: 8, font: 'var(--t-label)', textDecoration: 'none',
        }}>✓ Mark Fixed Paid</Link>
      </div>
    </div>
  );
}
