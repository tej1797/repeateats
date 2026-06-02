'use client';

// Customer Deal Feed — discovery homepage (Phase 3 redesign)
// Sections: Header · HeroBanner · CuisinePills · Tabs · Trending · DealGrid · Featured Restaurants · Recently Added
// Auth logic and data hooks are UNCHANGED from Phase 2.

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  IconSearch, IconMapPin, IconX,
  IconRefresh, IconUser, IconCrown, IconLogout, IconChevronRight,
  IconHeart, IconClock,
} from '@tabler/icons-react';
import { DEAL_FILTERS, type DealFilterId } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { useDeals } from '@/hooks/useDeals';
import { useClaims } from '@/hooks/useClaims';
import { useRestaurants } from '@/hooks/useRestaurants';
import SharedDealCard from '@/components/deals/DealCard';
import CuisinePills from '@/components/deals/CuisinePills';
import DealDetailModal from '@/components/deals/DealDetailModal';
import QRCodeModal from '@/components/deals/QRCodeModal';
import Skeleton from '@/components/ui/Skeleton';
import MobileNav from '@/components/layout/MobileNav';
import type { DealWithRestaurant, Restaurant } from '@/types/index';
import type { User } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────
type Tab = 'active' | 'coming' | 'all';
interface ClaimInfo { qr_code: string; status: string; expires_at: string | null }

interface SearchResult {
  restaurants: Array<{ id: string; name: string; cuisine: string | null; city: string }>;
  deals:       Array<{ id: string; title: string; emoji: string; discount_value: string | null }>;
  cities:      string[];
}

// ─── Constants ────────────────────────────────────────────────────────────
const CITIES: string[] = [
  'GTA Area', 'Mississauga', 'Brampton', 'Toronto',
  'Markham', 'Kitchener-Waterloo', 'Hamilton', 'Oakville',
];

// Rough lat/lon for each Ontario city — used by geolocation "Use My Location"
const CITY_COORDS: Record<string, [number, number]> = {
  'GTA Area':           [43.65, -79.38],
  'Toronto':            [43.65, -79.38],
  'Mississauga':        [43.59, -79.64],
  'Brampton':           [43.72, -79.76],
  'Markham':            [43.86, -79.27],
  'Kitchener-Waterloo': [43.45, -80.49],
  'Hamilton':           [43.26, -79.87],
  'Oakville':           [43.45, -79.69],
};


// Food images per category — used by TrendingCard
const CATEGORY_IMAGES: Record<string, string> = {
  indian:    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80',
  bbq:       'https://images.unsplash.com/photo-1558030006-450675393462?w=400&q=80',
  italian:   'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=80',
  bar:       'https://images.unsplash.com/photo-1575444758702-4a6b9222336e?w=400&q=80',
  canadian:  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80',
  bubbletea: 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=400&q=80',
  pizza:     'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',
  burgers:   'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
  sushi:     'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&q=80',
  desserts:  'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&q=80',
  chinese:   'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&q=80',
  seafood:   'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80',
  default:   'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80',
};

// Hero slides (module-level so HeroBanner's useEffect dep array is empty)
const HERO_SLIDES = [
  {
    emoji:    '🔥',
    title:    '12 new deals this week',
    sub:      'Fresh local restaurant deals, updated every Monday',
    gradient: 'linear-gradient(135deg, #E85D04 0%, #A03C01 100%)',
  },
  {
    emoji:    '💰',
    title:    'Save up to 50% at local spots',
    sub:      'Exclusive discounts from Ontario restaurants',
    gradient: 'linear-gradient(135deg, #7E22CE 0%, #4C1D95 100%)',
  },
  {
    emoji:    '⭐',
    title:    'RepEAT+ — exclusive deals from $4.99/mo',
    sub:      'Early access, bonus deals, and priority claims',
    gradient: 'linear-gradient(135deg, #065F46 0%, #064E3B 100%)',
  },
] as const;

// ─── HeroBanner ───────────────────────────────────────────────────────────
function HeroBanner() {
  const [slide, setSlide] = useState(0);
  const touchStartX = useRef(0);

  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % HERO_SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="relative overflow-hidden rounded-brand mb-5 h-[120px] md:h-[160px] select-none"
      onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={e => {
        const dx = touchStartX.current - e.changedTouches[0].clientX;
        if (dx > 40)       setSlide(s => (s + 1) % HERO_SLIDES.length);
        else if (dx < -40) setSlide(s => (s - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
      }}
    >
      {HERO_SLIDES.map((s, i) => (
        <div
          key={i}
          className="absolute inset-0 flex items-center px-6 md:px-10 transition-opacity duration-500"
          style={{ background: s.gradient, opacity: i === slide ? 1 : 0, pointerEvents: i === slide ? 'auto' : 'none' }}
        >
          {/* Decorative circles */}
          <div className="absolute right-[-20px] top-[-20px] w-[160px] h-[160px] rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute right-[60px] bottom-[-40px] w-[120px] h-[120px] rounded-full bg-white/5 pointer-events-none" />

          <div className="text-white relative z-10">
            <div className="text-[28px] md:text-[36px] mb-1">{s.emoji}</div>
            <div className="font-display text-[18px] md:text-[24px] font-bold leading-tight">{s.title}</div>
            <div className="text-[12px] md:text-[14px] opacity-85 mt-1">{s.sub}</div>
          </div>
        </div>
      ))}

      {/* Dot indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setSlide(i)}
            className={`rounded-full bg-white transition-all duration-300 ${i === slide ? 'w-5 h-2 opacity-100' : 'w-2 h-2 opacity-50'}`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Counter */}
      <span className="absolute top-3 right-4 text-[11px] text-white/60 font-mono z-10">
        {slide + 1}/{HERO_SLIDES.length}
      </span>
    </div>
  );
}

// ─── TrendingCard — wider image-heavy card for the Trending row ───────────
function TrendingCard({ deal, onClick }: { deal: DealWithRestaurant; onClick: () => void }) {
  const category = deal.restaurant?.category ?? 'default';
  const img = CATEGORY_IMAGES[category] ?? CATEGORY_IMAGES.default;

  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-[200px] rounded-brand overflow-hidden shadow-brand border border-[var(--bd)] hover:-translate-y-1 hover:shadow-brand2 transition-all duration-150 text-left cursor-pointer"
    >
      <div className="relative h-[130px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />

        {/* Emoji top-right */}
        <span className="absolute top-2 right-2 text-[22px] drop-shadow-md">{deal.emoji ?? '🍽️'}</span>

        {/* Claim count social proof */}
        {deal.current_claims > 0 && (
          <span className="absolute top-2 left-2 text-[11px] font-bold text-white bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full">
            🔥 {deal.current_claims} claimed
          </span>
        )}

        {/* Discount value */}
        <span className="absolute bottom-2 left-2.5 font-display text-[18px] font-extrabold text-white drop-shadow">
          {deal.discount_value}
        </span>
      </div>

      <div className="bg-surface p-2.5">
        <p className="font-bold text-[13px] text-tx line-clamp-1">{deal.title}</p>
        <p className="text-[11px] text-t2 mt-0.5 truncate">{deal.restaurant?.name}</p>
      </div>
    </button>
  );
}

