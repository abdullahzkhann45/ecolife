'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

type Tab = 'shop' | 'inventory';

function ShopShape({ kind }: { kind: string }) {
  const c = 'rgba(255,255,255,0.94)';
  if (kind === 'flame') return <svg width="50%" height="70%" viewBox="0 0 100 140" fill={c}><path d="M50 0 C 80 30 90 60 80 90 C 90 95 95 110 90 125 C 80 140 60 140 50 140 C 40 140 20 140 10 125 C 5 110 10 95 20 90 C 10 60 20 30 50 0 Z" /></svg>;
  if (kind === 'blob') return <svg width="70%" height="70%" viewBox="0 0 100 100" fill={c}><path d="M50 5 C 80 5 95 30 95 55 C 95 85 70 95 50 95 C 25 95 5 80 5 55 C 5 30 20 5 50 5 Z" /></svg>;
  if (kind === 'lightning') return <svg width="50%" height="80%" viewBox="0 0 60 100" fill={c}><path d="M35 0 L 0 56 H 26 L 18 100 L 60 38 H 32 Z" /></svg>;
  if (kind === 'leaf') return <svg width="70%" height="70%" viewBox="0 0 100 100" fill={c}><path d="M10 90 C 10 40 40 10 90 10 C 90 60 60 90 10 90 Z" /><path d="M10 90 L 60 40" stroke="rgba(0,0,0,0.18)" strokeWidth="3" fill="none" /></svg>;
  if (kind === 'ice') return <svg width="70%" height="70%" viewBox="0 0 100 100" fill="none" stroke={c} strokeWidth="4" strokeLinecap="round"><path d="M50 8v84M22 28l56 44M22 72l56-44M8 50h84" /></svg>;
  return <svg width="70%" height="70%" viewBox="0 0 100 100" fill="none" stroke={c} strokeWidth="6"><circle cx="50" cy="50" r="38" /></svg>;
}

const GRADIENTS: Record<string, { bg: string; shape: string }> = {
  cosmetic: { bg: 'linear-gradient(135deg, #ffb774, #c75a2a)', shape: 'flame' },
  booster: { bg: 'linear-gradient(135deg, #bcdcfe, #7ea7d8)', shape: 'ice' },
  real_world: { bg: 'linear-gradient(135deg, #6f8a3a, #2e5a3a)', shape: 'leaf' },
  default: { bg: 'linear-gradient(135deg, #e8d97e, #a87a2a)', shape: 'blob' },
};

function pickArt(type: string, name: string) {
  const key = type?.toLowerCase().replace(/[-\s]/g, '_');
  if (GRADIENTS[key]) return GRADIENTS[key];
  // Fallback by name hint
  if (/freeze|ice|frost/i.test(name)) return { bg: 'linear-gradient(135deg, #bcdcfe, #7ea7d8)', shape: 'ice' };
  if (/flame|fire|ember/i.test(name)) return { bg: 'linear-gradient(135deg, #ffb774, #c75a2a)', shape: 'flame' };
  if (/leaf|tree|forest|moss/i.test(name)) return { bg: 'linear-gradient(135deg, #b7c98a, #6f8a3a)', shape: 'leaf' };
  if (/boost|2x|double|hour/i.test(name)) return { bg: 'linear-gradient(135deg, #e8d97e, #a87a2a)', shape: 'lightning' };
  return GRADIENTS.default;
}

