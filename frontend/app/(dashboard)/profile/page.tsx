'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [streak, setStreak] = useState<any>(null);
  const [points, setPoints] = useState<any>(null);
  const [score, setScore] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      api.get('/streaks'),
      api.get('/points'),
      api.get('/eco-score'),
    ]).then(([s, p, e]) => {
      setStreak(s.data);
      setPoints(p.data);
      setScore(e.data);
    });
  }, []);

  const initials = user?.username?.slice(0, 2)?.toUpperCase() ?? '??';

  return (
    <div>
      {/* Hero */}
      <div className="page-head fade-up" style={{ alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
          <div className="avatar xl accent">{initials}</div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 14 }}>§ Member · since {user?.createdAt ? new Date(user.createdAt).getFullYear() : '2026'}</div>
            <h1>
              @{user?.username}
            </h1>
            <p style={{ marginTop: 14, color: 'var(--mute)', fontSize: 15 }}>{user?.email}</p>
          </div>
        </div>
        <button onClick={logout} className="btn btn-danger">
          Sign out
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, marginBottom: 48 }} className="stagger">
        <div className="stat-tile accent">
          <div className="label">Current streak</div>
          <div className="value">{streak?.currentStreak ?? 0}<span className="unit">DAYS</span></div>
          {streak?.longestStreak > 0 && <div className="sub">Best ever · {streak.longestStreak} days</div>}
        </div>
        <div className="stat-tile">
          <div className="label">Points balance</div>
          <div className="value">{(points?.balance ?? 0).toLocaleString()}<span className="unit">PTS</span></div>
          <div className="sub">{points?.entries?.length ?? 0} ledger entries</div>
        </div>
        <div className="stat-tile leaf">
          <div className="label">Eco score</div>
          <div className="value">{score?.currentScore ?? '—'}<span className="unit">/ 1000</span></div>
          {score && (
            <div className="sub">{score.improvement >= 0 ? '↑' : '↓'} {Math.abs(score.improvement)} from baseline</div>
          )}
        </div>
      </div>

      {/* Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, 1fr)', gap: 32 }} className="profile-grid">
        <div>
          <div style={{ marginBottom: 22 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>§ Activity</div>
            <h2 className="display" style={{ fontSize: 'clamp(28px, 3.4vw, 42px)' }}>
              Every <em>point</em>,<br />on the ledger.
            </h2>
          </div>

          <div className="eco-card" style={{ padding: 0, overflow: 'hidden' }}>
            {!points?.entries || points.entries.length === 0 ? (
              <div style={{ padding: '80px 24px', textAlign: 'center' }}>
                <div className="eyebrow" style={{ marginBottom: 10 }}>§ Empty</div>
                <p style={{ color: 'var(--mute)' }}>No activity yet. Complete a task to populate your ledger.</p>
              </div>
            ) : points.entries.slice(0, 12).map((entry: any, i: number) => (
              <div
                key={entry.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  gap: 16, alignItems: 'center',
                  padding: '16px 22px',
                  borderBottom: i < Math.min(11, points.entries.length - 1) ? '1px solid var(--hair)' : 0,
                }}
              >
                <div className="eyebrow" style={{ minWidth: 60 }}>
                  #{(points.entries.length - i).toString().padStart(3, '0')}
                </div>
                <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.4 }}>
                  {entry.description}
                </div>
                <div style={{
                  fontFamily: 'var(--display)',
                  fontWeight: 700,
                  fontSize: 22,
                  letterSpacing: '-0.02em',
                  color: entry.amount >= 0 ? 'var(--leaf)' : 'var(--danger)',
                }}>
                  {entry.amount >= 0 ? '+' : ''}{entry.amount}
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside style={{ display: 'grid', gap: 18, alignContent: 'start' }} className="stagger">
          {streak?.longestStreak > 0 && (
            <div className="eco-card ink">
              <div className="eyebrow" style={{ marginBottom: 10, color: 'rgba(239,233,215,0.55)' }}>§ Personal best</div>
              <div className="bignum" style={{ fontSize: 72, color: 'var(--paper)' }}>
                {streak.longestStreak}
                <span className="unit" style={{ color: 'rgba(239,233,215,0.55)' }}>DAYS</span>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(239,233,215,0.65)', marginTop: 12, lineHeight: 1.5 }}>
                Your longest unbroken streak. Keep going to beat it.
              </p>
            </div>
          )}

          <div className="eco-card">
            <div className="eyebrow" style={{ marginBottom: 12 }}>§ Account</div>
            <div style={{ display: 'grid', gap: 10, fontSize: 13.5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--mute)' }}>Username</span>
                <span>@{user?.username}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--mute)' }}>Email</span>
                <span style={{ maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--mute)' }}>Streak freezes</span>
                <span>{streak?.freezesAvailable ?? 1}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <style jsx>{`
        @media (max-width: 1000px) {
          .profile-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