// ─── RestaurantScrollCard — for the Featured Restaurants row ──────────────
function RestaurantScrollCard({ r, dealCount }: { r: Restaurant; dealCount: number }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(`/customer/restaurant/${r.id}`)}
      className="flex-shrink-0 w-[185px] bg-surface rounded-brand shadow-brand border border-[var(--bd)] overflow-hidden hover:-translate-y-0.5 hover:shadow-brand2 transition-all duration-150 text-left cursor-pointer"
    >
      <div
        className="h-[105px] bg-cover bg-center"
        style={{
          background: r.cover_url
            ? `url(${r.cover_url}) center/cover no-repeat`
            : 'linear-gradient(135deg, #E85D04 0%, #A03C01 100%)',
        }}
      />
      <div className="p-3">
        <div className="flex items-start justify-between gap-1 mb-1">
          <p className="font-bold text-[13px] text-tx line-clamp-1 flex-1">{r.name}</p>
          {dealCount > 0 && (
            <span className="text-[10px] font-bold text-brand bg-brandlt px-1.5 py-0.5 rounded-full flex-shrink-0">
              {dealCount} deal{dealCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <p className="text-[11px] text-t2 truncate">{r.cuisine ? `${r.cuisine} · ` : ''}{r.city}</p>
        {r.rating > 0 && (
          <p className="text-[11px] text-t3 mt-1">⭐ {r.rating.toFixed(1)}</p>
        )}
      </div>
    </button>
  );
}

// ─── ProfileDrawer ────────────────────────────────────────────────────────
function ProfileDrawer({ user, onClose, onSignOut }: { user: User; onClose: () => void; onSignOut: () => void }) {
  const avatarUrl   = user.user_metadata?.avatar_url as string | undefined;
  const fullName    = (user.user_metadata?.full_name ?? user.user_metadata?.name ?? '') as string;
  const displayName = fullName || (user.email?.split('@')[0] ?? 'You');
  const initials    = displayName.charAt(0).toUpperCase();

  const [miniStats, setMiniStats] = useState<{ claims: number; saved: number } | null>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Fetch quick stats to show in drawer header
  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(json => {
        if (json.data) {
          setMiniStats({
            claims: json.data.stats.total_claims,
            saved:  Math.round(json.data.stats.total_saved_cents / 100),
          });
        }
      })
      .catch(() => {});
  }, []);

  const navItems = [
    { href: '/customer',                       label: 'Browse Deals',      icon: '🏠' },
    { href: '/customer/profile',               label: 'My Profile',        icon: '👤' },
    { href: '/customer/profile?tab=claims',    label: 'My Claims',         icon: '🎟️' },
    { href: '/customer/profile?tab=savings',   label: 'Savings Dashboard', icon: '💰' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-[320px] max-w-[90vw] h-full bg-surface flex flex-col shadow-2xl"
        style={{ animation: 'slideInRight 0.25s ease' }}
      >
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface2 flex items-center justify-center text-t2 hover:text-tx transition-colors">
          <IconX size={16} />
        </button>

        {/* User header */}
        <div className="px-5 pt-8 pb-5 border-b border-[var(--bd)]">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={displayName} className="w-14 h-14 rounded-full object-cover border-2 border-[var(--bd)]" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-brand flex items-center justify-center border-2 border-[var(--bg)]">
                <span className="font-display text-[24px] font-bold text-white">{initials}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[16px] truncate">{displayName}</p>
              <p className="text-[12px] text-t2 truncate">{user.email}</p>
              {miniStats && (
                <p className="text-[11px] text-t3 mt-0.5">
                  {miniStats.claims} claim{miniStats.claims !== 1 ? 's' : ''} · ${miniStats.saved} saved
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon }) => (
            <Link key={label} href={href} onClick={onClose} className="flex items-center gap-3 px-3 py-2.5 rounded-brands text-[14px] font-semibold text-tx hover:bg-surface2 transition-colors">
              <span className="text-[18px]">{icon}</span> {label}
            </Link>
          ))}
          <div className="my-2 border-t border-[var(--bd)]" />
          <Link href="/repeat-plus" onClick={onClose} className="flex items-center gap-3 px-3 py-2.5 rounded-brands text-[14px] font-semibold hover:bg-surface2 transition-colors" style={{ color: '#F59E0B' }}>
            <IconCrown size={18} style={{ color: '#F59E0B' }} /> Upgrade to RepEAT+
          </Link>
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-[var(--bd)]">
          <button onClick={onSignOut} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-brands text-[14px] font-semibold text-t2 hover:text-red-600 hover:bg-red-50 transition-colors">
            <IconLogout size={16} /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── RestaurantCard (All Restaurants tab) ────────────────────────────────
