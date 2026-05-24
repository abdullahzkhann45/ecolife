'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import Link from 'next/link';

const CATEGORIES = ['all', 'committed', 'transport', 'diet', 'energy', 'water', 'waste', 'consumption'];
const CATEGORY_GLYPH: Record<string, string> = {
  all: '◯', committed: '♥', transport: '↗', diet: '◍', energy: '⚡', water: '💧', waste: '↻', consumption: '◊',
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<any>(null);

  const load = () => {
    Promise.all([
      api.get('/tasks/today'),
      api.get('/tasks/commitment-progress'),
    ]).then(([t, p]) => {
      setTasks(t.data);
      setProgress(p.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleCommit = async (e: React.MouseEvent, taskId: string, committed: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (committed) await api.delete(`/tasks/${taskId}/commit`);
      else await api.post(`/tasks/${taskId}/commit`);
      load();
    } catch {}
  };

  const filtered = category === 'all' ? tasks
    : category === 'committed' ? tasks.filter(t => t.committed)
    : tasks.filter(t => t.category === category);
  const done = filtered.filter(t => t.completedToday).length;

  return (
    <div>
      <div className="page-head fade-up">
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>§ 02 — The daily loop</div>
          <h1>Today&apos;s<br /><em>verified</em> tasks.</h1>
        </div>
        <p className="page-sub">
          Pick tasks. Commit to them. Prove it with a photo or self-rate. Your eco-score moves daily based on what you actually do.
        </p>
      </div>

      {/* Commitment progress banner */}
      {progress && progress.tasksCommitted > 0 && (
        <div className="eco-card" style={{ marginBottom: 28, padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontFamily: 'var(--display)', fontSize: 32, fontWeight: 700, color: 'var(--accent)' }}>
              {progress.tasksCompletedToday}/{progress.tasksCommitted}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Committed tasks done today</div>
              <div className="eyebrow" style={{ marginTop: 2 }}>Projected +{progress.projectedScoreImprovement} score if fully completed daily</div>
            </div>
          </div>
          <div className="bar-track" style={{ width: 120 }}>
            <div className="bar-fill accent" style={{ width: `${progress.completionRate * 100}%` }} />
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }} className="scrollbar-hide stagger">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} className={`chip ${category === cat ? 'active' : ''}`}>
              <span style={{ fontFamily: 'var(--display)', fontWeight: 700 }}>{CATEGORY_GLYPH[cat]}</span>
              <span style={{ textTransform: 'capitalize' }}>{cat}</span>
            </button>
          ))}
        </div>
        <div className="eyebrow">{done} / {filtered.length} complete</div>
      </div>

      {/* Task grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} style={{ height: 200, borderRadius: 14, background: 'var(--paper-deep)', opacity: 0.5 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="eco-card" style={{ textAlign: 'center', padding: '80px 24px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>§ Empty</div>
          <p style={{ color: 'var(--mute)', fontSize: 16 }}>No tasks in this category.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }} className="stagger">
          {filtered.map(task => (
            <Link key={task.id} href={`/tasks/${task.id}`} className="eco-card interactive"
              style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 16, opacity: task.completedToday ? 0.65 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 12,
                  background: task.completedToday ? 'var(--leaf)' : 'var(--ink)',
                  color: 'var(--paper)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--display)', fontSize: 24, fontWeight: 700,
                }}>
                  {task.completedToday ? '✓' : CATEGORY_GLYPH[task.category] || '◯'}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {task.selfRatingEnabled && <span className="pill" style={{ fontSize: 10, background: 'var(--paper-deep)' }}>Self-rate</span>}
                  {task.verificationMechanism === 'geo' && <span className="pill" style={{ fontSize: 10, background: 'var(--leaf)', color: 'var(--paper)' }}>GPS</span>}
                  <span className="pill pill-paper">{task.basePoints} pts</span>
                  <button
                    onClick={(e) => toggleCommit(e, task.id, task.committed)}
                    style={{
                      background: 'transparent', border: 0, cursor: 'pointer', fontSize: 20,
                      color: task.committed ? 'var(--accent)' : 'var(--hair)',
                      transition: 'color 0.18s',
                    }}
                    title={task.committed ? 'Remove commitment' : 'Commit to this task'}
                  >
                    {task.committed ? '♥' : '♡'}
                  </button>
                </div>
              </div>
              <div>
                <div style={{
                  fontFamily: 'var(--display)', fontSize: 22, fontWeight: 600,
                  letterSpacing: '-0.02em', lineHeight: 1.15,
                  textDecoration: task.completedToday ? 'line-through' : 'none',
                }}>{task.title}</div>
                <p style={{ marginTop: 8, fontSize: 14, color: 'var(--mute)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {task.description}
                </p>
              </div>
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid var(--hair)' }}>
                <span className="eyebrow" style={{ fontSize: 10 }}>{task.category}</span>
                {task.co2SavedGrams > 0 && (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.12em', color: 'var(--leaf)' }}>
                    −{(task.co2SavedGrams / 1000).toFixed(1)} KG CO₂
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
