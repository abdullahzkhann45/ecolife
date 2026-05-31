'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

type Tab = 'leaderboard' | 'friends' | 'requests';

export default function FriendsPage() {
  const [tab, setTab] = useState<Tab>('leaderboard');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [addUsername, setAddUsername] = useState('');
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = async () => {
    try {
      const [lb, fr, pr] = await Promise.all([
        api.get('/friends/leaderboard'),
        api.get('/friends'),
        api.get('/friends/pending'),
      ]);
      setLeaderboard(lb.data);
      setFriends(fr.data);
      setPending(pr.data);
    } catch (err: any) {
      setAddError(err.response?.data?.message || 'Failed to load friends');
    }
  };

  useEffect(() => { load(); }, []);

  const handleAddFriend = async () => {
    const username = addUsername.trim().toLowerCase();
    if (!username) return;
    setAddError(''); setAddSuccess(''); setLoading(true);
    try {
      await api.post('/friends/request', { username });
      setAddSuccess(`Friend request sent to @${username}`);
      setAddUsername('');
      await load();
    } catch (err: any) {
      setAddError(err.response?.data?.message || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id: string) => {
    if (!id) return;
    setAddError(''); setActionId(id);
    try {
      await api.post(`/friends/${id}/accept`);
      await load();
      setTab('friends');
    } catch (err: any) {
      setAddError(err.response?.data?.message || 'Failed to accept request');
    } finally {
      setActionId(null);
    }
  };

  const handleRemove = async (id: string) => {
    if (!id) return;
    setAddError(''); setActionId(id);
    try {
      await api.delete(`/friends/${id}`);
      await load();
    } catch (err: any) {
      setAddError(err.response?.data?.message || 'Failed to update friendship');
    } finally {
      setActionId(null);
    }
  };

  const avatarColors = ['var(--accent)', 'var(--leaf)', 'var(--ink)'];
  const initials = (s: string) => s.slice(0, 2).toUpperCase();

  return (
    <div>
      <div className="page-head fade-up">
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>§ 05 — Friends &amp; competition</div>
          <h1>
            Solo trackers<br /><em>die</em> quietly.
          </h1>
        </div>
        <p className="page-sub">
          Weekly leaderboards rank by points earned this week, not absolute eco score — so a new friend joining today is competitive on day one.
        </p>
      </div>

      {/* Top row: add friend + tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) auto', gap: 24, alignItems: 'center', marginBottom: 32, flexWrap: 'wrap' }} className="friends-top">
        <div className="eco-card" style={{ padding: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="text"
            value={addUsername}
            onChange={e => setAddUsername(e.target.value)}
            placeholder="Add a friend by username…"
            className="eco-input"
            style={{ padding: '6px 10px', flex: 1, fontSize: 15, borderBottom: 0 }}
            onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
          />
          <button
            onClick={handleAddFriend}
            disabled={loading || !addUsername.trim()}
            className="btn btn-accent"
            style={{ height: 40, padding: '0 18px', fontSize: 13 }}
          >
            {loading ? <div className="spinner spinner-paper" /> : 'Send request'}
          </button>
        </div>

        <div className="tab-bar">
          {([
            { id: 'leaderboard', label: 'Leaderboard' },
            { id: 'friends', label: `Friends · ${friends.length}` },
            { id: 'requests', label: `Requests · ${pending.length}` },
          ] as { id: Tab; label: string }[]).map(({ id, label }) => (
            <button key={id} onClick={() => setTab(id)} className={`tab-btn ${tab === id ? 'active' : ''}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {addError && <div className="notice notice-error" style={{ marginBottom: 24 }}>{addError}</div>}
      {addSuccess && <div className="notice notice-ok" style={{ marginBottom: 24 }}>{addSuccess}</div>}

      {/* Leaderboard */}
      {tab === 'leaderboard' && (
        <div className="eco-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 26px', borderBottom: '1px solid var(--hair)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div className="display" style={{ fontSize: 22 }}>Weekly leaderboard</div>
            <div className="eyebrow">Mon → Sun</div>
          </div>
          {leaderboard.length === 0 ? (
            <div style={{ padding: '80px 24px', textAlign: 'center' }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>§ Empty</div>
              <p style={{ color: 'var(--mute)', fontSize: 15 }}>Add friends to see the leaderboard.</p>
            </div>
          ) : (
            <div className="stagger">
              {leaderboard.map((entry, i) => (
                <div
                  key={entry.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 52px 1fr auto',
                    gap: 16, alignItems: 'center',
                    padding: '18px 26px',
                    borderBottom: i < leaderboard.length - 1 ? '1px solid var(--hair)' : 0,
                    background: entry.isCurrentUser ? 'var(--accent-soft)' : 'transparent',
                  }}
                >
                  <div className="display" style={{ fontSize: 28, color: i < 3 ? 'var(--accent)' : 'var(--mute)' }}>
                    {String(entry.rank).padStart(2, '0')}
                  </div>
                  <div className="avatar" style={{ background: avatarColors[i % 3] }}>
                    {initials(entry.username)}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>
                      @{entry.username}{entry.isCurrentUser && <span style={{ color: 'var(--accent)', fontFamily: 'var(--serif)', fontStyle: 'italic', marginLeft: 8 }}>· you</span>}
                    </div>
                    <div className="eyebrow" style={{ marginTop: 4 }}>this week</div>
                  </div>
                  <div className="display" style={{ fontSize: 32 }}>
                    {entry.weeklyPoints.toLocaleString()}
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.14em', color: 'var(--mute)', marginLeft: 6, fontWeight: 500 }}>PTS</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Friends */}
      {tab === 'friends' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }} className="stagger">
          {friends.length === 0 ? (
            <div className="eco-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '80px 24px' }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>§ Empty</div>
              <p style={{ color: 'var(--mute)', fontSize: 15 }}>No friends yet. Send a request above.</p>
            </div>
          ) : friends.map((f, i) => (
            <div key={f.friendshipId} className="eco-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="avatar" style={{ background: avatarColors[i % 3] }}>{initials(f.username)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em' }}>@{f.username}</div>
                <div className="eyebrow" style={{ marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.email}</div>
              </div>
              <button onClick={() => handleRemove(f.friendshipId)} className="btn btn-danger" style={{ height: 32, fontSize: 11, padding: '0 12px' }}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Requests */}
      {tab === 'requests' && (
        <div style={{ display: 'grid', gap: 12 }} className="stagger">
          {pending.length === 0 ? (
            <div className="eco-card" style={{ textAlign: 'center', padding: '80px 24px' }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>§ Empty</div>
              <p style={{ color: 'var(--mute)', fontSize: 15 }}>No pending friend requests.</p>
            </div>
          ) : pending.map((req, i) => {
            const requestId = req.id || req._id;
            return (
            <div key={requestId} className="eco-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="avatar" style={{ background: avatarColors[i % 3] }}>{initials(req.requester?.username ?? '?')}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em' }}>@{req.requester?.username}</div>
                <div className="eyebrow" style={{ marginTop: 4 }}>wants to be friends</div>
              </div>
              <button onClick={() => handleAccept(requestId)} disabled={actionId === requestId} className="btn btn-accent" style={{ height: 36, fontSize: 12 }}>
                {actionId === requestId ? 'Working...' : 'Accept'}
              </button>
              <button onClick={() => handleRemove(requestId)} disabled={actionId === requestId} className="btn btn-danger" style={{ height: 36, fontSize: 12 }}>
                Decline
              </button>
            </div>
          )})}
        </div>
      )}

      <style jsx>{`
        @media (max-width: 900px) {
          .friends-top { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
