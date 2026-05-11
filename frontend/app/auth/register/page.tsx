'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const passwordChecks = [
    { label: '8+ characters', valid: form.password.length >= 8 },
    { label: 'Contains a number', valid: /\d/.test(form.password) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form.email, form.username, form.password);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', position: 'relative', overflow: 'hidden' }}>
      <div className="page-grain" aria-hidden="true" />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        minHeight: '100vh',
        position: 'relative',
        zIndex: 1,
      }} className="auth-grid">

        {/* Left branding panel */}
        <div className="auth-brand" style={{ padding: '40px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', zIndex: 2 }}>
            <span className="brand-mark" />
            <span className="brand-text">EcoLife</span>
          </Link>

          <div style={{ maxWidth: 540, position: 'relative', zIndex: 2 }}>
            <div className="eyebrow" style={{ marginBottom: 18 }}>§ Day 1 starts now</div>
            <h1 className="display" style={{ fontSize: 'clamp(56px, 8vw, 104px)', marginBottom: 28 }}>
              Stop trying.<br />Start <em>streaking</em>.
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.45, color: 'var(--ink-soft)', maxWidth: '36ch', marginBottom: 32 }}>
              Three-minute onboarding. First verified task in 60 seconds. No credit card.
            </p>

            <div style={{ display: 'grid', gap: 14 }}>
              {[
                { tag: '01', t: 'Personalized baseline', d: 'Profile your habits in 3 minutes.' },
                { tag: '02', t: 'Verified daily tasks', d: 'Photo, sensor, geo, or receipt proof.' },
                { tag: '03', t: 'Earn & redeem', d: 'Points, streaks, real-world rewards.' },
              ].map(item => (
                <div key={item.tag} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <span className="mono" style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }}>§ {item.tag}</span>
                  <div>
                    <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 16, letterSpacing: '-0.02em' }}>{item.t}</div>
                    <div style={{ fontSize: 13, color: 'var(--mute)', marginTop: 2 }}>{item.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mono" style={{ color: 'var(--mute)', zIndex: 2 }}>
            © {new Date().getFullYear()} · EcoLife v1.0
          </div>

          {/* Decorative shape */}
          <div style={{
            position: 'absolute', bottom: '-60px', right: '-80px', width: 260, height: 260,
            background: 'var(--accent)',
            borderRadius: '100% 8% 100% 8%',
            transform: 'rotate(-18deg)', opacity: 0.85,
          }} />
        </div>

        {/* Right form panel */}
        <div style={{
          background: 'var(--paper-card)',
          borderLeft: '1px solid var(--hair)',
          padding: '40px 56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }} className="auth-form-panel">
          <div style={{ width: '100%', maxWidth: 420 }}>
            <div className="auth-mobile-logo" style={{ display: 'none', marginBottom: 32 }}>
              <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                <span className="brand-mark" />
                <span className="brand-text">EcoLife</span>
              </Link>
            </div>

            <div className="eyebrow" style={{ marginBottom: 16 }}>§ Create account</div>
            <h2 className="display" style={{ fontSize: 'clamp(36px, 4.6vw, 56px)', marginBottom: 8 }}>
              Get <em>started</em>.
            </h2>
            <p style={{ color: 'var(--mute)', fontSize: 15, marginBottom: 36 }}>
              Email, username, password. That&apos;s it.
            </p>

            {error && <div className="notice notice-error" style={{ marginBottom: 22 }}>{error}</div>}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 22 }}>
                <label>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="eco-input"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div style={{ marginBottom: 22 }}>
                <label>Username</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  className="eco-input"
                  placeholder="ecowarrior42"
                  required
                  minLength={3}
                  maxLength={20}
                  autoComplete="username"
                />
              </div>

              <div style={{ marginBottom: 26 }}>
                <label>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="eco-input"
                    placeholder="••••••••"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    style={{ paddingRight: 48 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                      background: 'transparent', border: 0, cursor: 'pointer',
                      fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.14em',
                      textTransform: 'uppercase', color: 'var(--mute)', fontWeight: 500,
                    }}
                  >
                    {showPassword ? 'hide' : 'show'}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                  {passwordChecks.map(c => (
                    <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 14, height: 14, borderRadius: 50,
                        background: c.valid ? 'var(--leaf)' : 'transparent',
                        border: c.valid ? '1.5px solid var(--leaf)' : '1.5px solid var(--hair)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--paper)', fontSize: 9, fontWeight: 700,
                      }}>{c.valid && '✓'}</div>
                      <span style={{ fontSize: 11.5, color: c.valid ? 'var(--leaf)' : 'var(--mute)', fontFamily: 'var(--mono)', letterSpacing: '0.08em' }}>
                        {c.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-accent"
                style={{ width: '100%', height: 54, fontSize: 15 }}
              >
                {loading ? <div className="spinner spinner-paper" /> : (
                  <>
                    Create account
                    <span className="btn-arrow">
                      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2.5 9.5L9.5 2.5M4 2.5h5.5V8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                  </>
                )}
              </button>
            </form>

            <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--hair)', textAlign: 'center' }}>
              <p style={{ color: 'var(--mute)', fontSize: 14 }}>
                Already have an account?{' '}
                <Link href="/auth/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                  Sign in →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .auth-grid { grid-template-columns: 1fr !important; }
          .auth-brand { display: none !important; }
          .auth-form-panel { border-left: 0 !important; padding: 24px !important; }
          .auth-mobile-logo { display: block !important; }
        }
      `}</style>
    </div>
  );
}
