'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import Link from 'next/link';

const CATEGORIES = ['all', 'transport', 'diet', 'energy', 'waste', 'consumption'];
const CATEGORY_GLYPH: Record<string, string> = {
  all: '◯', transport: '↗', diet: '◍', energy: '⚡', waste: '↻', consumption: '◊',
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/tasks/today').then(res => {
      setTasks(res.data);
      setLoading(false);
    });
  }, []);

  const filtered = category === 'all' ? tasks : tasks.filter(t => t.category === category);
  const done = filtered.filter(t => t.completedToday).length;

  return (
    <div>
      <div className="page-head fade-up">
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>§ 02 — The daily loop</div>
          <h1>
            Today&apos;s<br /><em>verified</em> tasks.
          </h1>
        </div>
        <p className="page-sub">
          Pick one. Prove it. Earn points. Each task carries its own verification mechanism — photo, sensor, geo, or receipt — so the numbers stay honest.
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }} className="scrollbar-hide stagger">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`chip ${category === cat ? 'active' : ''}`}
            >
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
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}
          className="stagger"
        >
          {filtered.map(task => (
            <Link
              key={task.id}
              href={`/tasks/${task.id}`}
              className="eco-card interactive"
              style={{
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                opacity: task.completedToday ? 0.65 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div
                  style={{
                    width: 52, height: 52, borderRadius: 12,
                    background: task.completedToday ? 'var(--leaf)' : 'var(--ink)',
                    color: 'var(--paper)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--display)', fontSize: 24, fontWeight: 700,
                  }}
                >
                  {task.completedToday ? '✓' : CATEGORY_GLYPH[task.category]}
                </div>
                <span className="pill pill-paper">{task.basePoints} pts</span>
              </div>

              <div>
                <div style={{
                  fontFamily: 'var(--display)', fontSize: 22, fontWeight: 600,
                  letterSpacing: '-0.02em', lineHeight: 1.15,
                  textDecoration: task.completedToday ? 'line-through' : 'none',
                }}>
                  {task.title}
                </div>
                <p style={{ marginTop: 8, fontSize: 14, color: 'var(--mute)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {task.description}
                </p>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid var(--hair)' }}>
                <span className="eyebrow" style={{ fontSize: 10 }}>
                  {task.category}
                </span>
                {task.co2SavedGrams > 0 ? (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.12em', color: 'var(--leaf)' }}>
                    −{(task.co2SavedGrams / 1000).toFixed(1)} KG CO₂
                  </span>
                ) : (
                  <span style={{ fontFamily: 'var(--display)', fontSize: 18, color: 'var(--mute)' }}>→</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
