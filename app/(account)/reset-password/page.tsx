'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';

type Stage = 'form' | 'success' | 'invalid';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [stage, setStage] = useState<Stage>(token ? 'form' : 'invalid');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setError(null);

    if (password !== confirm) {
      setFieldErrors({ confirm: ['Passwords do not match'] });
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/v1/auth/password-reset/confirm', { token, password });
      setStage('success');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data;
        if (err.response?.status === 422 && data?.fields) {
          setFieldErrors(data.fields);
        } else if (err.response?.status === 422) {
          setStage('invalid');
        } else {
          setError('Something went wrong. Please try again.');
        }
      }
    } finally {
      setLoading(false);
    }
  }

  if (stage === 'success') {
    return (
      <>
        <h1 style={{ font: 'var(--t-section)', margin: '0 0 12px', color: 'var(--fg-primary)' }}>Password updated</h1>
        <p style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)', margin: '0 0 24px' }}>Your password has been reset. You can now sign in with your new password.</p>
        <a
          href="/login"
          style={{
            display: 'block', textAlign: 'center', padding: '12px', borderRadius: 10,
            background: 'var(--accent)', color: 'var(--accent-fg)',
            font: 'var(--t-body)', fontWeight: 600, textDecoration: 'none',
          }}
        >
          Sign in
        </a>
      </>
    );
  }

  if (stage === 'invalid') {
    return (
      <>
        <h1 style={{ font: 'var(--t-section)', margin: '0 0 12px', color: 'var(--fg-primary)' }}>Link expired or already used</h1>
        <p style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)', margin: '0 0 24px' }}>
          This password reset link is no longer valid.
        </p>
        <a
          href="/forgot-password"
          style={{
            display: 'block', textAlign: 'center', padding: '12px', borderRadius: 10,
            background: 'var(--accent)', color: 'var(--accent-fg)',
            font: 'var(--t-body)', fontWeight: 600, textDecoration: 'none',
          }}
        >
          Request a new link
        </a>
      </>
    );
  }

  return (
    <>
      <h1 style={{ font: 'var(--t-section)', margin: '0 0 24px', color: 'var(--fg-primary)' }}>Reset password</h1>
      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="password" style={{ display: 'block', font: 'var(--t-label)', marginBottom: 6, color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            New password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '10px 12px', paddingRight: 44, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)', font: 'var(--t-body)', boxSizing: 'border-box' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-secondary)', font: 'var(--t-caption)', padding: 0 }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {fieldErrors.password && <div role="alert" style={{ color: 'var(--danger)', font: 'var(--t-caption)', marginTop: 4 }}>{fieldErrors.password[0]}</div>}
          <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', marginTop: 4 }}>At least 10 characters</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="confirm" style={{ display: 'block', font: 'var(--t-label)', marginBottom: 6, color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Confirm password
          </label>
          <input
            id="confirm"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)', font: 'var(--t-body)', boxSizing: 'border-box' }}
          />
          {fieldErrors.confirm && <div role="alert" style={{ color: 'var(--danger)', font: 'var(--t-caption)', marginTop: 4 }}>{fieldErrors.confirm[0]}</div>}
        </div>

        {error && (
          <div role="alert" style={{ color: 'var(--danger)', font: 'var(--t-caption)', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '12px', borderRadius: 10, border: 'none',
            background: 'var(--accent)', color: 'var(--accent-fg)',
            font: 'var(--t-body)', fontWeight: 600, cursor: loading ? 'wait' : 'pointer', minHeight: 44,
          }}
        >
          {loading ? 'Saving…' : 'Save'}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
