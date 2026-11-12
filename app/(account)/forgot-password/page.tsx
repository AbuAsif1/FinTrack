'use client';

import { useState } from 'react';
import axios from 'axios';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/v1/auth/password-reset/request', { email });
    } catch {
      // Always show the same confirmation
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <>
        <h1 style={{ font: 'var(--t-section)', margin: '0 0 12px', color: 'var(--fg-primary)' }}>Check your email</h1>
        <p style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)', margin: '0 0 24px' }}>
          If that email has an account, a reset link is on its way.
        </p>
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <a href="/login" style={{ color: 'var(--accent)', font: 'var(--t-caption)', textDecoration: 'none' }}>Back to sign in</a>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 style={{ font: 'var(--t-section)', margin: '0 0 24px', color: 'var(--fg-primary)' }}>Forgot password</h1>
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

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '12px', borderRadius: 10, border: 'none',
            background: 'var(--accent)', color: 'var(--accent-fg)',
            font: 'var(--t-body)', fontWeight: 600, cursor: loading ? 'wait' : 'pointer', minHeight: 44,
          }}
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <a href="/login" style={{ color: 'var(--accent)', font: 'var(--t-caption)', textDecoration: 'none' }}>Back to sign in</a>
      </div>
    </>
  );
}
