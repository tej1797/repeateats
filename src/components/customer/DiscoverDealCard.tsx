'use client';

import { IconHeart, IconCrown } from '@tabler/icons-react';
import type { DealWithRestaurant } from '@/types/index';
import { formatDiscountValue } from '@/lib/utils';
import { CUSTOMER_UI, METALLIC_GOLD } from '@/lib/customerUI';

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

interface DiscoverDealCardProps {
  deal:           DealWithRestaurant;
  onClick:        () => void;
  claimed?:       boolean;
  saved?:         boolean;
  onToggleSave?:  () => void;
  showCrown?:     boolean;
  locked?:        boolean;
}

export default function DiscoverDealCard({
  deal,
  onClick,
  claimed = false,
  saved = false,
  onToggleSave,
  showCrown = false,
  locked = false,
}: DiscoverDealCardProps) {
  const img = CATEGORY_IMAGES[deal.restaurant?.category ?? ''] ?? CATEGORY_IMAGES.default;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-2xl overflow-hidden transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
      style={{
        background: CUSTOMER_UI.glassBg,
        border: `1px solid ${CUSTOMER_UI.glassBorder}`,
        opacity: locked ? 0.75 : 1,
      }}
    >
      <div className="relative h-[130px] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />

        {deal.current_claims > 0 && (
          <span
            className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.65)', color: '#fff' }}
          >
            {deal.current_claims} claimed
          </span>
        )}

        {showCrown && (
          <span className="absolute top-2 right-2" style={{ color: METALLIC_GOLD.base }}>
            <IconCrown size={16} fill={METALLIC_GOLD.base} />
          </span>
        )}

        {onToggleSave && (
          <span
            role="button"
            tabIndex={0}
            onClick={e => { e.stopPropagation(); onToggleSave(); }}
            onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); onToggleSave(); } }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          >
            <IconHeart size={14} style={{ color: saved ? '#ef4444' : '#fff', fill: saved ? '#ef4444' : 'none' }} />
          </span>
        )}

        <span className="absolute bottom-2 left-2.5 font-display text-[20px] font-extrabold text-white drop-shadow-lg">
          {formatDiscountValue(deal.discount_value)}
        </span>
      </div>

      <div className="p-3">
        <p className="text-[13px] font-bold leading-snug line-clamp-2 mb-1" style={{ color: CUSTOMER_UI.textPrimary }}>
          {deal.title}
        </p>
        <p className="text-[11px] truncate" style={{ color: CUSTOMER_UI.textMuted }}>
          {deal.restaurant?.name}
          {deal.restaurant?.city ? ` · ${deal.restaurant.city}` : ''}
        </p>
        {claimed && (
          <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.2)', color: '#4ade80' }}>
            Active claim
          </span>
        )}
      </div>
    </button>
  );
}
