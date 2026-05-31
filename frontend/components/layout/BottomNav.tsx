'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const navItems = [
  { href: '/home', label: 'Home' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/eco-score', label: 'Eco score' },
  { href: '/friends', label: 'Friends' },
  { href: '/profile', label: 'Profile' },
];

export default function TopNav() {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, zIndex: 50,
        background: 'color-mix(in oklab, var(--paper) 82%, transparent)',
        backdropFilter: 'blur(14px) saturate(140%)',
        WebkitBackdropFilter: 'blur(14px) saturate(140%)',
        borderBottom: '1px solid var(--hair)',
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: '0 auto',
          padding: '0 48px',
          height: 72,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
        }}
        className="topnav-inner"
      >
        <Link href="/home" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <span className="brand-mark" />
          <span className="brand-text">EcoLife</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="topnav-links">
          {navItems.map(({ href, label }) => {
            const active = pathname === href || pathname?.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                style={{
                  fontFamily: 'var(--body)',
                  fontSize: 13,
                  fontWeight: 500,
                  padding: '8px 14px',
                  borderRadius: 999,
                  textDecoration: 'none',
                  letterSpacing: '-0.005em',
                  color: active ? 'var(--paper)' : 'var(--ink-soft)',
                  background: active ? 'var(--ink)' : 'transparent',
                  transition: 'background 0.18s, color 0.18s',
                }}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user?.username && (
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--mute)',
                whiteSpace: 'nowrap',
              }}
              className="topnav-user"
            >
              @{user.username}
            </span>
          )}
          <button
            onClick={logout}
            className="btn btn-ghost"
            style={{ height: 36, fontSize: 12, padding: '0 16px' }}
          >
            Sign out
          </button>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 1100px) {
          .topnav-user { display: none; }
        }
        @media (max-width: 900px) {
          .topnav-inner { padding: 0 22px !important; gap: 12px !important; }
          .topnav-links { overflow-x: auto; max-width: 60vw; }
        }
        @media (max-width: 720px) {
          .topnav-links a { padding: 6px 10px !important; font-size: 12px !important; }
        }
      `}</style>
    </nav>
  );
}
