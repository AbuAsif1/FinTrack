'use client';

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16, textAlign: 'center', padding: 24, fontFamily: 'sans-serif' }}>
          <h2 style={{ fontSize: 24, margin: 0 }}>Something went wrong</h2>
          <p style={{ color: '#6b7280', maxWidth: 400, margin: 0 }}>An unexpected error occurred. Please try again.</p>
          <button onClick={reset} style={{ padding: '10px 24px', borderRadius: 8, background: '#3A5FCD', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 15 }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
