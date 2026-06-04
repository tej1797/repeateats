'use client';

// Restaurant detail page — /customer/restaurant/[id]
// Shows hero, info, active deals (claimable), Google reviews, similar restaurants.
// Accessible without auth; claim button requires sign-in.

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { RestaurantWithDeals, Restaurant, DealWithRestaurant } from '@/types/index';
import { useClaims } from '@/hooks/useClaims';
import DealCard from '@/components/deals/DealCard';
import DealDetailModal from '@/components/deals/DealDetailModal';
import QRCodeModal from '@/components/deals/QRCodeModal';
import ReviewsSection from '@/components/ReviewsSection';
import Skeleton from '@/components/ui/Skeleton';
import MobileNav from '@/components/layout/MobileNav';
import StarRating from '@/components/form/StarRating';
import {
  IconArrowLeft, IconMapPin, IconPhone, IconGlobe,
  IconBrandInstagram, IconChevronDown, IconChevronUp,
  IconTicket, IconX, IconUser,
} from '@tabler/icons-react';

// ─── Hour entry shape (from the restaurant onboarding wizard) ─────────────
interface HoursEntry { open: string; close: string; closed: boolean }

// Unsplash fallback images per cuisine category
const CATEGORY_IMAGES: Record<string, string> = {
  indian:    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80',
  bbq:       'https://images.unsplash.com/photo-1558030006-450675393462?w=800&q=80',
  italian:   'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
  bar:       'https://images.unsplash.com/photo-1575444758702-4a6b9222336e?w=800&q=80',
  canadian:  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
  bubbletea: 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=800&q=80',
  pizza:     'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80',
  burgers:   'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
  sushi:     'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80',
  desserts:  'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80',
  vegan:     'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
  chinese:   'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&q=80',
  seafood:   'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
  default:   'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
};

