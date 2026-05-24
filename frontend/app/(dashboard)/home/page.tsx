'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import Link from 'next/link';

const CATEGORY_GLYPH: Record<string, string> = {
  transport: '↗', diet: '◍', energy: '⚡', water: '💧', waste: '↻', consumption: '◊',
};

export default function HomePage() {
  const { user } = useAuth();
  const [streak, setStreak] = useState<any>(null);
  const [points, setPoints] = useState<any>(null);
  const [ecoScore, setEcoScore] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [commitProgress, setCommitProgress] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      api.get('/streaks'),
      api.get('/points'),
      api.get('/eco-score'),
      api.get('/tasks/today'),
      api.get('/tasks/commitment-progress'),
    ]).then(([s, p, e, t, cp]) => {
      setStreak(s.data);
      setPoints(p.data);
      setEcoScore(e.data);
      setTasks(t.data.slice(0, 6));
      setCommitProgress(cp.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const nextMilestone = streak ? [7, 14, 30, 60, 100, 365].find(m => m > streak.currentStreak) : null;
  const completedToday = tasks.filter(t => t.completedToday).length;

  return (
    <div>
      {/* Header */}
      <div className="page-head fade-up">
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>§ Day {streak?.currentStreak ?? '—'} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          <h1>
            {greeting()},<br />
            <em>@{user?.username}</em>.
          </h1>
        </div>
        <p className="page-sub">
          You&apos;ve completed <strong style={{ color: 'var(--ink)' }}>{completedToday} of {tasks.length}</strong> tasks today. Keep the streak alive.
        </p>
      </div>

      {/* Stat row */}
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18, marginBottom: 56 }}
        className="stagger"
      >
        <div className="stat-tile accent">
          <div className="corner-mark">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8 7 8 11 12 14C15 11 13 8 17 4C16 9 20 13 18 18C16 22 12 22 12 22S6 22 6 16C6 11 10 10 12 2Z"/></svg>
          </div>
          <div className="label">Current streak</div>
          <div className="value">{streak?.currentStreak ?? 0}<span className="unit">DAYS</span></div>
          {nextMilestone && (
            <div className="sub">{nextMilestone - (streak?.currentStreak ?? 0)} days to next milestone</div>
          )}
        </div>

        <div className="stat-tile">
          <div className="corner-mark">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.5 8.5L21 9L16 13.5L17.5 20L12 16.5L6.5 20L8 13.5L3 9L9.5 8.5Z"/></svg>
          </div>
          <div className="label">Points balance</div>
          <div className="value">{(points?.balance ?? 0).toLocaleString()}<span className="unit">PTS</span></div>
          <div className="sub">All-time earned · spend in shop</div>
        </div>

        <div className="stat-tile leaf">
          <div className="corner-mark">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21C3 12 11 4 21 3C20 13 12 21 3 21Z M3 21L13 11"/></svg>
          </div>
          <div className="label">Eco score</div>
          <div className="value">{ecoScore?.currentScore ?? '—'}<span className="unit">/ 1000</span></div>
          <div className="sub">
            {ecoScore && (ecoScore.improvement >= 0 ? '↑' : '↓')} {ecoScore?.improvement ?? 0} from baseline
          </div>
        </div>
      </div>

      {/* Section: Today's tasks */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: 48, alignItems: 'start' }} className="home-grid">
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>§ 01 — Today</div>
              <h2 className="display" style={{ fontSize: 'clamp(32px, 4vw, 48px)' }}>
                Verified <em>wins</em>,<br />ready to claim.
              </h2>
            </div>
            <Link href="/tasks" className="btn btn-ghost" style={{ height: 36, fontSize: 12 }}>
              All tasks
              <span className="btn-arrow"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2.5 9.5L9.5 2.5M4 2.5h5.5V8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
            </Link>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ height: 84, borderRadius: 14, background: 'var(--paper-deep)', opacity: 0.5 }} />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="eco-card" style={{ textAlign: 'center', padding: '64px 24px' }}>
              <div className="eyebrow" style={{ marginBottom: 12 }}>§ No tasks yet</div>
              <p style={{ color: 'var(--mute)', fontSize: 15 }}>Your starter tasks will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }} className="stagger">
              {tasks.map(task => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '56px 1fr auto auto',
                    alignItems: 'center',
                    gap: 18,
                    padding: '18px 22px',
                    borderRadius: 14,
                    background: task.completedToday ? 'var(--paper-deep)' : 'var(--paper-card)',
                    border: '1px solid var(--hair)',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'transform 0.18s, border-color 0.18s, box-shadow 0.18s',
                  }}
                  className="home-task-row"
                >
                  <div
                    style={{
                      width: 56, height: 56, borderRadius: 12,
                      background: task.completedToday ? 'var(--leaf)' : 'var(--ink)',
                      color: 'var(--paper)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--display)', fontSize: 26, fontWeight: 700,
                    }}
                  >
                    {task.completedToday ? '✓' : (CATEGORY_GLYPH[task.category] ?? '◯')}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'var(--display)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em',
                      textDecoration: task.completedToday ? 'line-through' : 'none',
                      color: task.completedToday ? 'var(--mute)' : 'var(--ink)',
                    }}>{task.title}</div>
                    <div style={{ marginTop: 4, fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mute)' }}>
                      {task.category} · {task.basePoints} pts
                    </div>
                  </div>
                  <span className="pill pill-paper">{task.basePoints}</span>
                  <span style={{ fontFamily: 'var(--display)', fontSize: 22, color: 'var(--mute)' }}>→</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside style={{ display: 'grid', gap: 18 }} className="stagger">
          {commitProgress && commitProgress.tasksCommitted > 0 && (
            <div className="eco-card" style={{ padding: '22px 24px' }}>
              <div className="eyebrow" style={{ marginBottom: 12 }}>§ Commitments</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                <span className="display" style={{ fontSize: 42, color: 'var(--accent)' }}>{commitProgress.tasksCompletedToday}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--mute)' }}>/ {commitProgress.tasksCommitted} done today</span>
              </div>
              <div className="bar-track" style={{ marginBottom: 10 }}>
                <div className="bar-fill accent" style={{ width: `${commitProgress.completionRate * 100}%` }} />
              </div>
              <div className="eyebrow">Projected +{commitProgress.projectedScoreImprovement} score/day</div>
            </div>
          )}
          {streak && streak.currentStreak > 0 && (
            <div className="eco-card ink" style={{ overflow: 'hidden' }}>
              <div className="eyebrow" style={{ marginBottom: 14 }}>§ Streak alive</div>
              <div className="bignum" style={{ fontSize: 64, color: 'var(--paper)' }}>
                {streak.currentStreak}
                <span className="unit" style={{ color: 'rgba(239,233,215,0.55)' }}>DAYS</span>
              </div>
              <p style={{ fontSize: 14, color: 'rgba(239,233,215,0.65)', marginTop: 12, lineHeight: 1.5 }}>
                {nextMilestone
                  ? `${nextMilestone - streak.currentStreak} days until the ${nextMilestone}-day badge unlocks.`
                  : 'You\'ve crossed every milestone. Legend status.'}
              </p>
            </div>
          )}

          {ecoScore && (
            <div className="eco-card">
              <div className="eyebrow" style={{ marginBottom: 10 }}>§ Score trend</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                <span className="display" style={{ fontSize: 36, color: ecoScore.improvement >= 0 ? 'var(--leaf)' : 'var(--danger)' }}>
                  {ecoScore.improvement >= 0 ? '+' : ''}{ecoScore.improvement}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mute)' }}>
                  vs baseline
                </span>
              </div>
              <Link href="/eco-score" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>
                See full breakdown →
              </Link>
            </div>
          )}

          <div className="eco-card">
            <div className="eyebrow" style={{ marginBottom: 14 }}>§ Quick links</div>
            <div style={{ display: 'grid', gap: 10 }}>
              <Link href="/friends" style={{ textDecoration: 'none', color: 'var(--ink)', fontSize: 14, display: 'flex', justifyContent: 'space-between' }}>
                <span>Leaderboard</span><span style={{ color: 'var(--mute)' }}>→</span>
              </Link>
              <Link href="/shop" style={{ textDecoration: 'none', color: 'var(--ink)', fontSize: 14, display: 'flex', justifyContent: 'space-between' }}>
                <span>Rewards shop</span><span style={{ color: 'var(--mute)' }}>→</span>
              </Link>
              <Link href="/profile" style={{ textDecoration: 'none', color: 'var(--ink)', fontSize: 14, display: 'flex', justifyContent: 'space-between' }}>
                <span>Activity history</span><span style={{ color: 'var(--mute)' }}>→</span>
              </Link>
            </div>
          </div>
        </aside>
      </div>

      <style jsx>{`
        .home-task-row:hover {
          transform: translateY(-2px);
          border-color: rgba(28, 36, 24, 0.32) !important;
          box-shadow: 0 14px 30px -18px rgba(28, 36, 24, 0.3);
        }
        @media (max-width: 1000px) {
          .home-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
        }
      `}</style>
    </div>
  );
}
