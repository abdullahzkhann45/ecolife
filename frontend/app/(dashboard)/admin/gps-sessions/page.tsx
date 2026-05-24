'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import api from '@/lib/api';

// Dynamic import to avoid SSR crash with Leaflet
const TrailMap = dynamic(() => import('./TrailMap'), { ssr: false });

interface GpsSession {
  id: string;
  username: string;
  submissionId: string;
  pointCount: number;
  distanceMeters: number;
  durationSeconds: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  mode: string;
  verdict: string;
  confidence: number;
  antiCheatFlags: string[];
  adminOverrideBy: string | null;
  adminOverrideReason: string | null;
  createdAt: string;
}

export default function AdminGpsSessions() {
  const [sessions, setSessions] = useState<GpsSession[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [overriding, setOverriding] = useState(false);

  // Filters
  const [modeFilter, setModeFilter] = useState('');
  const [verdictFilter, setVerdictFilter] = useState('');

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (modeFilter) params.mode = modeFilter;
      if (verdictFilter) params.verdict = verdictFilter;
      const res = await api.get('/admin/gps-sessions', { params });
      setSessions(res.data.items);
      setTotal(res.data.total);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchSessions(); }, [page, modeFilter, verdictFilter]);

  const expandRow = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); setDetail(null); return; }
    setExpandedId(id);
    setDetail(null);
    try {
      const res = await api.get(`/admin/gps-sessions/${id}`);
      setDetail(res.data);
    } catch {}
  };

  const handleOverride = async (action: 'approve' | 'reject') => {
    if (!expandedId || !overrideReason.trim()) return;
    setOverriding(true);
    try {
      await api.patch(`/admin/gps-sessions/${expandedId}/override`, { action, reason: overrideReason });
      setOverrideReason('');
      fetchSessions();
      setExpandedId(null);
      setDetail(null);
    } catch {}
    setOverriding(false);
  };

  const fmtDuration = (s: number) => `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
  const fmtDist = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;

  const verdictColor = (v: string) => {
    if (v === 'approved') return 'var(--leaf)';
    if (v === 'rejected') return 'var(--danger)';
    return 'var(--accent)';
  };

  return (
    <div>
      <div className="page-head fade-up">
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>§ Admin</div>
          <h1>GPS <em>sessions</em>.</h1>
        </div>
        <div className="eyebrow">{total} total sessions</div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <select value={modeFilter} onChange={e => { setModeFilter(e.target.value); setPage(1); }}
          style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--paper-card)', fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer' }}>
          <option value="">All modes</option>
          <option value="walking">Walking</option>
          <option value="cycling">Cycling</option>
          <option value="vehicle">Vehicle</option>
          <option value="unknown">Unknown</option>
        </select>
        <select value={verdictFilter} onChange={e => { setVerdictFilter(e.target.value); setPage(1); }}
          style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--paper-card)', fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer' }}>
          <option value="">All verdicts</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="manual_review">Manual review</option>
        </select>
      </div>

      {/* Table */}
      <div className="eco-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 64, textAlign: 'center' }}><div className="spinner" /></div>
        ) : sessions.length === 0 ? (
          <div style={{ padding: 64, textAlign: 'center', color: 'var(--mute)' }}>No GPS sessions found.</div>
        ) : (
          <>
            {/* Header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 0.8fr 0.8fr 0.7fr 0.6fr 0.5fr 0.5fr',
              gap: 8, padding: '12px 20px', borderBottom: '1px solid var(--hair)',
              fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mute)',
            }}>
              <div>User</div><div>Distance</div><div>Duration</div><div>Avg Speed</div><div>Mode</div><div>Conf.</div><div>Verdict</div>
            </div>

            {sessions.map((s, i) => (
              <div key={s.id}>
                <div
                  onClick={() => expandRow(s.id)}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 0.8fr 0.8fr 0.7fr 0.6fr 0.5fr 0.5fr',
                    gap: 8, padding: '14px 20px', cursor: 'pointer',
                    borderBottom: '1px solid var(--hair)',
                    background: expandedId === s.id ? 'var(--paper-deep)' : 'transparent',
                    transition: 'background 0.15s',
                    fontSize: 13,
                  }}
                  onMouseOver={e => { if (expandedId !== s.id) e.currentTarget.style.background = 'var(--paper-deep)'; }}
                  onMouseOut={e => { if (expandedId !== s.id) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ fontWeight: 600 }}>@{s.username}</div>
                  <div>{fmtDist(s.distanceMeters)}</div>
                  <div>{fmtDuration(s.durationSeconds)}</div>
                  <div>{s.avgSpeedKmh.toFixed(1)} km/h</div>
                  <div><span className="pill" style={{ fontSize: 10, padding: '2px 8px' }}>{s.mode}</span></div>
                  <div>{s.confidence}%</div>
                  <div style={{ color: verdictColor(s.verdict), fontWeight: 600 }}>{s.verdict}</div>
                </div>

                {/* Expanded detail */}
                {expandedId === s.id && (
                  <div style={{ padding: '20px 24px', borderBottom: '2px solid var(--hair)', background: 'var(--paper-deep)' }}>
                    {!detail ? (
                      <div style={{ textAlign: 'center', padding: 24 }}><div className="spinner" /></div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                        {/* Map */}
                        <div>
                          <div className="eyebrow" style={{ marginBottom: 10 }}>§ Route map</div>
                          {detail.rawTrail && detail.rawTrail.length >= 2 ? (
                            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--hair)', height: 320 }}>
                              <TrailMap trail={detail.rawTrail} flags={detail.antiCheatFlags} />
                            </div>
                          ) : (
                            <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper-card)', borderRadius: 12, color: 'var(--mute)', fontSize: 13 }}>
                              Trail data expired or unavailable
                            </div>
                          )}
                        </div>

                        {/* Details + Override */}
                        <div>
                          <div className="eyebrow" style={{ marginBottom: 10 }}>§ Verdict details</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, marginBottom: 16 }}>
                            <div><span style={{ color: 'var(--mute)' }}>Mode:</span> <strong>{detail.mode}</strong></div>
                            <div><span style={{ color: 'var(--mute)' }}>Points:</span> {detail.pointCount}</div>
                            <div><span style={{ color: 'var(--mute)' }}>Distance:</span> {fmtDist(detail.distanceMeters)}</div>
                            <div><span style={{ color: 'var(--mute)' }}>Duration:</span> {fmtDuration(detail.durationSeconds)}</div>
                            <div><span style={{ color: 'var(--mute)' }}>Avg speed:</span> {detail.avgSpeedKmh.toFixed(1)} km/h</div>
                            <div><span style={{ color: 'var(--mute)' }}>Max speed:</span> {detail.maxSpeedKmh.toFixed(1)} km/h</div>
                            <div><span style={{ color: 'var(--mute)' }}>Confidence:</span> {detail.confidence}%</div>
                            <div><span style={{ color: 'var(--mute)' }}>Verdict:</span> <strong style={{ color: verdictColor(detail.verdict) }}>{detail.verdict}</strong></div>
                          </div>

                          {detail.antiCheatFlags.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                              <div className="eyebrow" style={{ marginBottom: 6 }}>§ Flags</div>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {detail.antiCheatFlags.map((f: string, i: number) => (
                                  <span key={i} className="pill" style={{ fontSize: 10, padding: '2px 8px', background: 'var(--danger)', color: 'var(--paper)' }}>{f}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {detail.adminOverrideBy && (
                            <div className="notice" style={{ fontSize: 12, marginBottom: 16 }}>
                              Overridden by admin: {detail.adminOverrideReason}
                            </div>
                          )}

                          <div className="eyebrow" style={{ marginBottom: 8 }}>§ Override</div>
                          <input
                            type="text" placeholder="Reason for override..."
                            value={overrideReason} onChange={e => setOverrideReason(e.target.value)}
                            style={{
                              width: '100%', padding: '10px 14px', borderRadius: 10,
                              border: '1px solid var(--hair)', background: 'var(--paper-card)',
                              fontFamily: 'var(--body)', fontSize: 13, marginBottom: 10,
                            }}
                          />
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <button onClick={() => handleOverride('approve')} disabled={overriding || !overrideReason.trim()}
                              className="btn" style={{ height: 38, fontSize: 12, background: 'var(--leaf)', color: 'var(--paper)', border: 0 }}>
                              Approve
                            </button>
                            <button onClick={() => handleOverride('reject')} disabled={overriding || !overrideReason.trim()}
                              className="btn btn-danger" style={{ height: 38, fontSize: 12 }}>
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Pagination */}
      {total > 15 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 24 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="btn btn-soft" style={{ height: 36, fontSize: 12 }}>Previous</button>
          <span className="eyebrow" style={{ alignSelf: 'center' }}>Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={sessions.length < 15}
            className="btn btn-soft" style={{ height: 36, fontSize: 12 }}>Next</button>
        </div>
      )}
    </div>
  );
}
