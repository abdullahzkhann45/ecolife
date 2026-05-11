'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ emailOrUsername: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.emailOrUsername, form.password);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
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

          <div style={{ maxWidth: 520, position: 'relative', zIndex: 2 }}>
            <div className="eyebrow" style={{ marginBottom: 18 }}>§ Welcome back</div>
            <h1 className="display" style={{ fontSize: 'clamp(56px, 8vw, 104px)', marginBottom: 28 }}>
              Pick up the<br /><em>streak</em> you<br />left running.
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.45, color: 'var(--ink-soft)', maxWidth: '34ch' }}>
              Your points, eco score, and the friends you&apos;re trying to beat are still waiting.
            </p>
          </div>

          <div className="mono" style={{ color: 'var(--mute)', zIndex: 2 }}>
            © {new Date().getFullYear()} · EcoLife v1.0
          </div>

          {/* Decorative shapes */}
          <div style={{
            position: 'absolute', top: '20%', right: '-80px', width: 320, height: 320,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, var(--leaf) 0%, var(--leaf) 55%, color-mix(in oklab, var(--leaf) 70%, black) 100%)',
            boxShadow: 'inset -30px -30px 60px rgba(0,0,0,0.25)',
            opacity: 0.85,
          }} />
          <div style={{
            position: 'absolute', top: '34%', right: '20%', width: 110, height: 18,
            background: 'var(--accent)', borderRadius: 999, transform: 'rotate(-12deg)',
            opacity: 0.85,
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
          position: 'relative',
        }} className="auth-form-panel">
          <div style={{ width: '100%', maxWidth: 420 }}>
            <div className="auth-mobile-logo" style={{ display: 'none', marginBottom: 32 }}>
              <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                <span className="brand-mark" />
                <span className="brand-text">EcoLife</span>
              </Link>
            </div>

            <div className="eyebrow" style={{ marginBottom: 16 }}>§ Sign in</div>
            <h2 className="display" style={{ fontSize: 'clamp(36px, 4.6vw, 56px)', marginBottom: 8 }}>
              Sign <em>in</em>.
            </h2>
            <p style={{ color: 'var(--mute)', fontSize: 15, marginBottom: 36 }}>
              Use your email or username and password.
            </p>

            {error && <div className="notice notice-error" style={{ marginBottom: 22 }}>{error}</div>}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 26 }}>
                <label>Email or username</label>
                <input
                  type="text"
                  value={form.emailOrUsername}
                  onChange={e => setForm({ ...form, emailOrUsername: e.target.value })}
                  className="eco-input"
                  placeholder="you@example.com"
                  required
                  autoComplete="username"
                />
              </div>

              <div style={{ marginBottom: 32 }}>
                <label>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="eco-input"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
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
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-accent"
                style={{ width: '100%', height: 54, fontSize: 15 }}
              >
                {loading ? <div className="spinner spinner-paper" /> : (
                  <>
                    Sign in
                    <span className="btn-arrow">
                      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2.5 9.5L9.5 2.5M4 2.5h5.5V8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                  </>
                )}
              </button>
            </form>

            <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--hair)', textAlign: 'center' }}>
              <p style={{ color: 'var(--mute)', fontSize: 14 }}>
                New here?{' '}
                <Link href="/auth/register" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                  Create an account →
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
