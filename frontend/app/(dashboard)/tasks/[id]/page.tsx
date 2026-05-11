'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';

const MECHANISM_INFO: Record<string, { label: string; needsPhoto: boolean }> = {
  photo: { label: 'Photo proof + AI verification', needsPhoto: true },
  sensor: { label: 'Sensor tracking + photo', needsPhoto: true },
  geo: { label: 'Location check-in', needsPhoto: false },
  receipt: { label: 'Receipt scan + OCR', needsPhoto: true },
  self_attest: { label: 'Self-confirm', needsPhoto: false },
};

const CATEGORY_GLYPH: Record<string, string> = {
  transport: '↗', diet: '◍', energy: '⚡', waste: '↻', consumption: '◊',
};

export default function TaskDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [task, setTask] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get(`/tasks/${id}`).then(res => setTask(res.data));
  }, [id]);

  const needsPhoto = task ? (MECHANISM_INFO[task.verificationMechanism]?.needsPhoto ?? false) : false;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Image must be under 10 MB'); return; }
    setPhotoFile(file);
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (needsPhoto && !photoFile) {
      setError('Upload a photo to verify this task');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('metadata', JSON.stringify({ submittedAt: new Date().toISOString() }));
      if (photoFile) formData.append('photo', photoFile);
      const res = await api.post(`/tasks/${id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!task) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '128px 0' }}>
        <div className="spinner" />
      </div>
    );
  }

  const mech = MECHANISM_INFO[task.verificationMechanism] || MECHANISM_INFO.self_attest;

  if (result) {
    const approved = result.status === 'approved';
    const rejected = result.status === 'rejected';
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', paddingTop: 32 }}>
        <div className="eco-card pop-in" style={{ padding: 48, textAlign: 'center' }}>
          <div className="eyebrow" style={{ marginBottom: 18 }}>
            {approved ? '§ Verified' : rejected ? '§ Rejected' : '§ Under review'}
          </div>
          <h1 className="display" style={{ fontSize: 64, marginBottom: 16 }}>
            {approved ? <>Task <em>complete</em>.</> : rejected ? <>Not <em>verified</em>.</> : <>Pending <em>audit</em>.</>}
          </h1>
          <p style={{ fontSize: 17, color: 'var(--mute)', maxWidth: '38ch', margin: '0 auto 28px', lineHeight: 1.5 }}>
            {approved
              ? `You just earned ${result.pointsAwarded} points. Streak continues.`
              : rejected
              ? 'The AI couldn\'t verify this photo. Try again with a clearer shot.'
              : 'Your submission has been flagged for human review.'}
          </p>

          {result.rejectionReason && (
            <div className="notice notice-error" style={{ textAlign: 'left', marginBottom: 24 }}>
              {result.rejectionReason}
            </div>
          )}
          {result.aiConfidence != null && (
            <div className="eyebrow" style={{ marginBottom: 24 }}>AI confidence · {result.aiConfidence}%</div>
          )}

          {approved && (
            <div style={{
              background: 'var(--accent)', color: 'var(--paper)',
              borderRadius: 14, padding: '20px 24px', marginBottom: 28,
            }}>
              <div className="bignum" style={{ fontSize: 56, color: 'var(--paper)' }}>
                +{result.pointsAwarded}
                <span className="unit" style={{ color: 'rgba(239,233,215,0.7)' }}>PTS</span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rejected && (
              <button
                onClick={() => { setResult(null); setPhotoFile(null); setPhotoPreview(null); }}
                className="btn btn-accent" style={{ width: '100%' }}
              >
                Try a different photo
              </button>
            )}
            <button onClick={() => router.push('/tasks')} className="btn btn-primary" style={{ width: '100%' }}>
              Back to tasks
            </button>
            <button onClick={() => router.push('/home')} className="btn btn-soft" style={{ width: '100%' }}>
              Go home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Back */}
      <button
        onClick={() => router.back()}
        style={{
          background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
          fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--mute)', marginBottom: 24,
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}
      >
        ← Back
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(340px, 1fr)', gap: 48, alignItems: 'start' }} className="task-grid">
        {/* Left: details */}
        <div>
          <div className="page-head" style={{ marginBottom: 32, paddingBottom: 0, borderBottom: 0 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 14 }}>§ {task.category} · {task.basePoints} pts</div>
              <h1>
                {task.title.split(' ').slice(0, -1).join(' ')}{' '}
                <em>{task.title.split(' ').slice(-1)[0]}</em>.
              </h1>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
            <div
              style={{
                width: 88, height: 88, borderRadius: 18,
                background: 'var(--ink)', color: 'var(--paper)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--display)', fontSize: 44, fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {CATEGORY_GLYPH[task.category] ?? '◯'}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="pill pill-ink">{task.category}</span>
              <span className="pill pill-accent">{task.basePoints} pts</span>
            </div>
          </div>

          <div className="eco-card" style={{ marginBottom: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>§ The task</div>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: 'var(--ink)' }}>{task.description}</p>
          </div>

          {(task.co2SavedGrams > 0 || task.waterSavedLiters > 0 || task.wasteDivertedGrams > 0) && (
            <div className="eco-card">
              <div className="eyebrow" style={{ marginBottom: 16 }}>§ Estimated impact</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 18 }}>
                {task.co2SavedGrams > 0 && (
                  <div>
                    <div className="bignum" style={{ fontSize: 36, color: 'var(--leaf)' }}>
                      {(task.co2SavedGrams / 1000).toFixed(1)}<span className="unit">KG</span>
                    </div>
                    <div className="eyebrow" style={{ marginTop: 6 }}>CO₂ saved</div>
                  </div>
                )}
                {task.waterSavedLiters > 0 && (
                  <div>
                    <div className="bignum" style={{ fontSize: 36 }}>
                      {task.waterSavedLiters}<span className="unit">L</span>
                    </div>
                    <div className="eyebrow" style={{ marginTop: 6 }}>Water saved</div>
                  </div>
                )}
                {task.wasteDivertedGrams > 0 && (
                  <div>
                    <div className="bignum" style={{ fontSize: 36, color: 'var(--accent)' }}>
                      {task.wasteDivertedGrams}<span className="unit">G</span>
                    </div>
                    <div className="eyebrow" style={{ marginTop: 6 }}>Diverted</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: verify */}
        <div style={{ position: 'sticky', top: 96 }}>
          <div className="eco-card ink" style={{ marginBottom: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 10, color: 'rgba(239,233,215,0.6)' }}>§ Verification</div>
            <p style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 22, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 12 }}>
              {mech.label}
            </p>
            <p style={{ fontSize: 13, color: 'rgba(239,233,215,0.65)', lineHeight: 1.55 }}>
              {task.proofInstructions}
            </p>
          </div>

          {needsPhoto && (
            <div style={{ marginBottom: 18 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoSelect}
                style={{ display: 'none' }}
              />
              {photoPreview ? (
                <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--hair)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt="Proof" style={{ width: '100%', height: 240, objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        background: 'var(--paper)', border: 0, color: 'var(--ink)',
                        padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
                        fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.14em',
                        textTransform: 'uppercase', fontWeight: 500,
                      }}
                    >Change</button>
                    <button
                      onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                      style={{
                        background: 'var(--danger)', border: 0, color: 'var(--paper)',
                        width: 28, height: 28, borderRadius: 999, cursor: 'pointer',
                        fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >×</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%', minHeight: 240,
                    background: 'var(--paper-card)',
                    border: '2px dashed var(--hair)',
                    borderRadius: 16,
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: 12, cursor: 'pointer',
                    color: 'var(--ink)', padding: 24,
                    transition: 'border-color 0.18s, background 0.18s',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--ink)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--hair)'; }}
                >
                  <div style={{
                    width: 56, height: 56, borderRadius: 14, background: 'var(--ink)',
                    color: 'var(--paper)', fontFamily: 'var(--display)', fontSize: 28,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>↑</div>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>
                    Upload proof photo
                  </div>
                  <div className="eyebrow">Tap to capture or choose</div>
                </button>
              )}
            </div>
          )}

          {error && <div className="notice notice-error" style={{ marginBottom: 18 }}>{error}</div>}

          <button
            onClick={handleSubmit}
            disabled={submitting || (needsPhoto && !photoFile)}
            className="btn btn-accent"
            style={{ width: '100%', height: 56, fontSize: 16 }}
          >
            {submitting ? (
              <><div className="spinner spinner-paper" /> Verifying…</>
            ) : (
              <>
                {needsPhoto ? 'Submit for verification' : 'Mark as complete'}
                <span className="btn-arrow">
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M2.5 9.5L9.5 2.5M4 2.5h5.5V8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </>
            )}
          </button>
          <p className="eyebrow" style={{ marginTop: 14, textAlign: 'center' }}>
            {needsPhoto ? 'Photo analyzed by Gemini AI · ≈3s' : 'Points awarded instantly'}
          </p>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 1000px) {
          .task-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
        }
      `}</style>
    </div>
  );
}
