'use client';

// Customer Deal Feed — connects to /api/deals and /api/restaurants.
// This is a Client Component because it manages interactive state
// (filters, modals, search). "use client" means this runs in the browser.

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  IconSearch, IconMapPin, IconX, IconCircleCheck,
  IconInfoCircle, IconUser, IconBuildingStore, IconShoppingBag,
  IconTruck, IconRefresh,
} from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { useDeals } from '@/hooks/useDeals';
import { useClaims } from '@/hooks/useClaims';
import { useRestaurants } from '@/hooks/useRestaurants';
import { type Icon as TablerIcon } from '@tabler/icons-react';
import type { DealWithRestaurant, Restaurant } from '@/types/index';
import type { DealType } from '@/types/index';
import type { User } from '@supabase/supabase-js';

// ─── Local types ──────────────────────────────────────────────────────────
type Tab        = 'active' | 'coming' | 'all';
type FilterType = 'all' | DealType;

// ─── Constants ────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all',       emoji: '🍽️', label: 'All',        bg: 'bg-[#FFF3EC]' },
  { id: 'indian',    emoji: '🍛', label: 'Indian',      bg: 'bg-[#FFF7ED]' },
  { id: 'italian',   emoji: '🍝', label: 'Italian',     bg: 'bg-[#FFF1F0]' },
  { id: 'bbq',       emoji: '🥩', label: 'BBQ',         bg: 'bg-[#FEF3C7]' },
  { id: 'bar',       emoji: '🍺', label: 'Bar & Grill', bg: 'bg-[#EFF6FF]' },
  { id: 'canadian',  emoji: '🍁', label: 'Canadian',    bg: 'bg-[#F0FDF4]' },
  { id: 'burgers',   emoji: '🍔', label: 'Burgers',     bg: 'bg-[#FFF7ED]' },
  { id: 'chinese',   emoji: '🥢', label: 'Chinese',     bg: 'bg-[#F0FDF4]' },
  { id: 'sushi',     emoji: '🍣', label: 'Sushi',       bg: 'bg-[#EFF6FF]' },
  { id: 'pizza',     emoji: '🍕', label: 'Pizza',       bg: 'bg-[#FFF1F0]' },
  { id: 'desserts',  emoji: '🧁', label: 'Desserts',    bg: 'bg-[#FDF4FF]' },
  { id: 'vegan',     emoji: '🥗', label: 'Vegan',       bg: 'bg-[#F0FDF4]' },
  { id: 'bubbletea', emoji: '🧋', label: 'Bubble Tea',  bg: 'bg-[#FDF4FF]' },
];

const CITIES = [
  'GTA Area', 'Mississauga', 'Brampton', 'Toronto',
  'Markham', 'Kitchener-Waterloo', 'Hamilton', 'Oakville',
];

// TablerIcon is the base type for all @tabler/icons-react icon components
const TYPE_FILTERS: { id: FilterType; label: string; Icon?: TablerIcon }[] = [
  { id: 'all',      label: 'All Types' },
  { id: 'dine-in',  label: 'Dine-in',   Icon: IconBuildingStore },
  { id: 'pickup',   label: 'Pickup',    Icon: IconShoppingBag },
  { id: 'delivery', label: 'Delivery',  Icon: IconTruck },
];

// ─── SkeletonCard ─────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-surface rounded-brand shadow-brand overflow-hidden animate-pulse border border-[var(--bd)]">
      <div className="h-28 bg-surface2" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-14 bg-surface2 rounded-full" />
        <div className="h-4 w-3/4 bg-surface2 rounded-full" />
        <div className="h-7 w-1/2 bg-surface2 rounded-full" />
        <div className="h-2 bg-surface2 rounded-full" />
        <div className="h-3 w-1/3 bg-surface2 rounded-full" />
      </div>
    </div>
  );
}

// ─── DealTypeBadge ────────────────────────────────────────────────────────
function DealTypeBadge({ types }: { types: string[] }) {
  const first = types[0] ?? 'dine-in';
  const styles: Record<string, string> = {
    'dine-in':  'bg-blue-50 text-blue-700 border-blue-200',
    'pickup':   'bg-green-50 text-green-700 border-green-200',
    'delivery': 'bg-orange-50 text-orange-800 border-orange-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${styles[first] ?? 'bg-gray-50 text-gray-700 border-gray-200'}`}>
      {first}
      {types.length > 1 && <span>+{types.length - 1}</span>}
    </span>
  );
}

