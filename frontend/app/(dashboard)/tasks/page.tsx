'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import Link from 'next/link';

const CATEGORY_GLYPH: Record<string, string> = {
  transport: '↗', diet: '◍', energy: '⚡', water: '💧', waste: '↻', consumption: '◊',
};

export default function TasksPage() {
  const [todayData, setTodayData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get('/tasks/today').then(res => {
      setTodayData(res.data);
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

  const tasks = todayData?.tasks || [];
  const chapter = todayData?.chapter ?? 1;
  const day = todayData?.day ?? 1;
  const dayOf = todayData?.dayOf ?? 5;
  const rank = todayData?.rank;
  const dayComplete = todayData?.dayComplete ?? false;
  const chapterComplete = todayData?.chapterComplete ?? false;
  const completedCount = todayData?.completedTasksToday ?? 0;
  const totalCount = todayData?.totalTasksToday ?? 0;

  return (
    <div>
      <div className="page-head fade-up">
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            § Chapter {chapter} · Day {day}/{dayOf} · {rank?.emoji} {rank?.title}
          </div>
          <h1>Today&apos;s<br /><em>tasks</em>.</h1>
        </div>
        <p className="page-sub">
          Complete all {totalCount} tasks to unlock Day {day < dayOf ? day + 1 : '1 of Chapter ' + (chapter + 1)}.
          Each chapter completed ranks you up.
        </p>
      </div>

      {/* Chapter progress bar */}
      <div className="eco-card" style={{ marginBottom: 32, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>{rank?.emoji}</span>
            <div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 700 }}>Chapter {chapter}</div>
              <div className="eyebrow" style={{ marginTop: 2 }}>{rank?.title} → {todayData?.chaptersCompleted !== undefined ? 'Next rank after this chapter' : ''}</div>
            </div>
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--mute)' }}>
            {completedCount}/{totalCount} tasks · Day {day}/{dayOf}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {Array.from({ length: dayOf }).map((_, i) => {
            const isDone = i < (day - 1) || (i === day - 1 && dayComplete);
            const isCurrent = i === day - 1 && !dayComplete;
            return (
              <div key={i} style={{ position: 'relative', flex: 1 }}>
                <div style={{
                  height: 8, borderRadius: 4,
                  background: isDone ? 'var(--leaf)' : isCurrent ? 'var(--accent)' : 'var(--paper-deep)',
                  transition: 'background 0.3s',
                }} />
                <div style={{
                  textAlign: 'center', marginTop: 6,
                  fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em',
                  color: isCurrent ? 'var(--accent)' : isDone ? 'var(--leaf)' : 'var(--mute)',
                  fontWeight: isCurrent ? 700 : 400,
                }}>
                  {isDone ? '✓' : `D${i + 1}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task list */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ height: 200, borderRadius: 14, background: 'var(--paper-deep)', opacity: 0.5 }} />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="eco-card" style={{ textAlign: 'center', padding: '80px 24px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>§ Complete onboarding</div>
          <p style={{ color: 'var(--mute)', fontSize: 16 }}>Your personalized tasks will appear after the questionnaire.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }} className="stagger">
            {tasks.map((task: any) => (
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

          {/* Day/Chapter complete banner */}
          {dayComplete && (
            <div style={{ marginTop: 24 }} className="eco-card" >
              <div style={{ textAlign: 'center', padding: '32px 24px', background: chapterComplete ? 'var(--accent)' : 'var(--leaf)', borderRadius: 12, color: 'var(--paper)' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>{chapterComplete ? '🏆' : '🎉'}</div>
                <div style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 700 }}>
                  {chapterComplete ? `Chapter ${chapter} Complete!` : `Day ${day} Complete!`}
                </div>
                <p style={{ marginTop: 10, fontSize: 15, opacity: 0.9 }}>
                  {chapterComplete
                    ? `You ranked up! Chapter ${chapter + 1} is now unlocked.`
                    : `Great work! Day ${day + 1} is now unlocked. Come back to continue.`}
                </p>
              </div>
            </div>
          )}

          {/* Next chapter preview (locked) */}
          {!chapterComplete && (
            <div style={{ marginTop: 32 }}>
              <div className="eco-card" style={{ padding: '28px 24px', opacity: 0.5, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
                    <div style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 700 }}>Chapter {chapter + 1}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--mute)', marginTop: 4 }}>
                      Complete all {dayOf} days to unlock
                    </div>
                  </div>
                </div>
                <div style={{ filter: 'blur(4px)', pointerEvents: 'none' }}>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Chapter {chapter + 1}</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {[1, 2, 3].map(i => (
                      <div key={i} style={{ height: 48, borderRadius: 10, background: 'var(--paper-deep)' }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
