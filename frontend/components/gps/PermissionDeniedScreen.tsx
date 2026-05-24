'use client';

interface Props {
  onRetry: () => void;
  onSkip: () => void;
}

export default function PermissionDeniedScreen({ onRetry, onSkip }: Props) {
  return (
    <div className="eco-card" style={{ padding: 32, textAlign: 'center' }}>
      <div style={{
        width: 64, height: 64, borderRadius: 16, background: 'var(--danger)',
        color: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--display)', fontSize: 32, margin: '0 auto 20px',
      }}>!</div>

      <h3 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
        Location helps us verify your task
      </h3>

      <p style={{ fontSize: 14, color: 'var(--mute)', lineHeight: 1.6, maxWidth: '36ch', margin: '0 auto 24px' }}>
        We need GPS access to track your route and confirm your trip. Your location data is deleted within 7 days.
      </p>

      <div style={{ display: 'grid', gap: 10 }}>
        <button onClick={onRetry} className="btn btn-accent" style={{ width: '100%', height: 48, fontSize: 14 }}>
          Try again
        </button>
        <button onClick={onSkip} className="btn btn-soft" style={{ width: '100%', height: 40, fontSize: 13 }}>
          Skip for now (50% points)
        </button>
      </div>

      <p style={{ fontSize: 11, color: 'var(--mute)', marginTop: 16, lineHeight: 1.5 }}>
        If the prompt doesn't appear, enable location in your browser settings.
      </p>
    </div>
  );
}