function RestaurantCard({ r }: { r: Restaurant }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(`/customer/restaurant/${r.id}`)}
      className="bg-surface rounded-brand shadow-brand border border-[var(--bd)] p-4 hover:-translate-y-0.5 hover:shadow-brand2 transition-all duration-150 cursor-pointer text-left w-full"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-brands bg-brandlt flex items-center justify-center flex-shrink-0 text-2xl">🍽️</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-body font-bold text-[15px] truncate">{r.name}</h3>
          <p className="text-[12px] text-t2">{r.cuisine} · {r.city}</p>
          {r.rating > 0 && <p className="text-[12px] text-t3">⭐ {r.rating.toFixed(1)} · {r.review_count} reviews</p>}
        </div>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {r.accepts_dine_in  && <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">Dine-in</span>}
        {r.accepts_pickup   && <span className="text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">Pickup</span>}
        {r.accepts_delivery && <span className="text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">Delivery</span>}
        {r.open_to_collabs  && <span className="text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">🎥 Collabs open</span>}
      </div>
    </button>
  );
}

// ─── DealCard thin wrapper ────────────────────────────────────────────────
function DealCard({ deal, onClick, claimed }: { deal: DealWithRestaurant; onClick: () => void; claimed?: boolean }) {
  return <SharedDealCard deal={deal} onClick={onClick} claimed={claimed} />;
}

// ─── Overlay (shared by location + sign-in modals) ───────────────────────
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      {children}
    </div>
  );
}

// ─── LocationModal ────────────────────────────────────────────────────────
function LocationModal({ city, radius, onApply, onClose }: { city: string; radius: number; onApply: (c: string, r: number) => void; onClose: () => void }) {
  const [localCity,   setLocalCity]   = useState(city);
  const [localRadius, setLocalRadius] = useState(radius);
  const [locating,    setLocating]    = useState(false);
  const [locateErr,   setLocateErr]   = useState('');

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) { setLocateErr('Geolocation not supported'); return; }
    setLocating(true);
    setLocateErr('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        // Find nearest Ontario city by Euclidean distance on lat/lon
        let nearest = 'GTA Area';
        let minDist = Infinity;
        for (const [name, [clat, clon]] of Object.entries(CITY_COORDS)) {
          const dist = Math.hypot(lat - clat, lon - clon);
          if (dist < minDist) { minDist = dist; nearest = name; }
        }
        setLocalCity(nearest);
        setLocating(false);
      },
      () => { setLocateErr('Could not get location. Please select manually.'); setLocating(false); },
      { timeout: 8000 },
    );
  };

  return (
    <Overlay onClose={onClose}>
      <div className="bg-surface rounded-brand shadow-brand2 w-full max-w-sm p-6 animate-[slideUp_0.2s_ease]">
        <div className="flex justify-between items-center mb-5">
          <span className="font-display text-[17px] font-bold">Location &amp; Radius</span>
          <button onClick={onClose} className="p-1 text-t2 hover:text-tx transition-colors"><IconX size={18} /></button>
        </div>

        {/* Use My Location button */}
        <button
          onClick={handleUseMyLocation}
          disabled={locating}
          className="w-full h-10 mb-4 flex items-center justify-center gap-2 border border-brand text-brand font-semibold text-[13px] rounded-brands hover:bg-brandlt transition-all disabled:opacity-60"
        >
          <IconMapPin size={14} />
          {locating ? 'Detecting location…' : '📍 Use My Location'}
        </button>
        {locateErr && <p className="text-[12px] text-red-500 mb-3 -mt-1">{locateErr}</p>}

        <p className="text-[13px] font-semibold text-t2 mb-2">Quick select</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {CITIES.map(c => (
            <button
              key={c}
              onClick={() => setLocalCity(c)}
              className={`text-[13px] font-semibold px-3 py-1.5 rounded-full border transition-all ${localCity === c ? 'bg-brand text-white border-brand' : 'bg-surface border-[var(--bd2)] text-t2 hover:border-brand hover:text-brand'}`}
            >
              {c === 'GTA Area' ? '🗺️ ' : '📍 '}{c}
            </button>
          ))}
        </div>
        <div className="flex justify-between items-baseline mb-2">
          <p className="text-[13px] text-t2 font-medium">Radius from <span className="text-brand font-bold">{localCity}</span></p>
          <p className="font-display text-[24px] font-extrabold text-brand">{localRadius} km</p>
        </div>
        <input type="range" min={5} max={100} step={5} value={localRadius} onChange={e => setLocalRadius(Number(e.target.value))} className="w-full mb-1 accent-brand" />
        <div className="flex justify-between text-[11px] text-t3 mb-5">
          <span>5 km</span><span>25</span><span>50</span><span>75</span><span>100 km</span>
        </div>
        <button onClick={() => { onApply(localCity, localRadius); onClose(); }} className="w-full h-11 bg-brand hover:bg-brand2 text-white font-semibold rounded-brands transition-colors">
          Show deals in this area
        </button>
      </div>
    </Overlay>
  );
}