// ─── SignInModal (inline, no external deps) ───────────────────────────────
function SignInModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (u: User) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = useRef(createClient()).current;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    if (data.user) onSuccess(data.user);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
      <div className="bg-surface rounded-brand shadow-brand2 w-full max-w-sm p-6 animate-[slideUp_0.22s_ease]">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-display text-[20px] font-bold">Sign in to claim</h2>
          <button onClick={onClose} className="p-1 text-t2 hover:text-tx"><IconX size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required className="w-full h-11 px-3.5 border border-[var(--bd2)] rounded-brands bg-surface text-tx text-[15px] outline-none focus:border-brand transition-all" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="w-full h-11 px-3.5 border border-[var(--bd2)] rounded-brands bg-surface text-tx text-[15px] outline-none focus:border-brand transition-all" />
          {error && <p className="text-[13px] text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="w-full h-11 bg-brand hover:bg-brand2 disabled:opacity-60 text-white font-semibold rounded-brands transition-colors">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="text-center text-[13px] text-t2 mt-4">
          New here?{' '}
          <Link href="/customer/signup" className="text-brand font-semibold">Create a free account →</Link>
        </p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────
export default function RestaurantDetailPage() {
  const params = useParams();
  const id     = params?.id as string;
  const router = useRouter();
  const supabase = useRef(createClient()).current;

  // ── Auth (optional — not required to view, required to claim) ─────────
  const [user,        setUser]        = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) { setUser(session?.user ?? null); setAuthChecked(true); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (mounted) { setUser(session?.user ?? null); setAuthChecked(true); }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [supabase]);

  // ── Restaurant data ───────────────────────────────────────────────────
  const [restaurant,   setRestaurant]   = useState<RestaurantWithDeals | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [showHours,    setShowHours]    = useState(false);
  const [similarRests, setSimilarRests] = useState<Restaurant[]>([]);
  const [heroSrc,      setHeroSrc]      = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/restaurants/${id}`)
      .then(r => r.json())
      .then(({ data, error: e }: { data?: RestaurantWithDeals; error?: string }) => {
        if (e || !data) { setError('Restaurant not found'); return; }
        setRestaurant(data);
        // Build hero src: stored cover → Google Places proxy → cuisine Unsplash
        const cuisine = (data.category ?? data.cuisine ?? 'default').toLowerCase();
        const proxyUrl = `/api/restaurant-photo?name=${encodeURIComponent(data.name)}&city=${encodeURIComponent(data.city)}&cuisine=${encodeURIComponent(cuisine)}`;
        setHeroSrc(data.cover_url ?? proxyUrl);
      })
      .catch(() => setError('Failed to load restaurant'))
      .finally(() => setLoading(false));
  }, [id]);

  // Fetch similar restaurants once we know the cuisine
  useEffect(() => {
    if (!restaurant?.cuisine) return;
    fetch('/api/restaurants')
      .then(r => r.json())
      .then(({ data }: { data?: Restaurant[] }) => {
        if (!data) return;
        setSimilarRests(
          data
            .filter(r => r.id !== restaurant.id && r.cuisine === restaurant.cuisine)
            .slice(0, 4)
        );
      })
      .catch(() => {});
  }, [restaurant]);

  // ── Claim state ───────────────────────────────────────────────────────
  const [activeDeal,    setActiveDeal]    = useState<DealWithRestaurant | null>(null);
  const [qrCode,        setQrCode]        = useState<string | null>(null);
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null);
  const [claimError,    setClaimError]    = useState<string | null>(null);
  const [showSignIn,    setShowSignIn]    = useState(false);
  interface ClaimInfo { id: string; qr_code: string; status: string; expires_at: string | null }
  const [userClaimMap, setUserClaimMap] = useState<Record<string, ClaimInfo>>({});
  const { claimDeal, loading: claiming } = useClaims();

  useEffect(() => {
    if (!user) return;
    fetch('/api/claims')
      .then(r => r.json())
      .then(({ data }: { data?: Array<{ id: string; deal_id: string; qr_code: string; status: string; expires_at: string | null }> }) => {
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
  }, [user]);

  const isActiveClaim = (dealId: string): boolean => {
    const c = userClaimMap[dealId];
    if (!c || c.status !== 'claimed') return false;
    if (!c.expires_at) return true;
    return new Date(c.expires_at) > new Date();
  };

  const handleClaim = async () => {
    if (!activeDeal) return;
    if (!user) { setShowSignIn(true); return; }
    setClaimError(null);
    const result = await claimDeal(activeDeal.id);
    if (result) {
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      setUserClaimMap(prev => ({
        ...prev,
        [activeDeal.id]: { id: result.claim_id ?? '', qr_code: result.qr_code, status: 'claimed', expires_at: expiresAt },
      }));
      setQrCode(result.qr_code);
      if ((result as { claim_id?: string }).claim_id) {
        setActiveClaimId((result as { claim_id?: string }).claim_id!);
      }
    } else {
      setClaimError('Could not claim this deal. Please try again.');
    }
  };

  // ── Derived deal list ─────────────────────────────────────────────────
  const deals: DealWithRestaurant[] = useMemo(() => {
    if (!restaurant) return [];
    return (restaurant.deals ?? []).map(d => ({
      ...d,
      restaurant: {
        id:       restaurant.id,
        name:     restaurant.name,
        cuisine:  restaurant.cuisine,
        category: restaurant.category,
        city:     restaurant.city,
        address:  restaurant.address,
        rating:   restaurant.rating,
      },
    }));
  }, [restaurant]);

  const hours = restaurant?.hours as Record<string, HoursEntry> | null;

  // ── Loading skeleton ──────────────────────────────────────────────────
  if (loading || !authChecked) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <div className="h-[280px] bg-[var(--sf2)] animate-pulse" />
        <div className="max-w-[900px] mx-auto px-5 py-6 space-y-4">
          <Skeleton variant="text" />
          <Skeleton variant="text" />
          <div className="grid grid-cols-2 gap-4 mt-8">
            <Skeleton variant="dealCard" />
            <Skeleton variant="dealCard" />
          </div>
        </div>
        <MobileNav portal="customer" />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center px-5">
          <p className="text-5xl mb-4">😕</p>
          <p className="text-[20px] font-bold mb-2">Restaurant not found</p>
          <p className="text-[14px] text-t2 mb-5">It may have moved or been removed.</p>
          <Link href="/customer" className="inline-flex items-center gap-1.5 text-brand font-semibold hover:underline">
            <IconArrowLeft size={16} /> Back to deals
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">

      {/* ── Back nav ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-[var(--bd)]">
        <div className="max-w-[900px] mx-auto px-5 h-14 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[14px] font-semibold text-t2 hover:text-brand transition-colors flex-shrink-0"
          >
            <IconArrowLeft size={18} /> Back
          </button>
          <span className="text-tx font-semibold text-[14px] truncate">{restaurant.name}</span>
        </div>
      </div>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="h-[240px] md:h-[320px] relative flex items-end overflow-hidden">
        {heroSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroSrc}
            alt={restaurant.name}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => {
              const cuisine = (restaurant.category ?? restaurant.cuisine ?? 'default').toLowerCase();
              const fallback = CATEGORY_IMAGES[cuisine] ?? CATEGORY_IMAGES.default;
              if (heroSrc !== fallback) setHeroSrc(fallback);
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="relative z-10 max-w-[900px] mx-auto px-5 pb-6 w-full">
          {/* Pills */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {restaurant.cuisine && (
              <span className="text-[12px] font-bold text-white bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                {restaurant.cuisine}
              </span>
            )}
            <span className="text-[12px] text-white/75">{restaurant.city}</span>
            {deals.length > 0 && (
              <span className="text-[12px] font-bold text-brand bg-white/95 px-2.5 py-0.5 rounded-full ml-auto">
                {deals.length} active deal{deals.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {/* Name */}
          <h1 className="font-display text-[28px] md:text-[38px] font-extrabold text-white leading-tight mb-2">
            {restaurant.name}
          </h1>
          {/* Rating */}
          {restaurant.rating > 0 && (
            <div className="flex items-center gap-2">
              <StarRating rating={restaurant.rating} size="sm" showNumber />
              {restaurant.review_count > 0 && (
                <span className="text-[12px] text-white/70">({restaurant.review_count} reviews)</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────── */}
      <div className="max-w-[900px] mx-auto px-5 py-6 pb-28">

        {/* Description */}
        {restaurant.description && (
          <p className="text-[15px] text-t2 leading-relaxed mb-6">{restaurant.description}</p>
        )}

        {/* Service badges */}
        <div className="flex gap-2 flex-wrap mb-6">
          {restaurant.accepts_dine_in  && <span className="text-[12px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full">🍽️ Dine-in</span>}
          {restaurant.accepts_pickup   && <span className="text-[12px] font-semibold bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full">🥡 Pickup</span>}
          {restaurant.accepts_delivery && <span className="text-[12px] font-semibold bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1 rounded-full">🛵 Delivery</span>}
          {restaurant.open_to_collabs  && <span className="text-[12px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 rounded-full">📸 Open to collabs</span>}
        </div>

        {/* Info cards */}
        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          {restaurant.address && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(restaurant.address)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-start gap-3 bg-surface rounded-brands border border-[var(--bd)] px-4 py-3 hover:border-brand transition-colors group"
            >
              <IconMapPin size={18} className="text-brand flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-t3 uppercase tracking-wide mb-0.5">Address</p>
                <p className="text-[14px] text-tx group-hover:text-brand transition-colors leading-snug">{restaurant.address}</p>
              </div>
            </a>
          )}
          {restaurant.phone && (
            <a
              href={`tel:${restaurant.phone}`}
              className="flex items-start gap-3 bg-surface rounded-brands border border-[var(--bd)] px-4 py-3 hover:border-brand transition-colors group"
            >
              <IconPhone size={18} className="text-brand flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-bold text-t3 uppercase tracking-wide mb-0.5">Phone</p>
                <p className="text-[14px] text-tx group-hover:text-brand transition-colors">{restaurant.phone}</p>
              </div>
            </a>
          )}
          {restaurant.website && (
            <a
              href={restaurant.website.startsWith('http') ? restaurant.website : `https://${restaurant.website}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-start gap-3 bg-surface rounded-brands border border-[var(--bd)] px-4 py-3 hover:border-brand transition-colors group"
            >
              <IconGlobe size={18} className="text-brand flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-t3 uppercase tracking-wide mb-0.5">Website</p>
                <p className="text-[14px] text-tx group-hover:text-brand transition-colors truncate">
                  {restaurant.website.replace(/^https?:\/\//, '')}
                </p>
              </div>
            </a>
          )}
          {restaurant.instagram && (
            <a
              href={`https://instagram.com/${restaurant.instagram.replace('@', '')}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-start gap-3 bg-surface rounded-brands border border-[var(--bd)] px-4 py-3 hover:border-brand transition-colors group"
            >
              <IconBrandInstagram size={18} className="text-brand flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-bold text-t3 uppercase tracking-wide mb-0.5">Instagram</p>
                <p className="text-[14px] text-tx group-hover:text-brand transition-colors">{restaurant.instagram}</p>
              </div>
            </a>
          )}
        </div>

        {/* Hours accordion */}
        {hours && Object.keys(hours).length > 0 && (
          <div className="bg-surface rounded-brands border border-[var(--bd)] mb-6 overflow-hidden">
            <button
              onClick={() => setShowHours(!showHours)}
              className="flex items-center justify-between w-full px-4 py-3 text-[14px] font-semibold hover:bg-surface2 transition-colors"
            >
              <span className="flex items-center gap-2">
                🕐 Operating Hours
              </span>
              {showHours ? <IconChevronUp size={16} className="text-t3" /> : <IconChevronDown size={16} className="text-t3" />}
            </button>
            {showHours && (
              <div className="border-t border-[var(--bd)]">
                {Object.entries(hours).map(([day, entry]) => (
                  <div key={day} className="flex justify-between items-center px-4 py-2 text-[13px] border-b border-[var(--bd)] last:border-0">
                    <span className="font-semibold w-12 text-t2">{day}</span>
                    <span className={entry.closed ? 'text-t3 italic' : 'text-tx font-medium'}>
                      {entry.closed ? 'Closed' : `${entry.open} – ${entry.close}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Active Deals */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <IconTicket size={20} className="text-brand" />
            <h2 className="text-[20px] font-bold">
              Active Deals
              {deals.length > 0 && (
                <span className="ml-2 text-brand text-[16px]">({deals.length})</span>
              )}
            </h2>
          </div>

          {deals.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
              {deals.map(deal => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  onClick={() => { setActiveDeal(deal); setClaimError(null); }}
                  claimed={isActiveClaim(deal.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-surface rounded-brand border border-[var(--bd)]">
              <p className="text-4xl mb-2">🍽️</p>
              <p className="font-semibold text-t2 text-[15px]">No active deals right now</p>
              <p className="text-[13px] text-t3 mt-1">Check back soon for exclusive offers</p>
            </div>
          )}
        </section>

        {/* Google Reviews */}
        <section className="mb-8">
          <ReviewsSection restaurantId={restaurant.id} />
        </section>

        {/* Similar Restaurants */}
        {similarRests.length > 0 && (
          <section className="mb-4">
            <h3 className="text-[18px] font-bold mb-4">
              Similar {restaurant.cuisine} Restaurants
            </h3>
            <div className="flex gap-4 overflow-x-auto scrollbar-none pb-2 -mx-5 px-5">
              {similarRests.map(r => (
                <button
                  key={r.id}
                  onClick={() => router.push(`/customer/restaurant/${r.id}`)}
                  className="flex-shrink-0 w-[180px] bg-surface rounded-brand border border-[var(--bd)] overflow-hidden hover:-translate-y-0.5 hover:shadow-brand transition-all duration-150 text-left"
                >
                  <div
                    className="h-[100px]"
                    style={{ background: 'linear-gradient(135deg, #E85D04 0%, #A03C01 100%)' }}
                  />
                  <div className="p-3">
                    <p className="font-bold text-[13px] text-tx line-clamp-1">{r.name}</p>
                    <p className="text-[11px] text-t2 mt-0.5">{r.city}</p>
                    {r.rating > 0 && (
                      <p className="text-[11px] text-t3 mt-0.5">⭐ {r.rating.toFixed(1)}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Modals ────────────────────────────────────────────────── */}
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
          isRedeemed={userClaimMap[activeDeal.id]?.status === 'redeemed'}
          onViewExisting={code => {
            setQrCode(code);
            const claimInfo = userClaimMap[activeDeal.id];
            if (claimInfo?.id) setActiveClaimId(claimInfo.id);
          }}
        />
      )}

      {qrCode && activeDeal && activeClaimId && (
        <QRCodeModal
          claimId={activeClaimId}
          dealTitle={activeDeal.title}
          restaurantName={restaurant.name}
          customerName={(user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email ?? 'Guest') as string}
          customerId={user?.id ?? '0000'}
          onClose={() => { setQrCode(null); setActiveDeal(null); setActiveClaimId(null); }}
        />
      )}

      {showSignIn && (
        <SignInModal
          onClose={() => setShowSignIn(false)}
          onSuccess={u => { setUser(u); setShowSignIn(false); }}
        />
      )}

      {/* User hint if not signed in */}
      {!user && authChecked && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-30 bg-[#0A0A0A] text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-2.5 text-[13px] font-semibold whitespace-nowrap">
          <IconUser size={16} className="text-brand" />
          <span>Sign in to claim deals</span>
          <button
            onClick={() => setShowSignIn(true)}
            className="ml-1 text-brand hover:underline"
          >
            Sign in →
          </button>
        </div>
      )}

      <MobileNav portal="customer" />
    </div>
  );
}
