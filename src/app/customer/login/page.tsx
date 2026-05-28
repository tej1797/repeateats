'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconEye, IconEyeOff, IconCheck } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';

// ─── Google SVG ───────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path d="M17.64 9.2c0-.637-.057-1.25-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

// ─── Friendly error messages ──────────────────────────────────────────────────
function friendlyError(msg: string): string {
  if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials'))
    return "Hmm, that's not right 🤔 Try again";
  if (msg.includes('Email not confirmed'))
    return "Check your inbox — we sent you a verification link";
  if (msg.includes('User already registered') || msg.includes('already registered'))
    return "That email is taken — sign in instead?";
  if (msg.includes('rate limit') || msg.includes('too many') || msg.includes('Too many'))
    return "Whoa, slow down! Try in 30 seconds 🐢";
  if (msg.includes('Password should'))
    return "Password needs at least 6 characters";
  if (msg.includes('Unable to validate') || msg.includes('not found'))
    return "We don't know that email yet — create an account?";
  return msg;
}

// ─── Floating label input ─────────────────────────────────────────────────────
function FloatField({
  id, label, type = 'text', value, onChange,
  right, valid,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; right?: React.ReactNode; valid?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const up = focused || value.length > 0;
  return (
    <div className="relative">
      <label
        htmlFor={id}
        className="absolute left-4 pointer-events-none transition-all duration-150"
        style={{
          top:       up ? 8  : '50%',
          transform: up ? 'none' : 'translateY(-50%)',
          fontSize:  up ? 11 : 15,
          fontWeight: up ? 600 : 400,
          color:     focused ? '#E85D04' : '#9CA3AF',
        }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={type === 'password' ? 'current-password' : 'email'}
        required
        className="w-full rounded-xl bg-white text-[#111] text-[15px] outline-none transition-all"
        style={{
          height: 56,
          paddingTop: 20,
          paddingBottom: 8,
          paddingLeft: 16,
          paddingRight: right ? 44 : 16,
          border: focused ? '2px solid #E85D04' : '1.5px solid #E5E7EB',
          boxShadow: focused ? '0 0 0 3px rgba(232,93,4,0.1)' : undefined,
        }}
      />
      {right && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>
      )}
      {valid && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
          <IconCheck size={11} className="text-white" />
        </div>
      )}
    </div>
  );
}

// ─── Mini floating deal card (left panel decoration) ─────────────────────────
function FloatingDealCard({ style, discount, restaurant, cuisine }: {
  style?: React.CSSProperties; discount: string; restaurant: string; cuisine: string;
}) {
  return (
    <div
      className="absolute bg-white rounded-2xl shadow-xl p-3.5 w-[190px]"
      style={{ border: '1px solid rgba(0,0,0,0.06)', ...style }}
    >
      <p className="text-[10px] font-semibold text-gray-400 mb-0.5">{cuisine}</p>
      <p className="font-bold text-[13px] text-gray-800 truncate mb-1">{restaurant}</p>
      <span className="inline-block bg-orange-50 text-orange-700 text-[13px] font-extrabold px-2 py-0.5 rounded-lg border border-orange-200">
        {discount}
      </span>
    </div>
  );
}

