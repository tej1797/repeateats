'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

type SyncState = 'pending' | 'done' | 'already_active' | 'error';

// useSearchParams() requires Suspense in Next.js App Router static prerender
export default function RepeatPlusSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
        <div style={{ width: 44, height: 44, border: '3px solid rgba(212,175,55,0.2)', borderTopColor: '#FFBF00', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <RepeatPlusSuccess />
    </Suspense>
  );
}

function RepeatPlusSuccess() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const sessionId    = searchParams.get('session_id');

  const [secs,      setSecs]      = useState(5);
  const [syncState, setSyncState] = useState<SyncState>('pending');
  const [syncError, setSyncError] = useState('');
  const [tier,      setTier]      = useState<'starter' | 'pro'>('pro');

  // ── Confetti ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes confettiFall {
        0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
        100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
      }
      .confetti-piece {
        position: fixed; width: 10px; height: 10px;
        animation: confettiFall linear forwards;
        border-radius: 2px; z-index: 9999; pointer-events: none;
      }
    `;
    document.head.appendChild(style);
    const colors = ['#E85D04', '#FFBF00', '#FFD700', '#fff', '#065F46'];
    const pieces: HTMLElement[] = [];
    for (let i = 0; i < 80; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.left = `${Math.random() * 100}vw`;
      el.style.top  = '-20px';
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.animationDuration = `${1.5 + Math.random() * 2}s`;
      el.style.animationDelay   = `${Math.random() * 1.5}s`;
      document.body.appendChild(el);
      pieces.push(el);
    }
    const cleanup = setTimeout(() => pieces.forEach(el => el.remove()), 5000);
    return () => { clearTimeout(cleanup); pieces.forEach(el => el.remove()); style.remove(); };
  }, []);

  // ── Sync plan from Stripe session ─────────────────────────────────────────
  const runSync = useCallback(async () => {
    if (!sessionId) {
      // No session_id — user may have navigated here directly; check if already active
      setSyncState('already_active');
      return;
    }

    setSyncState('pending');
    setSyncError('');

    try {
      const res  = await fetch('/api/subscription/sync', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ session_id: sessionId }),
      });
      const json = await res.json() as { ok?: boolean; tier?: string; status?: string; error?: string };

      if (!res.ok) {
        if (res.status === 404 || (json.error ?? '').toLowerCase().includes('invalid')) {
          // Stale or already-used session_id
          setSyncState('already_active');
          return;
        }
        throw new Error(json.error ?? 'Sync failed');
      }

      if (json.tier === 'starter' || json.tier === 'pro') setTier(json.tier);
      setSyncState('done');
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Something went wrong syncing your plan. Please refresh or contact support.');
      setSyncState('error');
    }
  }, [sessionId]);

  useEffect(() => { void runSync(); }, [runSync]);

  // ── Auto-redirect countdown (only after successful sync) ──────────────────
  useEffect(() => {
    if (syncState !== 'done' && syncState !== 'already_active') return;
    const countDown = setInterval(() => setSecs(s => s - 1), 1000);
    const redirect  = setTimeout(() => router.push('/customer/profile'), 5000);
    return () => { clearInterval(countDown); clearTimeout(redirect); };
  }, [router, syncState]);

  // ── Error state ────────────────────────────────────────────────────────────
  if (syncState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6" style={{ background: '#0A0A0A' }}>
        <div className="max-w-md w-full">
          <div className="text-5xl mb-5">⚠️</div>
          <h1 className="font-display text-[28px] font-extrabold text-white mb-3">
            Sync error
          </h1>
          <div className="rounded-xl px-4 py-3 mb-6 text-left" style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.35)' }}>
            <p className="text-[14px]" style={{ color: '#fca5a5' }}>{syncError}</p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => { setSecs(5); void runSync(); }}
              className="h-12 px-8 rounded-2xl font-bold text-[15px] transition-all hover:opacity-90"
              style={{ background: '#FFBF00', color: '#1a1100' }}
            >
              Retry
            </button>
            <Link
              href="/customer/profile"
              className="h-12 px-8 rounded-2xl font-semibold text-[15px] border transition-all flex items-center justify-center"
              style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}
            >
              Go to my profile
            </Link>
          </div>
          <p className="text-[12px] mt-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Your Stripe payment was successful. If the issue persists, email support@repeateats.ca
          </p>
        </div>
      </div>
    );
  }

  // ── Already active (stale session_id or direct nav) ───────────────────────
  if (syncState === 'already_active') {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6" style={{ background: '#0A0A0A' }}>
        <div>
          <div className="text-6xl mb-5">✅</div>
          <h1 className="font-display text-[36px] font-extrabold text-white mb-2">
            Your plan is already active
          </h1>
          <p className="text-[16px] mb-8" style={{ color: 'rgba(255,255,255,0.55)' }}>
            You&apos;re already a RepEAT+ member — no action needed.
          </p>
          <Link
            href="/customer/profile"
            className="inline-flex items-center justify-center h-12 px-8 rounded-2xl font-bold text-[15px] transition-all hover:opacity-90"
            style={{ background: '#FFBF00', color: '#1a1100' }}
          >
            Go to my profile →
          </Link>
        </div>
      </div>
    );
  }

  // ── Pending (syncing) ─────────────────────────────────────────────────────
  if (syncState === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6" style={{ background: '#0A0A0A' }}>
        <div>
          <div style={{
            width: 44, height: 44, margin: '0 auto 16px',
            border: '3px solid rgba(212,175,55,0.2)', borderTopColor: '#FFBF00',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>Activating your plan…</p>
        </div>
      </div>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────
  const isProTier = tier === 'pro';

  return (
    <div className="min-h-screen flex items-center justify-center text-center px-6" style={{ background: '#0A0A0A' }}>
      <div>
        <div className="text-7xl mb-6 animate-bounce">👑</div>

        <h1 className="font-display text-[42px] font-extrabold text-white mb-3 leading-tight">
          Welcome to Rep<span style={{ color: isProTier ? '#FFBF00' : '#3B82F6' }}>EAT+</span>
        </h1>

        <p className="text-[18px] font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.8)' }}>
          Your 3-day free trial has started!
        </p>
        <p className="text-[15px] mb-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {isProTier
            ? 'Exclusive deals, early access, and real savings — all yours now.'
            : 'More claims, deal reminders, and savings tracking — yours to explore.'}
        </p>

        {/* Tier badge */}
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8"
          style={{ background: isProTier ? 'rgba(212,175,55,0.15)' : 'rgba(59,130,246,0.15)', border: `1px solid ${isProTier ? 'rgba(212,175,55,0.4)' : 'rgba(59,130,246,0.4)'}` }}
        >
          <span style={{ fontSize: 14 }}>{isProTier ? '⭐' : '🚀'}</span>
          <span className="text-[13px] font-bold" style={{ color: isProTier ? '#FFBF00' : '#60a5fa' }}>
            {isProTier ? 'Pro plan activated' : 'Starter plan activated'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <Link
            href="/customer"
            className="inline-flex items-center justify-center h-12 px-8 rounded-2xl font-bold text-[15px] transition-all hover:opacity-90"
            style={{ background: isProTier ? '#FFBF00' : '#3B82F6', color: isProTier ? '#1a1100' : '#fff' }}
          >
            Browse exclusive deals →
          </Link>
          <Link
            href="/customer/profile"
            className="inline-flex items-center justify-center h-12 px-8 rounded-2xl font-semibold text-[15px] border transition-all"
            style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}
          >
            Go to my profile
          </Link>
        </div>

        <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Redirecting to your profile in {secs}s…
        </p>
      </div>
    </div>
  );
}
