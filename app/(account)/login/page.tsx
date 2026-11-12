'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { setAccessToken, tryRestoreSession } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  function startResendCooldown() {
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
      await axios.post('/api/v1/auth/resend-verification', { email });
      startResendCooldown();
    } catch {
      // silent
    } finally {
      setResendLoading(false);
    }
  }

  // Attempt silent refresh first
  useEffect(() => {
    tryRestoreSession().then((ok) => {
      if (ok) router.replace('/');
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await axios.post<{ accessToken: string }>('/api/v1/auth/login', {
        email,
        password,
      }, { withCredentials: true });
      setAccessToken(data.accessToken);
      router.replace('/');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const code = err.response?.data?.code;
        const status = err.response?.status;
        if (status === 403 && code === 'EMAIL_NOT_VERIFIED') {
          setError('Verify your email first.');
          setShowResend(true);
        } else if (status === 403 && code === 'ACCOUNT_DEACTIVATED') {
          const reason = err.response?.data?.reason;
          setError(reason ? `Account deactivated: ${reason}` : 'This account is deactivated. Contact the site admin.');
        } else if (status === 429) {
          setError('Too many attempts. Try again in 15 minutes.');
        } else {
          setError('Incorrect email or password.');
        }
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 style={{ font: 'var(--t-section)', margin: '0 0 24px', color: 'var(--fg-primary)' }}>Sign in</h1>
      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="email" style={{ display: 'block', font: 'var(--t-label)', marginBottom: 6, color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)', font: 'var(--t-body)', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="password" style={{ display: 'block', font: 'var(--t-label)', marginBottom: 6, color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)', font: 'var(--t-body)', boxSizing: 'border-box' }}
          />
        </div>

        {error && (
          <div role="alert" style={{ color: 'var(--danger)', font: 'var(--t-caption)', marginBottom: showResend ? 8 : 16 }}>
            {error}
          </div>
        )}

        {showResend && (
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || resendLoading}
            style={{
              width: '100%', padding: '10px', marginBottom: 16, borderRadius: 8,
              border: '1px solid var(--border)', background: 'transparent',
              color: resendCooldown > 0 ? 'var(--fg-muted)' : 'var(--accent)',
              font: 'var(--t-caption)', cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {resendCooldown > 0 ? `Resend verification email (${resendCooldown}s)` : resendLoading ? 'Sending…' : 'Resend verification email'}
          </button>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '12px', borderRadius: 10, border: 'none',
            background: 'var(--accent)', color: 'var(--accent-fg)',
            font: 'var(--t-body)', fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
            minHeight: 44,
          }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div style={{ marginTop: 20, font: 'var(--t-caption)', color: 'var(--fg-secondary)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <a href="/forgot-password" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Forgot password?</a>
        <a href="/register" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Create an account</a>
      </div>
    </>
  );
}
