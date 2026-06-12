'use client';

import StarRating from '@/components/StarRating';
import ProgressBar from '@/components/ui/ProgressBar';
import type { DealWithRestaurant } from '@/types/index';
import { formatCustomerDealTitle, formatDiscountValue } from '@/lib/utils';

// Food image map by cuisine category (Unsplash)
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
  vegan:     'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
  chinese:   'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&q=80',
  seafood:   'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80',
  default:   'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80',
};

interface DealCardProps {
  deal:     DealWithRestaurant;
  onClick:  () => void;
  compact?: boolean;
  claimed?: boolean; // show a small "claimed" indicator
}

export default function DealCard({ deal, onClick, compact = false, claimed = false }: DealCardProps) {
  const imgSrc    = CATEGORY_IMAGES[deal.restaurant?.category ?? ''] ?? CATEGORY_IMAGES.default;
  const spotsLeft = deal.max_claims !== null ? deal.max_claims - deal.current_claims : null;
  const isSoldOut = spotsLeft !== null && spotsLeft <= 0;

  return (
    <div
      className="bg-surface rounded-brand shadow-brand cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-brand2 overflow-hidden border border-[var(--bd)] flex flex-col group"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={`${formatCustomerDealTitle(deal.title)} at ${deal.restaurant?.name}`}
    >
      {/* Food photo header */}
      <div className={`relative ${compact ? 'h-[110px]' : 'h-[140px]'} overflow-hidden flex-shrink-0`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={deal.restaurant?.name ?? ''}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.85) 100%)' }}
        />

        {/* Deal type badge — top left */}
        {deal.deal_types?.length > 0 && (
          <div className="absolute top-2 left-2">
            <span
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border capitalize"
              style={{
                background:  'rgba(255,255,255,0.18)',
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

        {/* Claimed indicator */}
        {claimed && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            ✓ Claimed
          </div>
        )}

        {/* Coming soon badge */}
        {deal.is_coming && !claimed && (
          <span className="absolute top-2 right-2 bg-white/90 text-[10px] font-bold px-2 py-0.5 rounded-full text-t2 border border-[var(--bd)]">
            Coming soon
          </span>
        )}

        {/* Restaurant name + discount — bottom */}
        <div className="absolute bottom-2.5 left-3 right-3">
          <div className="mb-1 inline-flex">
            <span
              className="text-[13px] font-bold text-white truncate max-w-full"
              style={{
                background:     'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(4px)',
                padding:        '2px 8px',
                borderRadius:   100,
                textShadow:     '0 1px 4px rgba(0,0,0,0.8)',
              }}
            >
              {deal.restaurant?.name ?? 'Restaurant'}
            </span>
          </div>
          <p
            className="font-display text-[22px] font-extrabold text-white leading-none"
            style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}
          >
            {formatDiscountValue(deal.discount_value)}
          </p>
        </div>
      </div>

      {/* Card body */}
      <div className="p-3.5 flex flex-col flex-1">
        <h3 className="font-body font-bold text-[14px] leading-snug mb-1.5 line-clamp-2 flex-1">
          {formatCustomerDealTitle(deal.title)}
        </h3>

        {/* Rating */}
        {(deal.restaurant?.rating ?? 0) > 0 && (
          <div className="mb-2">
            <StarRating rating={deal.restaurant!.rating} size="sm" />
          </div>
        )}

        {/* Progress / unlimited */}
        <ProgressBar
          value={deal.current_claims}
          max={deal.max_claims}
          className="mb-2"
        />

        {/* Sold out overlay text */}
        {isSoldOut && (
          <p className="text-[11px] font-bold text-t3 mt-0.5">Fully claimed</p>
        )}

        {/* Footer */}
        <p className="text-[11px] text-t3 truncate mt-auto">
          📍 {deal.restaurant?.city ?? ''}
          {(deal.available_days?.length ?? 0) > 0 && deal.available_days![0] !== 'all' && (
            <span className="ml-1">· {deal.available_days!.join(', ')}</span>
          )}
        </p>
      </div>
    </div>
  );
}
