'use client';

import { useState } from 'react';
import axios from 'axios';

type Stage = 'form' | 'check-email';

export default function RegisterPage() {
  const [stage, setStage] = useState<Stage>('form');
  const [sentEmail, setSentEmail] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  const signupClosed = process.env.NEXT_PUBLIC_SIGNUP_CLOSED === 'true';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setLoading(true);
    try {
      await axios.post('/api/v1/auth/register', { name, email, password });
      setSentEmail(email);
      setStage('check-email');
      startCooldown();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data;
        if (err.response?.status === 422 && data?.fields) {
          setFieldErrors(data.fields);
        } else if (err.response?.status === 403 && data?.code === 'SIGNUP_CLOSED') {
          setFieldErrors({ _: ['Registration is currently closed.'] });
        } else if (err.response?.status === 429) {
          setFieldErrors({ _: ['Too many attempts. Try again in an hour.'] });
        } else {
          setFieldErrors({ _: ['Something went wrong. Please try again.'] });
        }
      }
    } finally {
      setLoading(false);
    }
  }

  function startCooldown() {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((n) => {
        if (n <= 1) { clearInterval(interval); return 0; }
        return n - 1;
      });
    }, 1000);
  }

  async function handleResend() {
    setResendLoading(true);
    try {
      await axios.post('/api/v1/auth/resend-verification', { email: sentEmail });
      startCooldown();
    } catch {
      // silent — same response either way
    } finally {
      setResendLoading(false);
    }
  }

  if (signupClosed) {
    return (
      <>
        <h1 style={{ font: 'var(--t-section)', margin: '0 0 16px', color: 'var(--fg-primary)' }}>Create account</h1>
        <p style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)', margin: 0 }}>Registration is currently closed.</p>
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <a href="/login" style={{ color: 'var(--accent)', font: 'var(--t-caption)', textDecoration: 'none' }}>Already have an account?</a>
        </div>
      </>
    );
  }

  if (stage === 'check-email') {
    return (
      <>
        <h1 style={{ font: 'var(--t-section)', margin: '0 0 12px', color: 'var(--fg-primary)' }}>Check your email</h1>
        <p style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)', margin: '0 0 24px' }}>
          We sent a link to <strong>{sentEmail}</strong>. Open it to verify your account.
        </p>
        <button
          onClick={handleResend}
          disabled={resendCooldown > 0 || resendLoading}
          style={{
            width: '100%', padding: '12px', borderRadius: 10, border: '1px solid var(--border)',
            background: 'transparent', color: resendCooldown > 0 ? 'var(--fg-muted)' : 'var(--accent)',
            font: 'var(--t-body)', cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer', minHeight: 44,
          }}
        >
          {resendCooldown > 0 ? `Resend link (${resendCooldown}s)` : resendLoading ? 'Sending…' : 'Resend link'}
        </button>
      </>
    );
  }

  return (
    <>
      <h1 style={{ font: 'var(--t-section)', margin: '0 0 24px', color: 'var(--fg-primary)' }}>Create account</h1>
      <form onSubmit={handleSubmit} noValidate>
        <Field label="Name" id="name" error={fieldErrors.name?.[0]}>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={inputStyle}
          />
        </Field>
        <Field label="Email" id="email" error={fieldErrors.email?.[0]}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
        </Field>
        <Field label="Password" id="password" error={fieldErrors.password?.[0]}>
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ ...inputStyle, paddingRight: 44 }}
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
          <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', marginTop: 4 }}>At least 10 characters</div>
        </Field>

        {fieldErrors._ && (
          <div role="alert" style={{ color: 'var(--danger)', font: 'var(--t-caption)', marginBottom: 16 }}>
            {fieldErrors._[0]}
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
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <div style={{ marginTop: 20, font: 'var(--t-caption)', color: 'var(--fg-secondary)', textAlign: 'center' }}>
        <a href="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Already have an account?</a>
      </div>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--bg-sunken)', color: 'var(--fg-primary)', font: 'var(--t-body)', boxSizing: 'border-box',
};

function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label htmlFor={id} style={{ display: 'block', font: 'var(--t-label)', marginBottom: 6, color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </label>
      {children}
      {error && <div role="alert" style={{ color: 'var(--danger)', font: 'var(--t-caption)', marginTop: 4 }}>{error}</div>}
    </div>
  );
}
