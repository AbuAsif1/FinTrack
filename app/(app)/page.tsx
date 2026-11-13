'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { SummaryTile } from '@/components/ui/SummaryTile';
import { Amount } from '@/components/ui/Amount';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { PageHeader } from '@/components/ui/PageHeader';

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
  const month = now.getMonth();

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
    const fyStart = month >= 6 ? year : year - 1;
    return { from: `${fyStart}-07-01`, to: `${fyStart + 1}-06-30` };
  }
  const to = now.toISOString().slice(0, 10);
  const f = new Date(now.getTime() - 30 * 86400000);
  return { from: f.toISOString().slice(0, 10), to };
}

function statusIcon(status: string, isOverdue: boolean, isDueSoon: boolean) {
  if (status === 'PAID') return '✓';
  if (status === 'SKIPPED') return '—';
  if (isOverdue) return '✕';
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
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: 20,
      height: 100,
      animation: 'pulse 1.4s ease infinite',
    }} />
  );
}

function FirstRunChecklist() {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 24 }}>
      <h2 style={{ margin: '0 0 8px', font: '600 18px var(--font-space-grotesk, system-ui)', color: 'var(--fg-primary)' }}>
        Welcome to FinTrack
      </h2>
      <p style={{ margin: '0 0 20px', font: 'var(--t-body)', color: 'var(--fg-secondary)' }}>
        Complete these steps to get started:
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { label: 'Add this month\'s income', href: '/income' },
          { label: 'Add savings accounts', href: '/savings' },
          { label: 'Set up Fixed Expenses', href: '/fixed-expenses' },
          { label: 'Import history', href: '/settings/import' },
        ].map((item) => (
          <li key={item.href}>
            <Link href={item.href} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: 'var(--accent)',
              font: 'var(--t-body)',
              textDecoration: 'none',
              padding: '4px 0',
            }}>
              <span style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                border: '2px solid var(--accent)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                flexShrink: 0,
              }}>
                +
              </span>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <span style={{
          font: 'var(--t-label)',
          color: 'var(--fg-secondary)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          Cash flow
        </span>
        <div style={{ display: 'flex', gap: 12, marginLeft: 'auto' }}>
          <span style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--income)', display: 'inline-block' }} />
            Income
          </span>
          <span style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--spending)', display: 'inline-block' }} />
            Spending
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }} aria-hidden="true">
        {trend.map((m) => (
          <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: '100%', display: 'flex', gap: 3, alignItems: 'flex-end', height: 84 }}>
              <div style={{
                flex: 1,
                background: 'var(--income)',
                borderRadius: '3px 3px 0 0',
                height: `${(m.in_hand_income_paisa / max) * 84}px`,
                minHeight: m.in_hand_income_paisa > 0 ? 3 : 0,
                opacity: 0.9,
              }} />
              <div style={{
                flex: 1,
                background: 'var(--spending)',
                borderRadius: '3px 3px 0 0',
                height: `${(m.total_spending_paisa / max) * 84}px`,
                minHeight: m.total_spending_paisa > 0 ? 3 : 0,
                opacity: 0.9,
              }} />
            </div>
            <span style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', fontSize: 10, textAlign: 'center' }}>
              {formatMonth(m.month).slice(0, 3)}
            </span>
          </div>
        ))}
      </div>
      {/* Data table for screen readers */}
      <table style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
        <caption>Income vs spending trend, last 6 months</caption>
        <thead><tr><th>Month</th><th>Income</th><th>Spending</th></tr></thead>
        <tbody>
          {trend.map((m) => (
            <tr key={m.month}>
              <td>{formatMonth(m.month)}</td>
              <td>{m.in_hand_income_paisa}</td>
              <td>{m.total_spending_paisa}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SpendingByCategory({ categories, totalPaisa }: { categories: DashboardData['spending_by_category']; totalPaisa: number }) {
  if (!categories.length) return (
    <span style={{ color: 'var(--fg-muted)', font: 'var(--t-caption)' }}>No spending data</span>
  );

  return (
    <div>
      <span style={{
        font: 'var(--t-label)',
        color: 'var(--fg-secondary)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        display: 'block',
        marginBottom: 14,
      }}>
        Spending by category
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {categories.map((c) => {
          const pct = totalPaisa > 0 ? Math.round((c.amount_paisa / totalPaisa) * 100) : 0;
          return (
            <div key={c.category_id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, font: 'var(--t-body)' }}>
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: c.color,
                    flexShrink: 0,
                  }} />
                  {c.category_name}
                </span>
                <span style={{ font: 'var(--t-data-sm)', fontVariantNumeric: 'tabular-nums' }}>
                  <Amount paisa={c.amount_paisa} />
                </span>
              </div>
              <div style={{
                height: 4,
                background: 'var(--bg-sunken)',
                borderRadius: 2,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: c.color,
                  borderRadius: 2,
                  transition: 'width 400ms cubic-bezier(0.4,0,0.2,1)',
                }} />
              </div>
            </div>
          );
        })}
      </div>
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

  const alertInstances = data?.fixed_expense_panel.filter((i) => i.is_overdue || i.is_due_soon) ?? [];

  const periodLabels: Record<Period, string> = {
    'this-month': 'This month',
    'last-month': 'Last month',
    'this-fy': 'This tax year',
    'last-30': 'Last 30 days',
    'custom': 'Custom',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page header */}
      <PageHeader
        eyebrow="Your finances, clearly"
        title="Dashboard"
        description="A calm overview built only from your saved records."
      />

      {/* Alert banners */}
      {alertInstances.map((inst) => (
        <AlertBanner key={inst.id} variant={inst.is_overdue ? 'danger' : 'warn'}>
          {inst.is_overdue ? 'Overdue:' : 'Due soon:'} {inst.name} — <Amount paisa={inst.standard_amount_paisa} />
          {' '}
          <Link href="/fixed-expenses" style={{ color: 'inherit', fontWeight: 600, marginLeft: 8 }}>
            Mark Paid →
          </Link>
        </AlertBanner>
      ))}

      {/* Period selector */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {(['this-month', 'last-month', 'this-fy', 'last-30'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: '5px 14px',
              borderRadius: 20,
              border: '1px solid var(--border)',
              background: period === p ? 'var(--accent)' : 'var(--bg-surface)',
              color: period === p ? 'var(--accent-fg)' : 'var(--fg-secondary)',
              font: 'var(--t-label)',
              fontSize: 12,
              cursor: 'pointer',
              transition: 'background 150ms, color 150ms',
            }}
          >
            {period === p ? '✓ ' : ''}{periodLabels[p]}
          </button>
        ))}
      </div>

      {/* Summary tiles */}
      {loading ? (
        <div className="r-tiles">
          {[0, 1, 2, 3].map((i) => <SkeletonTile key={i} />)}
        </div>
      ) : error ? (
        <div style={{ color: 'var(--danger)', font: 'var(--t-body)' }}>{error}</div>
      ) : !hasData ? (
        <FirstRunChecklist />
      ) : data ? (
        <div className="r-tiles">
          <SummaryTile
            label="In-Hand Income"
            paisa={data.tiles.in_hand_income_paisa}
            variant="featured"
            icon="↑"
            subtitle="Saved income this period"
            delta={data.tiles.in_hand_income_change_paisa != null ? { paisa: data.tiles.in_hand_income_change_paisa, label: 'vs prev' } : undefined}
          />
          <SummaryTile
            label="Total Spending"
            paisa={data.tiles.total_spending_paisa}
            variant="spending"
            icon="↗"
            subtitle="Saved expenses this period"
            delta={data.tiles.total_spending_change_paisa != null ? { paisa: data.tiles.total_spending_change_paisa, label: 'vs prev' } : undefined}
          />
          <SummaryTile
            label="Net Savings"
            paisa={data.tiles.net_savings_paisa}
            variant="savings"
            icon="↗"
            subtitle="Income minus spending"
            delta={data.tiles.net_savings_change_paisa != null ? { paisa: data.tiles.net_savings_change_paisa, label: 'vs prev' } : undefined}
          />
          <SummaryTile
            label="Savings Rate"
            paisa={0}
            valueOverride={data.tiles.savings_rate_bps != null ? `${(data.tiles.savings_rate_bps / 100).toFixed(1)}%` : '—'}
            variant="income"
            icon="↗"
            subtitle="(Income − spending) ÷ income"
            delta={data.tiles.savings_rate_change_bps != null ? {
              paisa: data.tiles.savings_rate_change_bps,
              label: `pp vs prev`,
            } : undefined}
          />
        </div>
      ) : null}

      {/* Main grid: cash flow + tax */}
      {data && hasData && (
        <div className="r-main">
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
            <SixMonthChart trend={data.six_month_trend} />
          </div>

          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, borderTopWidth: 3, borderTopColor: 'var(--tax)', borderTopStyle: 'solid' }}>
            <span style={{
              font: 'var(--t-label)',
              color: 'var(--fg-secondary)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: 12,
            }}>
              Tax this year
            </span>
            {data.tax_snapshot.is_provisional && (
              <div style={{ font: 'var(--t-caption)', color: 'var(--warn)', marginBottom: 12 }}>
                Settings provisional —{' '}
                <Link href="/settings/tax-years" style={{ color: 'var(--warn)' }}>Update →</Link>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <span style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>Paid so far</span>
                <div style={{ font: 'var(--t-data-sm)', fontWeight: 600, marginTop: 2 }}>
                  <Amount paisa={data.tax_snapshot.tax_paid_paisa} />
                </div>
              </div>
              <div>
                <span style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>Est. remaining</span>
                <div style={{
                  font: 'var(--t-data-sm)',
                  fontWeight: 600,
                  marginTop: 2,
                  color: data.tax_snapshot.remaining_tax_paisa < 0 ? 'var(--ok)' : 'var(--fg-primary)',
                }}>
                  <Amount paisa={data.tax_snapshot.remaining_tax_paisa} />
                </div>
              </div>
              {data.tax_snapshot.suggested_monthly_tds_paisa != null && (
                <div>
                  <span style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>Suggested TDS/mo</span>
                  <div style={{ font: 'var(--t-data-sm)', marginTop: 2 }}>
                    <Amount paisa={data.tax_snapshot.suggested_monthly_tds_paisa} />
                  </div>
                </div>
              )}
            </div>
            <Link href="/tax" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 14,
              font: 'var(--t-caption)',
              color: 'var(--accent)',
              textDecoration: 'none',
              fontWeight: 500,
            }}>
              Go to Tax Dashboard →
            </Link>
          </div>
        </div>
      )}

      {/* Fixed expenses + loan summary */}
      {data && hasData && (
        <div className="r-halves">
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Upcoming this month
              </span>
              <Link href="/fixed-expenses" style={{ font: 'var(--t-caption)', color: 'var(--accent)', textDecoration: 'none' }}>
                View all →
              </Link>
            </div>
            {data.fixed_expense_panel.length === 0 ? (
              <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>No fixed expenses set up.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {data.fixed_expense_panel.slice(0, 7).map((inst) => {
                  const icon = statusIcon(inst.status, inst.is_overdue, inst.is_due_soon);
                  const iconColor = inst.is_overdue ? 'var(--danger)' : inst.is_due_soon ? 'var(--warn)' : inst.status === 'PAID' ? 'var(--ok)' : 'var(--fg-muted)';
                  return (
                    <div key={inst.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '7px 0',
                      borderBottom: '1px solid var(--border)',
                    }}>
                      <span style={{ color: iconColor, width: 14, flexShrink: 0, fontWeight: 600 }}>{icon}</span>
                      <span style={{ flex: 1, font: 'var(--t-body)' }}>{inst.name}</span>
                      <span style={{ font: 'var(--t-data-sm)', fontVariantNumeric: 'tabular-nums' }}>
                        <Amount paisa={inst.actual_amount_paisa ?? inst.standard_amount_paisa} />
                      </span>
                      <span style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', width: 40, textAlign: 'right' }}>
                        Day {inst.due_date.slice(8)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Loans
              </span>
              <Link href="/loans" style={{ font: 'var(--t-caption)', color: 'var(--accent)', textDecoration: 'none' }}>
                View all →
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <span style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>People owe you</span>
                <div style={{ font: 'var(--t-data)', color: 'var(--ok)', marginTop: 4 }}>
                  <Amount paisa={data.loan_summary.owed_to_me_paisa} />
                </div>
              </div>
              <div>
                <span style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>You owe</span>
                <div style={{
                  font: 'var(--t-data)',
                  marginTop: 4,
                  color: data.loan_summary.i_owe_paisa > 0 ? 'var(--danger)' : 'var(--fg-primary)',
                }}>
                  <Amount paisa={data.loan_summary.i_owe_paisa} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spending by category + recent transactions */}
      {data && hasData && (
        <div className="r-content">
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
            <SpendingByCategory categories={data.spending_by_category} totalPaisa={data.tiles.total_spending_paisa} />
          </div>

          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Recent activity
              </span>
              <Link href="/transactions" style={{ font: 'var(--t-caption)', color: 'var(--accent)', textDecoration: 'none' }}>
                View all →
              </Link>
            </div>
            {data.recent_transactions.length === 0 ? (
              <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>No transactions yet.</div>
            ) : (
              <div>
                {data.recent_transactions.map((tx, i) => (
                  <div key={tx.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 0',
                    borderBottom: i < data.recent_transactions.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: 'var(--bg-raised)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      font: '600 14px var(--font-space-grotesk, system-ui)',
                      color: 'var(--fg-secondary)',
                    }}>
                      {tx.description.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ font: 'var(--t-body)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tx.description}
                      </div>
                      <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', marginTop: 1 }}>
                        {tx.date.slice(5).replace('-', ' ')}
                        {tx.category_name && ` · ${tx.category_name}`}
                      </div>
                    </div>
                    <span style={{
                      font: 'var(--t-data-sm)',
                      fontVariantNumeric: 'tabular-nums',
                      flexShrink: 0,
                      color: tx.amount_paisa > 0 ? 'var(--ok)' : 'var(--danger)',
                    }}>
                      {tx.amount_paisa > 0 ? '+' : '−'}<Amount paisa={Math.abs(tx.amount_paisa)} />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cash this month */}
      {data && hasData && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Cash this month
            </span>
            {data.current_month.income_is_estimated && (
              <span style={{
                padding: '2px 8px',
                borderRadius: 999,
                background: 'var(--neutral-bg)',
                color: 'var(--neutral)',
                font: 'var(--t-caption)',
                fontSize: 11,
              }}>
                estimated
              </span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 16 }}>
            <div>
              <span style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>Discretionary cash</span>
              <div style={{ font: 'var(--t-data)', marginTop: 4 }}>
                <Amount paisa={data.current_month.discretionary_cash_paisa} />
              </div>
              <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', marginTop: 2 }}>
                after <Amount paisa={data.current_month.fixed_commitments_paisa} /> fixed
              </div>
            </div>
            <div>
              <span style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>Remaining to spend</span>
              <div style={{
                font: 'var(--t-data)',
                marginTop: 4,
                color: data.current_month.remaining_to_spend_paisa < 0 ? 'var(--danger)' : 'var(--fg-primary)',
              }}>
                <Amount paisa={data.current_month.remaining_to_spend_paisa} />
              </div>
            </div>
          </div>
          {data.current_month.fixed_commitments_paisa > 0 && (
            <>
              <ProgressBar
                value={data.current_month.fixed_commitments_paisa}
                max={data.current_month.fixed_commitments_paisa + Math.max(data.current_month.remaining_to_spend_paisa, 0)}
                aria-label="Committed vs remaining"
              />
              <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', marginTop: 6 }}>
                {Math.round((data.current_month.fixed_commitments_paisa / (data.current_month.fixed_commitments_paisa + Math.max(data.current_month.remaining_to_spend_paisa, 0))) * 100)}% committed
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
}
