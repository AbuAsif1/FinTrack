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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 32 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="FinTrack" width={56} height={56} style={{ borderRadius: 14 }} />
        <span style={{
          font: '700 22px var(--font-space-grotesk, system-ui)',
          color: 'var(--fg-primary)',
          letterSpacing: '-0.02em',
        }}>
          FinTrack
        </span>
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