export default function ShopPage() {
  const [tab, setTab] = useState<Tab>('shop');
  const [items, setItems] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const [shopRes, invRes, ptsRes] = await Promise.all([
      api.get('/shop'),
      api.get('/shop/inventory'),
      api.get('/points'),
    ]);
    setItems(shopRes.data);
    setInventory(invRes.data);
    setBalance(ptsRes.data.balance);
  };

  useEffect(() => { load(); }, []);

  const handlePurchase = async (itemId: string, itemName: string) => {
    setPurchasing(itemId);
    setMessage(''); setError('');
    try {
      await api.post(`/shop/${itemId}/purchase`);
      setMessage(`Purchased ${itemName}`);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Purchase failed');
    } finally {
      setPurchasing(null);
    }
  };

  const handleEquip = async (inventoryId: string) => {
    await api.post(`/shop/inventory/${inventoryId}/equip`);
    await load();
  };

  const ownedIds = new Set(inventory.map(i => i.shopItemId));

  return (
    <div>
      <div className="page-head fade-up">
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>§ 06 — Spend your points</div>
          <h1>
            Cosmetics,<br />boosters,<br /><em>real good</em>.
          </h1>
        </div>
        <p className="page-sub">
          Points are an in-app currency, not vapor. The ledger is immutable; sink and source are tracked globally so the economy never inflates.
        </p>
      </div>

      {/* Top bar: balance + tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, marginBottom: 32, flexWrap: 'wrap' }}>
        <div className="tab-bar">
          {([
            { id: 'shop', label: 'Shop' },
            { id: 'inventory', label: `My items · ${inventory.length}` },
          ] as { id: Tab; label: string }[]).map(({ id, label }) => (
            <button key={id} onClick={() => setTab(id)} className={`tab-btn ${tab === id ? 'active' : ''}`}>
              {label}
            </button>
          ))}
        </div>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '10px 20px', borderRadius: 999,
          background: 'var(--ink)', color: 'var(--paper)',
        }}>
          <span className="eyebrow" style={{ color: 'rgba(239,233,215,0.55)' }}>Balance</span>
          <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em' }}>
            {balance.toLocaleString()}
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.14em', color: 'rgba(239,233,215,0.55)' }}>PTS</span>
        </div>
      </div>

      {message && <div className="notice notice-ok" style={{ marginBottom: 24 }}>{message}</div>}
      {error && <div className="notice notice-error" style={{ marginBottom: 24 }}>{error}</div>}

      {tab === 'shop' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 18 }} className="stagger">
          {items.map(item => {
            const owned = ownedIds.has(item.id);
            const canAfford = balance >= item.price;
            const art = pickArt(item.type, item.name);
            return (
              <div
                key={item.id}
                className="eco-card"
                style={{
                  padding: 0, overflow: 'hidden',
                  display: 'flex', flexDirection: 'column',
                  opacity: owned ? 0.78 : 1,
                }}
              >
                <div style={{
                  aspectRatio: '1 / 1', background: art.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderBottom: '1px solid var(--hair)',
                }}>
                  <ShopShape kind={art.shape} />
                </div>
                <div style={{ padding: 18, display: 'flex', flexDirection: 'column', flex: 1, gap: 6 }}>
                  <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 18, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                    {item.name}
                  </div>
                  <div className="eyebrow">{item.type}</div>
                  {item.description && (
                    <p style={{ fontSize: 12.5, color: 'var(--mute)', lineHeight: 1.5, margin: '4px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.description}
                    </p>
                  )}
                  <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid var(--hair)' }}>
                    <div className="display" style={{ fontSize: 24 }}>
                      {item.price.toLocaleString()}
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--mute)', marginLeft: 4, fontWeight: 500 }}>PTS</span>
                    </div>
                    {owned ? (
                      <span className="pill pill-leaf">Owned</span>
                    ) : (
                      <button
                        onClick={() => handlePurchase(item.id, item.name)}
                        disabled={!canAfford || purchasing === item.id}
                        className="btn btn-accent"
                        style={{ height: 32, fontSize: 11.5, padding: '0 14px' }}
                      >
                        {purchasing === item.id ? <div className="spinner spinner-paper" style={{ width: 14, height: 14 }} /> : (canAfford ? 'Buy' : 'Locked')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="eco-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '80px 24px' }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>§ Empty</div>
              <p style={{ color: 'var(--mute)' }}>Shop is loading…</p>
            </div>
          )}
        </div>
      )}

      {tab === 'inventory' && (
        <div style={{ display: 'grid', gap: 12 }} className="stagger">
          {inventory.length === 0 ? (
            <div className="eco-card" style={{ textAlign: 'center', padding: '80px 24px' }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>§ Empty</div>
              <p style={{ color: 'var(--mute)' }}>No items yet. Earn points and buy your first reward.</p>
            </div>
          ) : inventory.map(inv => {
            const art = pickArt(inv.shopItem?.type ?? '', inv.shopItem?.name ?? '');
            return (
              <div key={inv.id} className="eco-card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 14 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 12,
                  background: art.bg, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <ShopShape kind={art.shape} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>{inv.shopItem?.name}</div>
                  <div className="eyebrow" style={{ marginTop: 4 }}>{inv.shopItem?.type}</div>
                </div>
                <button
                  onClick={() => handleEquip(inv.id)}
                  className={inv.isEquipped ? 'btn btn-primary' : 'btn btn-soft'}
                  style={{ height: 36, fontSize: 12, padding: '0 16px' }}
                >
                  {inv.isEquipped ? 'Equipped ✓' : 'Equip'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
