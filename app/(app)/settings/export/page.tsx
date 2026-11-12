'use client';

import { useState } from 'react';
import { getAccessToken } from '@/lib/api';

function downloadUrl(path: string) {
  const token = getAccessToken();
  return fetch(`/api/v1/${path}`, { headers: { Authorization: `Bearer ${token ?? ''}` } })
    .then((res) => {
      if (!res.ok) throw new Error('Export failed');
      return res.blob();
    })
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cd = '';
      a.download = cd || path.split('/').pop() ?? 'export';
      a.click();
      URL.revokeObjectURL(url);
    });
}

interface ExportCardProps {
  title: string;
  desc: string;
  children: React.ReactNode;
}

function ExportCard({ title, desc, children }: ExportCardProps) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
      <div style={{ font: 'var(--t-label)', fontWeight: 600, marginBottom: 4 }}>{title}</div>
      <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)', marginBottom: 12 }}>{desc}</div>
      {children}
    </div>
  );
}

export default function ExportPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [incFy, setIncFy] = useState('');
  const [summaryFrom, setSummaryFrom] = useState('');
  const [summaryTo, setSummaryTo] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function doExport(key: string, path: string) {
    setLoading(key);
    setError('');
    try {
      await downloadUrl(path);
    } catch {
      setError('Export failed — please try again.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760 }}>
      <h1 style={{ font: 'var(--t-page)', margin: 0 }}>Export Data</h1>
      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(var(--danger-rgb), 0.1)', border: '1px solid var(--danger)', borderRadius: 8, color: 'var(--danger)', font: 'var(--t-body)' }}>
          {error}
        </div>
      )}

      <ExportCard title="Full Backup" desc="All your data in one JSON file — can be used to restore or migrate">
        <button
          onClick={() => doExport('full', 'export/full')}
          disabled={loading === 'full'}
          style={{ padding: '8px 20px', borderRadius: 6, background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', cursor: 'pointer', font: 'var(--t-label)' }}
        >
          {loading === 'full' ? 'Exporting…' : 'Download JSON'}
        </button>
      </ExportCard>

      <ExportCard title="Transactions CSV" desc="Export transactions for a date range (compatible with the import template)">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', display: 'block', marginBottom: 4 }}>From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)' }} />
          </div>
          <div>
            <label style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', display: 'block', marginBottom: 4 }}>To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)' }} />
          </div>
          <button
            onClick={() => doExport('tx', `export/transactions${from || to ? `?from=${from}&to=${to}` : ''}`)}
            disabled={loading === 'tx'}
            style={{ padding: '8px 20px', borderRadius: 6, background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', cursor: 'pointer', font: 'var(--t-label)' }}
          >
            {loading === 'tx' ? 'Exporting…' : 'Download CSV'}
          </button>
        </div>
      </ExportCard>

      <ExportCard title="Income CSV" desc="Export income entries for a fiscal year (compatible with the import template)">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', display: 'block', marginBottom: 4 }}>Fiscal Year</label>
            <input
              placeholder="e.g. 2025-2026"
              value={incFy}
              onChange={(e) => setIncFy(e.target.value)}
              style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)', width: 140 }}
            />
          </div>
          <button
            onClick={() => doExport('income', `export/income${incFy ? `?fiscal_year=${incFy}` : ''}`)}
            disabled={loading === 'income'}
            style={{ padding: '8px 20px', borderRadius: 6, background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', cursor: 'pointer', font: 'var(--t-label)' }}
          >
            {loading === 'income' ? 'Exporting…' : 'Download CSV'}
          </button>
        </div>
      </ExportCard>

      <ExportCard title="Monthly Summary CSV" desc="Per-month income, spending and savings rate for a date range">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', display: 'block', marginBottom: 4 }}>From (YYYY-MM)</label>
            <input value={summaryFrom} onChange={(e) => setSummaryFrom(e.target.value)} placeholder="2026-01" style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)', width: 120 }} />
          </div>
          <div>
            <label style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', display: 'block', marginBottom: 4 }}>To (YYYY-MM)</label>
            <input value={summaryTo} onChange={(e) => setSummaryTo(e.target.value)} placeholder="2026-12" style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)', width: 120 }} />
          </div>
          <button
            onClick={() => doExport('summary', `export/monthly-summary?from=${summaryFrom}&to=${summaryTo}`)}
            disabled={loading === 'summary' || !summaryFrom || !summaryTo}
            style={{ padding: '8px 20px', borderRadius: 6, background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', cursor: 'pointer', font: 'var(--t-label)', opacity: !summaryFrom || !summaryTo ? 0.6 : 1 }}
          >
            {loading === 'summary' ? 'Exporting…' : 'Download CSV'}
          </button>
        </div>
      </ExportCard>
    </div>
  );
}