// ─── Stat pill (left panel) ───────────────────────────────────────────────────
function StatPill({ text }: { text: string }) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2 rounded-full"
      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
    >
      <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
      <span className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>{text}</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CustomerLoginPage() {
  const router   = useRouter();
  const supabase = useRef(createClient()).current;

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [btnState, setBtnState] = useState<'idle' | 'loading' | 'success'>('idle');

  // Cursor glow on left panel
  const leftRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = leftRef.current;
    if (!el) return;
    const fn = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      setCursor({ x: e.clientX - r.left, y: e.clientY - r.top });
    };
    el.addEventListener('mousemove', fn);
    return () => el.removeEventListener('mousemove', fn);
  }, []);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBtnState('loading');
    setError('');
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr) {
      setBtnState('idle');
      setError(friendlyError(authErr.message));
      return;
    }
    setBtnState('success');
    setTimeout(() => router.push('/customer'), 900);
  };

  const handleGoogle = async () => {
    // Store intended portal in a cookie BEFORE the OAuth redirect
    await fetch('/api/auth/set-portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portal: 'customer' }),
    });
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#0D0D0D' }}>

      {/* ── Left panel ─────────────────────────────────────────────── */}
      <div
        ref={leftRef}
        className="hidden lg:flex w-[40%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: '#111' }}
      >
        {/* Cursor glow */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(500px circle at ${cursor.x}px ${cursor.y}px, rgba(232,93,4,0.12), transparent 50%)`,
          }}
        />

        {/* Back link */}
        <Link href="/" className="inline-flex items-center gap-2 text-[13px] font-medium z-10"
          style={{ color: 'rgba(255,255,255,0.45)' }}>
          ← Back to home
        </Link>

        {/* Floating deal cards */}
        <div className="flex-1 relative">
          <FloatingDealCard
            discount="$10 OFF"
            restaurant="Nirvana Restaurant"
            cuisine="🍛 Indian · Brampton"
            style={{ top: '8%', left: '5%', animation: 'floatA 6s ease-in-out infinite' }}
          />
          <FloatingDealCard
            discount="BUY 2 GET 1"
            restaurant="Real Fruit Bubble Tea"
            cuisine="🧋 Bubble Tea · Mississauga"
            style={{ top: '38%', right: '0%', animation: 'floatB 7s ease-in-out infinite' }}
          />
          <FloatingDealCard
            discount="25% OFF"
            restaurant="Charcoal Steak House"
            cuisine="🥩 BBQ · Kitchener"
            style={{ bottom: '15%', left: '10%', animation: 'floatC 5.5s ease-in-out infinite' }}
          />
        </div>

        {/* Bottom copy + stats */}
        <div className="z-10 space-y-4">
          <p className="font-display text-[26px] font-extrabold leading-tight text-white">
            Join 5,000+ deal<br />hunters in Ontario
          </p>
          <div className="flex flex-col gap-2">
            <StatPill text="23 deals claimed today" />
            <StatPill text="12 restaurants added this week" />
            <StatPill text="$4,200 saved today" />
          </div>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6" style={{ background: '#0D0D0D' }}>
        <div
          className="w-full max-w-[440px] rounded-2xl p-8 relative"
          style={{ background: '#fff', borderTop: '4px solid #E85D04', boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}
        >
          {/* Logo */}
          <div className="mb-6">
            <div className="font-display text-[32px] font-extrabold tracking-tight leading-none mb-1">
              Rep<span style={{ color: '#E85D04' }}>EAT</span>
            </div>
            <p className="text-[14px]" style={{ color: '#6B7280' }}>
              Customer portal · Sign in to claim deals
            </p>
          </div>

          {/* Social buttons */}
          <div className="space-y-3 mb-5">
            <button
              onClick={handleGoogle}
              className="w-full h-12 rounded-xl flex items-center justify-center gap-3 font-semibold text-[14px] transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{ background: '#fff', border: '1.5px solid #E5E7EB', color: '#111' }}
            >
              <GoogleIcon /> Continue with Google
            </button>
            <button
              disabled
              className="w-full h-12 rounded-xl flex items-center justify-center gap-3 font-semibold text-[14px] opacity-40 cursor-not-allowed"
              style={{ background: '#111', color: '#fff' }}
              title="Coming soon"
            >
              <svg width="16" height="18" viewBox="0 0 814 1000" fill="currentColor" aria-hidden>
                <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-47.4-148.2-112.7C92.3 727.7 60 620.5 60 515.5c0-178.5 116.4-273.7 230.7-273.7 62.8 0 114.9 41.3 163.7 41.3 47.1 0 108.4-44 176.8-44 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
              </svg>
              Continue with Apple (coming soon)
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: '#E5E7EB' }} />
            <span className="text-[12px] font-medium" style={{ color: '#9CA3AF' }}>or sign in with email</span>
            <div className="flex-1 h-px" style={{ background: '#E5E7EB' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <FloatField
              id="email" label="Email address" type="email"
              value={email} onChange={setEmail}
              valid={isEmailValid && email.length > 0}
            />
            <FloatField
              id="password" label="Password" type={showPw ? 'text' : 'password'}
              value={password} onChange={setPassword}
              right={
                <button type="button" onClick={() => setShowPw((v) => !v)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  {showPw ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              }
            />

            {/* Personality errors */}
            {error && (
              <div className="px-4 py-3 rounded-xl text-[13px] font-medium" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
                {error}
              </div>
            )}

            {/* Sign in button with state */}
            <button
              type="submit"
              disabled={btnState !== 'idle'}
              className="w-full h-12 rounded-xl text-white font-bold text-[15px] flex items-center justify-center gap-2 transition-all duration-300 disabled:cursor-not-allowed"
              style={{
                background: btnState === 'success' ? '#16a34a' : '#E85D04',
                transform: btnState === 'loading' ? 'none' : undefined,
              }}
            >
              {btnState === 'loading' && (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              )}
              {btnState === 'idle'    && 'Sign in'}
              {btnState === 'loading' && 'Signing you in...'}
              {btnState === 'success' && 'Welcome back! 🎉'}
            </button>
          </form>

          {/* Links */}
          <p className="text-center text-[13px] mt-4" style={{ color: '#6B7280' }}>
            No account yet?{' '}
            <Link href="/customer/signup" className="font-semibold hover:underline" style={{ color: '#E85D04' }}>
              Create one free →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
