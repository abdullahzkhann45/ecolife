'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import Link from 'next/link';

interface Question { id: string; section: string; sectionIcon: string; question: string; options: string[]; }

const CATEGORY_LABEL: Record<string, string> = {
  transport: 'Transport', diet: 'Diet', energy: 'Energy',
  water: 'Water', waste: 'Waste', consumption: 'Consumption',
};

const LIFESTYLE_LABEL: Record<string, string> = {
  urban_affluent: 'Urban Affluent',
  urban_middle: 'Urban Middle-Class',
  semi_urban: 'Semi-Urban',
  rural: 'Rural',
};

export default function OnboardingPage() {
  const { updateUser } = useAuth();
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/onboarding/questions').then(res => setQuestions(res.data));
  }, []);

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) setCurrentStep(s => s + 1);
    else handleSubmit();
  };
  const handleSkip = () => {
    if (currentStep < questions.length - 1) setCurrentStep(s => s + 1);
    else handleSubmit();
  };
  const handleBack = () => { if (currentStep > 0) setCurrentStep(s => s - 1); };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await api.post('/onboarding/submit', { answers });
      setResult(res.data);
      updateUser({ onboardingCompleted: true });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // ── RESULT SCREEN ──
  if (result) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--paper)', position: 'relative', overflow: 'hidden' }}>
        <div className="page-grain" aria-hidden="true" />
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '64px 32px', position: 'relative', zIndex: 1 }}>
          <div className="pop-in" style={{ textAlign: 'center', marginBottom: 48 }}>
            <div className="eyebrow" style={{ marginBottom: 18 }}>§ Your baseline · day 0</div>
            <h1 className="display" style={{ fontSize: 'clamp(56px, 9vw, 120px)', marginBottom: 18 }}>
              Your <em>eco</em><br />score.
            </h1>
            <div className="display" style={{ fontSize: 'clamp(120px, 22vw, 240px)', color: 'var(--accent)', lineHeight: 0.85 }}>
              {result.baselineScore}
            </div>
            <div className="eyebrow" style={{ marginTop: 14 }}>/ 1000 · starting point</div>
          </div>

          {/* Lifestyle badge */}
          {result.lifestyleType && (
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <span className="pill pill-ink" style={{ fontSize: 14, padding: '10px 22px' }}>
                {LIFESTYLE_LABEL[result.lifestyleType] || result.lifestyleType}
              </span>
            </div>
          )}

          <div className="eco-card" style={{ marginBottom: 24, padding: 28 }}>
            <div className="eyebrow" style={{ marginBottom: 18 }}>§ Category breakdown</div>
            <div style={{ display: 'grid', gap: 18 }}>
              {Object.entries(result.categoryBreakdown || {}).map(([cat, val]: [string, any], i) => (
                <div key={cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontFamily: 'var(--display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em' }}>
                      {CATEGORY_LABEL[cat] ?? cat}
                    </span>
                    <span className="display" style={{ fontSize: 22 }}>{val}</span>
                  </div>
                  <div className="bar-track">
                    <div className={`bar-fill ${i % 3 === 0 ? 'leaf' : i % 3 === 1 ? '' : 'accent'}`} style={{ width: `${val / 10}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="eco-card ink" style={{ marginBottom: 32, padding: 28 }}>
            <div className="eyebrow" style={{ marginBottom: 12, color: 'rgba(239,233,215,0.55)' }}>§ Ready to begin</div>
            <p className="display" style={{ fontSize: 28, color: 'var(--paper)', marginBottom: 8 }}>
              {result.starterTasks?.length ?? 0} starter <em>tasks</em> queued.
            </p>
            <p style={{ fontSize: 14, color: 'rgba(239,233,215,0.65)', lineHeight: 1.55 }}>
              Personalized to your lifestyle and the categories where you can move your number fastest.
            </p>
          </div>

          <button onClick={() => router.push('/home')} className="btn btn-accent" style={{ width: '100%', height: 60, fontSize: 16 }}>
            Start my journey
            <span className="btn-arrow">
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2.5 9.5L9.5 2.5M4 2.5h5.5V8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          </button>
        </div>
      </div>
    );
  }

  // ── LOADING ──
  if (questions.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  const q = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  // Check if this is the first question of a new section
  const prevSection = currentStep > 0 ? questions[currentStep - 1].section : null;
  const isNewSection = q.section !== prevSection;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', position: 'relative', overflow: 'hidden' }}>
      <div className="page-grain" aria-hidden="true" />

      <header style={{ padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <span className="brand-mark" />
          <span className="brand-text">EcoLife</span>
        </Link>
        <div className="mono" style={{ color: 'var(--mute)' }}>
          Step {String(currentStep + 1).padStart(2, '0')} / {String(questions.length).padStart(2, '0')}
        </div>
      </header>

      <div style={{ height: 3, background: 'var(--paper-deep)', position: 'relative', zIndex: 2 }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', transition: 'width 0.4s cubic-bezier(0.3,0.7,0.2,1)' }} />
      </div>

      <main style={{ maxWidth: 880, margin: '0 auto', padding: '56px 32px 80px', position: 'relative', zIndex: 1 }}>
        <div className="fade-up" key={q.id}>
          {isNewSection && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 24, padding: '8px 18px', borderRadius: 999, background: 'var(--paper-deep)' }}>
              <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 18 }}>{q.sectionIcon}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mute)' }}>{q.section}</span>
            </div>
          )}

          <div className="eyebrow" style={{ marginBottom: 18 }}>§ About you · {q.id.replace(/_/g, ' ')}</div>
          <h1 className="display" style={{ fontSize: 'clamp(40px, 6vw, 76px)', marginBottom: 48 }}>
            {q.question}
          </h1>

          <div style={{ display: 'grid', gap: 12, marginBottom: 48 }} className="stagger">
            {q.options.map(opt => {
              const selected = answers[q.id] === opt;
              return (
                <button
                  key={opt}
                  onClick={() => handleAnswer(q.id, opt)}
                  style={{
                    appearance: 'none',
                    background: selected ? 'var(--ink)' : 'var(--paper-card)',
                    color: selected ? 'var(--paper)' : 'var(--ink)',
                    border: '1px solid',
                    borderColor: selected ? 'var(--ink)' : 'var(--hair)',
                    borderRadius: 14, padding: '20px 24px',
                    fontFamily: 'var(--body)', fontSize: 17, fontWeight: 500,
                    textAlign: 'left', cursor: 'pointer',
                    transition: 'background 0.18s, color 0.18s, border-color 0.18s, transform 0.18s',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                  }}
                  onMouseOver={(e) => { if (!selected) { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.transform = 'translateX(4px)'; }}}
                  onMouseOut={(e) => { if (!selected) { e.currentTarget.style.borderColor = 'var(--hair)'; e.currentTarget.style.transform = ''; }}}
                >
                  <span>{opt}</span>
                  {selected && (
                    <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', color: 'var(--paper)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>✓</span>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              {currentStep > 0 && <button onClick={handleBack} className="btn btn-ghost">← Back</button>}
              <button onClick={handleSkip} className="btn btn-soft">Skip</button>
            </div>
            <button onClick={handleNext} disabled={loading} className="btn btn-accent" style={{ height: 54, fontSize: 15, padding: '0 32px' }}>
              {loading ? <div className="spinner spinner-paper" /> : (
                <>
                  {currentStep === questions.length - 1 ? 'See my score' : 'Next'}
                  <span className="btn-arrow">
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2.5 9.5L9.5 2.5M4 2.5h5.5V8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
