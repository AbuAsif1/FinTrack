'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';

type Stage = 'loading' | 'success' | 'invalid';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [stage, setStage] = useState<Stage>('loading');
  const [resendEmail, setResendEmail] = useState('');
  const [resendInput, setResendInput] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    if (!token) { setStage('invalid'); return; }
    axios.post('/api/v1/auth/verify-email', { token })
      .then(() => setStage('success'))
      .catch(() => setStage('invalid'));
  }, [token]);

  function startCooldown() {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((n) => {
        if (n <= 1) { clearInterval(interval); return 0; }
        return n - 1;
      });
    }, 1000);
  }

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setResendLoading(true);
    try {
      await axios.post('/api/v1/auth/resend-verification', { email: resendEmail || resendInput });
      setResendSent(true);
      startCooldown();
    } catch {
      // silent
    } finally {
      setResendLoading(false);
    }
  }

  if (stage === 'loading') {
    return <p style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)' }}>Verifying…</p>;
  }

  if (stage === 'success') {
    return (
      <>
        <h1 style={{ font: 'var(--t-section)', margin: '0 0 12px', color: 'var(--fg-primary)' }}>Email verified</h1>
        <p style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)', margin: '0 0 24px' }}>Your email has been verified. You can now sign in.</p>
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

  return (
    <>
      <h1 style={{ font: 'var(--t-section)', margin: '0 0 12px', color: 'var(--fg-primary)' }}>Link expired or already used</h1>
      <p style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)', margin: '0 0 24px' }}>
        {resendSent
          ? 'A new verification link has been sent. Check your inbox.'
          : 'Enter your email address to get a new verification link.'}
      </p>
      {!resendSent && (
        <form onSubmit={handleResend} noValidate>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="resend-email" style={{ display: 'block', font: 'var(--t-label)', marginBottom: 6, color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Email
            </label>
            <input
              id="resend-email"
              type="email"
              value={resendInput}
              onChange={(e) => setResendInput(e.target.value)}
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)', font: 'var(--t-body)', boxSizing: 'border-box' }}
            />
          </div>
          <button
            type="submit"
            disabled={resendCooldown > 0 || resendLoading}
            style={{
              width: '100%', padding: '12px', borderRadius: 10, border: 'none',
              background: 'var(--accent)', color: 'var(--accent-fg)',
              font: 'var(--t-body)', fontWeight: 600, cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer', minHeight: 44,
            }}
          >
            {resendCooldown > 0 ? `Resend link (${resendCooldown}s)` : resendLoading ? 'Sending…' : 'Resend verification link'}
          </button>
        </form>
      )}
      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <a href="/login" style={{ color: 'var(--accent)', font: 'var(--t-caption)', textDecoration: 'none' }}>Back to sign in</a>
      </div>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
