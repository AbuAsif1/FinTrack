'use client';

import { useState, useRef } from 'react';
import api from '@/lib/api';

type Dataset = 'INCOME' | 'TRANSACTIONS' | 'LOAN_ENTRIES';

interface RowError { row: number; reason: string }

interface PreviewResult {
  batch_id: string;
  dataset: Dataset;
  filename: string;
  total_rows: number;
  valid_rows: number;
  error_rows: RowError[];
  already_imported: number;
  total_paisa: number;
}

interface BatchItem {
  id: string;
  dataset: Dataset;
  filename: string;
  status: string;
  row_count: number;
  created_at: string;
}

const DATASET_LABELS: Record<Dataset, string> = {
  INCOME: 'Income',
  TRANSACTIONS: 'Transactions',
  LOAN_ENTRIES: 'Loan Entries',
};

const DATASET_DESCS: Record<Dataset, string> = {
  INCOME: 'Monthly salary, dividends and other income',
  TRANSACTIONS: 'Spending, savings deposits and loan entries',
  LOAN_ENTRIES: 'Borrow/lend history with running balances',
};

function formatBDT(paisa: number) {
  return '৳' + (paisa / 100).toLocaleString('en-BD', { minimumFractionDigits: 0 });
}

export default function ImportPage() {
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [committed, setCommitted] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<BatchItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function downloadTemplate(dataset: Dataset) {
    const res = await fetch(`/api/v1/imports/templates/${dataset}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataset.toLowerCase()}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFileSelect(dataset: Dataset) {
    setSelectedDataset(dataset);
    setPreview(null);
    setCommitted(false);
    setError('');
    setTimeout(() => fileRef.current?.click(), 50);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedDataset) return;
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('dataset', selectedDataset);
      form.append('file', file);
      const { data } = await api.post<PreviewResult>('/imports/preview', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPreview(data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Upload failed';
      setError(msg);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleCommit() {
    if (!preview) return;
    setCommitting(true);
    setError('');
    try {
      await api.post(`/imports/${preview.batch_id}/commit`);
      setCommitted(true);
      setPreview(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Import failed';
      setError(msg);
    } finally {
      setCommitting(false);
    }
  }

  async function loadHistory() {
    const { data } = await api.get<BatchItem[]>('/imports');
    setHistory(data);
    setShowHistory(true);
  }

  async function handleUndo(batchId: string) {
    await api.post(`/imports/${batchId}/undo`);
    setHistory((prev) => prev.map((b) => b.id === batchId ? { ...b, status: 'UNDONE' } : b));
  }

  const hasErrors = (preview?.error_rows.length ?? 0) > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760 }}>
      <h1 style={{ font: 'var(--t-page)', margin: 0 }}>Import Data</h1>
      <p style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)', margin: 0 }}>
        Upload a CSV file to import your historical data. Download a template first to see the required format.
      </p>

      <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileChange} />

      {/* Dataset cards */}
      {!preview && !committed && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {(['INCOME', 'TRANSACTIONS', 'LOAN_ENTRIES'] as Dataset[]).map((dataset) => (
            <div key={dataset} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ font: 'var(--t-label)', fontWeight: 600 }}>{DATASET_LABELS[dataset]}</div>
              <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>{DATASET_DESCS[dataset]}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                <button
                  onClick={() => downloadTemplate(dataset)}
                  style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--fg-primary)', font: 'var(--t-caption)', cursor: 'pointer' }}
                >
                  Template
                </button>
                <button
                  onClick={() => handleFileSelect(dataset)}
                  disabled={uploading}
                  style={{ flex: 1, padding: '7px 10px', borderRadius: 6, background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', font: 'var(--t-caption)', cursor: 'pointer' }}
                >
                  {uploading && selectedDataset === dataset ? 'Reading…' : 'Upload'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(var(--danger-rgb), 0.1)', border: '1px solid var(--danger)', borderRadius: 8, color: 'var(--danger)', font: 'var(--t-body)' }}>
          {error}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ font: 'var(--t-label)', fontWeight: 600 }}>{preview.filename}</div>
                <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)', marginTop: 4 }}>
                  {preview.total_rows} rows · {preview.valid_rows} valid · {preview.error_rows.length} errors · {preview.already_imported} already imported
                </div>
              </div>
              <span style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>
                Total: {formatBDT(preview.total_paisa)}
              </span>
            </div>

            {/* Error rows first */}
            {preview.error_rows.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ font: 'var(--t-label)', color: 'var(--danger)', marginBottom: 8 }}>
                  {preview.error_rows.length} row(s) with errors — fix and re-upload
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--t-caption)' }}>
                  <thead>
                    <tr style={{ color: 'var(--fg-secondary)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '4px 0' }}>Row</th>
                      <th style={{ textAlign: 'left', padding: '4px 8px' }}>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.error_rows.map((e, i) => (
                      <tr key={i} style={{ color: 'var(--danger)', borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '4px 0' }}>{e.row}</td>
                        <td style={{ padding: '4px 8px' }}>{e.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleCommit}
                disabled={hasErrors || committing}
                style={{
                  padding: '10px 24px', borderRadius: 6,
                  background: hasErrors ? 'var(--bg-raised)' : 'var(--accent)',
                  color: hasErrors ? 'var(--fg-muted)' : 'var(--accent-fg)',
                  border: 'none', font: 'var(--t-label)', cursor: hasErrors ? 'not-allowed' : 'pointer',
                }}
              >
                {committing ? 'Importing…' : `Import ${preview.valid_rows} rows`}
              </button>
              <button
                onClick={() => { setPreview(null); setSelectedDataset(null); }}
                style={{ padding: '10px 20px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--fg-primary)', font: 'var(--t-label)', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {committed && (
        <div style={{ padding: '16px 20px', background: 'rgba(var(--savings-rgb), 0.1)', border: '1px solid var(--savings)', borderRadius: 8 }}>
          <div style={{ font: 'var(--t-label)', fontWeight: 600 }}>Import successful!</div>
          <button onClick={() => { setCommitted(false); setSelectedDataset(null); }} style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', font: 'var(--t-caption)' }}>
            Import another file
          </button>
        </div>
      )}

      {/* History */}
      <div>
        {!showHistory ? (
          <button onClick={loadHistory} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', font: 'var(--t-label)' }}>
            View import history
          </button>
        ) : (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
            <h2 style={{ font: 'var(--t-section)', margin: '0 0 12px' }}>Import History</h2>
            {history.length === 0 ? (
              <p style={{ font: 'var(--t-body)', color: 'var(--fg-muted)' }}>No imports yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--t-body)' }}>
                <thead>
                  <tr style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '6px 0' }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>File</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Rows</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {history.map((b) => (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 0', font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>
                        {new Date(b.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '8px 8px' }}>{b.filename}</td>
                      <td style={{ padding: '8px 8px', textAlign: 'right' }}>{b.row_count}</td>
                      <td style={{ padding: '8px 8px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 4, font: 'var(--t-caption)',
                          background: b.status === 'COMMITTED' ? 'var(--savings)' : b.status === 'UNDONE' ? 'var(--bg-raised)' : 'var(--warn)',
                          color: b.status === 'COMMITTED' ? '#fff' : 'var(--fg-primary)',
                        }}>
                          {b.status}
                        </span>
                      </td>
                      <td style={{ padding: '8px 0', textAlign: 'right' }}>
                        {b.status === 'COMMITTED' && (
                          <button onClick={() => handleUndo(b.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', font: 'var(--t-caption)' }}>
                            Undo
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
