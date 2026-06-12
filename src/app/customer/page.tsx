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
import { type DealFilterId } from '@/lib/constants';
import { getBrowseDayTabs } from '@/lib/dealVisibility';
import { CUSTOMER_UI } from '@/lib/customerUI';
import { formatCustomerDealTitle } from '@/lib/utils';
import { dealRunsOnOffset, firstClaimableOffset, dateForOffset } from '@/lib/dealSchedule';
import { BROWSE_DAYS } from '@/lib/tierLimits';
import { usePlan } from '@/hooks/usePlan';
import AmbientBackground from '@/components/customer/AmbientBackground';
import DiscoverCompactHeader from '@/components/customer/DiscoverCompactHeader';
import CuisineCircles from '@/components/customer/CuisineCircles';
import DiscoverDealCard from '@/components/customer/DiscoverDealCard';
import DiscoverFilterBar from '@/components/customer/DiscoverFilterBar';
import DiscoverFiltersSheet from '@/components/customer/DiscoverFiltersSheet';
import {
  applyDealTypeFilter,
  applyRatingFilter,
  applyServiceMode,
  sortDeals,
  type QuickDealFilterId,
  type ServiceMode,
  type SortBy,
} from '@/lib/discoverFilters';
import { createClient } from '@/lib/supabase/client';
import { startGoogleOAuth } from '@/lib/portalAuth';
import { handleOAuthReturn } from '@/lib/oauthCallback';
import { useDeals } from '@/hooks/useDeals';
import { useClaims } from '@/hooks/useClaims';
import { useRestaurants } from '@/hooks/useRestaurants';
import DealDetailModal from '@/components/deals/DealDetailModal';
import QRCodeModal from '@/components/deals/QRCodeModal';
import Skeleton from '@/components/ui/Skeleton';
import MobileNav from '@/components/layout/MobileNav';
import type { DealWithRestaurant, Restaurant } from '@/types/index';
import type { User } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────
type DayKey = 'today' | 'tomorrow' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type Tab    = DayKey | 'all';
interface DayTabDef { key: DayKey; label: string; offset: number; earlyAccess?: boolean; locked?: boolean; claimable?: boolean }
interface ClaimInfo { id: string; qr_code: string; status: string; expires_at: string | null }

// ─── Day-tab utilities ────────────────────────────────────────────────────
// DOW index matches JS Date.getDay() — 0 = Sunday
const DOW_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

// Map 'mon' → 'Mon' to match available_days[] values stored in the DB
const capFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// True if the deal runs on the day corresponding to tabKey (date range + DOW).
function dealAvailableOnTab(deal: DealWithRestaurant, tabKey: string, tabs?: DayTabDef[]): boolean {
  if (tabKey === 'all') return true;
  const offset = tabs?.find(t => t.key === tabKey)?.offset
    ?? (tabKey === 'today' ? 0 : tabKey === 'tomorrow' ? 1 : 0);
  return dealRunsOnOffset(deal, offset);
}

// Returns 7-day browse tabs — everyone sees all days; claim gating is separate.
function getVisibleTabs(tier: string, tomorrowUnlockActive = false): DayTabDef[] {
  return getBrowseDayTabs(tier, tomorrowUnlockActive).map(t => ({
    key:         t.key as DayKey,
    label:       t.label,
    offset:      t.offset,
    earlyAccess: t.claimable && t.offset > 0,
    locked:      t.locked,
    claimable:   t.claimable,
  }));
}

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

// ─── RestaurantScrollCard — for the Featured Restaurants row ──────────────
// Image priority: stored cover_url → proxy (Google Places) → cuisine Unsplash fallback
function RestaurantScrollCard({ r, dealCount }: { r: Restaurant; dealCount: number }) {
  const router = useRouter();

  // Build the initial src using the best available source
  const cuisine = (r.category ?? r.cuisine ?? 'default').toLowerCase();
  const initialSrc = r.cover_url
    ?? `/api/restaurant-photo?name=${encodeURIComponent(r.name)}&city=${encodeURIComponent(r.city)}&cuisine=${encodeURIComponent(cuisine)}`;

  const [imgSrc, setImgSrc] = useState(initialSrc);

  return (
    <button
      onClick={() => router.push(`/customer/restaurant/${r.id}`)}
      className="flex-shrink-0 w-[185px] bg-surface rounded-brand shadow-brand border border-[var(--bd)] overflow-hidden hover:-translate-y-0.5 hover:shadow-brand2 transition-all duration-150 text-left cursor-pointer"
    >
      <div className="h-[105px] relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={r.name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => {
            // Final fallback if both proxy and cover_url fail
            const fallback = CATEGORY_IMAGES[cuisine] ?? CATEGORY_IMAGES.default;
            if (imgSrc !== fallback) setImgSrc(fallback);
          }}
        />
      </div>
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
    { href: '/customer/claims',                label: 'My Claims',         icon: '🎟️' },
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

