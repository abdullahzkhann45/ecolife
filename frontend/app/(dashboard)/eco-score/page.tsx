'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

const CATEGORY_INFO: Record<string, { glyph: string; label: string }> = {
  transport: { glyph: '↗', label: 'Transport' },
  diet: { glyph: '◍', label: 'Diet' },
  energy: { glyph: '⚡', label: 'Energy' },
  waste: { glyph: '↻', label: 'Waste' },
  consumption: { glyph: '◊', label: 'Consumption' },
};

export default function EcoScorePage() {
  const [score, setScore] = useState<any>(null);
  const [showMethodology, setShowMethodology] = useState(false);

  useEffect(() => {
    api.get('/eco-score').then(res => setScore(res.data));
  }, []);

  if (!score) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '128px 0' }}>
        <div className="spinner" />
      </div>
    );
  }

  const R = 44, C = 2 * Math.PI * R;
  const dash = `${C * (score.currentScore / 1000)} ${C}`;
  const improved = score.improvement >= 0;
  const tier = score.currentScore >= 700 ? 'Champion'
              : score.currentScore >= 500 ? 'Above average'
              : score.currentScore >= 300 ? 'On the rise'
              : 'Getting started';

  return (
    <div>
      <div className="page-head fade-up">
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>§ 03 — Eco score</div>
          <h1>
            One number,<br /><em>all of it</em>.
          </h1>
        </div>
        <p className="page-sub">
          A weighted sum of category sub-scores over a rolling 30-day window, calibrated against published lifestyle CO₂e estimates.
        </p>
      </div>

      {/* Score + categories grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)', gap: 64, alignItems: 'center', marginBottom: 72 }} className="score-grid">
        <div style={{ position: 'relative', aspectRatio: '1 / 1', maxWidth: 480, margin: '0 auto', width: '100%' }} className="fade-up">
          <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
            <circle cx="50" cy="50" r={R} fill="none" stroke="var(--paper-deep)" strokeWidth="6" />
            <circle
              cx="50" cy="50" r={R} fill="none"
              stroke="var(--ink)" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={dash}
              style={{ transition: 'stroke-dasharray 1.4s cubic-bezier(0.3,0.7,0.2,1)' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>your score</div>
            <div className="display" style={{ fontSize: 'clamp(80px, 14vw, 160px)', lineHeight: 1 }}>
              {score.currentScore}
            </div>
            <div className="eyebrow" style={{ marginTop: 8 }}>/ 1000 · {tier}</div>
            <div style={{
              marginTop: 14, fontFamily: 'var(--mono)', fontSize: 12,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: improved ? 'var(--leaf)' : 'var(--danger)',
            }}>
              {improved ? '↑' : '↓'} {Math.abs(score.improvement)} from baseline
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 22 }} className="stagger">
          {Object.entries(score.categoryBreakdown || {}).map(([cat, val]: [string, any], i) => {
            const info = CATEGORY_INFO[cat] || { glyph: '◯', label: cat };
            const color = i % 3 === 0 ? 'leaf' : i % 3 === 1 ? '' : 'accent';
            return (
              <div key={cat}>
                <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 14, alignItems: 'center', marginBottom: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: 'var(--ink)', color: 'var(--paper)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--display)', fontSize: 18, fontWeight: 700,
                  }}>{info.glyph}</div>
                  <div>
                    <div style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>
                      {info.label}
                    </div>
                  </div>
                  <div className="display" style={{ fontSize: 32 }}>{val}</div>
                </div>
                <div className="bar-track">
                  <div className={`bar-fill ${color}`} style={{ width: `${val / 10}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sub-cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, marginBottom: 48 }} className="stagger">
        <div className="stat-tile">
          <div className="label">Baseline score</div>
          <div className="value" style={{ fontSize: 48 }}>{score.baselineScore}</div>
          <div className="sub">Day-1 assessment</div>
        </div>
        <div className="stat-tile leaf">
          <div className="label">Tasks · 30 days</div>
          <div className="value" style={{ fontSize: 48 }}>{score.tasksCompletedLast30Days}</div>
          <div className="sub">Verified completions</div>
        </div>
        <div className="stat-tile accent">
          <div className="label">Tier</div>
          <div className="value" style={{ fontSize: 36 }}>{tier}</div>
          <div className="sub">{score.currentScore >= 700 ? 'Top 10% of users' : 'Climb to Champion'}</div>
        </div>
      </div>

      {/* Methodology + motivation */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
        <div className="eco-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <div className="eyebrow">§ Methodology</div>
            <button
              onClick={() => setShowMethodology(!showMethodology)}
              style={{
                background: 'transparent', border: 0, cursor: 'pointer',
                fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 500,
              }}
            >
              {showMethodology ? 'hide' : 'show'}
            </button>
          </div>
          {showMethodology ? (
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-soft)' }}>{score.methodology}</p>
          ) : (
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--mute)' }}>
              Six category sub-scores. Rolling 30-day window. Calibrated against published CO₂e estimates so the number means something real.
            </p>
          )}
        </div>

        <div className="eco-card ink">
          <div className="eyebrow" style={{ marginBottom: 14, color: 'rgba(239,233,215,0.6)' }}>§ Where you stand</div>
          <p className="display" style={{ fontSize: 32, color: 'var(--paper)', marginBottom: 14 }}>
            {score.currentScore >= 700 ? <>You&apos;re a <em>Champion</em>.</>
             : score.currentScore >= 500 ? <>Solid <em>progress</em>.</>
             : <>Every <em>action</em> counts.</>}
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(239,233,215,0.65)' }}>
            {score.currentScore >= 700
              ? 'You\'re in the top tier. Keep the streak alive and you stay there.'
              : score.currentScore >= 500
              ? 'Above the average user. Complete more tasks to push into Champion territory.'
              : 'Start today. Small actions compound into a real score.'}
          </p>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .score-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
        }
      `}</style>
    </div>
  );
}
