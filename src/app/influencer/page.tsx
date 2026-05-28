'use client';

// Influencer portal — two views:
//   'auth' → sign-in / sign-up (purple theme)
//   'feed' → collab grid + filter chips + negotiate modal + live chat panel

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Influencer, CollabWithDetails } from '@/types';
import { useCollabs } from '@/hooks/useCollabs';
import { useMessages } from '@/hooks/useMessages';
import {
  IconX,
  IconSend,
  IconLoader2,
  IconCheck,
  IconBrandInstagram,
  IconDeviceMobileStar,
  IconMapPin,
  IconUsers,
  IconStar,
  IconChevronDown,
} from '@tabler/icons-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const CUISINE_FILTERS = [
  'All', 'Indian', 'Italian', 'Japanese', 'Chinese',
  'Mexican', 'Thai', 'BBQ', 'Pizza', 'Seafood', 'Vegan',
];

const CITY_FILTERS = [
  'All', 'Toronto', 'Mississauga', 'Brampton', 'Markham',
  'Waterloo', 'Kitchener', 'Hamilton', 'London', 'Ottawa',
];

// Preset counter-offer amounts (chips shown in the negotiate modal)
const OFFER_CHIPS = [50, 100, 150, 200, 300];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InfluencerPage() {
  const supabase = useRef(createClient()).current;

  const [view,        setView]       = useState<'loading' | 'auth' | 'feed'>('loading');
  const [user,        setUser]       = useState<SupabaseUser | null>(null);
  const [influencer,  setInfluencer] = useState<Influencer | null>(null);

  // Filter state passed to useCollabs
  const [filterCuisine, setFilterCuisine] = useState('');
  const [filterCity,    setFilterCity]    = useState('');

  // Negotiate modal
  const [activeCollab, setActiveCollab] = useState<CollabWithDetails | null>(null);
  // Chat panel (inside the negotiate modal)
  const [chatOpen,     setChatOpen]     = useState(false);

  // ── Auth listener ────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (!session?.user) { setView('auth'); return; }
        setUser(session.user);
        await loadInfluencer(session.user.id);
        if (mounted) setView('feed');
      } catch (err) {
        console.error('[InfluencerPage] init error:', err);
        if (mounted) setView('auth');
      }
    };

    void init();

    // Safety timeout
    const timeout = setTimeout(() => {
      if (mounted) setView((v) => v === 'loading' ? 'auth' : v);
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          await loadInfluencer(session.user.id);
          if (mounted) setView('feed');
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setInfluencer(null);
          setView('auth');
        }
      }
    );
    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function loadInfluencer(uid: string) {
    const { data } = await supabase
      .from('influencers')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle();
    if (data) setInfluencer(data as Influencer);
  }

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    setActiveCollab(null);
    setChatOpen(false);
  }, [supabase]);

  // Close chat panel (keeps modal open)
  const closeChat = useCallback(() => setChatOpen(false), []);
  // Close negotiate modal (also closes chat)
  const closeModal = useCallback(() => {
    setChatOpen(false);
    setActiveCollab(null);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  if (view === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0A' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid rgba(126,34,206,0.2)', borderTop: '3px solid #7E22CE', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ color: '#666', fontSize: 13 }}>Loading creator portal...</p>
        </div>
      </div>
    );
  }
  if (view === 'auth') return <AuthView supabase={supabase} />;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <header className="bg-surface border-b border-[var(--bd)] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-brands bg-[#FDF4FF] flex items-center justify-center">
              <IconDeviceMobileStar size={18} style={{ color: '#7E22CE' }} />
            </div>
            <div className="font-display text-[17px] font-extrabold tracking-tight leading-none">
              Rep<span className="text-brand">EAT</span>
              <span className="ml-1.5 text-[13px] font-semibold text-t3 tracking-normal">Creator</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/influencer/profile"
              className="text-[13px] font-semibold transition-colors hover:text-tx"
              style={{ color: '#7E22CE' }}>
              My profile
            </a>
            <button
              onClick={handleSignOut}
              className="text-[13px] text-t2 hover:text-tx transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Creator stats banner */}
        {influencer && (
          <CreatorBanner influencer={influencer} />
        )}

        {/* Filter chips */}
        <FilterRow
          cuisineFilter={filterCuisine}
          cityFilter={filterCity}
          onCuisineChange={setFilterCuisine}
          onCityChange={setFilterCity}
        />

        {/* Collab feed */}
        <CollabFeed
          cuisine={filterCuisine}
          city={filterCity}
          onSelectCollab={(c) => { setActiveCollab(c); setChatOpen(false); }}
        />
      </main>

      {/* Negotiate modal — rendered when a collab card is tapped */}
      {activeCollab && (
        <NegotiateModal
          collab={activeCollab}
          user={user!}
          chatOpen={chatOpen}
          onOpenChat={() => setChatOpen(true)}
          onCloseChat={closeChat}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

// ─── Google SVG ───────────────────────────────────────────────────────────────
function GoogleSVG() {
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
function friendlyCreatorError(msg: string): string {
  if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials'))
    return "Hmm, those credentials don't match 🤔 Try again";
  if (msg.includes('Email not confirmed'))
    return "Check your inbox — we sent you a verification link";
  if (msg.includes('User already registered') || msg.includes('already registered'))
    return "That email is taken — sign in instead?";
  if (msg.includes('rate limit') || msg.includes('too many') || msg.includes('Too many'))
    return "Slow down! Try again in 30 seconds 🐢";
  if (msg.includes('Password should'))
    return "Password needs at least 6 characters";
  return msg;
}

// ─── Floating label input ─────────────────────────────────────────────────────
function CreatorFloatField({
  id, label, type = 'text', value, onChange, right,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; right?: React.ReactNode;
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
          color:     focused ? '#7E22CE' : '#9CA3AF',
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
          border: focused ? '2px solid #7E22CE' : '1.5px solid #E5E7EB',
          boxShadow: focused ? '0 0 0 3px rgba(126,34,206,0.1)' : undefined,
        }}
      />
      {right && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>
      )}
    </div>
  );
}

