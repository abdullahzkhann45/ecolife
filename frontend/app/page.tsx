'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import './landing.css';

/* ── Hooks ─────────────────────────────────────────────────────── */
function useMouseTilt() {
  const [m, setM] = useState({ x: 0, y: 0 });
  useEffect(() => {
    let raf = 0, target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
    const onMove = (e: MouseEvent) => {
      target = { x: (e.clientX / innerWidth - 0.5) * 2, y: (e.clientY / innerHeight - 0.5) * 2 };
    };
    const tick = () => {
      cur.x += (target.x - cur.x) * 0.08;
      cur.y += (target.y - cur.y) * 0.08;
      setM({ x: cur.x, y: cur.y });
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('mousemove', onMove); };
  }, []);
  return m;
}

function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    let raf = 0, latest = 0;
    const tick = () => { setY(latest); raf = 0; };
    const onScroll = () => { latest = window.scrollY; if (!raf) raf = requestAnimationFrame(tick); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return y;
}

function useElementScrollProgress(ref: React.RefObject<HTMLElement | null>) {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = ref.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const total = r.height + innerHeight;
        const seen = innerHeight - r.top;
        setP(Math.max(0, Math.min(1, seen / total)));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ref]);
  return p;
}

function useInView(opts = { threshold: 0.25 }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current || seen) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setSeen(true)), opts
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen] as const;
}

function useCountUp(target: number, ms = 1400, run = true) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, run]);
  return n;
}

/* ── Flame canvas painter ────────────────────────────────────── */
function flamePainter(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  let w = 0, h = 0, raf = 0;
  const dpr = Math.min(2, devicePixelRatio || 1);
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    w = r.width; h = r.height;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  const ro = new ResizeObserver(resize); ro.observe(canvas);
  const N = 180;
  const spawn = () => ({
    x: w / 2 + (Math.random() - 0.5) * w * 0.18,
    y: h * (0.78 + Math.random() * 0.12),
    vx: (Math.random() - 0.5) * 0.4,
    vy: -(0.6 + Math.random() * 1.8),
    r: 14 + Math.random() * 36,
    life: 0, max: 60 + Math.random() * 60,
    hue: 18 + Math.random() * 24,
  });
  const particles = Array.from({ length: N }, spawn);
  const tick = () => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(14,20,16,0.18)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      p.life++; p.x += p.vx; p.y += p.vy;
      p.vy *= 0.985; p.vx += (Math.random() - 0.5) * 0.08;
      const t = p.life / p.max;
      const a = Math.max(0, 1 - t) * 0.55;
      const r = p.r * (1 - t * 0.5);
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      const hue = p.hue + t * 8;
      grad.addColorStop(0, `hsla(${hue}, 95%, 65%, ${a})`);
      grad.addColorStop(0.5, `hsla(${hue - 8}, 95%, 50%, ${a * 0.55})`);
      grad.addColorStop(1, `hsla(${hue - 16}, 95%, 35%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      if (p.life >= p.max || p.y < h * 0.1) Object.assign(p, spawn());
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => { cancelAnimationFrame(raf); ro.disconnect(); };
}

/* ── Components ──────────────────────────────────────────────── */

function Reveal({ children, stagger, className = '' }: { children: React.ReactNode; stagger?: boolean; className?: string }) {
  const [ref, seen] = useInView({ threshold: 0.15 });
  const cls = `${stagger ? 'reveal-stagger' : 'reveal'} ${seen ? 'in' : ''} ${className}`.trim();
  return <div ref={ref} className={cls}>{children}</div>;
}

const ArrowDR = () => (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M2.5 9.5L9.5 2.5M4 2.5h5.5V8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function BigBadge({ text, center, style }: { text: string; center: string; style?: React.CSSProperties }) {
  const id = useMemo(() => 'bb' + Math.random().toString(36).slice(2, 8), []);
  return (
    <svg viewBox="0 0 100 100" style={{ position: 'absolute', width: 'clamp(180px,22vw,280px)', height: 'clamp(180px,22vw,280px)', pointerEvents: 'none', zIndex: 3, ...style }}>
      <defs><path id={id} d="M 50 50 m -38 0 a 38 38 0 1 1 76 0 a 38 38 0 1 1 -76 0" /></defs>
      <g style={{ animation: 'l-spin 18s linear infinite', transformOrigin: 'center' }}>
        <text fill="var(--ink)" style={{ fontFamily: 'var(--mono)', fontSize: '6.4px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600 }}>
          <textPath href={`#${id}`} startOffset="0">{text.repeat(6)}</textPath>
        </text>
      </g>
      <circle cx="50" cy="50" r="22" fill="var(--accent)" />
      <text x="50" y="54" fill="var(--paper)" textAnchor="middle" style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: '16px', letterSpacing: '-0.04em' }}>{center}</text>
    </svg>
  );
}