// ─── SignInModal ──────────────────────────────────────────────────────────
function SignInModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (u: User) => void }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const supabase = useRef(createClient()).current;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const fn = isSignUp
      ? supabase.auth.signUp({ email, password })
      : supabase.auth.signInWithPassword({ email, password });
    const { data, error: authError } = await fn;
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    if (data.user) onSuccess(data.user);
  };

  const handleGoogle = async () => {
    localStorage.setItem('rp_portal', 'customer');
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  return (
    <Overlay onClose={onClose}>
      <div className="bg-surface rounded-brand shadow-brand2 w-full max-w-sm p-6 animate-[slideUp_0.22s_ease]">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-display text-[20px] font-bold">{isSignUp ? 'Create account' : 'Sign in'}</h2>
          <button onClick={onClose} className="p-1 text-t2 hover:text-tx"><IconX size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 mb-4">
          <div>
            <label className="block text-[13px] font-semibold text-t2 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required className="w-full h-11 px-3.5 border border-[var(--bd2)] rounded-brands bg-surface text-tx text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all" />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-t2 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="w-full h-11 px-3.5 border border-[var(--bd2)] rounded-brands bg-surface text-tx text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all" />
          </div>
          {error && <p className="text-[13px] text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="w-full h-11 bg-brand hover:bg-brand2 disabled:opacity-60 text-white font-semibold rounded-brands transition-colors">
            {loading ? 'Loading…' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-px bg-[var(--bd)]" /><span className="text-[12px] text-t3">or</span><div className="flex-1 h-px bg-[var(--bd)]" />
        </div>
        <button onClick={handleGoogle} className="w-full h-11 border border-[var(--bd2)] rounded-brands font-semibold text-[14px] text-tx hover:border-brand hover:text-brand transition-all flex items-center justify-center gap-2">
          <span className="text-[16px]">G</span> Continue with Google
        </button>
        <p className="text-center text-[13px] text-t2 mt-4">
          {isSignUp ? 'Already have an account?' : 'No account?'}{' '}
          <button onClick={() => setIsSignUp(!isSignUp)} className="text-brand font-semibold">
            {isSignUp ? 'Sign in →' : 'Create one free →'}
          </button>
        </p>
      </div>
    </Overlay>
  );
}

// ─── Main CustomerPage ────────────────────────────────────────────────────
export default function CustomerPage() {
  // ── Filter state ────────────────────────────────────────────
  const [category,   setCategory]   = useState('all');
  const [dealType,   setDealType]   = useState<DealFilterId>('all');
  const [dietFilter, setDietFilter] = useState<'all' | 'veg' | 'egg' | 'nonveg'>('all');
  const [tab,        setTab]        = useState<Tab>('active');
  const [search,     setSearch]     = useState('');
  const [city,       setCity]       = useState('GTA Area');
  const [radius,     setRadius]     = useState(30);

  // ── Pagination ──────────────────────────────────────────────
  const [visibleCount, setVisibleCount] = useState(12);

  // ── Search suggestions ──────────────────────────────────────
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult>({ restaurants: [], deals: [], cities: [] });
  const searchDebounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef  = useRef<HTMLDivElement>(null);

  // ── Modal state ─────────────────────────────────────────────
  const [activeDeal,   setActiveDeal]   = useState<DealWithRestaurant | null>(null);
  const [qrCode,       setQrCode]       = useState<string | null>(null);
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null);
  const [showLocation, setShowLocation] = useState(false);
  const [showSignIn,   setShowSignIn]   = useState(false);
  const [showDrawer,   setShowDrawer]   = useState(false);
  const [claimError,   setClaimError]   = useState<string | null>(null);

  // ── Active claims banner ─────────────────────────────────────
  const [claimsBannerDismissed, setClaimsBannerDismissed] = useState(false);

  // ── Claim usage counters (daily + monthly) ───────────────────
  const [claimUsage, setClaimUsage] = useState<{ daily: number; monthly: number } | null>(null);

  // ── Favorites & recently viewed ─────────────────────────────
  const [favorites,      setFavorites]      = useState<Set<string>>(new Set());
  const [recentlyViewed, setRecentlyViewed] = useState<DealWithRestaurant[]>([]);

  // ── Auth state ──────────────────────────────────────────────
  const [user,         setUser]         = useState<User | null>(null);
  const [authChecked,  setAuthChecked]  = useState(false);
  const [userClaimMap, setUserClaimMap] = useState<Record<string, ClaimInfo>>({});
  const supabase = useRef(createClient()).current;
  const router   = useRouter();

  // Auth listener (unchanged from Phase 2)
  useEffect(() => {
    let mounted = true;
    let redirectTimer: ReturnType<typeof setTimeout> | null = null;

    const handleSession = (u: User) => {
      if (!mounted) return;
      if (redirectTimer) { clearTimeout(redirectTimer); redirectTimer = null; }
      setUser(u);
      setAuthChecked(true);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (session?.user) {
        handleSession(session.user);
      } else if (event === 'SIGNED_OUT') {
        router.replace('/customer/login');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        handleSession(session.user);
      } else {
        redirectTimer = setTimeout(() => {
          if (mounted) router.replace('/customer/login');
        }, 3000);
      }
    });

    return () => {
      mounted = false;
      if (redirectTimer) clearTimeout(redirectTimer);
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  // Fetch user's existing claims — store status + expires_at; compute daily/monthly usage
  useEffect(() => {
    if (!authChecked || !user) return;
    fetch('/api/claims')
      .then(r => r.json())
      .then(({ data }: { data?: Array<{ deal_id: string; qr_code: string; status: string; expires_at: string | null; claimed_at: string }> }) => {
        if (!data) return;
        const map: Record<string, ClaimInfo> = {};
        let daily = 0; let monthly = 0;
        const todayStr    = new Date().toISOString().split('T')[0];
        const monthStart  = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
        for (const c of data) {
          if (!c.deal_id) continue;
          if (c.status === 'claimed' || c.status === 'redeemed') {
            map[c.deal_id] = { qr_code: c.qr_code, status: c.status, expires_at: c.expires_at };
            if (c.claimed_at >= todayStr) daily++;
            if (new Date(c.claimed_at) >= monthStart) monthly++;
          }
        }
        setUserClaimMap(map);
        setClaimUsage({ daily, monthly });
      })
      .catch(() => {});
  }, [authChecked, user]);

  // Realtime claim counts (unchanged)
  const [liveClaimCounts, setLiveClaimCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!authChecked) return;
    const channel = supabase
      .channel('deals-live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'deals' }, (payload) => {
        const updated = payload.new as { id: string; current_claims: number };
        setLiveClaimCounts(prev => ({ ...prev, [updated.id]: updated.current_claims }));
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [supabase, authChecked]);

  // Search suggestions — debounced fetch from /api/search
  useEffect(() => {
    if (!search.trim() || search.length < 2) {
      setSearchResults({ restaurants: [], deals: [], cities: [] });
      return;
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/search?q=${encodeURIComponent(search)}`);
        const data = await res.json() as SearchResult;
        setSearchResults(data);
      } catch { /* ignore network errors */ }
    }, 300);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [search]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Read ?tab= from URL on first load (supports MobileNav deep links)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    if (t === 'coming' || t === 'active' || t === 'all') setTab(t as Tab);
  }, []);

  // ── Claim status helpers ─────────────────────────────────────
  const isActiveClaim = (dealId: string): boolean => {
    const c = userClaimMap[dealId];
    if (!c || c.status !== 'claimed') return false;
    if (!c.expires_at) return true;
    return new Date(c.expires_at) > new Date();
  };

  const isRedeemed = (dealId: string): boolean =>
    userClaimMap[dealId]?.status === 'redeemed';

  // Init favorites from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('rp_favorites');
      if (stored) setFavorites(new Set(JSON.parse(stored) as string[]));
    } catch { /* ignore parse errors */ }
  }, []);

  const toggleFavorite = (dealId: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(dealId)) next.delete(dealId); else next.add(dealId);
      try { localStorage.setItem('rp_favorites', JSON.stringify(Array.from(next))); } catch { /* ignore */ }
      return next;
    });
  };

  const addRecentlyViewed = (deal: DealWithRestaurant) => {
    setRecentlyViewed(prev => [deal, ...prev.filter(d => d.id !== deal.id)].slice(0, 6));
  };

  const handleShare = async (deal: DealWithRestaurant) => {
    const url = `${window.location.origin}/customer/restaurant/${deal.restaurant?.id ?? ''}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: deal.title, text: `${deal.emoji ?? ''} ${deal.title}`, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch { /* user cancelled share */ }
  };

  // Reset visible count + deal type filter when tab changes
  useEffect(() => { setVisibleCount(12); }, [tab, category, dealType, city]);
  useEffect(() => { setDealType('all'); }, [tab]);

  // ── Data hooks (unchanged) ───────────────────────────────────
  // Only pass server-side type filter for deal_types[] filters; discount_type is client-side
  const serverTypeFilter = (dealType === 'dine-in' || dealType === 'pickup')
    ? dealType as 'dine-in' | 'pickup'
    : undefined;

  const { deals, loading: dealsLoading, error: dealsError, refetch } = useDeals({
    category:  category === 'all' ? undefined : category,
    type:      serverTypeFilter,
    tab:       tab === 'all' ? 'active' : tab,
    city:      city === 'GTA Area' ? undefined : city,
  });
  const { restaurants, loading: restsLoading } = useRestaurants({ city: city === 'GTA Area' ? undefined : city });
  const { claimDeal, loading: claiming }        = useClaims();

  // Merge realtime counts (unchanged)
  const dealsWithLive = useMemo(
    () => deals.map(d => ({ ...d, current_claims: liveClaimCounts[d.id] ?? d.current_claims })),
    [deals, liveClaimCounts]
  );

  // Client-side filter: search + discount_type-based deal filters
  const filteredDeals = useMemo(() => {
    let results = dealsWithLive;

    // Discount-type filters applied client-side
    if (dealType === 'bogo') {
      results = results.filter(d => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dt = (d as any).discount_type as string | null;
        const t = d.title.toLowerCase();
        return dt === 'bogo' || (t.includes('buy') && t.includes('get'));
      });
    } else if (dealType === 'percentage') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      results = results.filter(d => (d as any).discount_type === 'percentage');
    } else if (dealType === 'free') {
      results = results.filter(d => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dt = (d as any).discount_type as string | null;
        return dt === 'free_item' || dt === 'free' || d.title.toLowerCase().includes('free');
      });
    } else if (dealType === 'combo') {
      results = results.filter(d => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dt = (d as any).discount_type as string | null;
        return dt === 'combo' || d.title.toLowerCase().includes('combo');
      });
    } else if (dealType === 'happy_hour') {
      results = results.filter(d => {
        const t = (d.title + ' ' + (d.description ?? '')).toLowerCase();
        return t.includes('happy hour');
      });
    }

    // Search filter
    if (!search.trim()) return results;
    const q = search.toLowerCase();
    return results.filter(d =>
      d.title.toLowerCase().includes(q) ||
      (d.restaurant?.name ?? '').toLowerCase().includes(q) ||
      (d.description ?? '').toLowerCase().includes(q)
    );
  }, [dealsWithLive, search, dealType]);

  const filteredRests = useMemo(() => {
    if (!search.trim()) return restaurants;
    const q = search.toLowerCase();
    return restaurants.filter(r =>
      r.name.toLowerCase().includes(q) || (r.cuisine ?? '').toLowerCase().includes(q)
    );
  }, [restaurants, search]);

  // ── Derived data for new sections ───────────────────────────
  const trendingDeals = useMemo(
    () => [...dealsWithLive]
      .sort((a, b) => b.current_claims - a.current_claims)
      .filter(d => d.current_claims > 0)
      .slice(0, 6),
    [dealsWithLive]
  );

  const recentDeals = useMemo(() => {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return dealsWithLive
      .filter(d => d.created_at && new Date(d.created_at) > cutoff)
      .slice(0, 8);
  }, [dealsWithLive]);

  const dealCountByRestaurant = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of dealsWithLive) {
      if (d.restaurant?.id) map[d.restaurant.id] = (map[d.restaurant.id] ?? 0) + 1;
    }
    return map;
  }, [dealsWithLive]);

  // ── Claim handler ────────────────────────────────────────────
  const handleClaim = async () => {
    if (!activeDeal) return;
    setClaimError(null);
    const result = await claimDeal(activeDeal.id);
    if (result) {
      const expiresAt = new Date(Date.now() + 45 * 60 * 1000).toISOString();
      setUserClaimMap(prev => ({
        ...prev,
        [activeDeal.id]: { qr_code: result.qr_code, status: 'claimed', expires_at: expiresAt },
      }));
      setQrCode(result.qr_code);
      // Store claim ID for dynamic QR (comes from the API response if available)
      if ((result as { claim_id?: string }).claim_id) {
        setActiveClaimId((result as { claim_id?: string }).claim_id!);
      }
    } else {
      setClaimError('Could not claim this deal. Please try again.');
    }
  };

  // ── Derived booleans ─────────────────────────────────────────
  // Diet filter (veg = veg only; egg = veg+egg; nonveg/all = everything)
  const dietFilteredDeals = dietFilter === 'veg'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? filteredDeals.filter(d => (d as any).diet_type === 'veg')
    : dietFilter === 'egg'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? filteredDeals.filter(d => ['veg', 'egg'].includes((d as any).diet_type ?? 'nonveg'))
    : filteredDeals;

  // Hide deals the user has already redeemed from the main feed
  const visibleFilteredDeals = dietFilteredDeals.filter(d => !isRedeemed(d.id));

  const loading    = tab === 'all' ? restsLoading : dealsLoading;
  const tabDeals   = tab === 'all' ? [] : visibleFilteredDeals;
  const isEmpty    = !loading && (tab === 'all' ? filteredRests.length === 0 : tabDeals.length === 0);
  const isSearching = search.length >= 2;
  const hasSearchDropdown = searchFocused && isSearching && (
    searchResults.restaurants.length > 0 ||
    searchResults.deals.length > 0 ||
    searchResults.cities.length > 0
  );

  // Blank screen while auth check runs
  if (!authChecked) return <div className="min-h-screen bg-[var(--bg)]" />;

  return (
    <div className="min-h-screen bg-[var(--bg)]">

      {/* ── Sticky header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-surface border-b border-[var(--bd)] shadow-sm">
        <div className="max-w-[1100px] mx-auto px-5 h-16 flex items-center gap-3">

          {/* Logo */}
          <Link href="/customer" className="font-display text-[22px] font-extrabold tracking-tight leading-none flex-shrink-0">
            Rep<span className="text-brand">EAT</span>
          </Link>

          {/* Search + dropdown */}
          <div className="relative flex-1 max-w-[520px]" ref={searchContainerRef}>
            <IconSearch size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-t3 pointer-events-none z-10" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setSearchFocused(true); }}
              onFocus={() => setSearchFocused(true)}
              placeholder="Search restaurants, deals, cuisines…"
              className="w-full h-11 pl-10 pr-9 border border-[var(--bd2)] rounded-full bg-surface2 text-tx text-[14px] outline-none focus:bg-surface focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all placeholder:text-t3"
            />
            {search && (
              <button onClick={() => { setSearch(''); setSearchFocused(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-t3 hover:text-tx z-10 transition-colors">
                <IconX size={16} />
              </button>
            )}

            {/* Search suggestions dropdown */}
            {hasSearchDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface border border-[var(--bd2)] rounded-brand shadow-brand2 z-50 overflow-hidden max-h-[380px] overflow-y-auto">
                {searchResults.restaurants.length > 0 && (
                  <>
                    <p className="px-4 py-2 text-[11px] font-bold text-t3 uppercase tracking-wide bg-surface2">🍽️ Restaurants</p>
                    {searchResults.restaurants.map(r => (
                      <button
                        key={r.id}
                        onMouseDown={() => { router.push(`/customer/restaurant/${r.id}`); setSearchFocused(false); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-surface2 border-b border-[var(--bd)] last:border-0 transition-colors"
                      >
                        <p className="text-[14px] font-semibold text-tx">{r.name}</p>
                        <p className="text-[12px] text-t2">{r.cuisine} · {r.city}</p>
                      </button>
                    ))}
                  </>
                )}
                {searchResults.deals.length > 0 && (
                  <>
                    <p className="px-4 py-2 text-[11px] font-bold text-t3 uppercase tracking-wide bg-surface2">🏷️ Deals</p>
                    {searchResults.deals.map(d => (
                      <button
                        key={d.id}
                        onMouseDown={() => setSearchFocused(false)}
                        className="w-full text-left px-4 py-2.5 hover:bg-surface2 border-b border-[var(--bd)] last:border-0 transition-colors flex items-center gap-2.5"
                      >
                        <span className="text-[18px]">{d.emoji}</span>
                        <div>
                          <p className="text-[14px] font-semibold text-tx">{d.title}</p>
                          {d.discount_value && <p className="text-[12px] text-brand font-bold">{d.discount_value}</p>}
                        </div>
                      </button>
                    ))}
                  </>
                )}
                {searchResults.cities.length > 0 && (
                  <>
                    <p className="px-4 py-2 text-[11px] font-bold text-t3 uppercase tracking-wide bg-surface2">📍 Cities</p>
                    {searchResults.cities.map(c => (
                      <button
                        key={c}
                        onMouseDown={() => { setCity(c); setSearch(''); setSearchFocused(false); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-surface2 border-b border-[var(--bd)] last:border-0 transition-colors text-[14px] font-semibold text-tx"
                      >
                        📍 {c}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Location pill */}
          <button
            onClick={() => setShowLocation(true)}
            className="flex items-center gap-1.5 bg-brandlt border-[1.5px] border-brand rounded-full px-3.5 py-2 text-[13px] font-bold text-brand hover:bg-brand hover:text-white transition-all flex-shrink-0 whitespace-nowrap"
          >
            <IconMapPin size={14} />
            <span className="hidden sm:inline">{city} · {radius} km</span>
            <span className="sm:hidden">{radius} km</span>
          </button>

          {/* Avatar */}
          {user ? (
            <button onClick={() => setShowDrawer(true)} className="relative flex-shrink-0 hover:opacity-90 transition-opacity" title="Open profile">
              {user.user_metadata?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.user_metadata.avatar_url as string} alt="Profile" className="w-9 h-9 rounded-full object-cover border-2 border-[var(--bd)]" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center">
                  <span className="text-white font-bold text-[14px]">
                    {((user.user_metadata?.full_name ?? user.email ?? 'U') as string).charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </button>
          ) : (
            <button onClick={() => setShowSignIn(true)} className="w-9 h-9 rounded-full bg-brandlt flex items-center justify-center flex-shrink-0 hover:bg-brand/20 transition-colors" title="Sign in">
              <IconUser size={16} className="text-brand" />
            </button>
          )}
        </div>

        {/* Tab switcher */}
        <div className="max-w-[1100px] mx-auto px-5 border-t border-[var(--bd)] flex overflow-x-auto scrollbar-none">
          {(['active', 'coming', 'all'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-[14px] font-semibold whitespace-nowrap border-b-[2.5px] transition-all ${tab === t ? 'text-brand border-brand' : 'text-t2 border-transparent hover:text-tx'}`}
            >
              {t === 'active' ? 'Deals This Week' : t === 'coming' ? 'Coming Next Week' : 'All Restaurants'}
            </button>
          ))}
        </div>
      </header>

      {/* ── Claim usage bar ────────────────────────────────────────── */}
      {claimUsage && user && (
        <div className="border-b border-[var(--bd)] bg-surface2">
          <div className="max-w-[1100px] mx-auto px-5 py-2 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-[12px] text-t2">
              🎟️{' '}
              <span className={claimUsage.daily >= 1 ? 'font-bold text-brand' : 'font-semibold'}>
                {claimUsage.daily}/1 today
              </span>
              {' · '}
              <span className={claimUsage.monthly >= 3 ? 'font-bold text-brand' : 'font-semibold'}>
                {claimUsage.monthly}/3 this month
              </span>
            </p>
            {claimUsage.monthly >= 3 && (
              <Link href="/repeat-plus" className="text-[11px] font-bold text-brand hover:text-brand2 transition-colors whitespace-nowrap">
                Upgrade for more →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── Active claims banner ───────────────────────────────────── */}
      {(() => {
        const activeCount = Object.keys(userClaimMap).filter(id => isActiveClaim(id)).length;
        if (claimsBannerDismissed || activeCount === 0) return null;
        return (
          <div className="bg-brand/10 border-b border-brand/20">
            <div className="max-w-[1100px] mx-auto px-5 py-2.5 flex items-center gap-3">
              <IconClock size={15} className="text-brand flex-shrink-0" />
              <p className="text-[13px] font-semibold text-tx flex-1">
                You have <span className="text-brand">{activeCount} active claim{activeCount !== 1 ? 's' : ''}</span>
                {' '}— remember to redeem before they expire!{' '}
                <Link href="/customer/profile?tab=claims" className="underline text-brand hover:text-brand2">View QR codes →</Link>
              </p>
              <button onClick={() => setClaimsBannerDismissed(true)} className="text-t3 hover:text-tx flex-shrink-0">
                <IconX size={15} />
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── Main content ───────────────────────────────────────────── */}
      <main className="max-w-[1100px] mx-auto px-5 py-5 pb-28">

        {/* Section 2 — Hero Banner (active tab, not searching) */}
        {tab === 'active' && !isSearching && <HeroBanner />}

        {/* Section 2b — Diet preference toggle */}
        <div className="flex items-center gap-2 mb-4">
          {([
            { id: 'veg',    label: 'Veg',     dot: '#16a34a' },
            { id: 'egg',    label: 'Egg',     dot: '#ca8a04' },
            { id: 'nonveg', label: 'Non-Veg', dot: '#dc2626' },
          ] as const).map(({ id, label, dot }) => {
            const active = dietFilter === id;
            return (
              <button
                key={id}
                onClick={() => setDietFilter(active ? 'all' : id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold border transition-all ${active ? 'text-tx border-transparent shadow-sm' : 'text-t2 border-[var(--bd2)] hover:border-t2'}`}
                style={active ? { background: `${dot}18`, borderColor: dot } : {}}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dot }} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Section 3 — Cuisine Pills */}
        <CuisinePills selected={category} onChange={setCategory} className="mb-5" />

        {/* Section 4 — Deal type filter chips (horizontally scrollable) */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 mb-5 -mx-5 px-5">
          {DEAL_FILTERS.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setDealType(id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-semibold border-[1.5px] transition-all whitespace-nowrap flex-shrink-0 ${dealType === id ? 'bg-brand text-white border-brand' : 'bg-surface text-t2 border-[var(--bd2)] hover:border-brand hover:text-brand'}`}
            >
              {icon && <span className="text-[14px] leading-none">{icon}</span>}
              {label}
            </button>
          ))}
        </div>

        {/* Results header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[20px] font-bold">
            {tab === 'active'
              ? `Deals near you${!dealsLoading && filteredDeals.length > 0 ? ` (${filteredDeals.length})` : ''}`
              : tab === 'coming'
              ? 'Coming next week'
              : 'All restaurants'}
          </h2>
          {dealsError && (
            <button onClick={refetch} className="flex items-center gap-1.5 text-[13px] text-t2 hover:text-brand transition-colors">
              <IconRefresh size={14} /> Retry
            </button>
          )}
        </div>

        {/* Section 4b — Saved Deals (favorites, active tab, not searching) */}
        {tab === 'active' && !isSearching && favorites.size > 0 && (() => {
          const savedDeals = dealsWithLive.filter(d => favorites.has(d.id));
          if (savedDeals.length === 0) return null;
          return (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[16px] font-bold">❤️ Saved Deals</h3>
                <span className="text-[12px] text-t3">{savedDeals.length} saved</span>
              </div>
              <div className="flex gap-3.5 overflow-x-auto scrollbar-none pb-2 -mx-5 px-5">
                {savedDeals.map(deal => (
                  <div key={deal.id} className="flex-shrink-0 w-[200px] relative">
                    <button
                      onClick={e => { e.stopPropagation(); toggleFavorite(deal.id); }}
                      className="absolute top-2 right-2 z-20 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                    >
                      <IconHeart size={14} className="text-red-500 fill-red-500" />
                    </button>
                    <DealCard
                      deal={deal}
                      onClick={() => { addRecentlyViewed(deal); setActiveDeal(deal); setClaimError(null); }}
                      claimed={isActiveClaim(deal.id)}
                    />
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* Section 4c — Recently Viewed (active tab, not searching, has items) */}
        {tab === 'active' && !isSearching && recentlyViewed.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[16px] font-bold">🕐 Recently Viewed</h3>
              <button onClick={() => setRecentlyViewed([])} className="text-[12px] text-t3 hover:text-tx transition-colors">Clear</button>
            </div>
            <div className="flex gap-3.5 overflow-x-auto scrollbar-none pb-2 -mx-5 px-5">
              {recentlyViewed.map(deal => (
                <div key={deal.id} className="flex-shrink-0 w-[200px] relative">
                  <DealCard
                    deal={deal}
                    onClick={() => { setActiveDeal(deal); setClaimError(null); }}
                    claimed={isActiveClaim(deal.id)}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 5 — Trending Now (active tab, has claimed deals, not searching) */}
        {tab === 'active' && !dealsLoading && trendingDeals.length > 0 && !isSearching && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[16px] font-bold">🔥 Trending Now</h3>
              <span className="text-[12px] text-t3">Most claimed this week</span>
            </div>
            <div className="flex gap-3.5 overflow-x-auto scrollbar-none pb-2 -mx-5 px-5">
              {trendingDeals.map(deal => (
                <TrendingCard key={deal.id} deal={deal} onClick={() => { setActiveDeal(deal); setClaimError(null); }} />
              ))}
            </div>
          </section>
        )}

        {/* Error state */}
        {dealsError && !loading && tab !== 'all' && (
          <div className="text-center py-16 text-t2">
            <p className="text-4xl mb-3">⚠️</p>
            <p className="text-[18px] font-bold mb-1">Could not load deals</p>
            <p className="text-[14px] mb-4">{dealsError}</p>
            <button onClick={refetch} className="h-10 px-6 bg-brand hover:bg-brand2 text-white font-semibold rounded-brands transition-colors">Try again</button>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} variant="dealCard" />)}
          </div>
        )}

        {/* Empty state */}
        {isEmpty && !loading && (
          <div className="text-center py-20 text-t2">
            <p className="text-5xl mb-3">🔍</p>
            <p className="text-[18px] font-bold mb-2">No {tab === 'all' ? 'restaurants' : 'deals'} found</p>
            <p className="text-[14px]">Try a different category, type, or location</p>
          </div>
        )}

        {/* Section 6 — Deal grid with stagger animation + load more */}
        {(!dealsError || tab === 'all') && !loading && tab !== 'all' && tabDeals.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {tabDeals.slice(0, visibleCount).map((deal, i) => (
                <div
                  key={deal.id}
                  className="relative"
                  style={{ animation: 'fadeUpIn 0.3s ease both', animationDelay: `${Math.min(i, 7) * 45}ms` }}
                >
                  <DealCard
                    deal={deal}
                    onClick={() => { addRecentlyViewed(deal); setActiveDeal(deal); setClaimError(null); }}
                    claimed={isActiveClaim(deal.id)}
                  />
                  {/* Heart / save button */}
                  <button
                    onClick={e => { e.stopPropagation(); toggleFavorite(deal.id); }}
                    className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                    aria-label={favorites.has(deal.id) ? 'Remove from saved' : 'Save deal'}
                  >
                    <IconHeart
                      size={14}
                      className={favorites.has(deal.id) ? 'text-red-500' : 'text-t3'}
                      style={favorites.has(deal.id) ? { fill: '#ef4444' } : {}}
                    />
                  </button>
                </div>
              ))}
            </div>
            {/* Load more button */}
            {visibleCount < tabDeals.length && (
              <div className="text-center mt-8">
                <button
                  onClick={() => setVisibleCount(v => v + 12)}
                  className="h-11 px-8 border-[1.5px] border-[var(--bd2)] rounded-brands text-[14px] font-semibold text-t2 hover:border-brand hover:text-brand transition-all"
                >
                  Load more
                  <span className="text-t3 ml-1.5 text-[12px]">({tabDeals.length - visibleCount} remaining)</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* Restaurant grid (All tab) */}
        {!loading && tab === 'all' && filteredRests.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
            {filteredRests.map(r => <RestaurantCard key={r.id} r={r} />)}
          </div>
        )}

        {/* Section 7 — Featured Restaurants (active tab, after deal grid, not searching) */}
        {tab === 'active' && !dealsLoading && restaurants.length > 0 && !isSearching && (
          <section className="mt-10 mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[16px] font-bold">🏪 Featured Restaurants</h3>
              <button
                onClick={() => setTab('all')}
                className="text-[12px] text-brand font-semibold flex items-center gap-0.5 hover:underline"
              >
                View all <IconChevronRight size={13} />
              </button>
            </div>
            <div className="flex gap-3.5 overflow-x-auto scrollbar-none pb-2 -mx-5 px-5">
              {restaurants.slice(0, 10).map(r => (
                <RestaurantScrollCard key={r.id} r={r} dealCount={dealCountByRestaurant[r.id] ?? 0} />
              ))}
            </div>
          </section>
        )}

        {/* Section 8 — Recently Added (active tab, not searching) */}
        {tab === 'active' && !dealsLoading && recentDeals.length > 0 && !isSearching && (
          <section className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[16px] font-bold">✨ Recently Added</h3>
              <span className="text-[12px] text-t3 font-medium">Last 7 days</span>
            </div>
            <div className="flex gap-3.5 overflow-x-auto scrollbar-none pb-2 -mx-5 px-5">
              {recentDeals.map(deal => (
                <div key={deal.id} className="flex-shrink-0 w-[200px] relative">
                  <span className="absolute top-2 left-2 z-20 text-[10px] font-bold text-white bg-brand px-2 py-0.5 rounded-full shadow-sm pointer-events-none">
                    NEW
                  </span>
                  <DealCard
                    deal={deal}
                    onClick={() => { setActiveDeal(deal); setClaimError(null); }}
                    claimed={isActiveClaim(deal.id)}
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ── Modals ─────────────────────────────────────────────────── */}
      {showLocation && (
        <LocationModal
          city={city} radius={radius}
          onApply={(c, r) => { setCity(c); setRadius(r); }}
          onClose={() => setShowLocation(false)}
        />
      )}

      {activeDeal && !qrCode && (
        <DealDetailModal
          deal={activeDeal}
          user={user}
          onClose={() => setActiveDeal(null)}
          onClaim={handleClaim}
          claiming={claiming}
          claimError={claimError}
          alreadyClaimed={isActiveClaim(activeDeal.id)}
          existingQrCode={userClaimMap[activeDeal.id]?.qr_code}
          isRedeemed={isRedeemed(activeDeal.id)}
          onViewExisting={code => setQrCode(code)}
          onShare={() => handleShare(activeDeal)}
        />
      )}

      {qrCode && activeDeal && (
        <QRCodeModal
          code={qrCode}
          dealTitle={activeDeal.title}
          restaurantName={activeDeal.restaurant?.name}
          claimId={activeClaimId ?? undefined}
          onClose={() => { setQrCode(null); setActiveDeal(null); setActiveClaimId(null); }}
        />
      )}

      {showSignIn && (
        <SignInModal
          onClose={() => setShowSignIn(false)}
          onSuccess={u => { setUser(u); setShowSignIn(false); }}
        />
      )}

      {showDrawer && user && (
        <ProfileDrawer
          user={user}
          onClose={() => setShowDrawer(false)}
          onSignOut={async () => { setShowDrawer(false); await supabase.auth.signOut(); }}
        />
      )}

      {/* ── Mobile nav ─────────────────────────────────────────────── */}
      <MobileNav portal="customer" />
    </div>
  );
}