// ─── Stat pill (left panel) ───────────────────────────────────────────────────
function CreatorStatPill({ text }: { text: string }) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2 rounded-full"
      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
      <span className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>{text}</span>
    </div>
  );
}

// ─── AuthView ─────────────────────────────────────────────────────────────────

function AuthView({ supabase }: { supabase: ReturnType<typeof createClient> }) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBtnState('loading'); setError('');
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr) {
      setBtnState('idle');
      setError(friendlyCreatorError(authErr.message));
      return;
    }
    setBtnState('success');
  };

  const handleGoogle = async () => {
    await fetch('/api/auth/set-portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portal: 'influencer' }),
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
        style={{ background: '#0e0a1a' }}
      >
        {/* Cursor glow */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(500px circle at ${cursor.x}px ${cursor.y}px, rgba(126,34,206,0.15), transparent 50%)`,
          }}
        />

        {/* Ambient orb */}
        <div
          className="pointer-events-none absolute"
          style={{
            width: 380, height: 380, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(126,34,206,0.18) 0%, transparent 70%)',
            top: '20%', left: '-10%',
            filter: 'blur(40px)',
          }}
        />

        {/* Back link */}
        <a href="/" className="inline-flex items-center gap-2 text-[13px] font-medium z-10"
          style={{ color: 'rgba(255,255,255,0.4)' }}>
          ← Back to home
        </a>

        {/* Center content */}
        <div className="flex-1 flex flex-col items-center justify-center z-10 text-center gap-6">
          {/* Icon */}
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(126,34,206,0.2)', border: '1px solid rgba(126,34,206,0.3)' }}
          >
            <IconDeviceMobileStar size={38} style={{ color: '#A855F7' }} />
          </div>

          <div>
            <p className="font-display text-[28px] font-extrabold text-white leading-tight mb-2">
              Monetise your<br />food content
            </p>
            <p className="text-[14px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Connect with Ontario restaurants.<br />Get paid to create.
            </p>
          </div>

          {/* Collab cards */}
          <div className="space-y-3 w-full max-w-[220px]">
            {[
              { rest: 'Nirvana Restaurant', pay: '$250', type: '2 Reels + Story' },
              { rest: 'Charcoal Steak House', pay: '$180', type: '1 TikTok' },
              { rest: 'Real Fruit Bubble Tea', pay: '$120', type: 'Instagram post' },
            ].map((c) => (
              <div
                key={c.rest}
                className="bg-white/5 rounded-xl p-3 text-left"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[12px] font-bold text-white truncate">{c.rest}</p>
                  <span className="text-[13px] font-extrabold text-purple-400">{c.pay}</span>
                </div>
                <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>{c.type}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <div className="z-10 space-y-2">
          <CreatorStatPill text="7 collabs available now" />
          <CreatorStatPill text="Avg $200–$350 per collab" />
          <CreatorStatPill text="2% platform fee only" />
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6" style={{ background: '#0D0D0D' }}>
        <div
          className="w-full max-w-[440px] rounded-2xl p-8 relative"
          style={{ background: '#fff', borderTop: '4px solid #7E22CE', boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}
        >
          {/* Logo */}
          <div className="mb-6">
            <div className="font-display text-[32px] font-extrabold tracking-tight leading-none mb-1">
              Rep<span style={{ color: '#E85D04' }}>EAT</span>
            </div>
            <p className="text-[14px]" style={{ color: '#6B7280' }}>
              Creator portal · Sign in to browse collabs
            </p>
          </div>

          {/* Google button */}
          <div className="mb-5">
            <button
              onClick={handleGoogle}
              className="w-full h-12 rounded-xl flex items-center justify-center gap-3 font-semibold text-[14px] transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{ background: '#fff', border: '1.5px solid #E5E7EB', color: '#111' }}
            >
              <GoogleSVG /> Continue with Google
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
            <CreatorFloatField
              id="inf-email" label="Email address" type="email"
              value={email} onChange={setEmail}
            />
            <CreatorFloatField
              id="inf-password" label="Password" type={showPw ? 'text' : 'password'}
              value={password} onChange={setPassword}
              right={
                <button type="button" onClick={() => setShowPw((v) => !v)} className="text-gray-400 hover:text-gray-600 transition-colors text-[12px] font-semibold">
                  {showPw ? 'Hide' : 'Show'}
                </button>
              }
            />

            {error && (
              <div className="px-4 py-3 rounded-xl text-[13px] font-medium" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={btnState !== 'idle'}
              className="w-full h-12 rounded-xl text-white font-bold text-[15px] flex items-center justify-center gap-2 transition-all duration-300 disabled:cursor-not-allowed"
              style={{
                background: btnState === 'success' ? '#16a34a' : '#7E22CE',
              }}
            >
              {btnState === 'loading' && (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              )}
              {btnState === 'idle'    && 'Sign in'}
              {btnState === 'loading' && 'Signing you in…'}
              {btnState === 'success' && 'Welcome back! 🎉'}
            </button>
          </form>

          {/* Toggle / signup */}
          <p className="text-center text-[13px] mt-4" style={{ color: '#6B7280' }}>
            No account yet?{' '}
            <a href="/influencer/signup" className="font-semibold hover:underline" style={{ color: '#7E22CE' }}>
              Create creator profile →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Creator stats banner ─────────────────────────────────────────────────────

function CreatorBanner({ influencer }: { influencer: Influencer }) {
  const handle = influencer.instagram_handle ?? influencer.tiktok_handle ?? 'Creator';

  return (
    <div className="bg-surface rounded-brand shadow-brand p-5 mb-5 flex items-center gap-4">
      {/* Avatar placeholder */}
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0"
        style={{ background: '#FDF4FF' }}
      >
        📱
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display text-lg font-extrabold leading-tight truncate">
          {handle}
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {influencer.follower_count && (
            <span className="text-[12px] text-t2 flex items-center gap-1">
              <IconUsers size={12} /> {influencer.follower_count.toLocaleString()} followers
            </span>
          )}
          {influencer.total_collabs > 0 && (
            <span className="text-[12px] text-t2 flex items-center gap-1">
              <IconCheck size={12} /> {influencer.total_collabs} collabs done
            </span>
          )}
          {influencer.rating > 0 && (
            <span className="text-[12px] text-t2 flex items-center gap-1">
              <IconStar size={12} /> {influencer.rating.toFixed(1)}
            </span>
          )}
          {influencer.niche && (
            <span className="text-[12px] text-t3">{influencer.niche}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Filter row ───────────────────────────────────────────────────────────────

function FilterRow({
  cuisineFilter, cityFilter, onCuisineChange, onCityChange,
}: {
  cuisineFilter: string;
  cityFilter: string;
  onCuisineChange: (v: string) => void;
  onCityChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2 mb-5">
      {/* Cuisine chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CUISINE_FILTERS.map((c) => {
          const value = c === 'All' ? '' : c;
          const active = cuisineFilter === value;
          return (
            <button
              key={c}
              onClick={() => onCuisineChange(active ? '' : value)}
              className={`shrink-0 h-8 px-3.5 rounded-full text-[13px] font-semibold border transition-colors ${
                active
                  ? 'bg-[#7E22CE] text-white border-[#7E22CE]'
                  : 'bg-surface border-[var(--bd2)] text-t2 hover:border-[#7E22CE] hover:text-[#7E22CE]'
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>

      {/* City chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="shrink-0 flex items-center gap-1 text-[12px] text-t3 pr-1">
          <IconMapPin size={12} /> City:
        </span>
        {CITY_FILTERS.map((city) => {
          const value = city === 'All' ? '' : city;
          const active = cityFilter === value;
          return (
            <button
              key={city}
              onClick={() => onCityChange(active ? '' : value)}
              className={`shrink-0 h-7 px-3 rounded-full text-[12px] font-semibold border transition-colors ${
                active
                  ? 'bg-[#7E22CE] text-white border-[#7E22CE]'
                  : 'bg-surface border-[var(--bd2)] text-t2 hover:border-[#7E22CE] hover:text-[#7E22CE]'
              }`}
            >
              {city}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Collab feed ──────────────────────────────────────────────────────────────

function CollabFeed({
  cuisine, city, onSelectCollab,
}: {
  cuisine: string;
  city: string;
  onSelectCollab: (c: CollabWithDetails) => void;
}) {
  // Build filters object — empty string means no filter
  const filters = useMemo(() => ({
    status: 'open' as const,
    ...(cuisine ? { cuisine } : {}),
    ...(city    ? { city }    : {}),
  }), [cuisine, city]);

  const { collabs, loading, error } = useCollabs(filters);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-44 bg-surface animate-pulse rounded-brand" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (collabs.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">📭</div>
        <p className="text-t2 text-sm">No open collabs match your filters.</p>
        <p className="text-t3 text-xs mt-1">Try removing a filter to see more.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {collabs.map((collab) => (
        <CollabCard key={collab.id} collab={collab} onClick={() => onSelectCollab(collab)} />
      ))}
    </div>
  );
}

// ─── Collab card ──────────────────────────────────────────────────────────────

function CollabCard({ collab, onClick }: { collab: CollabWithDetails; onClick: () => void }) {
  const offerRange = collab.offer_amount_min && collab.offer_amount_max
    ? `$${collab.offer_amount_min}–$${collab.offer_amount_max}`
    : 'Offer TBD';

  return (
    <button
      onClick={onClick}
      className="bg-surface rounded-brand shadow-brand border border-[var(--bd)] p-4 text-left hover:-translate-y-0.5 hover:shadow-brand2 transition-all w-full"
    >
      {/* Restaurant name + city */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="font-bold text-[15px] text-tx leading-tight">
            {collab.restaurant.name}
          </div>
          <div className="text-[12px] text-t2 mt-0.5 flex items-center gap-1">
            <IconMapPin size={11} /> {collab.restaurant.city}
            {collab.restaurant.cuisine && <> · {collab.restaurant.cuisine}</>}
          </div>
        </div>
        {/* Purple "Open" badge */}
        <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FDF4FF] text-[#7E22CE]">
          Open
        </span>
      </div>

      {/* Deliverables */}
      {collab.deliverables && (
        <div className="text-[13px] text-tx font-semibold mb-1">{collab.deliverables}</div>
      )}

      {/* Brief preview */}
      {collab.brief && (
        <p className="text-[12px] text-t2 line-clamp-2 mb-3">{collab.brief}</p>
      )}

      {/* Footer: requirements + offer */}
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-t3">
          {collab.requirements ?? 'Any creator welcome'}
        </div>
        <div className="text-[13px] font-bold text-[#7E22CE]">{offerRange}</div>
      </div>
    </button>
  );
}

// ─── Negotiate modal ──────────────────────────────────────────────────────────

function NegotiateModal({
  collab, user, chatOpen, onOpenChat, onCloseChat, onClose,
}: {
  collab: CollabWithDetails;
  user: SupabaseUser;
  chatOpen: boolean;
  onOpenChat: () => void;
  onCloseChat: () => void;
  onClose: () => void;
}) {
  const [selectedOffer, setSelectedOffer] = useState<number | null>(null);
  const [customOffer,   setCustomOffer]   = useState('');
  const [showCustom,    setShowCustom]    = useState(false);
  const [applying,      setApplying]      = useState(false);
  const [applied,       setApplied]       = useState(false);
  const [applyError,    setApplyError]    = useState('');

  const offerRange = collab.offer_amount_min && collab.offer_amount_max
    ? `$${collab.offer_amount_min}–$${collab.offer_amount_max}`
    : null;

  const finalAmount = showCustom
    ? (Number(customOffer) || null)
    : selectedOffer;

  // Apply = set influencer_id + status=negotiating + send intro message
  const handleApply = async () => {
    setApplying(true);
    setApplyError('');
    try {
      const res = await fetch(`/api/collabs/${collab.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ influencer_id: user.id, status: 'negotiating' }),
      });
      if (!res.ok) throw new Error(await res.text());

      // Send an opening message with the proposed rate
      const intro = finalAmount
        ? `Hi! I'm interested in this collab. I'd like to propose $${finalAmount} for ${collab.deliverables ?? 'the deliverables'}.`
        : `Hi! I'm interested in this collab. Looking forward to discussing the details!`;

      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collab_id: collab.id, text: intro }),
      });

      setApplied(true);
      onOpenChat(); // open chat panel automatically after applying
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setApplying(false);
    }
  };

  return (
    // Full-screen backdrop
    <div
      className="fixed inset-0 z-40 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal card — slides up on mobile */}
      <div className="relative w-full sm:max-w-lg bg-surface rounded-t-brand sm:rounded-brand shadow-brand2 max-h-[92vh] flex flex-col animate-[slideUp_0.2s_ease-out]">

        {/* Modal close button (X) — always visible, closes the entire modal */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-surface2 flex items-center justify-center text-t2 hover:text-tx hover:bg-[var(--bd2)] transition-colors"
          aria-label="Close"
        >
          <IconX size={16} />
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-5">
          {/* Restaurant info */}
          <div className="pr-8 mb-4">
            <div className="font-display text-xl font-extrabold leading-tight">
              {collab.restaurant.name}
            </div>
            <div className="text-[13px] text-t2 mt-0.5 flex items-center gap-1">
              <IconMapPin size={12} />
              {collab.restaurant.city}
              {collab.restaurant.cuisine && <> · {collab.restaurant.cuisine}</>}
            </div>
          </div>

          {/* Offer range badge */}
          {offerRange && (
            <div
              className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-brands mb-4"
              style={{ background: '#FDF4FF', color: '#7E22CE' }}
            >
              Restaurant offer: {offerRange}
            </div>
          )}

          {/* Brief */}
          {collab.brief && (
            <div className="mb-4">
              <p className="text-[12px] font-semibold text-t3 uppercase tracking-wide mb-1">Brief</p>
              <p className="text-sm text-tx leading-relaxed">{collab.brief}</p>
            </div>
          )}

          {/* Deliverables */}
          {collab.deliverables && (
            <div className="mb-4">
              <p className="text-[12px] font-semibold text-t3 uppercase tracking-wide mb-1">Deliverables</p>
              <p className="text-sm text-tx">{collab.deliverables}</p>
            </div>
          )}

          {/* Requirements */}
          {collab.requirements && (
            <div className="mb-5">
              <p className="text-[12px] font-semibold text-t3 uppercase tracking-wide mb-1">Requirements</p>
              <p className="text-sm text-tx">{collab.requirements}</p>
            </div>
          )}

          {/* Counter-offer chips */}
          {!applied && (
            <div className="mb-5">
              <p className="text-[13px] font-semibold text-t2 mb-2">Your rate proposal (optional)</p>
              <div className="flex flex-wrap gap-2">
                {OFFER_CHIPS.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => { setSelectedOffer(amount); setShowCustom(false); }}
                    className={`h-9 px-4 rounded-brands border text-sm font-semibold transition-colors ${
                      selectedOffer === amount && !showCustom
                        ? 'bg-[#7E22CE] text-white border-[#7E22CE]'
                        : 'bg-surface border-[var(--bd2)] text-t2 hover:border-[#7E22CE] hover:text-[#7E22CE]'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
                {/* Custom amount chip */}
                <button
                  onClick={() => { setShowCustom(true); setSelectedOffer(null); }}
                  className={`h-9 px-4 rounded-brands border text-sm font-semibold transition-colors flex items-center gap-1 ${
                    showCustom
                      ? 'bg-[#7E22CE] text-white border-[#7E22CE]'
                      : 'bg-surface border-[var(--bd2)] text-t2 hover:border-[#7E22CE] hover:text-[#7E22CE]'
                  }`}
                >
                  Custom <IconChevronDown size={13} />
                </button>
              </div>

              {/* Custom amount input — shown when "Custom" chip is active */}
              {showCustom && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-t2 font-semibold">$</span>
                  <input
                    type="number"
                    value={customOffer}
                    onChange={(e) => setCustomOffer(e.target.value)}
                    placeholder="Enter amount"
                    min="1"
                    className="w-36 h-9 px-3 border border-[var(--bd2)] rounded-brands bg-surface text-sm text-tx outline-none focus:border-[#7E22CE] transition-all"
                    autoFocus
                  />
                </div>
              )}
            </div>
          )}

          {/* Transaction flow — shown once collab is accepted */}
          {applied && (
            <div className="mb-5 rounded-xl overflow-hidden border border-purple-100">
              <div className="bg-purple-50 px-4 py-3">
                <p className="text-[12px] font-bold text-purple-700 uppercase tracking-wide">How this collab works</p>
              </div>
              <div className="divide-y divide-purple-50">
                {[
                  { n: 1, title: 'Restaurant deposits payment', desc: `Restaurant pays into secure RepEAT escrow` },
                  { n: 2, title: 'You create the content', desc: 'Create content as per the brief agreed' },
                  { n: 3, title: 'Submit draft for approval', desc: 'Send your draft reel/post before publishing' },
                  { n: 4, title: 'Restaurant approves (48 hrs)', desc: 'Auto-approved if no response in 48 hours' },
                  { n: 5, title: 'You post the content', desc: 'Publish to Instagram/TikTok as agreed' },
                  { n: 6, title: 'Payment released to you', desc: 'RepEAT releases funds minus 2% platform fee' },
                ].map((s) => (
                  <div key={s.n} className="flex items-start gap-3 px-4 py-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5"
                      style={{ background: '#7E22CE', color: '#fff' }}>
                      {s.n}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-gray-800">{s.title}</p>
                      <p className="text-[12px] text-gray-500">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Apply / chat buttons */}
          {!applied ? (
            <div className="space-y-2">
              {applyError && (
                <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-brands px-3 py-2">
                  {applyError}
                </p>
              )}
              <button
                onClick={handleApply}
                disabled={applying}
                className="w-full h-11 font-bold text-[15px] text-white rounded-brands transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: '#7E22CE' }}
              >
                {applying
                  ? <><IconLoader2 size={17} className="animate-spin" /> Applying…</>
                  : finalAmount
                  ? `Apply for $${finalAmount}`
                  : 'Apply now'
                }
              </button>
              {/* Direct chat without applying first */}
              <button
                onClick={onOpenChat}
                className="w-full h-10 border border-[var(--bd2)] rounded-brands text-sm font-semibold text-t2 hover:border-[#7E22CE] hover:text-[#7E22CE] transition-colors"
              >
                Message restaurant first
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-brands px-4 py-3">
                <IconCheck size={16} /> Application sent! Chat is open below.
              </div>
              <button
                onClick={onOpenChat}
                className="w-full h-10 border border-[var(--bd2)] rounded-brands text-sm font-semibold text-t2 hover:border-[#7E22CE] hover:text-[#7E22CE] transition-colors"
              >
                Open chat
              </button>
            </div>
          )}
        </div>

        {/* Chat panel — slides in below the modal content */}
        {chatOpen && (
          <ChatPanel
            collabId={collab.id}
            userId={user.id}
            restaurantName={collab.restaurant.name}
            onClose={onCloseChat}
          />
        )}
      </div>
    </div>
  );
}

// ─── Chat panel ───────────────────────────────────────────────────────────────

function ChatPanel({
  collabId, userId, restaurantName, onClose,
}: {
  collabId: string;
  userId: string;
  restaurantName: string;
  onClose: () => void;
}) {
  const { messages, sendMessage, loading } = useMessages(collabId);
  const [draft,    setDraft]    = useState('');
  const [sending,  setSending]  = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to newest message whenever the list changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(draft.trim());
      setDraft('');
    } finally {
      setSending(false);
    }
  };

  return (
    // Chat panel sits below the modal scroll area, pinned to the bottom of the card
    <div className="border-t border-[var(--bd)] flex flex-col" style={{ height: 320 }}>
      {/* Chat header — has its own X button (closes only the panel, modal stays open) */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--bd)] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#FDF4FF] flex items-center justify-center text-sm">📸</div>
          <span className="text-[13px] font-semibold text-tx">{restaurantName}</span>
          <span className="text-[11px] text-green-600 font-semibold">• Live</span>
        </div>
        {/* Close chat button — only closes the chat panel, the negotiate modal remains visible */}
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-surface2 flex items-center justify-center text-t2 hover:text-tx transition-colors"
          aria-label="Close chat"
        >
          <IconX size={14} />
        </button>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <IconLoader2 size={20} className="text-t3 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-[12px] text-t3 pt-4">
            No messages yet. Say hello!
          </p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === userId;
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[78%] px-3 py-2 rounded-brands text-[13px] leading-relaxed ${
                    isMe
                      ? 'text-white rounded-br-[4px]'
                      : 'bg-surface2 text-tx rounded-bl-[4px]'
                  }`}
                  style={isMe ? { background: '#7E22CE' } : undefined}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-t border-[var(--bd)] shrink-0">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
          placeholder="Type a message…"
          className="flex-1 h-9 px-3 border border-[var(--bd2)] rounded-brands bg-surface text-sm text-tx outline-none focus:border-[#7E22CE] transition-all"
        />
        <button
          onClick={() => void handleSend()}
          disabled={!draft.trim() || sending}
          className="w-9 h-9 rounded-brands flex items-center justify-center text-white disabled:opacity-50 transition-colors shrink-0"
          style={{ background: '#7E22CE' }}
        >
          {sending
            ? <IconLoader2 size={16} className="animate-spin" />
            : <IconSend size={16} />
          }
        </button>
      </div>
    </div>
  );
}

// ─── Instagram handle display helper ─────────────────────────────────────────
// Imported icon used in the banner — kept here to avoid an unused-import warning
// if the banner is conditionally not rendered.
void IconBrandInstagram;