function Nav() {
  return (
    <nav className="landing-nav">
      <div className="wrap landing-nav-inner">
        <a href="#" className="brand"><span className="brand-mark" />EcoLife</a>
        <div className="nav-links">
          <a href="#how">How it works</a>
          <a href="#streak">Streak</a>
          <a href="#score">Eco score</a>
          <a href="#friends">Friends</a>
        </div>
        <Link href="/auth/login" className="btn btn-ghost" style={{ height: 40, fontSize: 13 }}>Sign in</Link>
      </div>
    </nav>
  );
}

function Hero() {
  const m = useMouseTilt();
  const y = useScrollY();
  const T = (depth: number, baseRot = 0, scrollRot = 0.04): React.CSSProperties => ({
    transform: `translate3d(${m.x * depth}px, ${m.y * depth - y * 0.1}px, 0) rotate(${baseRot + m.x * depth * 0.05 + y * scrollRot}deg)`
  });
  return (
    <header className="hero">
      <div className="hero-stage">
        <div className="hero-piece piece-ring spin" style={T(80, 0, 0)} />
        <div className="hero-piece piece-planet" style={T(40, 0, 0.02)} />
        <div className="hero-piece piece-leaf bob" style={T(70, -22, 0.05)} />
        <div className="hero-piece piece-flame" style={T(55, 8, -0.06)} />
        <div className="hero-piece piece-dot bob" style={T(120)} />
        <div className="hero-piece piece-bar" style={T(90, -6, 0.03)} />
        <svg className="hero-piece bob-slow" viewBox="0 0 320 80" fill="none" style={{ top: '14%', left: '4%', width: 320, height: 80, color: 'var(--ink)', ...T(60, -4) }}>
          <path d="M 4 40 C 30 4, 60 76, 90 40 S 150 4, 180 40 S 240 76, 270 40 S 312 12, 316 40" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
        </svg>
        <svg className="hero-piece" viewBox="0 0 220 60" fill="none" style={{ bottom: '8%', left: '38%', width: 220, height: 60, color: 'var(--accent)', ...T(100, 6, -0.08) }}>
          <path d="M 4 30 L 36 6 L 68 54 L 100 6 L 132 54 L 164 6 L 196 54 L 218 18" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <svg className="hero-piece spin-rev" viewBox="0 0 100 100" fill="currentColor" style={{ top: '8%', left: '48%', width: 110, height: 110, color: 'var(--accent)', ...T(50, 0, 0) }}>
          <path d="M50 4 L60 36 L94 38 L66 58 L78 92 L50 72 L22 92 L34 58 L6 38 L40 36 Z" />
        </svg>
        <svg className="hero-piece bob" viewBox="0 0 200 200" fill="none" style={{ top: '60%', right: '32%', width: 200, height: 200, color: 'var(--leaf)', ...T(75, -12, 0.07) }}>
          <path d="M 14 100 A 86 86 0 1 1 100 186" stroke="currentColor" strokeWidth="22" strokeLinecap="round" />
        </svg>
      </div>
      <div className="wrap">
        <div className="hero-head">
          <span className="mono">EcoLife · v1.0 · 2026</span>
          <span className="mono">Mobile-first PWA · Now in closed beta</span>
        </div>
        <h1 className="display hero-title">
          The planet<br />keeps <em>score</em><br />
          <span className="strike">alone</span> <span style={{ whiteSpace: 'nowrap' }}>with you.</span>
        </h1>
        <div className="hero-bottom">
          <p className="hero-lede">
            EcoLife turns the small, easy-to-skip stuff — walking instead of driving,
            picking up litter, swapping the takeout fork — into <strong>verified daily
            wins</strong>, a streak you&apos;ll fight to keep, and a leaderboard that makes
            your friends part of the climate fight.
          </p>
          <div className="hero-actions">
            <div className="hero-actions-row">
              <Link href="/auth/register" className="btn btn-primary">
                Start your streak
                <span className="btn-arrow"><ArrowDR /></span>
              </Link>
              <button className="btn btn-ghost">Watch the loop</button>
            </div>
            <span className="hero-meta">No credit card · 3-min onboarding · Day 1 task in 60s</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function MarqueeBand() {
  const items = ['Walk it, don’t drive it', 'Pick up the litter', 'Skip the plastic fork', 'Compost the peel', 'Bike the commute', 'Refill the bottle', 'Plant the seed'];
  const Row = () => <span>{items.map((t, i) => <span key={i}><span>{t}</span><span className="dot" /></span>)}</span>;
  return <div className="marquee"><div className="marquee-track"><Row /><Row /></div></div>;
}

function Manifesto() {
  const ref = useRef<HTMLElement>(null);
  const p = useElementScrollProgress(ref);
  const shift = (dir: number) => dir * (p - 0.5) * 1200;
  return (
    <section className="manifesto" ref={ref}>
      <div className="manifesto-row" style={{ transform: `translateX(${shift(-1)}px)` }}>
        <span>Every choice</span><span className="blob" /><em>is a vote</em><span className="blob" /><span className="outline">cast in carbon</span>
      </div>
      <div className="manifesto-row" style={{ transform: `translateX(${shift(1)}px)` }}>
        <span className="outline">and the planet</span><span className="blob" /><em>is counting</em><span className="blob" /><span>louder than ever</span>
      </div>
    </section>
  );
}

function Pitch() {
  return (
    <section className="section" id="how">
      <div className="wrap">
        <Reveal className="pitch" stagger>
          <div>
            <div className="eyebrow" style={{ marginBottom: 18 }}>§ 01 — The product</div>
            <h2 className="display pitch-title">An app that<br />makes good<br />choices loud.</h2>
          </div>
          <div className="pitch-body">
            <p>Most eco apps are quiet. You log a thing, the thing disappears, and a week later you&apos;ve forgotten the app exists. EcoLife is loud on purpose: every verified action moves a number, lights a streak, moves you up your friend group, and leaves a clear points trail for your progress.</p>
            <p>Behind the noise sits a real model. A 3-minute onboarding questionnaire profiles your transport, diet, home energy, and waste habits — then ranks the changes that&apos;d move <em>your</em> numbers most.</p>
            <div className="pitch-stats">
              <div><div className="pitch-stat-n">3 min</div><div className="pitch-stat-l">Onboarding ceiling — first task ready in 60s after.</div></div>
              <div><div className="pitch-stat-n">40%</div><div className="pitch-stat-l">Target Day-30 retention via streaks &amp; social pressure.</div></div>
              <div><div className="pitch-stat-n">0–1000</div><div className="pitch-stat-l">Eco score, calibrated against published CO₂e estimates.</div></div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function StreakSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ref, seen] = useInView();
  const days = useCountUp(47, 1600, seen);
  const sectionRef = useRef<HTMLElement>(null);
  const p = useElementScrollProgress(sectionRef);
  useEffect(() => {
    if (!canvasRef.current) return;
    return flamePainter(canvasRef.current);
  }, []);
  const milestones = [7, 14, 30, 60, 100, 365];
  return (
    <section className="section streak" id="streak" ref={(el) => { (ref as any).current = el; sectionRef.current = el; }}>
      <BigBadge text="day 47 · unbroken · keep going · " center="47" style={{ top: '8%', right: '4%', transform: `rotate(${p * 90}deg)` }} />
      <div className="wrap">
        <div className="streak-grid">
          <div className="streak-canvas-wrap">
            <canvas ref={canvasRef} className="streak-canvas" />
            <div className="streak-count"><div className="n">{days}</div><div className="l">Consecutive days</div></div>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 18 }}>§ 02 — The streak</div>
            <h2 className="display streak-title">One day.<br />Then <em>another</em>.<br />Then another.</h2>
            <div className="streak-body">
              <p>Open the app. Complete one verified task. The number goes up. Miss a day and it resets — but you get one streak freeze every thirty days.</p>
              <p>7, 14, 30, 60, 100, 365 — milestones each pay bonus points and unlock cosmetics. The flame above is real particles, not a sticker.</p>
            </div>
            <div className="streak-milestones">
              {milestones.map((m) => <span key={m} className={`streak-milestone ${days >= m ? 'hot' : ''}`}>{m} days</span>)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function EcoScoreSection() {
  const [ref, seen] = useInView();
  const score = useCountUp(642, 1800, seen);
  const delta = useCountUp(187, 1600, seen);
  const cats = [
    { l: 'Transport', v: 78, c: 'leaf' }, { l: 'Diet', v: 64, c: '' },
    { l: 'Energy', v: 51, c: '' }, { l: 'Waste', v: 83, c: 'leaf' },
    { l: 'Consumption', v: 42, c: 'accent' }, { l: 'Community', v: 71, c: '' },
  ];
  const R = 44, C = 2 * Math.PI * R;
  const dash = `${C * (score / 1000)} ${C}`;
  return (
    <section className="section" id="score">
      <div className="wrap">
        <div className="score-head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 18 }}>§ 03 — Eco score</div>
            <h2 className="display">One number,<br />all of it.</h2>
          </div>
          <p>A weighted sum of category sub-scores over a rolling 30-day window, calibrated against published lifestyle CO₂e estimates.</p>
        </div>
        <div className="score-grid" ref={ref}>
          <div className="score-dial-wrap">
            <svg className="score-dial-svg" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={R} fill="none" stroke="var(--paper-deep)" strokeWidth="6" />
              <circle cx="50" cy="50" r={R} fill="none" stroke="var(--ink)" strokeWidth="6" strokeLinecap="round" strokeDasharray={dash} style={{ transition: 'stroke-dasharray 1.4s cubic-bezier(0.3,0.7,0.2,1)' }} />
            </svg>
            <div className="score-dial-center">
              <div className="now">{score}</div>
              <div className="max">/ 1000 · 78th percentile</div>
              <div className="score-delta">↑ {delta} since week one</div>
            </div>
          </div>
          <div className="score-cats">
            {cats.map((c) => (
              <div className="score-cat" key={c.l}>
                <div className="score-cat-l">{c.l}</div>
                <div className="score-cat-bar">
                  <div className={`score-cat-bar-fill ${c.c}`} style={{ '--w': seen ? `${c.v}%` : '0%' } as any} />
                </div>
                <div className="score-cat-n">{c.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TaskLoop() {
  const [step, setStep] = useState(0);
  useEffect(() => { const id = setInterval(() => setStep((s) => (s + 1) % 3), 3200); return () => clearInterval(id); }, []);
  return (
    <section className="section task-section" id="task">
      <div className="wrap">
        <Reveal className="task-grid" stagger>
          <div className="task-copy">
            <div className="eyebrow" style={{ marginBottom: 18 }}>§ 04 — Verified, not vibes</div>
            <h2 className="display">If we can&apos;t<br /><em>prove</em> it,<br />it doesn&apos;t count.</h2>
            <p>Self-reporting is how trust dies. Every task carries one or more verification mechanisms — photo proof with AI analysis, device-sensor data, geo-fenced check-ins, or receipt OCR.</p>
            <p style={{ fontSize: 19, lineHeight: 1.5, color: 'var(--mute)', maxWidth: '44ch', margin: 0 }}>And when the model isn&apos;t sure, a human reviewer is. Rejections always come with a reason and an appeal path.</p>
          </div>
          <div>
            <div className="phone">
              <div className="phone-notch" />
              <div className="phone-screen">
                <div className="phone-status"><span>9:41</span><span>● ● ●</span></div>
                <div className="phone-body">
                  <div className="phone-eyebrow">Task · 80 pts</div>
                  <h3 className="phone-h">Pick up litter on a walk</h3>
                  <p className="phone-p">Capture a before and after along your route. We&apos;ll check the photos are taken within 30 minutes and the same place.</p>
                  <div className="phone-proof">
                    <div className="phone-proof-card before"><span className="lbl">Before · 14:02</span></div>
                    <div className="phone-proof-card after"><span className="lbl">After · 14:28</span></div>
                  </div>
                  <div className="phone-meta-row"><span className="k">Distance</span><span className="v">0.84 km</span></div>
                  <div className="phone-meta-row"><span className="k">GPS drift</span><span className="v">22 m · ok</span></div>
                  <div className="phone-meta-row"><span className="k">Classifier</span><span className="v">98% match</span></div>
                  <div className="phone-cta">Submit for verification<span style={{ display: 'inline-flex', width: 22, height: 22, borderRadius: 999, background: 'var(--paper)', color: 'var(--ink)', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>→</span></div>
                </div>
                {step === 2 && (
                  <div className="phone-verified">
                    <div className="check">✓</div>
                    <div><div className="t">Verified · +80 pts</div><div className="s">Streak day 47 · 30-day badge unlocked</div></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Friends() {
  const rows = [
    { rank: 1, name: 'Mara Onuoha', streak: 88, pts: 2840, color: '#c75a2a' },
    { rank: 2, name: 'Theo Bennett', streak: 41, pts: 2210, color: '#6f8a3a' },
    { rank: 3, name: 'You', streak: 47, pts: 1980, color: '#1c2418', you: true },
    { rank: 4, name: 'Jules Ito', streak: 22, pts: 1740, color: '#8a6a3a' },
    { rank: 5, name: 'Sana Lehrer', streak: 14, pts: 1430, color: '#2e5a3a' },
    { rank: 6, name: 'Devon Park', streak: 6, pts: 980, color: '#4a3a6a' },
  ];
  return (
    <section className="section" id="friends">
      <div className="wrap">
        <div className="friends-head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 18 }}>§ 05 — Friends &amp; competition</div>
            <h2 className="display">Solo trackers<br />die quietly.</h2>
          </div>
          <p>Weekly leaderboards rank by points earned <em>this week</em>, not absolute eco score — so a new friend joining today is competitive on day one.</p>
        </div>
        <div className="lb">
          <div className="lb-card">
            <div className="lb-card-head"><div className="t">Weekly leaderboard</div><div className="w">Mon → Sun · 3d 14h left</div></div>
            {rows.map((r) => (
              <div key={r.rank} className={`lb-row ${r.you ? 'you' : ''}`}>
                <div className="lb-rank">{String(r.rank).padStart(2, '0')}</div>
                <div className="lb-avatar" style={{ background: r.color }}>{r.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</div>
                <div><div className="lb-name">{r.name}</div><div className="lb-streak">▲ {r.streak}-day streak</div></div>
                <div />
                <div className="lb-pts">{r.pts.toLocaleString()}</div>
              </div>
            ))}
          </div>
          <div className="challenge-card">
            <div className="eyebrow">§ Challenge · 1v1</div>
            <h3>Who saves more kg of CO₂ this week?</h3>
            <div className="challenge-vs">
              <div className="who"><div className="avatar" style={{ background: 'var(--accent)', color: 'var(--paper)' }}>YO</div><div className="meta"><div className="n">You</div><div className="s">6.4 kg saved</div></div></div>
              <div className="vs">vs</div>
              <div className="who" style={{ flexDirection: 'row-reverse', textAlign: 'right' }}><div className="avatar" style={{ background: 'var(--leaf)', color: 'var(--paper)' }}>TB</div><div className="meta"><div className="n">Theo Bennett</div><div className="s">4.0 kg saved</div></div></div>
            </div>
            <div className="challenge-bar"><i /></div>
            <div className="challenge-foot"><span>Ends Sun 23:59</span><span>Pot · 400 pts</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="section cta">
      <div className="wrap">
        <div className="cta-tag">§ 07 — Today is day 1</div>
        <h2 className="display">Stop trying.<br />Start <em>streaking</em>.</h2>
        <Link href="/auth/register" className="cta-btn">
          Claim your first task
          <span style={{ display: 'inline-flex', width: 28, height: 28, borderRadius: 999, background: 'var(--paper)', color: 'var(--ink)', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2.5 9.5L9.5 2.5M4 2.5h5.5V8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
        </Link>
        <div style={{ marginTop: 22, color: 'var(--mute)', fontSize: 13, fontFamily: 'var(--mono)', letterSpacing: '.12em' }}>Free · 13+ · iOS · Android · Web</div>
      </div>
    </section>
  );
}

function BigMark() {
  const ref = useRef<HTMLDivElement>(null);
  const p = useElementScrollProgress(ref);
  return (
    <div ref={ref} className="wrap" style={{ overflow: 'hidden' }}>
      <h2 className="bigmark" style={{ transform: `translateY(${(1 - p) * 80}px)`, transition: 'transform .08s linear' }}>EcoLife</h2>
    </div>
  );
}

function Footer() {
  return (
    <footer className="wrap">
      <div className="l-footer">
        <div>© 2026 EcoLife · v1.0</div>
        <div style={{ display: 'flex', gap: 24 }}>
          <a href="#">Privacy</a><a href="#">Press kit</a><a href="#">Methodology</a><a href="#">Careers</a>
        </div>
      </div>
    </footer>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace(user.onboardingCompleted ? '/home' : '/onboarding');
    }
  }, [user, loading, router]);

  if (loading) return <div style={{ background: '#efe9d7', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>;
  if (user) return null;

  return (
    <div className="landing">
      <div className="landing-grain" aria-hidden="true" />
      <Nav />
      <Hero />
      <MarqueeBand />
      <Manifesto />
      <Pitch />
      <StreakSection />
      <EcoScoreSection />
      <TaskLoop />
      <Friends />
      <CTA />
      <BigMark />
      <Footer />
    </div>
  );
}
