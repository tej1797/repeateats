'use client';

// Deal preview page — shows top deals WITHOUT requiring login.
// Used as the landing target for "Browse deals →" CTA.

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { DealWithRestaurant } from '@/types/index';

// ─── Deal card (preview mode — no claim button) ───────────────────────────────
function PreviewDealCard({ deal }: { deal: DealWithRestaurant }) {
  const fillPct   = deal.max_claims ? Math.min((deal.current_claims / deal.max_claims) * 100, 100) : 0;
  const spotsLeft = deal.max_claims !== null ? deal.max_claims - deal.current_claims : null;

  const typeColors: Record<string, string> = {
    'dine-in':  'bg-blue-50 text-blue-700 border-blue-200',
    'pickup':   'bg-green-50 text-green-700 border-green-200',
    'delivery': 'bg-orange-50 text-orange-800 border-orange-200',
  };
  const firstType = deal.deal_types?.[0] ?? 'dine-in';

  return (
    <div className="bg-surface rounded-brand shadow-brand border border-[var(--bd)] overflow-hidden flex flex-col">
      {/* Emoji header */}
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
        {deal.deal_types?.length > 0 && (
          <div className="mb-2">
            <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full border ${typeColors[firstType] ?? 'bg-gray-50 text-gray-700 border-gray-200'}`}>
              {firstType}
            </span>
          </div>
        )}

        <p className="text-[12px] text-t2 mb-0.5 truncate font-medium">
          {deal.restaurant?.name ?? 'Restaurant'}
        </p>
        <h3 className="font-body font-bold text-[14px] leading-snug mb-2 line-clamp-2 flex-1">
          {deal.title}
        </h3>

        {/* Discount value */}
        {deal.discount_value && (
          <div className="font-display text-[26px] font-extrabold text-brand leading-none mb-1">
            {deal.discount_value}
          </div>
        )}

        {/* Progress bar */}
        {deal.max_claims !== null && (
          <div className="mb-3">
            <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
              <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${fillPct}%` }} />
            </div>
            {spotsLeft !== null && (
              <p className="text-[11px] text-t3 mt-1">
                {spotsLeft > 0 ? `${spotsLeft} spots left` : 'Sold out'}
              </p>
            )}
          </div>
        )}

        {/* City */}
        {deal.restaurant?.city && (
          <p className="text-[11px] text-t3 mb-3">📍 {deal.restaurant.city}</p>
        )}

        {/* Sign in to claim button */}
        <Link
          href="/customer/login"
          className="mt-auto block w-full h-10 bg-brand hover:bg-brand2 text-white font-semibold rounded-brands transition-colors text-[13px] flex items-center justify-center gap-1.5"
        >
          Sign in to claim →
        </Link>
      </div>
    </div>
  );
}

// ─── Blurred placeholder card ─────────────────────────────────────────────────
function BlurCard() {
  return (
    <div className="bg-surface rounded-brand border border-[var(--bd)] overflow-hidden opacity-60 blur-[2px] pointer-events-none select-none">
      <div className="h-28 bg-brandlt" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-14 bg-surface2 rounded-full" />
        <div className="h-4 w-3/4 bg-surface2 rounded-full" />
        <div className="h-7 w-1/2 bg-surface2 rounded-full" />
        <div className="h-2 bg-surface2 rounded-full" />
        <div className="h-9 bg-surface2 rounded-brands" />
      </div>
    </div>
  );
}

// ─── Main preview page ────────────────────────────────────────────────────────
export default function PreviewPage() {
  const [deals,   setDeals]   = useState<DealWithRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/deals?tab=active')
      .then((r) => r.json())
      .then((json: { data?: DealWithRestaurant[]; error?: string }) => {
        if (json.error) throw new Error(json.error);
        setDeals(json.data ?? []);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load deals'))
      .finally(() => setLoading(false));
  }, []);

  const topDeals = deals.slice(0, 6);

  return (
    <div className="min-h-screen bg-[var(--bg)]">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-surface border-b border-[var(--bd)] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="font-display text-[22px] font-extrabold tracking-tight leading-none">
            Rep<span className="text-brand">EAT</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/customer/login" className="text-[13px] font-semibold text-brand hover:text-brand2 transition-colors">
              Sign in →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Sign-in banner ──────────────────────────────────────────────────── */}
      <div className="bg-brand text-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-[14px] font-semibold">
            🔒 Sign in to claim deals, save favourites, and get notified about new offers near you
          </p>
          <Link
            href="/customer/login"
            className="flex-shrink-0 h-8 px-4 bg-white text-brand font-bold rounded-brands text-[13px] flex items-center hover:bg-brandlt transition-colors"
          >
            Sign in free →
          </Link>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-8">

        <div className="mb-6">
          <h1 className="font-display text-[28px] font-extrabold tracking-tight leading-tight mb-1">
            Deals near you
          </h1>
          <p className="text-[14px] text-t2">
            Top deals from Ontario restaurants — sign in to claim
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div className="text-[14px] text-red-600 bg-red-50 border border-red-200 rounded-brands px-4 py-3 mb-6">
            {error}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-surface rounded-brand border border-[var(--bd)] overflow-hidden animate-pulse">
                <div className="h-28 bg-surface2" />
                <div className="p-4 space-y-3">
                  <div className="h-3 w-14 bg-surface2 rounded-full" />
                  <div className="h-4 w-3/4 bg-surface2 rounded-full" />
                  <div className="h-7 w-1/2 bg-surface2 rounded-full" />
                  <div className="h-9 bg-surface2 rounded-brands" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Top 6 deal cards */}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {topDeals.map((deal) => (
              <PreviewDealCard key={deal.id} deal={deal} />
            ))}
            {topDeals.length === 0 && (
              <p className="text-t2 text-[14px] col-span-full py-12 text-center">
                No deals available right now — check back soon.
              </p>
            )}
          </div>
        )}

        {/* Blurred "more deals" row with overlay */}
        {!loading && topDeals.length > 0 && (
          <div className="relative">
            {/* Blurred placeholder row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <BlurCard key={i} />
              ))}
            </div>

            {/* Gradient + CTA overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center"
              style={{ background: 'linear-gradient(to bottom, transparent 0%, var(--bg) 40%)' }}>
              <div className="text-center px-6 mt-16">
                <p className="font-display text-[20px] font-bold mb-2">
                  + {Math.max(0, deals.length - 6)} more deals available
                </p>
                <p className="text-[14px] text-t2 mb-5">
                  Create a free account to see all deals and claim them in seconds.
                </p>
                <Link
                  href="/customer/login"
                  className="inline-flex items-center gap-2 h-12 px-8 bg-brand hover:bg-brand2 text-white font-bold rounded-brand text-[15px] transition-colors shadow-brand"
                >
                  Sign in to see all deals →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
