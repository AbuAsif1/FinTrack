'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api, { getAccessToken } from '@/lib/api';
import { DatePicker } from '@/components/ui/DatePicker';

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
      a.download = (cd || path.split('/').pop()) ?? 'export';
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

// ── Restore Section ───────────────────────────────────────────────────────

interface RestoreSummaryRow {
  created: number;
  restored?: number;
  skipped: number;
}

interface RestoreResult {
  ok: boolean;
  total_in_file: number;
  restored: number;
  summary: Record<string, RestoreSummaryRow>;
  errors: string[];
}

function RestoreSection() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ totalInFile: number; schemaVersion: string } | null>(null);
  const [filePayload, setFilePayload] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [result, setResult] = useState<RestoreResult | null>(null);
  const [error, setError] = useState('');

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError('');
    setResult(null);
    setPreview(null);
    try {
      const text = await f.text();
      const json = JSON.parse(text);
      if (!json.schema_version) throw new Error('Not a FinTrack export file (missing schema_version).');
      const count =
        (json.transactions?.length ?? 0) +
        (json.income_entries?.length ?? 0) +
        (json.loan_entries?.length ?? 0) +
        (json.categories?.length ?? 0) +
        (json.savings_accounts?.length ?? 0) +
        (json.loan_persons?.length ?? 0) +
        (json.tax_years?.length ?? 0) +
        (json.tax_investments?.length ?? 0) +
        (json.holiday_support_entries?.length ?? 0);
      setPreview({ totalInFile: count, schemaVersion: json.schema_version });
      setFilePayload(text);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function doRestore() {
    if (!filePayload) return;
    setRestoring(true);
    setError('');
    setResult(null);
    try {
      const { data } = await api.post<RestoreResult>('/data/restore', JSON.parse(filePayload));
      setResult(data);
      router.refresh();
    } catch {
      setError('Restore failed — please try again.');
    } finally {
      setRestoring(false);
    }
  }

  return (
    <ExportCard title="Restore from Backup" desc="Upload a full JSON export to merge records into your current account. Existing records are not deleted; duplicates are skipped.">
      <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleFile} style={{ display: 'none' }} />
      {!preview ? (
        <button
          onClick={() => fileRef.current?.click()}
          style={{ padding: '8px 20px', borderRadius: 6, background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', cursor: 'pointer', font: 'var(--t-label)' }}
        >
          Choose backup file
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, font: 'var(--t-body)', color: 'var(--fg-secondary)' }}>
            File contains <strong>{preview.totalInFile}</strong> records (schema v{preview.schemaVersion}).
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={doRestore}
              disabled={restoring}
              style={{ padding: '8px 20px', borderRadius: 6, background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', cursor: 'pointer', font: 'var(--t-label)' }}
            >
              {restoring ? 'Restoring…' : 'Restore'}
            </button>
            <button
              onClick={() => { setPreview(null); setFilePayload(null); if (fileRef.current) fileRef.current.value = ''; }}
              style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-primary)', font: 'var(--t-label)', cursor: 'pointer' }}
            >
              Choose different file
            </button>
          </div>
        </div>
      )}
      {error && <p style={{ color: 'var(--danger)', font: 'var(--t-caption)', marginTop: 10 }}>{error}</p>}
      {result && (
        <div style={{ marginTop: 14, padding: '12px 16px', background: 'var(--bg-sunken)', borderRadius: 8 }}>
          <p style={{ margin: '0 0 8px', font: 'var(--t-label)', color: 'var(--savings)' }}>
            Restored {result.restored} records ({result.total_in_file - result.restored} duplicates skipped)
          </p>
          <table style={{ width: '100%', font: 'var(--t-caption)', color: 'var(--fg-secondary)', borderCollapse: 'collapse' }}>
            <tbody>
              {Object.entries(result.summary).map(([k, v]) => (
                (v.created + (v.restored ?? 0) + v.skipped) > 0 && (
                  <tr key={k}>
                    <td style={{ padding: '2px 0' }}>{k.replace(/_/g, ' ')}</td>
                    <td style={{ textAlign: 'right' }}>+{v.created}{v.restored ? ` (${v.restored} undeleted)` : ''}, {v.skipped} skipped</td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
          {result.errors.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: 'pointer', color: 'var(--danger)', font: 'var(--t-caption)' }}>{result.errors.length} errors</summary>
              <ul style={{ margin: '8px 0 0', paddingLeft: 20, font: 'var(--t-caption)', color: 'var(--danger)' }}>
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}
    </ExportCard>
  );
}

// ── Automatic Backup Section ──────────────────────────────────────────────

interface BackupRun {
  id: string;
  run_at: string;
  record_count: number;
  delivery_method: string;
  status: string;
  error_message: string | null;
}

function AutoBackupSection() {
  const [cadence, setCadence] = useState<'OFF' | 'WEEKLY' | 'MONTHLY'>('OFF');
  const [saving, setSaving] = useState(false);
  const [runs, setRuns] = useState<BackupRun[]>([]);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<{ cadence: 'OFF' | 'WEEKLY' | 'MONTHLY' }>('/data/backup/schedule'),
      api.get<BackupRun[]>('/data/backup/history'),
    ]).then(([prefsRes, histRes]) => {
      setCadence(prefsRes.data.cadence);
      setRuns(histRes.data);
      setLoadingPrefs(false);
    }).catch(() => setLoadingPrefs(false));
  }, []);

  async function saveSchedule(newCadence: 'OFF' | 'WEEKLY' | 'MONTHLY') {
    setCadence(newCadence);
    setSaving(true);
    setSaveMsg('');
    try {
      await api.patch('/data/backup/schedule', { cadence: newCadence, delivery: 'EMAIL' });
      setSaveMsg('Saved.');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch {
      setSaveMsg('Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  if (loadingPrefs) return (
    <ExportCard title="Automatic Backups" desc="Receive a full JSON backup by email on a schedule.">
      <span style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>Loading…</span>
    </ExportCard>
  );

  return (
    <ExportCard title="Automatic Backups" desc="Receive a full JSON backup by email on a schedule. Delivery: email.">
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['OFF', 'WEEKLY', 'MONTHLY'] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => saveSchedule(opt)}
            disabled={saving}
            style={{
              padding: '8px 18px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: cadence === opt ? 'var(--accent)' : 'var(--bg-raised)',
              color: cadence === opt ? 'var(--accent-fg)' : 'var(--fg-primary)',
              font: 'var(--t-label)',
              cursor: 'pointer',
            }}
          >
            {opt === 'OFF' ? 'Off' : opt === 'WEEKLY' ? 'Weekly (Sunday)' : 'Monthly (1st)'}
          </button>
        ))}
        {saveMsg && <span style={{ font: 'var(--t-caption)', color: 'var(--savings)', alignSelf: 'center' }}>{saveMsg}</span>}
      </div>
      {runs.length > 0 && (
        <>
          <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', marginBottom: 6 }}>Backup history</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--t-caption)' }}>
            <thead>
              <tr style={{ color: 'var(--fg-secondary)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '4px 0' }}>Date</th>
                <th style={{ textAlign: 'right', padding: '4px 8px' }}>Records</th>
                <th style={{ textAlign: 'right', padding: '4px 0' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 0' }}>{r.run_at.slice(0, 10)}</td>
                  <td style={{ textAlign: 'right', padding: '6px 8px' }}>{r.record_count}</td>
                  <td style={{ textAlign: 'right', padding: '6px 0', color: r.status === 'COMPLETED' ? 'var(--savings)' : 'var(--danger)' }}>
                    {r.status === 'COMPLETED' ? 'Completed' : 'Failed'}
                    {r.error_message && <span title={r.error_message}> ⚠</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {runs.length === 0 && cadence !== 'OFF' && (
        <p style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', margin: '8px 0 0' }}>
          No backups yet. The first backup will run on the next scheduled day.
        </p>
      )}
    </ExportCard>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

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
      <h1 style={{ font: 'var(--t-page)', margin: 0 }}>Export &amp; Data</h1>
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
            <DatePicker value={from} onChange={setFrom} placeholder="Start date" />
          </div>
          <div>
            <label style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', display: 'block', marginBottom: 4 }}>To</label>
            <DatePicker value={to} onChange={setTo} placeholder="End date" />
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

      <RestoreSection />
      <AutoBackupSection />
    </div>
  );
}
