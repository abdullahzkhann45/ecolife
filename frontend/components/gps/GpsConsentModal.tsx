'use client';

interface Props {
  onAccept: () => void;
}

export default function GpsConsentModal({ onAccept }: Props) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(28,36,24,0.6)', backdropFilter: 'blur(4px)',
      padding: 24,
    }}>
      <div className="eco-card pop-in" style={{
        maxWidth: 420, width: '100%', padding: 36, textAlign: 'center',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, background: 'var(--leaf)',
          color: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--display)', fontSize: 28, margin: '0 auto 20px',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
          </svg>
        </div>

        <h3 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700, marginBottom: 16, lineHeight: 1.2 }}>
          We'll track your route to verify this task
        </h3>

        <div style={{ textAlign: 'left', fontSize: 14, color: 'var(--mute)', lineHeight: 1.7, marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <span style={{ flexShrink: 0 }}>*</span>
            <span>Keep your screen on for best accuracy</span>
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <span style={{ flexShrink: 0 }}>*</span>
            <span>Battery usage is similar to using Google Maps</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ flexShrink: 0 }}>*</span>
            <span>We delete your route after verification — your privacy comes first</span>
          </div>
        </div>

        <button onClick={onAccept} className="btn btn-accent" style={{ width: '100%', height: 52, fontSize: 15 }}>
          Got it, let's start
        </button>
      </div>
    </div>
  );
}
