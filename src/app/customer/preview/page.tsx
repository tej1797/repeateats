// Deal preview page — server-rendered, no auth required.
// Shows real deals (+ seed deals in dev) to convince visitors to sign up.

import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { USE_SEED_DATA } from '@/lib/seedData';
import type { DealWithRestaurant } from '@/types/index';
import { formatDealTitle } from '@/lib/utils';

// ─── Server-side data fetch ───────────────────────────────────────────────────
async function getPreviewDeals(): Promise<{ featured: DealWithRestaurant[]; total: number }> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const realQuery = supabase
    .from('deals')
    .select('*, restaurant:restaurants(id, name, city, cuisine, address, rating, is_paused)')
    .eq('is_active', true)
    .eq('is_coming', false)
    .order('current_claims', { ascending: false })
    .limit(80);

  const [{ data: realDeals }, { data: seedDeals }] = await Promise.all([
    realQuery,
    USE_SEED_DATA
      ? supabase
          .from('deals_seed')
          .select('*, restaurant:restaurants_seed(id, name, city, cuisine, address, rating)')
          .eq('is_active', true)
          .eq('is_coming', false)
          .order('current_claims', { ascending: false })
          .limit(80)
      : Promise.resolve({ data: null }),
  ]);

  const allDeals = [...(realDeals ?? []), ...(seedDeals ?? [])];

  // Filter paused restaurants client-side (PostgREST can't filter on joined table columns)
  // Seed restaurants don't have is_paused, so the check safely falls through as undefined (falsy).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deals = (allDeals as DealWithRestaurant[]).filter(d => !(d.restaurant as any)?.is_paused);
  const total  = deals.length;

  // Variety selection: 2 highest claimed + 2 newest + 2 from different cuisines
  const seen = new Set<string>();
  const pick  = (deal: DealWithRestaurant) => {
    if (seen.has(deal.id)) return false;
    seen.add(deal.id);
    return true;
  };

  const byClaimsTop = [...deals]
    .sort((a, b) => b.current_claims - a.current_claims)
    .filter(pick)
    .slice(0, 2);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const newest = [...deals]
    .filter((d) => d.created_at && d.created_at > sevenDaysAgo)
    .filter(pick)
    .slice(0, 2);

  const cuisinesSeen = new Set<string | null>();
  const varied = deals.filter((d) => {
    if (!pick(d)) return false;
    const c = d.restaurant?.cuisine ?? null;
    if (cuisinesSeen.has(c)) return false;
    cuisinesSeen.add(c);
    return true;
  }).slice(0, 2);

  const featured = [...byClaimsTop, ...newest, ...varied].slice(0, 6);

  // Pad to 6 with remaining deals if variety didn't fill up
  if (featured.length < 6) {
    deals.filter(pick).slice(0, 6 - featured.length).forEach(d => featured.push(d));
  }

  return { featured, total };
}

// ─── Deal card (server component — no claim button) ───────────────────────────
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
      <div className="h-28 bg-brandlt flex items-center justify-center relative flex-shrink-0">
        <span className="text-5xl select-none">{deal.emoji ?? '🍽️'}</span>
        {deal.current_claims > 0 && (
          <span className="absolute top-2 left-2 text-[10px] font-bold bg-black/60 text-white px-2 py-0.5 rounded-full">
            🔥 {deal.current_claims} claimed
          </span>
        )}
      </div>

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
          {formatDealTitle(deal.title)}
        </h3>

        {deal.discount_value && (
          <div className="font-display text-[26px] font-extrabold text-brand leading-none mb-1">
            {deal.discount_value}
          </div>
        )}

        {deal.max_claims !== null && (
          <div className="mb-3">
            <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
              <div className="h-full bg-brand rounded-full" style={{ width: `${fillPct}%` }} />
            </div>
            {spotsLeft !== null && (
              <p className="text-[11px] text-t3 mt-1">
                {spotsLeft > 0 ? `${spotsLeft} spots left` : 'Sold out'}
              </p>
            )}
          </div>
        )}

        {deal.restaurant?.city && (
          <p className="text-[11px] text-t3 mb-3">📍 {deal.restaurant.city}</p>
        )}

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

// ─── Main preview page (Server Component) ────────────────────────────────────
export default async function PreviewPage() {
  const { featured, total } = await getPreviewDeals();

  return (
    <div className="min-h-screen bg-[var(--bg)]">

      {/* Header */}
      <div className="bg-surface border-b border-[var(--bd)] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="font-display text-[22px] font-extrabold tracking-tight leading-none">
            Rep<span className="text-brand">EAT</span>
          </Link>
          <Link href="/customer/login" className="text-[13px] font-semibold text-brand hover:text-brand2 transition-colors">
            Sign in →
          </Link>
        </div>
      </div>

      {/* Sign-in banner */}
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

      <div className="max-w-6xl mx-auto px-4 py-8">

        <div className="mb-6">
          <h1 className="font-display text-[28px] font-extrabold tracking-tight leading-tight mb-1">
            Deals near you
          </h1>
          <p className="text-[14px] text-t2">
            Top deals from Ontario restaurants — sign in to claim
          </p>
        </div>

        {featured.length === 0 ? (
          <p className="text-t2 text-[14px] py-12 text-center">
            No deals available right now — check back soon.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {featured.map((deal) => (
                <PreviewDealCard key={deal.id} deal={deal} />
              ))}
            </div>

            {/* Blurred "more deals" row with overlay */}
            {total > 6 && (
              <div className="relative">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => <BlurCard key={i} />)}
                </div>
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center"
                  style={{ background: 'linear-gradient(to bottom, transparent 0%, var(--bg) 40%)' }}
                >
                  <div className="text-center px-6 mt-16">
                    <p className="font-display text-[20px] font-bold mb-2">
                      + {total - 6} more deals available
                    </p>
                    <p className="text-[14px] text-t2 mb-5">
                      Create a free account to see all deals and claim them in seconds.
                    </p>
                    <Link
                      href="/customer/login"
                      className="inline-flex items-center gap-2 h-12 px-8 bg-brand hover:bg-brand2 text-white font-bold rounded-brand text-[15px] transition-colors shadow-brand"
                    >
                      Sign in to see all {total} deals →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