// ─── LocationModal — bottom-sheet (mobile parity) ──────────────────────────
const RADIUS_CHIPS = [2, 5, 10, 25, 50, 100];

function LocationModal({ city, radius, onApply, onClose }: { city: string; radius: number; onApply: (c: string, r: number) => void; onClose: () => void }) {
  const [localCity,   setLocalCity]   = useState(city);
  const [localRadius, setLocalRadius] = useState(radius);
  const [query,       setQuery]       = useState('');
  const [locating,    setLocating]    = useState(false);
  const [locateErr,   setLocateErr]   = useState('');

  const matches = query.trim()
    ? CITIES.filter(c => c.toLowerCase().includes(query.toLowerCase()))
    : CITIES;

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) { setLocateErr('Geolocation not supported'); return; }
    setLocating(true);
    setLocateErr('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
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

  const apply = (nextCity = localCity, nextRadius = localRadius) => {
    onApply(nextCity, nextRadius);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.65)' }} onClick={onClose} />
      <div
        className="relative w-full sm:max-w-md rounded-t-[24px] sm:rounded-[24px] px-5 pt-5 pb-[max(20px,env(safe-area-inset-bottom))] animate-[slideUp_0.22s_ease] max-h-[88vh] overflow-y-auto scrollbar-none"
        style={{ background: CUSTOMER_UI.bgElevated, color: CUSTOMER_UI.textPrimary, border: `1px solid ${CUSTOMER_UI.glassBorder}` }}
      >
        <div className="flex items-start justify-between mb-1">
          <h2 className="font-display text-[22px] font-extrabold">Location</h2>
          <button onClick={onClose} className="p-1" style={{ color: CUSTOMER_UI.textSecondary }}><IconX size={20} /></button>
        </div>
        <p className="text-[14px] mb-4" style={{ color: CUSTOMER_UI.textSecondary }}>
          Search a city or adjust your search radius
        </p>

        {/* Search city */}
        <div className="relative mb-2">
          <IconSearch size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: CUSTOMER_UI.textMuted }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search city (e.g. Mississauga)"
            className="w-full h-12 pl-10 pr-3 rounded-xl text-[14px] outline-none placeholder:opacity-60"
            style={{ background: CUSTOMER_UI.glassBg, border: `1px solid ${CUSTOMER_UI.glassBorder}`, color: CUSTOMER_UI.textPrimary }}
          />
        </div>

        {/* City matches */}
        <div className="flex flex-wrap gap-2 mb-3">
          {matches.map(c => (
            <button
              key={c}
              onClick={() => { setLocalCity(c); setQuery(''); }}
              className="text-[13px] font-semibold px-3 py-1.5 rounded-full transition-all"
              style={localCity === c
                ? { background: CUSTOMER_UI.accent, color: '#fff' }
                : { background: CUSTOMER_UI.glassBg, border: `1px solid ${CUSTOMER_UI.glassBorder}`, color: CUSTOMER_UI.textSecondary }}
            >
              {c}
            </button>
          ))}
        </div>

        <button
          onClick={handleUseMyLocation}
          disabled={locating}
          className="w-full h-10 mb-5 flex items-center justify-center gap-2 rounded-xl text-[13px] font-semibold disabled:opacity-60"
          style={{ border: `1px solid ${CUSTOMER_UI.accent}`, color: CUSTOMER_UI.accent }}
        >
          <IconMapPin size={14} />
          {locating ? 'Detecting location…' : 'Use my location'}
        </button>
        {locateErr && <p className="text-[12px] mb-3 -mt-3" style={{ color: '#f87171' }}>{locateErr}</p>}

        {/* Search radius */}
        <h3 className="font-display text-[18px] font-bold mb-0.5">Search radius</h3>
        <p className="text-[13px] mb-3" style={{ color: CUSTOMER_UI.textSecondary }}>Show restaurants within</p>
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {RADIUS_CHIPS.map(r => {
            const active = localRadius === r;
            return (
              <button
                key={r}
                onClick={() => setLocalRadius(r)}
                className="h-12 rounded-xl text-[14px] font-bold transition-all"
                style={active
                  ? { background: CUSTOMER_UI.accent, color: '#fff' }
                  : { background: CUSTOMER_UI.glassBg, border: `1px solid ${CUSTOMER_UI.glassBorder}`, color: CUSTOMER_UI.textSecondary }}
              >
                {r} km
              </button>
            );
          })}
        </div>

        <button
          onClick={() => apply()}
          className="w-full py-3.5 rounded-2xl text-[16px] font-bold text-white"
          style={{ background: CUSTOMER_UI.accent }}
        >
          Show deals in {localCity}
        </button>
      </div>
    </div>
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
    await startGoogleOAuth(supabase, 'customer');
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
  const [dealType,      setDealType]      = useState<QuickDealFilterId>('all');
  const [sheetOffer,    setSheetOffer]    = useState<DealFilterId>('all');
  // Veg mode is ON by default (mobile parity). 'veg' = veg mode on, 'all' = non-veg mode.
  const [dietFilter,    setDietFilter]    = useState<'all' | 'veg' | 'egg' | 'nonveg'>('veg');
  const [serviceMode,   setServiceMode]   = useState<ServiceMode>('all');
  const [sortBy,        setSortBy]        = useState<SortBy>('relevance');
  const [minRating,     setMinRating]     = useState<number | null>(null);
  const [priceFilter,   setPriceFilter]   = useState<'all' | 'under10'>('all');
  const [showFilters,   setShowFilters]   = useState(false);
  const [tab,        setTab]        = useState<Tab>('today');
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

  // ── Plan + quota (replaces local claimUsage state) ──────────
  const plan = usePlan();

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

    const boot = async () => {
      await handleOAuthReturn(supabase, 'customer');
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (session?.user) {
        handleSession(session.user);
      } else {
        redirectTimer = setTimeout(() => {
          if (mounted) router.replace('/customer/login');
        }, 3000);
      }
    };

    void boot();

    return () => {
      mounted = false;
      if (redirectTimer) clearTimeout(redirectTimer);
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  // Fetch user's existing claims — store status + expires_at in the claim map
  useEffect(() => {
    if (!authChecked || !user) return;
    fetch('/api/claims')
      .then(r => r.json())
      .then(({ data }: { data?: Array<{ id: string; deal_id: string; qr_code: string; status: string; expires_at: string | null; claimed_at: string }> }) => {
        if (!data) return;
        const map: Record<string, ClaimInfo> = {};
        for (const c of data) {
          if (!c.deal_id) continue;
          if (c.status === 'claimed' || c.status === 'redeemed') {
            map[c.deal_id] = { id: c.id, qr_code: c.qr_code, status: c.status, expires_at: c.expires_at };
          }
        }
        setUserClaimMap(map);
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

  // Read ?tab= from URL on first load — supports MobileNav deep links + old URLs
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    if (!t) return;
    if (t === 'all') setTab('all');
    else if (t === 'active' || t === 'today') setTab('today');
    else if (t === 'coming' || t === 'tomorrow') setTab('tomorrow');
    // day-key tabs (mon, tue, …) set directly
    else if (['mon','tue','wed','thu','fri','sat','sun'].includes(t)) setTab(t as DayKey);
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

  // Reset visible count when filters change
  useEffect(() => { setVisibleCount(12); }, [tab, category, dealType, city, serviceMode, sortBy, minRating]);
  // Snap back to 'today' if plan loads and the current tab is no longer visible
  useEffect(() => {
    if (plan.loading) return;
    const allowed = [...visibleTabs.map(t => t.key), 'all' as const];
    if (!allowed.includes(tab as DayKey)) setTab('today');
  }, [plan.tier, plan.loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data hooks (unchanged) ───────────────────────────────────
  // Only pass server-side type filter for deal_types[] filters; discount_type is client-side
  const serverTypeFilter = (serviceMode === 'dine-in' || serviceMode === 'pickup')
    ? serviceMode
    : undefined;

  // Always fetch active deals — day filtering happens client-side so we can
  // switch tabs without extra network requests.
  const { deals, loading: dealsLoading, error: dealsError, refetch } = useDeals({
    category:  category === 'all' ? undefined : category,
    type:      serverTypeFilter,
    tab:       'active',
    city:      city === 'GTA Area' ? undefined : city,
  });
  const { restaurants, loading: restsLoading } = useRestaurants({ city: city === 'GTA Area' ? undefined : city });
  const { claimDeal, loading: claiming }        = useClaims();

  // Merge realtime counts (unchanged)
  const dealsWithLive = useMemo(
    () => deals.map(d => ({ ...d, current_claims: liveClaimCounts[d.id] ?? d.current_claims })),
    [deals, liveClaimCounts]
  );

  // Visible tabs for the current plan (recalculates when plan tier loads)
  const visibleTabs = useMemo(
    () => plan.loading
      ? [{ key: 'today' as DayKey, label: 'Today', offset: 0, claimable: true }]
      : getVisibleTabs(plan.tier, plan.tomorrow_unlock_active),
    [plan.tier, plan.loading, plan.tomorrow_unlock_active],
  );

  // Client-side filter: expiry guard + day filter + search + discount-type filters
  const filteredDeals = useMemo(() => {
    let results = dealsWithLive;

    // (4) Expiry guard — belt-and-suspenders on top of API filtering
    results = results.filter(d => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const endDate = d.valid_until ?? (d as any).end_date ?? null;
      return !endDate || new Date(endDate) >= new Date();
    });

    // Day filter — show only deals available on the selected tab's day
    if (tab !== 'all') {
      results = results.filter(d => dealAvailableOnTab(d, tab, visibleTabs));
    }

    // Offer / quick filters
    const activeOffer = sheetOffer !== 'all' ? sheetOffer : dealType;
    results = applyDealTypeFilter(results, activeOffer);
    if (priceFilter === 'under10') results = applyDealTypeFilter(results, 'under10');
    results = applyServiceMode(results, serviceMode);
    results = applyRatingFilter(results, minRating);
    results = sortDeals(results, sortBy);

    // Search filter
    if (!search.trim()) return results;
    const q = search.toLowerCase();
    return results.filter(d =>
      d.title.toLowerCase().includes(q) ||
      (d.restaurant?.name ?? '').toLowerCase().includes(q) ||
      (d.description ?? '').toLowerCase().includes(q)
    );
  }, [dealsWithLive, search, dealType, sheetOffer, tab, serviceMode, minRating, priceFilter, sortBy, visibleTabs]);

  const filteredRests = useMemo(() => {
    if (!search.trim()) return restaurants;
    const q = search.toLowerCase();
    return restaurants.filter(r =>
      r.name.toLowerCase().includes(q) || (r.cuisine ?? '').toLowerCase().includes(q)
    );
  }, [restaurants, search]);

  // Deal counts per DOW — fetched once for WeekStrip (Pro) and Starter locked preview
  const [dealCountsByDay, setDealCountsByDay] = useState<Record<string, number>>({});
  useEffect(() => {
    if (plan.loading) return;
    fetch('/api/deals/counts-by-day?days=7')
      .then(r => r.json())
      .then((d: Record<string, number>) => setDealCountsByDay(d))
      .catch(() => {});
  }, [plan.loading]);

  // Total deal count across future days (days 2-6 for Starter locked preview)
  const futureDayCount = useMemo(() => {
    if (plan.tier !== 'starter') return 0;
    const todayDowKey = DOW_KEYS[new Date().getDay()];
    const tomorrowDowKey = DOW_KEYS[(new Date().getDay() + 1) % 7];
    return Object.entries(dealCountsByDay)
      .filter(([d]) => d !== todayDowKey && d !== tomorrowDowKey)
      .reduce((sum, [, c]) => sum + c, 0);
  }, [dealCountsByDay, plan.tier]);

  // Preview of tomorrow's deals — shown blurred to Free users as upgrade hook
  const tomorrowPreviewDeals = useMemo(
    () => dealsWithLive
      .filter(d => dealRunsOnOffset(d, 1))
      .slice(0, 4),
    [dealsWithLive],
  );

  // Deals running later this week but not today — "Coming up this week" (mobile parity).
  const comingUpDeals = useMemo(() => {
    if (tab !== 'today') return [];
    let results = dealsWithLive.filter(d => {
      if (dealRunsOnOffset(d, 0)) return false;
      for (let off = 1; off < BROWSE_DAYS; off++) {
        if (dealRunsOnOffset(d, off)) return true;
      }
      return false;
    });
    const activeOffer = sheetOffer !== 'all' ? sheetOffer : dealType;
    results = applyDealTypeFilter(results, activeOffer);
    if (priceFilter === 'under10') results = applyDealTypeFilter(results, 'under10');
    results = applyServiceMode(results, serviceMode);
    results = applyRatingFilter(results, minRating);
    results = sortDeals(results, sortBy);
    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(d =>
        d.title.toLowerCase().includes(q) ||
        (d.restaurant?.name ?? '').toLowerCase().includes(q) ||
        (d.description ?? '').toLowerCase().includes(q)
      );
    }
    if (dietFilter === 'veg') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      results = results.filter(d => ((d as any).diet_type ?? 'veg') !== 'nonveg');
    } else if (dietFilter === 'egg') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      results = results.filter(d => ['veg', 'egg'].includes((d as any).diet_type ?? 'veg'));
    } else if (dietFilter === 'nonveg') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      results = results.filter(d => ((d as any).diet_type ?? 'nonveg') === 'nonveg');
    }
    return results.filter(d => {
      const c = userClaimMap[d.id];
      return !(c?.status === 'redeemed');
    });
  }, [tab, dealsWithLive, search, dealType, sheetOffer, serviceMode, minRating, priceFilter, sortBy, dietFilter, userClaimMap]);

  // ── Derived data for new sections ───────────────────────────
  const trendingDeals = useMemo(
    () => [...dealsWithLive]
      .filter(d => dealRunsOnOffset(d, 0))
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
  const currentTabMeta = visibleTabs.find(t => t.key === tab);
  const tabClaimLocked = currentTabMeta?.locked ?? false;

  // First day within tier claim window when this deal can be claimed.
  const activeClaimOffset = useMemo(() => {
    if (!activeDeal) return null;
    return firstClaimableOffset(activeDeal, plan.tier, plan.tomorrow_unlock_active);
  }, [activeDeal, plan.tier, plan.tomorrow_unlock_active]);

  const activeClaimLocked = !!activeDeal && !!user && activeClaimOffset === null;

  // Date (YYYY-MM-DD) for scheduled claims — first claimable day, or active tab day.
  const activeTabDate = useMemo(() => {
    if (activeClaimOffset !== null) return dateForOffset(activeClaimOffset);
    if (tab === 'all') return undefined;
    const offset = visibleTabs.find(t => t.key === tab)?.offset ?? 0;
    return dateForOffset(offset);
  }, [tab, visibleTabs, activeClaimOffset]);

  const handleClaim = async (opts?: { timer_starts_at?: string; claim_for_date?: string }) => {
    if (!activeDeal) return;
    if (tabClaimLocked) {
      setClaimError('Upgrade to RepEAT+ to claim deals on this day.');
      return;
    }
    setClaimError(null);
    const result = await claimDeal(activeDeal.id, opts);
    if (result && 'qr_code' in result) {
      const isScheduled = result.status === 'scheduled';
      const expiresAt = result.expires_at ?? new Date(Date.now() + 60 * 60 * 1000).toISOString();
      setUserClaimMap(prev => ({
        ...prev,
        [activeDeal.id]: {
          id: result.claim_id ?? '',
          qr_code: result.qr_code,
          status: isScheduled ? 'scheduled' : 'claimed',
          expires_at: expiresAt,
        },
      }));
      // Quota counter only increases on restaurant redeem (counted_against_limit).
      if (isScheduled) {
        // Reserved for a future time — no live QR yet. Send the user to Waiting.
        setActiveDeal(null);
        router.push('/customer/claims');
      } else {
        setQrCode(result.qr_code);
        if (result.claim_id) setActiveClaimId(result.claim_id);
      }
    } else {
      setClaimError(result?.error ?? 'Could not claim this deal. Please try again.');
    }
  };

  // ── Derived booleans ─────────────────────────────────────────
  // Diet filter (veg = veg only; egg = veg+egg; nonveg/all = everything)
  // Veg mode ON: hide only explicitly non-veg deals (unmarked deals still show).
  // Veg mode OFF ('all'): show everything including non-veg.
  const dietFilteredDeals = dietFilter === 'veg'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? filteredDeals.filter(d => ((d as any).diet_type ?? 'veg') !== 'nonveg')
    : dietFilter === 'egg'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? filteredDeals.filter(d => ['veg', 'egg'].includes((d as any).diet_type ?? 'veg'))
    : dietFilter === 'nonveg'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? filteredDeals.filter(d => ((d as any).diet_type ?? 'nonveg') === 'nonveg')
    : filteredDeals;

  // Hide deals the user has already redeemed from the main feed
  const visibleFilteredDeals = dietFilteredDeals.filter(d => !isRedeemed(d.id));

  const loading    = tab === 'all' ? restsLoading : dealsLoading;
  const tabDeals   = tab === 'all' ? [] : visibleFilteredDeals;
  const isEmpty    = !loading && (
    tab === 'all'
      ? filteredRests.length === 0
      : tab === 'today'
      ? tabDeals.length === 0 && comingUpDeals.length === 0
      : tabDeals.length === 0
  );
  const activeClaimTime = useMemo(() => {
    const times = Object.values(userClaimMap)
      .filter(c => c.status === 'claimed' && c.expires_at && new Date(c.expires_at) > new Date())
      .map(c => new Date(c.expires_at!).getTime())
      .sort((a, b) => a - b);
    if (!times.length) return null;
    return new Date(times[0]).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }, [userClaimMap]);

  const filterBadgeCount = useMemo(() => {
    let n = 0;
    if (sortBy !== 'relevance') n++;
    if (minRating) n++;
    if (priceFilter === 'under10') n++;
    if (sheetOffer !== 'all') n++;
    if (tab !== 'today') n++;
    return n;
  }, [sortBy, minRating, priceFilter, sheetOffer, tab]);

  const isSearching = search.length >= 2;
  const hasSearchDropdown = searchFocused && isSearching && (
    searchResults.restaurants.length > 0 ||
    searchResults.deals.length > 0 ||
    searchResults.cities.length > 0
  );

  // Blank screen while auth check runs
  if (!authChecked) return <div className="min-h-screen" style={{ background: CUSTOMER_UI.bg }} />;

  return (
    <div className="min-h-screen relative" style={{ background: CUSTOMER_UI.bg, color: CUSTOMER_UI.textPrimary }}>
      <AmbientBackground />

      {/* ── Sticky discover header (mobile parity) ─────────────────── */}
      <header className="sticky top-0 z-40 glass-bar border-b-0" style={{ borderBottom: `1px solid ${CUSTOMER_UI.glassBorder}` }}>
        <div className="max-w-[1100px] mx-auto px-4 pt-3 pb-2 space-y-3">

          {!plan.loading && (
            <DiscoverCompactHeader
              city={city}
              radiusKm={radius}
              tier={plan.tier}
              dailyUsed={plan.daily_used}
              effectiveDailyCap={plan.effective_daily_cap}
              pointsBalance={plan.points_balance}
              vegMode={dietFilter === 'veg'}
              onVegModeChange={(veg) => setDietFilter(veg ? 'veg' : 'all')}
              activeClaimTime={activeClaimTime}
            />
          )}

          {/* Search */}
          <div className="relative" ref={searchContainerRef}>
            <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" style={{ color: CUSTOMER_UI.textMuted }} />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setSearchFocused(true); }}
              onFocus={() => setSearchFocused(true)}
              placeholder="Search restaurants, deals, cuisines…"
              className="w-full h-9 pl-9 pr-9 rounded-xl text-[13px] outline-none transition-all placeholder:opacity-60"
              style={{
                background: CUSTOMER_UI.glassBg,
                border: `1px solid ${CUSTOMER_UI.glassBorder}`,
                color: CUSTOMER_UI.textPrimary,
              }}
            />
            {search && (
              <button onClick={() => { setSearch(''); setSearchFocused(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-t3 hover:text-tx z-10 transition-colors">
                <IconX size={16} />
              </button>
            )}

            {/* Search suggestions dropdown */}
            {hasSearchDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1.5 rounded-2xl z-50 overflow-hidden max-h-[380px] overflow-y-auto scrollbar-none glass-panel shadow-2xl">
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
                          <p className="text-[14px] font-semibold text-tx">{formatCustomerDealTitle(d.title)}</p>
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

          <div className="flex items-center justify-end gap-2 pb-1">
            <button
              type="button"
              onClick={() => setShowLocation(true)}
              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: CUSTOMER_UI.accentSoft, color: CUSTOMER_UI.accent }}
            >
              <IconMapPin size={12} />
              Change location
            </button>
            {user ? (
              <button type="button" onClick={() => setShowDrawer(true)} className="w-8 h-8 rounded-full overflow-hidden border" style={{ borderColor: CUSTOMER_UI.glassBorder }}>
                {user.user_metadata?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.user_metadata.avatar_url as string} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[12px] font-bold" style={{ background: CUSTOMER_UI.accent, color: '#fff' }}>
                    {((user.user_metadata?.full_name ?? user.email ?? 'U') as string).charAt(0).toUpperCase()}
                  </div>
                )}
              </button>
            ) : (
              <button type="button" onClick={() => setShowSignIn(true)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: CUSTOMER_UI.glassBg, border: `1px solid ${CUSTOMER_UI.glassBorder}` }}>
                <IconUser size={14} style={{ color: CUSTOMER_UI.accent }} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Active claims banner ───────────────────────────────────── */}
      {(() => {
        const activeCount = Object.keys(userClaimMap).filter(id => isActiveClaim(id)).length;
        if (claimsBannerDismissed || activeCount === 0) return null;
        return (
          <div style={{ background: CUSTOMER_UI.accentSoft, borderBottom: `1px solid ${CUSTOMER_UI.glassBorder}` }}>
            <div className="max-w-[1100px] mx-auto px-4 py-2.5 flex items-center gap-3">
              <IconClock size={15} className="flex-shrink-0" style={{ color: CUSTOMER_UI.accent }} />
              <p className="text-[13px] font-semibold flex-1" style={{ color: CUSTOMER_UI.textPrimary }}>
                You have <span style={{ color: CUSTOMER_UI.accent }}>{activeCount} active claim{activeCount !== 1 ? 's' : ''}</span>
                {' '}— remember to redeem before they expire!{' '}
                <Link href="/customer/claims" className="underline text-brand hover:text-brand2">View QR codes →</Link>
              </p>
              <button onClick={() => setClaimsBannerDismissed(true)} className="text-t3 hover:text-tx flex-shrink-0">
                <IconX size={15} />
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── Main content ───────────────────────────────────────────── */}
      <main className="max-w-[1100px] mx-auto px-4 py-4 pb-28">

        {/* Cuisine circles + filter bar (mobile layout) */}
        {tab !== 'all' && !isSearching && (
          <>
            <CuisineCircles selected={category} onChange={setCategory} className="mb-3" />
            <DiscoverFilterBar
              dealType={dealType}
              onDealType={(id) => { setDealType(id); setSheetOffer('all'); }}
              serviceMode={serviceMode}
              onServiceMode={setServiceMode}
              onOpenFilters={() => setShowFilters(true)}
              filterCount={filterBadgeCount}
            />
          </>
        )}

        {/* Results header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[20px] font-bold">
            {tab === 'all'
              ? 'All restaurants'
              : tab === 'today'
              ? `Today's deals${!dealsLoading && tabDeals.length > 0 ? ` (${tabDeals.length})` : ''}`
              : `${visibleTabs.find(t => t.key === tab)?.label ?? capFirst(tab)} deals`}
          </h2>
          {dealsError && (
            <button onClick={refetch} className="flex items-center gap-1.5 text-[13px] text-t2 hover:text-brand transition-colors">
              <IconRefresh size={14} /> Retry
            </button>
          )}
        </div>

        {/* Section 4b — Saved Deals (today tab, not searching) */}
        {tab === 'today' && !isSearching && favorites.size > 0 && (() => {
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
                    <DiscoverDealCard
                      deal={deal}
                      onClick={() => { addRecentlyViewed(deal); setActiveDeal(deal); setClaimError(null); }}
                      claimed={isActiveClaim(deal.id)}
                      saved={favorites.has(deal.id)}
                      onToggleSave={() => toggleFavorite(deal.id)}
                    />
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* Section 4c — Recently Viewed (today tab, not searching) */}
        {tab === 'today' && !isSearching && recentlyViewed.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[16px] font-bold">🕐 Recently Viewed</h3>
              <button onClick={() => setRecentlyViewed([])} className="text-[12px] text-t3 hover:text-tx transition-colors">Clear</button>
            </div>
            <div className="flex gap-3.5 overflow-x-auto scrollbar-none pb-2 -mx-5 px-5">
              {recentlyViewed.map(deal => (
                <div key={deal.id} className="flex-shrink-0 w-[200px] relative">
                  <DiscoverDealCard
                    deal={deal}
                    onClick={() => { setActiveDeal(deal); setClaimError(null); }}
                    claimed={isActiveClaim(deal.id)}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 5 — Trending Now (today tab only) */}
        {tab === 'today' && !dealsLoading && trendingDeals.length > 0 && !isSearching && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-1 h-5 rounded-full flex-shrink-0" style={{ background: CUSTOMER_UI.accent }} />
                <h3 className="text-[16px] font-bold">Trending Now</h3>
              </div>
              <span className="text-[12px] text-t3">Most claimed this week</span>
            </div>
            <div className="flex gap-3.5 overflow-x-auto scrollbar-none pb-2 -mx-5 px-5">
              {trendingDeals.map(deal => (
                <div key={deal.id} className="flex-shrink-0 w-[180px]">
                  <DiscoverDealCard deal={deal} onClick={() => { setActiveDeal(deal); setClaimError(null); }} showCrown={plan.tier === 'pro' || plan.tier === 'yearly'} />
                </div>
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
            <p className="text-[18px] font-bold mb-2">
              {tab === 'today'
                ? 'No deals today'
                : tab === 'all'
                ? 'No restaurants found'
                : `No deals found on ${visibleTabs.find(t => t.key === tab)?.label ?? tab}`}
            </p>
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
                  <DiscoverDealCard
                    deal={deal}
                    onClick={() => { addRecentlyViewed(deal); setActiveDeal(deal); setClaimError(null); }}
                    claimed={isActiveClaim(deal.id)}
                    saved={favorites.has(deal.id)}
                    onToggleSave={() => toggleFavorite(deal.id)}
                    showCrown={plan.tier === 'pro' || plan.tier === 'yearly'}
                    locked={currentTabMeta?.locked ?? false}
                  />
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

        {/* Coming up this week — today tab, future deals in browse window */}
        {tab === 'today' && !dealsLoading && comingUpDeals.length > 0 && !isSearching && (
          <section className="mt-8 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1 h-5 rounded-full flex-shrink-0" style={{ background: CUSTOMER_UI.gold }} />
              <h3 className="text-[16px] font-bold">Coming up this week</h3>
            </div>
            <p className="text-[12px] text-t3 mb-3 ml-3">
              Preview upcoming deals — upgrade to claim on future days.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {comingUpDeals.slice(0, 12).map((deal, i) => (
                <div
                  key={deal.id}
                  className="relative"
                  style={{ animation: 'fadeUpIn 0.3s ease both', animationDelay: `${Math.min(i, 7) * 45}ms` }}
                >
                  <DiscoverDealCard
                    deal={deal}
                    onClick={() => { addRecentlyViewed(deal); setActiveDeal(deal); setClaimError(null); }}
                    claimed={isActiveClaim(deal.id)}
                    saved={favorites.has(deal.id)}
                    onToggleSave={() => toggleFavorite(deal.id)}
                    locked={plan.tier === 'free'}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Restaurant grid (All tab) */}
        {!loading && tab === 'all' && filteredRests.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
            {filteredRests.map(r => <RestaurantCard key={r.id} r={r} />)}
          </div>
        )}

        {/* (3) Blurred tomorrow preview — Free users on Today tab */}
        {tab === 'today' && plan.tier === 'free' && !isSearching && !dealsLoading && tomorrowPreviewDeals.length > 0 && (
          <section className="mt-8 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-[16px] font-bold">🔮 Tomorrow&apos;s Deals</h3>
              <span className="text-[11px] font-semibold text-t3">Starter &amp; Pro only</span>
            </div>
            <div className="relative">
              {/* Blurred deal cards — pointer-events off so they can't be clicked */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 select-none pointer-events-none" style={{ filter: 'blur(4px)', opacity: 0.55 }}>
                {tomorrowPreviewDeals.map(deal => (
                  <DiscoverDealCard key={deal.id} deal={deal} onClick={() => {}} locked />
                ))}
              </div>
              {/* Upgrade overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-surface border border-[var(--bd)] rounded-brand shadow-brand2 p-5 mx-4 text-center max-w-xs w-full">
                  <div className="text-2xl mb-2">🔒</div>
                  <p className="font-display font-bold text-[15px] mb-1">Unlock tomorrow&apos;s deals</p>
                  <p className="text-[13px] text-t2 mb-4">Upgrade to Starter from $2.99/mo for early access</p>
                  <Link
                    href="/repeat-plus"
                    className="inline-flex items-center justify-center h-10 px-5 rounded-brands text-[14px] font-bold transition-all hover:opacity-90"
                    style={{ background: CUSTOMER_UI.gold, color: '#1a1100' }}
                  >
                    Upgrade to Starter →
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Starter locked-future-days teaser — shows below Tomorrow deals */}
        {tab === 'tomorrow' && plan.tier === 'starter' && !isSearching && !dealsLoading && futureDayCount > 0 && (
          <div className="my-6 rounded-brands border border-[var(--bd)] bg-surface2 px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-semibold text-[14px]">
                🔒 {futureDayCount} more deals this week
              </p>
              <p className="text-[12px] text-t2 mt-0.5">See the full 7-day calendar — upgrade to Pro</p>
            </div>
            <Link
              href="/repeat-plus"
              className="inline-flex items-center h-9 px-4 rounded-brands text-[13px] font-bold transition-all hover:opacity-90 flex-shrink-0"
              style={{ background: CUSTOMER_UI.gold, color: '#1a1100' }}
            >
              Unlock with Pro →
            </Link>
          </div>
        )}

        {/* Section 7 — Featured Restaurants (any day tab, after deal grid, not searching) */}
        {tab !== 'all' && !dealsLoading && restaurants.length > 0 && !isSearching && (
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

        {/* Section 8 — Recently Added (today tab only) */}
        {tab === 'today' && !dealsLoading && recentDeals.length > 0 && !isSearching && (
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
                  <DiscoverDealCard
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
          planTier={plan.tier}
          onClose={() => setActiveDeal(null)}
          onClaim={handleClaim}
          claiming={claiming}
          claimError={claimError}
          alreadyClaimed={isActiveClaim(activeDeal.id)}
          existingQrCode={userClaimMap[activeDeal.id]?.qr_code}
          isRedeemed={isRedeemed(activeDeal.id)}
          dailyLimitReached={plan.dailyHit}
          claimLocked={activeClaimLocked}
          claimForDate={activeTabDate}
          visitWindowMinutes={plan.visit_window_minutes}
          onViewExisting={code => {
            setQrCode(code);
            const claimInfo = userClaimMap[activeDeal.id];
            if (claimInfo?.id) setActiveClaimId(claimInfo.id);
          }}
          onShare={() => handleShare(activeDeal)}
        />
      )}

      {qrCode && activeDeal && activeClaimId && (
        <QRCodeModal
          claimId={activeClaimId}
          dealTitle={formatCustomerDealTitle(activeDeal.title)}
          restaurantName={activeDeal.restaurant?.name}
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

      <DiscoverFiltersSheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        sortBy={sortBy}
        onSortBy={setSortBy}
        dayTabs={visibleTabs}
        activeDay={tab === 'all' ? 'today' : tab}
        onDaySelect={(key) => setTab(key as Tab)}
        minRating={minRating}
        onMinRating={setMinRating}
        offerType={sheetOffer}
        onOfferType={setSheetOffer}
        priceFilter={priceFilter}
        onPriceFilter={setPriceFilter}
        onApply={() => setDealType('all')}
        onClear={() => {
          setSortBy('relevance');
          setMinRating(null);
          setPriceFilter('all');
          setSheetOffer('all');
          setDealType('all');
          setServiceMode('all');
          setTab('today');
        }}
      />

      {/* ── Mobile nav ─────────────────────────────────────────────── */}
      <MobileNav portal="customer" />
    </div>
  );
}