// ─── DealCard ─────────────────────────────────────────────────────────────
function DealCard({ deal, onClick }: { deal: DealWithRestaurant; onClick: () => void }) {
  const fillPct  = deal.max_claims ? Math.min((deal.current_claims / deal.max_claims) * 100, 100) : 0;
  const spotsLeft = deal.max_claims !== null ? deal.max_claims - deal.current_claims : null;

  return (
    <div
      className="bg-surface rounded-brand shadow-brand cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-brand2 overflow-hidden border border-[var(--bd)] flex flex-col"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      {/* Emoji header — brand-light tint */}
      <div className="h-28 bg-brandlt flex items-center justify-center relative flex-shrink-0">
        <span className="text-5xl select-none">{deal.emoji ?? '🍽️'}</span>
        {deal.is_coming && (
          <span className="absolute top-2 right-2 bg-white/90 text-[10px] font-bold px-2 py-0.5 rounded-full text-t2 border border-[var(--bd)]">
            Coming soon
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col flex-1">
        {/* Type badge */}
        {deal.deal_types?.length > 0 && (
          <div className="mb-2"><DealTypeBadge types={deal.deal_types} /></div>
        )}

        {/* Restaurant name */}
        <p className="text-[12px] text-t2 mb-0.5 truncate font-medium">
          {deal.restaurant?.name ?? 'Restaurant'}
        </p>

        {/* Deal title */}
        <h3 className="font-body font-bold text-[14px] leading-snug mb-2 line-clamp-2 flex-1">
          {deal.title}
        </h3>

        {/* Discount value — Syne font, big orange */}
        <p className="font-display text-[22px] font-extrabold text-brand leading-none mb-3">
          {deal.discount_value ?? '—'}
        </p>

        {/* Progress bar — only shown when max_claims is set */}
        {deal.max_claims !== null && (
          <div className="mb-2">
            <div className="flex justify-between text-[11px] text-t3 mb-1">
              <span>{deal.current_claims} claimed</span>
              <span>{spotsLeft} left</span>
            </div>
            <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
              {/* width must be inline — it's a dynamic percentage */}
              <div className="h-full bg-brand rounded-full transition-all duration-300" style={{ width: `${fillPct}%` }} />
            </div>
          </div>
        )}

        {/* City */}
        <p className="text-[11px] text-t3 truncate">
          📍 {deal.restaurant?.city ?? ''}
          {deal.available_days?.[0] !== 'all' && (
            <span className="ml-1">· {deal.available_days.join(', ')}</span>
          )}
        </p>
      </div>
    </div>
  );
}

// ─── RestaurantCard (shown in "All Restaurants" tab) ─────────────────────
function RestaurantCard({ r }: { r: Restaurant }) {
  return (
    <div className="bg-surface rounded-brand shadow-brand border border-[var(--bd)] p-4 hover:-translate-y-0.5 hover:shadow-brand2 transition-all duration-150 cursor-pointer">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-brands bg-brandlt flex items-center justify-center flex-shrink-0 text-2xl">
          🍽️
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-body font-bold text-[15px] truncate">{r.name}</h3>
          <p className="text-[12px] text-t2">{r.cuisine} · {r.city}</p>
          {r.rating > 0 && (
            <p className="text-[12px] text-t3">⭐ {r.rating.toFixed(1)} · {r.review_count} reviews</p>
          )}
        </div>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {r.accepts_dine_in  && <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">Dine-in</span>}
        {r.accepts_pickup   && <span className="text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">Pickup</span>}
        {r.accepts_delivery && <span className="text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">Delivery</span>}
        {r.open_to_collabs  && <span className="text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">🎥 Collabs open</span>}
      </div>
    </div>
  );
}

// ─── Overlay wrapper (shared by all modals) ───────────────────────────────
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {children}
    </div>
  );
}

// ─── LocationModal ────────────────────────────────────────────────────────
function LocationModal({
  city, radius, onApply, onClose,
}: {
  city: string;
  radius: number;
  onApply: (city: string, radius: number) => void;
  onClose: () => void;
}) {
  const [localCity,   setLocalCity]   = useState(city);
  const [localRadius, setLocalRadius] = useState(radius);

  return (
    <Overlay onClose={onClose}>
      <div className="bg-surface rounded-brand shadow-brand2 w-full max-w-sm p-6 animate-[slideUp_0.2s_ease]">
        <div className="flex justify-between items-center mb-5">
          <span className="font-display text-[17px] font-bold">Location &amp; Radius</span>
          <button onClick={onClose} className="p-1 text-t2 hover:text-tx transition-colors">
            <IconX size={18} />
          </button>
        </div>

        <p className="text-[13px] font-semibold text-t2 mb-2">Quick select</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {CITIES.map((c) => (
            <button
              key={c}
              onClick={() => setLocalCity(c)}
              className={`text-[13px] font-semibold px-3 py-1.5 rounded-full border transition-all ${
                localCity === c
                  ? 'bg-brand text-white border-brand'
                  : 'bg-surface border-[var(--bd2)] text-t2 hover:border-brand hover:text-brand'
              }`}
            >
              {c === 'GTA Area' ? '🗺️ ' : '📍 '}{c}
            </button>
          ))}
        </div>

        <div className="flex justify-between items-baseline mb-2">
          <p className="text-[13px] text-t2 font-medium">Radius from <span className="text-brand font-bold">{localCity}</span></p>
          <p className="font-display text-[24px] font-extrabold text-brand">{localRadius} km</p>
        </div>
        <input
          type="range" min={5} max={100} step={5} value={localRadius}
          onChange={(e) => setLocalRadius(Number(e.target.value))}
          className="w-full mb-1 accent-brand"
        />
        <div className="flex justify-between text-[11px] text-t3 mb-5">
          <span>5 km</span><span>25</span><span>50</span><span>75</span><span>100 km</span>
        </div>

        <button
          onClick={() => { onApply(localCity, localRadius); onClose(); }}
          className="w-full h-11 bg-brand hover:bg-brand2 text-white font-semibold rounded-brands transition-colors"
        >
          Show deals in this area
        </button>
      </div>
    </Overlay>
  );
}

// ─── DealModal ────────────────────────────────────────────────────────────
function DealModal({
  deal, user, onClose, onClaim, claiming, claimError,
}: {
  deal: DealWithRestaurant;
  user: User | null;
  onClose: () => void;
  onClaim: () => void;
  claiming: boolean;
  claimError: string | null;
}) {
  const fillPct   = deal.max_claims ? Math.min((deal.current_claims / deal.max_claims) * 100, 100) : 0;
  const spotsLeft = deal.max_claims !== null ? deal.max_claims - deal.current_claims : null;
  const soldOut   = deal.max_claims !== null && spotsLeft !== null && spotsLeft <= 0;

  return (
    <Overlay onClose={onClose}>
      <div className="bg-surface rounded-brand shadow-brand2 w-full max-w-sm overflow-hidden max-h-[93vh] overflow-y-auto animate-[slideUp_0.22s_ease]">
        {/* Header with emoji */}
        <div className="h-36 bg-brandlt flex items-center justify-center relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/25 flex items-center justify-center text-white hover:bg-black/40 transition-colors"
          >
            <IconX size={14} />
          </button>
          <span className="text-6xl">{deal.emoji ?? '🍽️'}</span>
        </div>

        <div className="p-5">
          {/* Badges */}
          {deal.deal_types?.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mb-3">
              {deal.deal_types.map((t) => <DealTypeBadge key={t} types={[t]} />)}
            </div>
          )}

          {/* Restaurant + title */}
          <p className="text-[13px] text-t2 mb-1">{deal.restaurant?.name}</p>
          <h2 className="font-display text-[20px] font-bold mb-3 leading-snug">{deal.title}</h2>

          {/* Discount */}
          <div className="flex items-baseline gap-3 mb-4">
            <span className="font-display text-[34px] font-extrabold text-brand leading-none">
              {deal.discount_value}
            </span>
            {deal.valid_until && (
              <span className="text-[13px] text-t2">Ends {deal.valid_until}</span>
            )}
          </div>

          {/* Description */}
          {deal.description && (
            <p className="text-[14px] text-t2 leading-relaxed mb-4">{deal.description}</p>
          )}

          {/* Progress bar */}
          {deal.max_claims !== null && (
            <div className="bg-surface2 rounded-brands px-3 py-2.5 mb-4">
              <div className="flex justify-between text-[12px] text-t3 mb-1.5">
                <span>{deal.current_claims} claimed</span>
                <span>{spotsLeft} spots left</span>
              </div>
              <div className="h-1.5 bg-[var(--bd2)] rounded-full overflow-hidden">
                <div className="h-full bg-brand rounded-full transition-all duration-300" style={{ width: `${fillPct}%` }} />
              </div>
            </div>
          )}

          {/* Details */}
          <div className="space-y-2 mb-5">
            <div className="flex items-center gap-2 text-[13px] text-t2">
              <IconMapPin size={15} className="text-brand flex-shrink-0" />
              <span>{deal.restaurant?.address ?? deal.restaurant?.city}</span>
            </div>
            {deal.available_days && deal.available_days[0] !== 'all' && (
              <div className="flex items-center gap-2 text-[13px] text-t2">
                <span className="text-t3 text-[15px]">📅</span>
                <span>{deal.available_days.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Error */}
          {claimError && (
            <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-brands px-3 py-2 mb-3">
              {claimError}
            </p>
          )}

          {/* CTA */}
          {deal.is_coming ? (
            <div className="w-full h-12 rounded-brands bg-surface2 border border-[var(--bd2)] flex items-center justify-center text-[15px] font-semibold text-t2">
              Available next week
            </div>
          ) : soldOut ? (
            <div className="w-full h-12 rounded-brands bg-surface2 border border-[var(--bd2)] flex items-center justify-center text-[15px] font-semibold text-t2">
              Fully claimed
            </div>
          ) : !user ? (
            <Link
              href="/customer/login"
              className="w-full h-12 bg-brand hover:bg-brand2 text-white font-semibold rounded-brands flex items-center justify-center transition-colors text-[15px]"
            >
              Sign in to claim this deal
            </Link>
          ) : (
            <button
              onClick={onClaim}
              disabled={claiming}
              className="w-full h-12 bg-brand hover:bg-brand2 disabled:opacity-60 text-white font-semibold rounded-brands transition-colors text-[15px]"
            >
              {claiming ? 'Claiming…' : 'Claim Deal'}
            </button>
          )}
        </div>
      </div>
    </Overlay>
  );
}

// ─── QrModal ─────────────────────────────────────────────────────────────
function QrModal({
  qrCode, dealTitle, onClose,
}: {
  qrCode: string;
  dealTitle: string;
  onClose: () => void;
}) {
  return (
    <Overlay onClose={onClose}>
      <div className="bg-surface rounded-brand shadow-brand2 w-full max-w-[300px] p-7 text-center animate-[slideUp_0.22s_ease]">
        {/* Success icon */}
        <div className="w-14 h-14 bg-brandlt rounded-full flex items-center justify-center mx-auto mb-3">
          <IconCircleCheck size={28} className="text-brand" />
        </div>
        <h2 className="font-display text-[20px] font-bold mb-1">Deal Claimed!</h2>
        <p className="text-[13px] text-t2 mb-5">{dealTitle}</p>

        {/* QR code visual — decorative grid matching the HTML prototype */}
        <div className="bg-white border border-gray-200 rounded-[10px] p-4 inline-block mb-4">
          {/* 7×7 dot grid representing a QR pattern */}
          <div className="w-[148px] h-[148px] relative">
            {/* Corner squares */}
            <div className="absolute top-0 left-0 w-11 h-11 bg-brand rounded-sm" />
            <div className="absolute top-1.5 left-1.5 w-8 h-8 bg-white rounded-sm" />
            <div className="absolute top-3 left-3 w-5 h-5 bg-brand rounded-sm" />
            <div className="absolute top-0 right-0 w-11 h-11 bg-tx rounded-sm" />
            <div className="absolute top-1.5 right-1.5 w-8 h-8 bg-white rounded-sm" />
            <div className="absolute top-3 right-3 w-5 h-5 bg-tx rounded-sm" />
            <div className="absolute bottom-0 left-0 w-11 h-11 bg-tx rounded-sm" />
            <div className="absolute bottom-1.5 left-1.5 w-8 h-8 bg-white rounded-sm" />
            <div className="absolute bottom-3 left-3 w-5 h-5 bg-tx rounded-sm" />
            {/* Center dots */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="grid grid-cols-4 gap-1">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className={`w-2.5 h-2.5 rounded-[1px] ${i % 3 === 0 ? 'bg-tx' : 'bg-transparent'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* The actual code */}
        <p className="font-display text-[26px] font-extrabold tracking-widest text-brand mb-1">{qrCode}</p>
        <p className="text-[12px] text-t3 mb-4">Show this code to restaurant staff</p>

        {/* Info banner */}
        <div className="bg-brandlt rounded-brands px-3 py-2.5 text-[12px] text-t2 leading-relaxed mb-5 flex items-start gap-1.5">
          <IconInfoCircle size={13} className="text-brand flex-shrink-0 mt-0.5" />
          <span>Show to restaurant staff at checkout to redeem your deal</span>
        </div>

        <button
          onClick={onClose}
          className="w-full h-10 bg-brand hover:bg-brand2 text-white font-semibold rounded-brands transition-colors"
        >
          Done
        </button>
      </div>
    </Overlay>
  );
}

// ─── SignInModal ──────────────────────────────────────────────────────────
function SignInModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (user: User) => void }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const supabase = useRef(createClient()).current;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const fn = isSignUp
      ? supabase.auth.signUp({ email, password })
      : supabase.auth.signInWithPassword({ email, password });
    const { data, error: authError } = await fn;
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    if (data.user) onSuccess(data.user);
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
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
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com" required
              className="w-full h-11 px-3.5 border border-[var(--bd2)] rounded-brands bg-surface text-tx text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-t2 mb-1">Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" required
              className="w-full h-11 px-3.5 border border-[var(--bd2)] rounded-brands bg-surface text-tx text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
            />
          </div>
          {error && <p className="text-[13px] text-red-600">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full h-11 bg-brand hover:bg-brand2 disabled:opacity-60 text-white font-semibold rounded-brands transition-colors"
          >
            {loading ? 'Loading…' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-px bg-[var(--bd)]" />
          <span className="text-[12px] text-t3">or</span>
          <div className="flex-1 h-px bg-[var(--bd)]" />
        </div>

        <button
          onClick={handleGoogle}
          className="w-full h-11 border border-[var(--bd2)] rounded-brands font-semibold text-[14px] text-tx hover:border-brand hover:text-brand transition-all flex items-center justify-center gap-2"
        >
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
  const [category,  setCategory]  = useState('all');
  const [dealType,  setDealType]  = useState<FilterType>('all');
  const [tab,       setTab]       = useState<Tab>('active');
  const [search,    setSearch]    = useState('');
  const [city,      setCity]      = useState('GTA Area');
  const [radius,    setRadius]    = useState(30);

  // ── Modal state ─────────────────────────────────────────────
  const [activeDeal,    setActiveDeal]    = useState<DealWithRestaurant | null>(null);
  const [qrCode,        setQrCode]        = useState<string | null>(null);
  const [showLocation,  setShowLocation]  = useState(false);
  const [showSignIn,    setShowSignIn]    = useState(false);
  const [claimError,    setClaimError]    = useState<string | null>(null);

  // ── Auth state ──────────────────────────────────────────────
  const [user,        setUser]        = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const supabase = useRef(createClient()).current;
  const router   = useRouter();

  useEffect(() => {
    // Check current session on mount — redirect to login if not signed in
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/customer/login');
      } else {
        setUser(data.user);
        setAuthChecked(true);
      }
    });
    // Listen for auth changes (sign out → redirect back to login)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.replace('/customer/login');
      } else {
        setUser(session.user);
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase, router]);

  // ── Data hooks ──────────────────────────────────────────────
  const { deals, loading: dealsLoading, error: dealsError, refetch } = useDeals({
    category: category === 'all' ? undefined : category,
    type:     dealType === 'all' ? undefined : dealType,
    tab:      tab === 'all' ? 'active' : tab, // 'all' tab shows restaurants, not deals
    city:     city === 'GTA Area' ? undefined : city,
  });
  const { restaurants, loading: restsLoading } = useRestaurants({
    city: city === 'GTA Area' ? undefined : city,
  });
  const { claimDeal, loading: claiming } = useClaims();

  // ── Client-side search filter ────────────────────────────────
  // Runs entirely in the browser — no network call on every keystroke
  const filteredDeals = useMemo(() => {
    if (!search.trim()) return deals;
    const q = search.toLowerCase();
    return deals.filter((d) =>
      d.title.toLowerCase().includes(q) ||
      (d.restaurant?.name ?? '').toLowerCase().includes(q) ||
      (d.description ?? '').toLowerCase().includes(q)
    );
  }, [deals, search]);

  const filteredRests = useMemo(() => {
    if (!search.trim()) return restaurants;
    const q = search.toLowerCase();
    return restaurants.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      (r.cuisine ?? '').toLowerCase().includes(q)
    );
  }, [restaurants, search]);

  // ── Claim handler ────────────────────────────────────────────
  const handleClaim = async () => {
    if (!activeDeal) return;
    setClaimError(null);
    const code = await claimDeal(activeDeal.id);
    if (code) {
      const title = activeDeal.title;
      setActiveDeal(null);
      setQrCode(code);
      // store title for QR modal
      setActiveDeal({ ...activeDeal, title } as DealWithRestaurant);
      setQrCode(code);
    } else {
      setClaimError('Could not claim this deal. Please try again.');
    }
  };

  const loading  = tab === 'all' ? restsLoading : dealsLoading;
  const tabDeals = tab === 'all' ? [] : filteredDeals;
  const isEmpty  = !loading && (tab === 'all' ? filteredRests.length === 0 : tabDeals.length === 0);

  const tabLabels: Record<Tab, string> = {
    active: `Deals near you${!dealsLoading && filteredDeals.length > 0 ? ` (${filteredDeals.length})` : ''}`,
    coming: 'Coming next week',
    all:    'All restaurants',
  };

  // Show blank screen while redirecting unauthenticated users
  if (!authChecked) {
    return <div className="min-h-screen bg-[var(--bg)]" />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">

      {/* ── Sticky nav ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-surface border-b border-[var(--bd)] shadow-sm">
        <div className="max-w-[1100px] mx-auto px-5 py-2.5 flex items-center gap-3">

          {/* Logo */}
          <Link href="/" className="font-display text-[22px] font-extrabold tracking-tight leading-none flex-shrink-0">
            Rep<span className="text-brand">EAT</span>
          </Link>

          {/* Search bar */}
          <div className="relative flex-1 max-w-[520px]">
            <IconSearch size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-t3 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search restaurants, dishes, deals…"
              className="w-full h-11 pl-10 pr-4 border border-[var(--bd2)] rounded-full bg-surface2 text-tx text-[14px] outline-none focus:bg-surface focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all placeholder:text-t3"
            />
          </div>

          {/* Location button */}
          <button
            onClick={() => setShowLocation(true)}
            className="flex items-center gap-1.5 bg-brandlt border-[1.5px] border-brand rounded-full px-3.5 py-2 text-[13px] font-bold text-brand hover:bg-brand hover:text-white transition-all flex-shrink-0 whitespace-nowrap"
          >
            <IconMapPin size={14} />
            <span>{city} · {radius} km</span>
          </button>

          {/* User avatar / sign in */}
          <button
            onClick={() => user ? supabase.auth.signOut() : setShowSignIn(true)}
            className="w-9 h-9 rounded-full bg-brandlt flex items-center justify-center flex-shrink-0 hover:bg-brand/20 transition-colors"
            title={user ? `Signed in as ${user.email} — click to sign out` : 'Sign in'}
          >
            <IconUser size={16} className="text-brand" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="max-w-[1100px] mx-auto px-5 border-t border-[var(--bd)] flex gap-0 overflow-x-auto scrollbar-none">
          {(['active', 'coming', 'all'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-[14px] font-semibold whitespace-nowrap border-b-[2.5px] transition-all ${
                tab === t
                  ? 'text-brand border-brand'
                  : 'text-t2 border-transparent hover:text-tx'
              }`}
            >
              {t === 'active' ? 'Deals This Week' : t === 'coming' ? 'Coming Next Week' : 'All Restaurants'}
            </button>
          ))}
        </div>
      </header>

      {/* ── Main content ──────────────────────────────────────────── */}
      <main className="max-w-[1100px] mx-auto px-5 py-5 pb-20">

        {/* Category icon row — horizontal scroll */}
        <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1 mb-5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`flex flex-col items-center gap-1.5 flex-shrink-0 transition-transform hover:scale-105 ${category === cat.id ? 'scale-105' : ''}`}
            >
              <div className={`w-[66px] h-[66px] rounded-2xl flex items-center justify-center text-[28px] border-[2.5px] transition-all ${cat.bg} ${
                category === cat.id ? 'border-brand ring-2 ring-brand/15' : 'border-transparent'
              }`}>
                {cat.emoji}
              </div>
              <span className={`text-[12px] font-semibold whitespace-nowrap ${category === cat.id ? 'text-brand' : 'text-t2'}`}>
                {cat.label}
              </span>
            </button>
          ))}
        </div>

        {/* Filter chips — deal type */}
        <div className="flex gap-2 flex-wrap mb-5">
          {TYPE_FILTERS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setDealType(id)}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold border-[1.5px] transition-all ${
                dealType === id
                  ? 'bg-brand text-white border-brand'
                  : 'bg-surface text-t2 border-[var(--bd2)] hover:border-brand hover:text-brand'
              }`}
            >
              {Icon && <Icon size={12} />}
              {label}
            </button>
          ))}
        </div>

        {/* Results header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[20px] font-bold">{tabLabels[tab]}</h2>
          {dealsError && (
            <button
              onClick={refetch}
              className="flex items-center gap-1.5 text-[13px] text-t2 hover:text-brand transition-colors"
            >
              <IconRefresh size={14} /> Retry
            </button>
          )}
        </div>

        {/* Error state — only shown for deals tabs; the 'all' tab shows restaurants even if deals errored */}
        {dealsError && !loading && tab !== 'all' && (
          <div className="text-center py-16 text-t2">
            <p className="text-4xl mb-3">⚠️</p>
            <p className="text-[18px] font-bold mb-1">Could not load deals</p>
            <p className="text-[14px] mb-4">{dealsError}</p>
            <button
              onClick={refetch}
              className="h-10 px-6 bg-brand hover:bg-brand2 text-white font-semibold rounded-brands transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {/* Deal / Restaurant grid */}
        {(!dealsError || tab === 'all') && (
          <>
            {/* Loading skeletons */}
            {loading && (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
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

            {/* Deal cards */}
            {!loading && tab !== 'all' && tabDeals.length > 0 && (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
                {tabDeals.map((deal) => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    onClick={() => { setActiveDeal(deal); setClaimError(null); }}
                  />
                ))}
              </div>
            )}

            {/* Restaurant cards */}
            {!loading && tab === 'all' && filteredRests.length > 0 && (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
                {filteredRests.map((r) => <RestaurantCard key={r.id} r={r} />)}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Modals ────────────────────────────────────────────────── */}

      {showLocation && (
        <LocationModal
          city={city} radius={radius}
          onApply={(c, r) => { setCity(c); setRadius(r); }}
          onClose={() => setShowLocation(false)}
        />
      )}

      {activeDeal && !qrCode && (
        <DealModal
          deal={activeDeal}
          user={user}
          onClose={() => setActiveDeal(null)}
          onClaim={handleClaim}
          claiming={claiming}
          claimError={claimError}
        />
      )}

      {qrCode && activeDeal && (
        <QrModal
          qrCode={qrCode}
          dealTitle={activeDeal.title}
          onClose={() => { setQrCode(null); setActiveDeal(null); }}
        />
      )}

      {showSignIn && (
        <SignInModal
          onClose={() => setShowSignIn(false)}
          onSuccess={(u) => { setUser(u); setShowSignIn(false); }}
        />
      )}
    </div>
  );
}
