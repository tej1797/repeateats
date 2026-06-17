'use client';

import { useState } from 'react';
import { IconHeart, IconStar, IconCrown, IconFlame, IconCircleCheck } from '@tabler/icons-react';
import type { DealWithRestaurant } from '@/types/index';
import { CUSTOMER_UI, METALLIC_GOLD } from '@/lib/customerUI';
import { formatCustomerDealTitle, getRestaurantRating } from '@/lib/utils';
import { getDealOfferHeadline } from '@/lib/dealOfferLabel';
import { getDealPriceTag } from '@/lib/dealPricing';

const CATEGORY_IMAGES: Record<string, string> = {
  indian:    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&q=80',
  bbq:       'https://images.unsplash.com/photo-1558030006-450675393462?w=500&q=80',
  italian:   'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&q=80',
  bar:       'https://images.unsplash.com/photo-1575444758702-4a6b9222336e?w=500&q=80',
  canadian:  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=500&q=80',
  bubbletea: 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=500&q=80',
  pizza:     'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&q=80',
  burgers:   'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80',
  sushi:     'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500&q=80',
  desserts:  'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500&q=80',
  chinese:   'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=500&q=80',
  seafood:   'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&q=80',
  default:   'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&q=80',
};

// Headline offer label derived from discount type (mobile parity).
function offerLabel(deal: DealWithRestaurant): string {
  return getDealOfferHeadline({
    discount_type: (deal as { discount_type?: string | null }).discount_type,
    discount_value: deal.discount_value,
    title: deal.title,
    scope_detail: deal.scope_detail,
  });
}

interface DiscoverDealCardProps {
  deal:           DealWithRestaurant;
  onClick:        () => void;
  claimed?:       boolean;
  redeemed?:      boolean;
  saved?:         boolean;
  onToggleSave?:  () => void;
  showCrown?:     boolean;
  locked?:        boolean;
}

export default function DiscoverDealCard({
  deal,
  onClick,
  claimed = false,
  redeemed = false,
  saved = false,
  onToggleSave,
  showCrown = false,
  locked = false,
}: DiscoverDealCardProps) {
  const cuisine = (deal.restaurant?.category ?? deal.restaurant?.cuisine ?? 'default').toLowerCase();
  // Prefer the restaurant's real cover (Google Places) → photo proxy → cuisine fallback.
  const proxySrc = deal.restaurant
    ? `/api/restaurant-photo?name=${encodeURIComponent(deal.restaurant.name)}&city=${encodeURIComponent(deal.restaurant.city ?? '')}&cuisine=${encodeURIComponent(cuisine)}`
    : (CATEGORY_IMAGES[cuisine] ?? CATEGORY_IMAGES.default);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initialSrc = ((deal.restaurant as any)?.cover_url as string | undefined) ?? proxySrc;
  const [imgSrc, setImgSrc] = useState(initialSrc);

  const headline = offerLabel(deal);
  const priceTag = getDealPriceTag({
    discount_type: (deal as { discount_type?: string | null }).discount_type,
    discount_value: deal.discount_value,
    base_price: deal.base_price ?? null,
    free_condition_type: deal.free_condition_type ?? null,
    free_condition_value: deal.free_condition_value ?? null,
  });
  const rating   = getRestaurantRating(deal.restaurant);
  const maxClaims = deal.max_claims;
  const pct = maxClaims && maxClaims > 0 ? Math.min(100, (deal.current_claims / maxClaims) * 100) : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-2xl overflow-hidden transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
      style={{
        background: CUSTOMER_UI.glassBg,
        border: `1px solid ${CUSTOMER_UI.glassBorder}`,
        opacity: locked ? 0.75 : 1,
      }}
    >
      {/* Image — restaurant photo, no number overlay */}
      <div className="relative h-[140px] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={deal.restaurant?.name ?? ''}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => {
            const fb = CATEGORY_IMAGES[cuisine] ?? CATEGORY_IMAGES.default;
            if (imgSrc !== fb) setImgSrc(fb);
          }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45), transparent 55%)' }} />

        {/* Already redeemed — top-left (mobile parity) */}
        {redeemed ? (
          <span
            className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full"
            style={{ background: '#166534', color: '#fff' }}
          >
            <IconCircleCheck size={12} />
            Already redeemed
          </span>
        ) : deal.current_claims > 0 ? (
          <span
            className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
          >
            <IconFlame size={10} style={{ color: CUSTOMER_UI.accent }} />
            {deal.current_claims} claimed
          </span>
        ) : null}

        {/* Crown (Pro) */}
        {showCrown && !onToggleSave && (
          <span className="absolute top-2 right-2" style={{ color: METALLIC_GOLD.base }}>
            <IconCrown size={16} fill={METALLIC_GOLD.base} />
          </span>
        )}

        {/* Heart save — top-right */}
        {onToggleSave && (
          <span
            role="button"
            tabIndex={0}
            onClick={e => { e.stopPropagation(); onToggleSave(); }}
            onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); onToggleSave(); } }}
            className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          >
            <IconHeart size={15} style={{ color: saved ? '#ef4444' : '#fff', fill: saved ? '#ef4444' : 'none' }} />
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-3">
        {/* Offer headline + item name */}
        <p className="font-display text-[17px] font-extrabold leading-tight" style={{ color: CUSTOMER_UI.textPrimary }}>
          {headline}
        </p>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <p className="text-[13px] font-semibold leading-snug line-clamp-1" style={{ color: CUSTOMER_UI.textSecondary }}>
            {formatCustomerDealTitle(deal.title)}
          </p>
          {priceTag && (
            <span className="text-[13px] font-extrabold leading-snug flex-shrink-0" style={{ color: CUSTOMER_UI.textPrimary }}>
              {priceTag}
            </span>
          )}
        </div>

        {/* Restaurant · city · rating */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-[11px] truncate" style={{ color: CUSTOMER_UI.textMuted }}>
            {deal.restaurant?.name}
            {deal.restaurant?.city ? ` · ${deal.restaurant.city}` : ''}
          </p>
          {rating > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold flex-shrink-0" style={{ color: CUSTOMER_UI.gold }}>
              <IconStar size={11} fill={CUSTOMER_UI.gold} /> {rating.toFixed(1)}
            </span>
          )}
        </div>

        {/* Claims progress bar with current/max on the right */}
        {maxClaims && maxClaims > 0 ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: CUSTOMER_UI.accent }} />
            </div>
            <span className="text-[10px] font-bold flex-shrink-0" style={{ color: CUSTOMER_UI.textMuted }}>
              {deal.current_claims}/{maxClaims}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <span className="text-[10px] font-bold flex-shrink-0" style={{ color: CUSTOMER_UI.textMuted }}>
              {deal.current_claims} claimed
            </span>
          </div>
        )}

        {claimed && !redeemed && (
          <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.2)', color: '#4ade80' }}>
            Active claim
          </span>
        )}
      </div>
    </button>
  );
}
