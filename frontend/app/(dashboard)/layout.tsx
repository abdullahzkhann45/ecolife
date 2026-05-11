'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import TopNav from '@/components/layout/BottomNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login');
    if (!loading && user && !user.onboardingCompleted) router.replace('/onboarding');
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--paper)', minHeight: '100vh', position: 'relative' }}>
      <div className="page-grain" aria-hidden="true" />
      <TopNav />
      <main className="page-content wrap" style={{ paddingBottom: 96, position: 'relative', zIndex: 1 }}>
        {children}
      </main>
    </div>
  );
}
