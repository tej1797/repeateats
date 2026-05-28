'use client';

// Customer Deal Feed — connects to /api/deals and /api/restaurants.
// This is a Client Component because it manages interactive state
// (filters, modals, search). "use client" means this runs in the browser.

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { QRCode } from 'react-qrcode-logo';
import {
  IconSearch, IconMapPin, IconX, IconCircleCheck,
  IconInfoCircle, IconUser, IconBuildingStore, IconShoppingBag,
  IconTruck, IconRefresh, IconDownload,
  IconCrown, IconTicket, IconChartBar, IconLogout,
} from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import StarRating from '@/components/StarRating';
import ReviewsSection from '@/components/ReviewsSection';
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
  { id: 'all',       label: 'All',        color: '#E85D04', img: null },
  { id: 'indian',    label: 'Indian',     color: '#C2410C', img: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=200&q=70' },
  { id: 'italian',   label: 'Italian',    color: '#B45309', img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&q=70' },
  { id: 'bbq',       label: 'BBQ',        color: '#92400E', img: 'https://images.unsplash.com/photo-1558030006-450675393462?w=200&q=70' },
  { id: 'bar',       label: 'Bar & Grill',color: '#1E40AF', img: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?w=200&q=70' },
  { id: 'canadian',  label: 'Canadian',   color: '#065F46', img: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&q=70' },
  { id: 'burgers',   label: 'Burgers',    color: '#9A3412', img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&q=70' },
  { id: 'chinese',   label: 'Chinese',    color: '#991B1B', img: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=200&q=70' },
  { id: 'sushi',     label: 'Sushi',      color: '#1E3A5F', img: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=200&q=70' },
  { id: 'pizza',     label: 'Pizza',      color: '#9D174D', img: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&q=70' },
  { id: 'desserts',  label: 'Desserts',   color: '#6B21A8', img: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=200&q=70' },
  { id: 'vegan',     label: 'Vegan',      color: '#166534', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&q=70' },
  { id: 'bubbletea', label: 'Bubble Tea', color: '#701A75', img: 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=200&q=70' },
  { id: 'seafood',   label: 'Seafood',    color: '#0E4D6E', img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&q=70' },
];

// ─── Confetti burst on cuisine selection ──────────────────────────────────
function fireConfetti(color: string, originX: number, originY: number) {
  if (typeof window === 'undefined') return;
  // Respect reduced-motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < 20; i++) {
    const el = document.createElement('div');
    const size = 4 + Math.random() * 7;
    el.style.cssText = `position:fixed;left:${originX}px;top:${originY}px;width:${size}px;height:${size}px;border-radius:${Math.random() > 0.4 ? '50%' : '2px'};background:${color};pointer-events:none;z-index:9999;`;
    const angle = Math.random() * Math.PI * 2;
    const dist  = 35 + Math.random() * 75;
    el.animate(
      [
        { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
        { transform: `translate(${Math.cos(angle)*dist}px,${Math.sin(angle)*dist}px) scale(0) rotate(${Math.random()*720}deg)`, opacity: 0 },
      ],
      { duration: 550 + Math.random() * 200, easing: 'ease-out', fill: 'forwards' }
    );
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }
}

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

// ─── Category → Unsplash food image map ───────────────────────────────────
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
  default:   'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80',
};

// ─── CuisineRow — photo-pill horizontal scroller ──────────────────────────
function CuisineRow({ category, onChange }: { category: string; onChange: (id: string) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(true);

  const updateArrows = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 10);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -240 : 240, behavior: 'smooth' });
  };

  return (
    <div className="relative group mb-5">
      {/* Left arrow (desktop only) */}
      {canLeft && (
        <button
          onClick={() => scroll('left')}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-surface shadow-brand border border-[var(--bd)] items-center justify-center text-t2 hover:text-brand transition-all opacity-0 group-hover:opacity-100 -translate-x-1/2"
          aria-label="Scroll left"
        >
          ‹
        </button>
      )}

      {/* Pill row */}
      <div
        ref={scrollRef}
        onScroll={updateArrows}
        className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1"
      >
        {CATEGORIES.map((cat, i) => {
          const active = category === cat.id;
          return (
            <button
              key={cat.id}
              onClick={(e) => {
                onChange(cat.id);
                fireConfetti(cat.color, e.clientX, e.clientY);
              }}
              className="flex-shrink-0 relative overflow-hidden transition-all duration-200 hover:scale-105"
              style={{
                height: 56,
                minWidth: 100,
                borderRadius: 100,
                border: active ? `2px solid #E85D04` : '1px solid rgba(0,0,0,0.12)',
                boxShadow: active ? '0 0 0 3px rgba(232,93,4,0.18)' : undefined,
                animationDelay: `${i * 50}ms`,
                animation: 'fadeUpIn 0.4s ease both',
              }}
            >
              {/* Photo background */}
              {cat.img ? (
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${cat.img})` }}
                />
              ) : (
                <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #E85D04, #FF9A4D)' }} />
              )}
              {/* Dark overlay */}
              <div
                className="absolute inset-0 transition-opacity duration-200"
                style={{ background: 'rgba(0,0,0,0.52)', opacity: active ? 0.35 : 1 }}
              />
              {/* Label */}
              <span
                className="relative z-10 font-bold text-white whitespace-nowrap px-5"
                style={{ fontSize: 13, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Right arrow (desktop only) */}
      {canRight && (
        <button
          onClick={() => scroll('right')}
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-surface shadow-brand border border-[var(--bd)] items-center justify-center text-t2 hover:text-brand transition-all opacity-0 group-hover:opacity-100 translate-x-1/2"
          aria-label="Scroll right"
        >
          ›
        </button>
      )}
    </div>
  );
}

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

// ─── ProfileDrawer ────────────────────────────────────────────────────────
// Slide-out sidebar (inspired by Uber Eats) — opens when user taps avatar.
function ProfileDrawer({
  user,
  onClose,
  onSignOut,
}: {
  user: User;
  onClose: () => void;
  onSignOut: () => void;
}) {
  const avatarUrl  = user.user_metadata?.avatar_url  as string | undefined;
  const fullName   = (user.user_metadata?.full_name ?? user.user_metadata?.name ?? '') as string;
  const displayName = fullName || (user.email?.split('@')[0] ?? 'You');
  const initials    = displayName.charAt(0).toUpperCase();

  // Prevent body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer panel — slides in from right */}
      <div
        className="relative w-[320px] max-w-[90vw] h-full bg-surface flex flex-col shadow-2xl"
        style={{ animation: 'slideInRight 0.25s ease' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface2 flex items-center justify-center text-t2 hover:text-tx transition-colors"
        >
          <IconX size={16} />
        </button>

        {/* User header */}
        <div className="px-5 pt-8 pb-5 border-b border-[var(--bd)]">
          <div className="flex items-center gap-3 mb-3">
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
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <Link
            href="/customer"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-brands text-[14px] font-semibold text-tx hover:bg-surface2 transition-colors"
          >
            <span className="text-[18px]">🏠</span> Browse Deals
          </Link>
          <Link
            href="/profile"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-brands text-[14px] font-semibold text-tx hover:bg-surface2 transition-colors"
          >
            <IconUser size={18} className="text-t2" /> My Profile
          </Link>
          <Link
            href="/profile"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-brands text-[14px] font-semibold text-tx hover:bg-surface2 transition-colors"
          >
            <IconTicket size={18} className="text-t2" /> My Claims
          </Link>
          <Link
            href="/profile"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-brands text-[14px] font-semibold text-tx hover:bg-surface2 transition-colors"
          >
            <IconChartBar size={18} className="text-t2" /> Savings Dashboard
          </Link>

          <div className="my-2 border-t border-[var(--bd)]" />

          <Link
            href="/repeat-plus"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-brands text-[14px] font-semibold hover:bg-surface2 transition-colors"
            style={{ color: '#F59E0B' }}
          >
            <IconCrown size={18} style={{ color: '#F59E0B' }} /> Upgrade to RepEAT+
          </Link>
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-[var(--bd)]">
          <button
            onClick={onSignOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-brands text-[14px] font-semibold text-t2 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <IconLogout size={16} /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DealCard ─────────────────────────────────────────────────────────────
function DealCard({ deal, onClick }: { deal: DealWithRestaurant; onClick: () => void }) {
  const fillPct   = deal.max_claims ? Math.min((deal.current_claims / deal.max_claims) * 100, 100) : 0;
  const spotsLeft = deal.max_claims !== null ? deal.max_claims - deal.current_claims : null;
  const isUrgent  = spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 5;
  const isSoldOut = deal.max_claims !== null && spotsLeft !== null && spotsLeft <= 0;
  const imgSrc    = CATEGORY_IMAGES[deal.restaurant?.category ?? ''] ?? CATEGORY_IMAGES.default;

  return (
    <div
      className="bg-surface rounded-brand shadow-brand cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-brand2 overflow-hidden border border-[var(--bd)] flex flex-col group"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      {/* Food photo header with gradient overlay */}
      <div className="relative h-[140px] overflow-hidden flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={deal.restaurant?.name ?? ''}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Stronger gradient so text is always readable */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.85) 100%)' }} />

        {/* Deal type badge — top left (larger, with blur) */}
        {deal.deal_types?.length > 0 && (
          <div className="absolute top-2 left-2">
            <span
              className="inline-flex items-center gap-1 text-[12px] font-bold px-2.5 py-1 rounded-full border capitalize"
              style={{
                background: 'rgba(255,255,255,0.18)',
                backdropFilter: 'blur(8px)',
                borderColor: 'rgba(255,255,255,0.35)',
                color: 'white',
              }}
            >
              {deal.deal_types[0]}
              {deal.deal_types.length > 1 && <span>+{deal.deal_types.length - 1}</span>}
            </span>
          </div>
        )}

        {/* Coming soon — top right */}
        {deal.is_coming && (
          <span className="absolute top-2 right-2 bg-white/90 text-[10px] font-bold px-2 py-0.5 rounded-full text-t2 border border-[var(--bd)]">
            Coming soon
          </span>
        )}

        {/* Restaurant name pill + discount at bottom */}
        <div className="absolute bottom-2.5 left-3 right-3">
          <div className="mb-1 inline-flex">
            <span
              className="text-[13px] font-bold text-white truncate max-w-full"
              style={{
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(4px)',
                padding: '2px 8px',
                borderRadius: 100,
                textShadow: '0 1px 4px rgba(0,0,0,0.8)',
              }}
            >
              {deal.restaurant?.name ?? 'Restaurant'}
            </span>
          </div>
          <p className="font-display text-[22px] font-extrabold text-white leading-none drop-shadow-sm" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>
            {deal.discount_value ?? '—'}
          </p>
        </div>
      </div>

      {/* Card body */}
      <div className="p-3.5 flex flex-col flex-1">
        {/* Deal title */}
        <h3 className="font-body font-bold text-[14px] leading-snug mb-1.5 line-clamp-2 flex-1">
          {deal.title}
        </h3>

        {/* Star rating from restaurant */}
        {(deal.restaurant?.rating ?? 0) > 0 && (
          <div className="mb-2">
            <StarRating rating={deal.restaurant!.rating} size="sm" />
          </div>
        )}

        {/* Progress — unlimited vs capped */}
        {deal.max_claims === null ? (
          <div className="flex items-center gap-1.5 text-[11px] text-green-600 font-semibold mb-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
            Unlimited · {deal.current_claims} claimed
          </div>
        ) : (
          <div className="mb-2">
            {isUrgent && (
              <p className="text-[11px] font-bold text-red-500 mb-1 animate-bounce">
                Only {spotsLeft} left!
              </p>
            )}
            <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isUrgent || isSoldOut ? 'bg-red-500' : 'bg-brand'}`}
                style={{ width: `${fillPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-t3 mt-1">
              <span>{deal.current_claims} claimed</span>
              <span>{isSoldOut ? 'Sold out' : `${spotsLeft} left`}</span>
            </div>
          </div>
        )}

        {/* City */}
        <p className="text-[11px] text-t3 truncate mt-auto">
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

          {/* Google reviews — fetched live, shown below the CTA */}
          {deal.restaurant?.id && (
            <ReviewsSection restaurantId={deal.restaurant.id} />
          )}
        </div>
      </div>
    </Overlay>
  );
}

// ─── QrModal ─────────────────────────────────────────────────────────────
const QR_CANVAS_ID = 'repeateats-qr-canvas';

function QrModal({
  qrCode, dealTitle, onClose,
}: {
  qrCode: string;
  dealTitle: string;
  onClose: () => void;
}) {
  const handleDownload = () => {
    const canvas = document.getElementById(QR_CANVAS_ID) as HTMLCanvasElement | null;
    if (!canvas) return;
    const url  = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `repeateats-${qrCode}.png`;
    link.href = url;
    link.click();
  };

  return (
    <Overlay onClose={onClose}>
      <div className="bg-surface rounded-brand shadow-brand2 w-full max-w-[310px] p-6 text-center animate-[slideUp_0.22s_ease]">
        {/* Success icon */}
        <div className="w-14 h-14 bg-brandlt rounded-full flex items-center justify-center mx-auto mb-3">
          <IconCircleCheck size={28} className="text-brand" />
        </div>
        <h2 className="font-display text-[20px] font-bold mb-1">Deal Claimed!</h2>
        <p className="text-[13px] text-t2 mb-4 px-2 line-clamp-2">{dealTitle}</p>

        {/* Real scannable QR code */}
        <div className="flex justify-center mb-4">
          <div className="bg-white p-3 rounded-[12px] border border-gray-100 shadow-sm inline-block">
            <QRCode
              id={QR_CANVAS_ID}
              value={qrCode}
              size={180}
              bgColor="#ffffff"
              fgColor="#E85D04"
              qrStyle="dots"
              eyeRadius={8}
            />
          </div>
        </div>

        {/* Claim code */}
        <p className="font-display text-[28px] font-extrabold tracking-[0.15em] text-brand mb-0.5">
          {qrCode}
        </p>
        <p className="text-[12px] text-t3 mb-4">Show this to restaurant staff at checkout</p>

        {/* Info banner */}
        <div className="bg-brandlt rounded-brands px-3 py-2 text-[12px] text-t2 leading-relaxed mb-4 flex items-start gap-1.5">
          <IconInfoCircle size={13} className="text-brand flex-shrink-0 mt-0.5" />
          <span>Valid for one visit · Single use code</span>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="flex-1 h-10 border border-[var(--bd2)] rounded-brands text-[13px] font-semibold text-t2 hover:border-brand hover:text-brand transition-colors flex items-center justify-center gap-1.5"
          >
            <IconDownload size={14} /> Save
          </button>
          <button
            onClick={onClose}
            className="flex-1 h-10 bg-brand hover:bg-brand2 text-white font-semibold rounded-brands transition-colors text-[13px]"
          >
            Done
          </button>
        </div>
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
    document.cookie = 'rp_portal=customer;path=/;max-age=600;SameSite=Lax'
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
  const [showDrawer,    setShowDrawer]    = useState(false);
  const [claimError,    setClaimError]    = useState<string | null>(null);

  // ── Auth state ──────────────────────────────────────────────
  const [user,        setUser]        = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const supabase = useRef(createClient()).current;
  const router   = useRouter();

  useEffect(() => {
    let mounted = true;
    let redirectTimer: ReturnType<typeof setTimeout> | null = null;

    const handleSession = (user: User) => {
      if (!mounted) return;
      if (redirectTimer) { clearTimeout(redirectTimer); redirectTimer = null; }
      setUser(user);
      setAuthChecked(true);
    };

    // onAuthStateChange is primary — fires INITIAL_SESSION and SIGNED_IN reliably
    // after the cookie from the OAuth callback has propagated
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (session?.user) {
        handleSession(session.user);
      } else if (event === 'SIGNED_OUT') {
        router.replace('/customer/login');
      }
      // INITIAL_SESSION with no user: wait for the 2s timer below
    });

    // Quick cookie check — instant if session already set (e.g. email/password login)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        handleSession(session.user);
      } else {
        // No session yet — give onAuthStateChange 2s to fire before redirecting.
        // This covers the race condition where the OAuth callback cookie hasn't
        // propagated to the browser Supabase client yet.
        redirectTimer = setTimeout(() => {
          if (mounted) router.replace('/customer/login');
        }, 2000);
      }
    });

    return () => {
      mounted = false;
      if (redirectTimer) clearTimeout(redirectTimer);
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  // ── Live claim counts via Supabase Realtime ──────────────────
  // Overrides deal.current_claims so progress bars update for all watchers.
  const [liveClaimCounts, setLiveClaimCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!authChecked) return;
    const channel = supabase
      .channel('deals-live')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'deals' },
        (payload) => {
          const updated = payload.new as { id: string; current_claims: number };
          setLiveClaimCounts((prev) => ({ ...prev, [updated.id]: updated.current_claims }));
        }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [supabase, authChecked]);

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

  // Merge Realtime overrides into the deals from the API
  const dealsWithLive = useMemo(
    () => deals.map((d) => ({
      ...d,
      current_claims: liveClaimCounts[d.id] ?? d.current_claims,
    })),
    [deals, liveClaimCounts]
  );

  // ── Client-side search filter ────────────────────────────────
  // Runs entirely in the browser — no network call on every keystroke
  const filteredDeals = useMemo(() => {
    if (!search.trim()) return dealsWithLive;
    const q = search.toLowerCase();
    return dealsWithLive.filter((d) =>
      d.title.toLowerCase().includes(q) ||
      (d.restaurant?.name ?? '').toLowerCase().includes(q) ||
      (d.description ?? '').toLowerCase().includes(q)
    );
  }, [dealsWithLive, search]);

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
        <div className="max-w-[1100px] mx-auto px-5 h-16 flex items-center gap-3">

          {/* Logo */}
          <Link href="/customer" className="font-display text-[22px] font-extrabold tracking-tight leading-none flex-shrink-0">
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

          {/* Smart avatar — Google photo or initials; opens profile drawer */}
          {user ? (
            <button
              onClick={() => setShowDrawer(true)}
              className="relative flex-shrink-0 hover:opacity-90 transition-opacity"
              title="Open profile"
            >
              {user.user_metadata?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.user_metadata.avatar_url as string}
                  alt="Profile"
                  className="w-9 h-9 rounded-full object-cover border-2 border-[var(--bd)]"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center">
                  <span className="text-white font-bold text-[14px]">
                    {((user.user_metadata?.full_name ?? user.email ?? 'U') as string).charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </button>
          ) : (
            <button
              onClick={() => setShowSignIn(true)}
              className="w-9 h-9 rounded-full bg-brandlt flex items-center justify-center flex-shrink-0 hover:bg-brand/20 transition-colors"
              title="Sign in"
            >
              <IconUser size={16} className="text-brand" />
            </button>
          )}
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

        {/* Cuisine pills — photo backgrounds, horizontal scroll */}
        <CuisineRow category={category} onChange={setCategory} />

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

      {/* ── Profile drawer ────────────────────────────────────────── */}
      {showDrawer && user && (
        <ProfileDrawer
          user={user}
          onClose={() => setShowDrawer(false)}
          onSignOut={async () => {
            setShowDrawer(false);
            await supabase.auth.signOut();
          }}
        />
      )}

      {/* ── Mobile bottom nav ─────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-[var(--bd)] flex md:hidden">
        {[
          { href: '/customer',     icon: '🏠', label: 'Deals'   },
          { href: '/customer',     icon: '🔍', label: 'Search',  action: () => document.querySelector<HTMLInputElement>('input[type=text]')?.focus() },
          { href: '/profile',      icon: '🎟️',  label: 'Claims'  },
          { href: '/profile',      icon: '👤', label: 'Profile' },
        ].map(({ href, icon, label, action }) => (
          <Link
            key={label}
            href={href}
            onClick={action}
            className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-t2 hover:text-brand transition-colors"
          >
            <span className="text-[20px] leading-none">{icon}</span>
            <span className="text-[10px] font-semibold">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
