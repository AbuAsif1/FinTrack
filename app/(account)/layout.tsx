export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{
        font: 'var(--t-section)',
        color: 'var(--accent)',
        marginBottom: 32,
        letterSpacing: '0.02em',
      }}>
        FinTrack BD
      </div>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'var(--bg-surface)',
        borderRadius: 10,
        border: '1px solid var(--border)',
        padding: 32,
      }}>
        {children}
      </div>
    </div>
  );
}
