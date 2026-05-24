'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useGPSTracking } from '@/lib/use-gps-tracking';
import { useAuth } from '@/lib/auth-context';
import GpsConsentModal from '@/components/gps/GpsConsentModal';
import PermissionDeniedScreen from '@/components/gps/PermissionDeniedScreen';

const MECHANISM_INFO: Record<string, { label: string; needsPhoto: boolean }> = {
  photo: { label: 'Photo proof + AI verification', needsPhoto: true },
  sensor: { label: 'Sensor tracking + photo', needsPhoto: true },
  geo: { label: 'GPS tracking verification', needsPhoto: false },
  receipt: { label: 'Receipt scan + OCR', needsPhoto: true },
  self_attest: { label: 'Self-confirm', needsPhoto: false },
};

const CATEGORY_GLYPH: Record<string, string> = {
  transport: '↗', diet: '◍', energy: '⚡', water: '💧', waste: '↻', consumption: '◊',
};

const RATING_LABELS = ['', 'Barely', 'Somewhat', 'Decent effort', 'Good job', 'Nailed it'];

export default function TaskDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [task, setTask] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [selfRating, setSelfRating] = useState<number>(0);
  const [committed, setCommitted] = useState(false);
  const [gpsResult, setGpsResult] = useState<any>(null);
  const [gpsSubmitting, setGpsSubmitting] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gps = useGPSTracking();
  const { user, updateUser } = useAuth();

  useEffect(() => {
    api.get(`/tasks/${id}`).then(res => setTask(res.data));
    api.get('/tasks/commitments').then(res => {
      const ids = res.data.map((c: any) => c.taskId);
      setCommitted(ids.includes(id));
    }).catch(() => {});
  }, [id]);

  const isSelfRating = task?.selfRatingEnabled;
  const isTransportGPS = task?.category === 'transport' && task?.verificationMechanism === 'geo';
  const needsPhoto = task ? (!isSelfRating && !isTransportGPS && (MECHANISM_INFO[task.verificationMechanism]?.needsPhoto ?? false)) : false;

  const handleGPSStart = async () => {
    if (!user?.gpsConsentShown) {
      setShowConsent(true);
      return;
    }
    gps.start();
  };

  const handleConsentAccept = async () => {
    try { await api.patch('/users/me', { gpsConsentShown: true }); } catch {}
    updateUser({ gpsConsentShown: true });
    setShowConsent(false);
    gps.start();
  };

  const handleSkipGPS = async () => {
    try {
      const res = await api.post(`/tasks/${id}/submit`, {
        metadata: JSON.stringify({ selfReported: true, noGps: true }),
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Skip submission failed');
    }
  };

  const handleGPSSubmit = async () => {
    const trail = gps.stop();
    if (trail.length < 2) { setError(`Only ${trail.length} GPS point(s) recorded. Make sure location is enabled, move around, and track for at least 1 minute.`); return; }
    setGpsSubmitting(true);
    setError('');
    try {
      const res = await api.post(`/tasks/${id}/verify-gps`, { trail, hasPhoto: false });
      setGpsResult(res.data);
      if (res.data.requiresPhoto) {
        setError('GPS signal too weak. Please upload a photo to verify this trip.');
      } else if (res.data.verdict?.approved) {
        setResult(res.data);
      } else {
        setError(res.data.verdict?.rejectionReason || res.data.rejectionReason || 'GPS verification failed. Try again with a longer trip.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'GPS submission failed');
    } finally { setGpsSubmitting(false); }
  };

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
    if (isSelfRating && selfRating === 0) { setError('Select a rating before submitting'); return; }
    if (needsPhoto && !photoFile) { setError('Upload a photo to verify this task'); return; }
    setSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('metadata', JSON.stringify({ submittedAt: new Date().toISOString() }));
      if (isSelfRating) formData.append('selfRating', String(selfRating));
      if (photoFile) formData.append('photo', photoFile);
      const res = await api.post(`/tasks/${id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Submission failed');
    } finally { setSubmitting(false); }
  };

  const toggleCommit = async () => {
    try {
      if (committed) await api.delete(`/tasks/${id}/commit`);
      else await api.post(`/tasks/${id}/commit`);
      setCommitted(!committed);
    } catch {}
  };

  if (!task) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '128px 0' }}><div className="spinner" /></div>;

  const mech = MECHANISM_INFO[task.verificationMechanism] || MECHANISM_INFO.self_attest;

  // ── RESULT SCREEN ──
  if (result) {
    const approved = result.status === 'approved';
    const rejected = result.status === 'rejected';
    const manualReview = result.status === 'manual_review' || result.needsManualReview;
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', paddingTop: 32 }}>
        <div className="eco-card pop-in" style={{ padding: 48, textAlign: 'center' }}>
          <div className="eyebrow" style={{ marginBottom: 18 }}>
            {approved && !manualReview ? '§ Verified' : manualReview ? '§ Under review' : rejected ? '§ Rejected' : '§ Under review'}
          </div>
          <h1 className="display" style={{ fontSize: 64, marginBottom: 16 }}>
            {approved && !manualReview ? <>Task <em>complete</em>.</> : manualReview ? <>Under <em>review</em>.</> : rejected ? <>Not <em>verified</em>.</> : <>Pending <em>audit</em>.</>}
          </h1>
          <p style={{ fontSize: 17, color: 'var(--mute)', maxWidth: '38ch', margin: '0 auto 28px', lineHeight: 1.5 }}>
            {manualReview ? `Provisional ${result.pointsAwarded} points awarded. Full points pending admin review.` : approved ? `You earned ${result.pointsAwarded} points.` : rejected ? 'Try again with a clearer shot.' : 'Flagged for review.'}
          </p>
          {result.rejectionReason && <div className="notice notice-error" style={{ textAlign: 'left', marginBottom: 24 }}>{result.rejectionReason}</div>}
          {result.verdict && (
            <div className="eco-card" style={{ textAlign: 'left', marginBottom: 24, padding: 20 }}>
              <div className="eyebrow" style={{ marginBottom: 12 }}>§ GPS trip summary</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 14 }}>
                <div><span style={{ color: 'var(--mute)' }}>Mode:</span> <strong>{result.verdict.mode}</strong></div>
                <div><span style={{ color: 'var(--mute)' }}>Distance:</span> <strong>{result.verdict.distanceKm} km</strong></div>
                <div><span style={{ color: 'var(--mute)' }}>Duration:</span> <strong>{result.verdict.durationMinutes} min</strong></div>
                <div><span style={{ color: 'var(--mute)' }}>Avg speed:</span> <strong>{result.verdict.avgSpeedKmh} km/h</strong></div>
                <div><span style={{ color: 'var(--mute)' }}>CO₂ saved:</span> <strong style={{ color: 'var(--leaf)' }}>{result.verdict.co2SavedGrams}g</strong></div>
                <div><span style={{ color: 'var(--mute)' }}>Confidence:</span> <strong>{result.verdict.confidence}%</strong></div>
              </div>
            </div>
          )}
          {result.selfRating && <div className="eyebrow" style={{ marginBottom: 16 }}>Self-rating · {result.selfRating}/5</div>}
          {result.aiConfidence != null && !result.selfRating && !result.verdict && <div className="eyebrow" style={{ marginBottom: 24 }}>AI confidence · {result.aiConfidence}%</div>}
          {approved && (
            <div style={{ background: 'var(--accent)', color: 'var(--paper)', borderRadius: 14, padding: '20px 24px', marginBottom: 28 }}>
              <div className="bignum" style={{ fontSize: 56, color: 'var(--paper)' }}>
                +{result.pointsAwarded}<span className="unit" style={{ color: 'rgba(239,233,215,0.7)' }}>PTS</span>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rejected && <button onClick={() => { setResult(null); setPhotoFile(null); setPhotoPreview(null); }} className="btn btn-accent" style={{ width: '100%' }}>Try a different photo</button>}
            <button onClick={() => router.push('/tasks')} className="btn btn-primary" style={{ width: '100%' }}>Back to tasks</button>
            <button onClick={() => router.push('/home')} className="btn btn-soft" style={{ width: '100%' }}>Go home</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => router.back()} style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mute)', marginBottom: 24, display: 'inline-flex', alignItems: 'center', gap: 8 }}>← Back</button>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(340px, 1fr)', gap: 48, alignItems: 'start' }} className="task-grid">
        {/* Left: details */}
        <div>
          <div className="page-head" style={{ marginBottom: 32, paddingBottom: 0, borderBottom: 0 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 14 }}>§ {task.category} · {task.basePoints} pts</div>
              <h1>{task.title.split(' ').slice(0, -1).join(' ')} <em>{task.title.split(' ').slice(-1)[0]}</em>.</h1>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
            <div style={{ width: 88, height: 88, borderRadius: 18, background: 'var(--ink)', color: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontSize: 44, fontWeight: 700, flexShrink: 0 }}>
              {CATEGORY_GLYPH[task.category] ?? '◯'}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="pill pill-ink">{task.category}</span>
              <span className="pill pill-accent">{task.basePoints} pts</span>
              {isSelfRating && <span className="pill" style={{ background: 'var(--paper-deep)' }}>Self-rate</span>}
              <button onClick={toggleCommit} className={`btn ${committed ? 'btn-accent' : 'btn-soft'}`} style={{ height: 34, fontSize: 12 }}>
                {committed ? '♥ Committed' : '♡ Commit'}
              </button>
            </div>
          </div>

          <div className="eco-card" style={{ marginBottom: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>§ The task</div>
            <p style={{ fontSize: 17, lineHeight: 1.55 }}>{task.description}</p>
          </div>

          {(task.co2SavedGrams > 0 || task.waterSavedLiters > 0 || task.wasteDivertedGrams > 0) && (
            <div className="eco-card">
              <div className="eyebrow" style={{ marginBottom: 16 }}>§ Estimated impact</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 18 }}>
                {task.co2SavedGrams > 0 && <div><div className="bignum" style={{ fontSize: 36, color: 'var(--leaf)' }}>{(task.co2SavedGrams / 1000).toFixed(1)}<span className="unit">KG</span></div><div className="eyebrow" style={{ marginTop: 6 }}>CO₂ saved</div></div>}
                {task.waterSavedLiters > 0 && <div><div className="bignum" style={{ fontSize: 36 }}>{task.waterSavedLiters}<span className="unit">L</span></div><div className="eyebrow" style={{ marginTop: 6 }}>Water saved</div></div>}
                {task.wasteDivertedGrams > 0 && <div><div className="bignum" style={{ fontSize: 36, color: 'var(--accent)' }}>{task.wasteDivertedGrams}<span className="unit">G</span></div><div className="eyebrow" style={{ marginTop: 6 }}>Diverted</div></div>}
              </div>
            </div>
          )}
        </div>

        {/* Right: verify */}
        <div style={{ position: 'sticky', top: 96 }}>
          <div className="eco-card ink" style={{ marginBottom: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 10, color: 'rgba(239,233,215,0.6)' }}>§ Verification</div>
            <p style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 22, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 12 }}>
              {isSelfRating ? 'Self-rating (1–5)' : mech.label}
            </p>
            <p style={{ fontSize: 13, color: 'rgba(239,233,215,0.65)', lineHeight: 1.55 }}>{task.proofInstructions}</p>
          </div>

          {/* Self-rating UI */}
          {isSelfRating && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {[1, 2, 3, 4, 5].map(n => {
                  const selected = selfRating === n;
                  const pts = Math.round(task.basePoints * (n / 5));
                  return (
                    <button key={n} onClick={() => setSelfRating(n)} style={{
                      appearance: 'none', border: '2px solid', cursor: 'pointer',
                      borderColor: selected ? 'var(--accent)' : 'var(--hair)',
                      background: selected ? 'var(--accent)' : 'var(--paper-card)',
                      color: selected ? 'var(--paper)' : 'var(--ink)',
                      borderRadius: 14, padding: '16px 8px', textAlign: 'center',
                      transition: 'all 0.18s',
                    }}>
                      <div style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 700 }}>{n}</div>
                      <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7 }}>{RATING_LABELS[n]}</div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, marginTop: 6, letterSpacing: '0.1em' }}>{pts} pts</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Photo upload */}
          {needsPhoto && (
            <div style={{ marginBottom: 18 }}>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} style={{ display: 'none' }} />
              {photoPreview ? (
                <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--hair)' }}>
                  <img src={photoPreview} alt="Proof" style={{ width: '100%', height: 240, objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
                    <button onClick={() => fileInputRef.current?.click()} style={{ background: 'var(--paper)', border: 0, color: 'var(--ink)', padding: '6px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500 }}>Change</button>
                    <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} style={{ background: 'var(--danger)', border: 0, color: 'var(--paper)', width: 28, height: 28, borderRadius: 999, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} style={{
                  width: '100%', minHeight: 240, background: 'var(--paper-card)', border: '2px dashed var(--hair)', borderRadius: 16,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'pointer', color: 'var(--ink)', padding: 24, transition: 'border-color 0.18s',
                }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--ink)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--hair)'; }}
                >
                  <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--ink)', color: 'var(--paper)', fontFamily: 'var(--display)', fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↑</div>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 600 }}>Upload proof photo</div>
                  <div className="eyebrow">Tap to capture or choose</div>
                </button>
              )}
            </div>
          )}

          {/* GPS consent modal */}
          {showConsent && <GpsConsentModal onAccept={handleConsentAccept} />}

          {/* GPS tracking panel */}
          {isTransportGPS && (
            <div style={{ marginBottom: 18 }}>
              {/* Permission denied */}
              {gps.permissionDenied && (
                <PermissionDeniedScreen onRetry={gps.start} onSkip={handleSkipGPS} />
              )}

              {!gps.isTracking && gps.trail.length === 0 && !gps.permissionDenied && (
                <button onClick={handleGPSStart} className="btn btn-accent" style={{ width: '100%', height: 64, fontSize: 16, gap: 12 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>
                  Start GPS tracking
                </button>
              )}

              {gps.isTracking && (
                <div className="eco-card" style={{ background: 'var(--leaf)', color: 'var(--paper)', padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div className="eyebrow" style={{ color: 'rgba(239,233,215,0.7)' }}>§ Tracking active</div>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#fff', animation: 'pulse 1.5s infinite' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 4 }}>Time</div>
                      <div className="display" style={{ fontSize: 36, color: 'var(--paper)' }}>
                        {Math.floor(gps.elapsed / 60)}:{(gps.elapsed % 60).toString().padStart(2, '0')}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 4 }}>Distance</div>
                      <div className="display" style={{ fontSize: 36, color: 'var(--paper)' }}>
                        {gps.distanceMeters >= 1000 ? `${(gps.distanceMeters / 1000).toFixed(2)}` : gps.distanceMeters}
                        <span className="unit" style={{ color: 'rgba(239,233,215,0.6)' }}>{gps.distanceMeters >= 1000 ? 'KM' : 'M'}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 4 }}>Points</div>
                      <div style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 700 }}>{gps.trail.length}</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 4 }}>Speed</div>
                      <div style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 700 }}>
                        {gps.currentSpeed != null ? `${(gps.currentSpeed * 3.6).toFixed(1)} km/h` : '—'}
                      </div>
                    </div>
                  </div>

                  <button onClick={handleGPSSubmit} disabled={gpsSubmitting}
                    className="btn" style={{ width: '100%', height: 48, fontSize: 14, background: 'var(--paper)', color: 'var(--ink)', border: 0 }}>
                    {gpsSubmitting ? <><div className="spinner" /> Verifying trail…</> : `Stop & verify trip (${gps.trail.length} pts)`}
                  </button>
                </div>
              )}

              {!gps.isTracking && gps.trail.length > 0 && !gpsResult && (
                <div style={{ display: 'grid', gap: 8 }}>
                  <button onClick={handleGPSSubmit} disabled={gpsSubmitting} className="btn btn-accent" style={{ width: '100%', height: 48, fontSize: 14 }}>
                    {gpsSubmitting ? 'Verifying…' : `Submit ${gps.trail.length} GPS points`}
                  </button>
                  <button onClick={gps.reset} className="btn btn-soft" style={{ width: '100%', height: 40, fontSize: 13 }}>Reset & start over</button>
                </div>
              )}

              {gpsResult && !gpsResult.verdict?.approved && (
                <div style={{ marginTop: 12 }}>
                  <div className="eco-card" style={{ background: 'var(--paper-deep)', padding: 20, marginBottom: 12 }}>
                    <div className="eyebrow" style={{ marginBottom: 10 }}>§ GPS result</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                      <div><span style={{ color: 'var(--mute)' }}>Mode:</span> {gpsResult.verdict?.mode}</div>
                      <div><span style={{ color: 'var(--mute)' }}>Distance:</span> {gpsResult.verdict?.distanceKm} km</div>
                      <div><span style={{ color: 'var(--mute)' }}>Avg speed:</span> {gpsResult.verdict?.avgSpeedKmh} km/h</div>
                      <div><span style={{ color: 'var(--mute)' }}>Confidence:</span> {gpsResult.verdict?.confidence}%</div>
                    </div>
                  </div>
                  <button onClick={() => { setGpsResult(null); gps.reset(); }} className="btn btn-accent" style={{ width: '100%', height: 44, fontSize: 13 }}>Try again</button>
                </div>
              )}
            </div>
          )}

          {gps.error && <div className="notice notice-error" style={{ marginBottom: 18 }}>{gps.error}</div>}
          {error && <div className="notice notice-error" style={{ marginBottom: 18 }}>{error}</div>}

          {!isTransportGPS && (
            <>
              <button onClick={handleSubmit}
                disabled={submitting || (needsPhoto && !photoFile) || (isSelfRating && selfRating === 0)}
                className="btn btn-accent" style={{ width: '100%', height: 56, fontSize: 16 }}>
                {submitting ? <><div className="spinner spinner-paper" /> Verifying…</> : (
                  <>
                    {isSelfRating ? `Submit rating (${selfRating}/5)` : needsPhoto ? 'Submit for verification' : 'Mark as complete'}
                    <span className="btn-arrow"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2.5 9.5L9.5 2.5M4 2.5h5.5V8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                  </>
                )}
              </button>
              <p className="eyebrow" style={{ marginTop: 14, textAlign: 'center' }}>
                {isSelfRating ? 'Points scaled by your rating' : needsPhoto ? 'Photo analyzed by Gemini AI · ≈3s' : 'Points awarded instantly'}
              </p>
            </>
          )}
          {isTransportGPS && !gps.isTracking && gps.trail.length === 0 && (
            <p className="eyebrow" style={{ marginTop: 14, textAlign: 'center' }}>
              GPS trail verified for distance, speed & mode · anti-cheat enabled
            </p>
          )}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 1000px) { .task-grid { grid-template-columns: 1fr !important; gap: 32px !important; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
