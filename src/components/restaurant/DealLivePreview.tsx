'use client';

import { formatCustomerDealTitle } from '@/lib/utils';
import { getDealOfferBadge } from '@/lib/dealOfferLabel';
import { getDealPriceTag } from '@/lib/dealPricing';
import { toDbDiscountType, type PriceTag, type RestaurantDiscountType } from '@/lib/restaurantDealForm';

const PREVIEW_BLUE = '#1249A9';
const CARD_BG = '#1C1917';
const CARD_BORDER = 'rgba(255,255,255,0.08)';

interface DealLivePreviewProps {
  title: string;
  discountType: RestaurantDiscountType;
  discountValue: string;
  scopeDetail?: string;
  dealTypes: string[];
  dietType: 'veg' | 'nonveg' | 'both';
  priceTag: PriceTag;
  isComing: boolean;
  restaurantName: string;
  restaurantCity?: string;
  basePrice?: string;
  freeConditionType?: 'spend' | 'item';
  freeConditionValue?: string;
}

function serviceTags(dealTypes: string[]): string[] {
  const tags: string[] = [];
  if (dealTypes.includes('pickup')) tags.push('Takeout');
  if (dealTypes.includes('dine-in')) tags.push('Dine-in');
  return tags.length ? tags : ['Takeout'];
}

function priceTagLabel(tag: PriceTag): string | null {
  if (tag === 'under6') return '$6 & under';
  if (tag === 'under12') return '$12 & under';
  return null;
}

export default function DealLivePreview({
  title,
  discountType,
  discountValue,
  scopeDetail,
  dealTypes,
  dietType,
  priceTag,
  isComing,
  restaurantName,
  restaurantCity,
  basePrice,
  freeConditionType,
  freeConditionValue,
}: DealLivePreviewProps) {
  const badge = getDealOfferBadge({
    discount_type: toDbDiscountType(discountType),
    discount_value: discountValue,
    title,
    scope_detail: scopeDetail,
  });

  const priceTagText = getDealPriceTag({
    discount_type: toDbDiscountType(discountType),
    discount_value: discountValue,
    base_price: basePrice && basePrice.trim() ? parseFloat(basePrice) : null,
    free_condition_type: freeConditionType ?? null,
    free_condition_value: freeConditionValue ?? null,
  });

  const displayTitle = formatCustomerDealTitle(title.trim()) || 'Your deal title';
  const subtitle = [restaurantName, restaurantCity].filter(Boolean).join(' · ');
  const services = serviceTags(dealTypes);
  const priceLabel = priceTagLabel(priceTag);

  return (
    <div className="rounded-brands border p-4" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-t3 mb-3">Live preview</p>

      <div
        className="relative rounded-[14px] px-4 py-4 min-h-[120px] flex flex-col justify-between"
        style={{ background: '#292524', border: `1px solid ${CARD_BORDER}` }}
      >
        <div>
          <span
            className="inline-block text-[10px] font-extrabold tracking-wide px-2.5 py-1 rounded-md text-white mb-3"
            style={{ background: PREVIEW_BLUE }}
          >
            {badge}
          </span>

          <div className="flex items-start justify-between gap-2">
            <p className="font-display text-[18px] font-extrabold leading-tight text-white">
              {displayTitle}
            </p>
            {priceTagText && (
              <span className="font-display text-[18px] font-extrabold leading-tight text-white flex-shrink-0">
                {priceTagText}
              </span>
            )}
          </div>

          {subtitle && (
            <p className="text-[13px] mt-1" style={{ color: '#A8A29E' }}>
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-end justify-between gap-2 mt-4">
          <div className="flex flex-wrap gap-1.5">
            {services.map((tag) => (
              <span
                key={tag}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#D6D3D1' }}
              >
                {tag}
              </span>
            ))}
            {priceLabel && (
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                style={{ background: 'rgba(18,73,169,0.25)', color: '#93C5FD' }}
              >
                {priceLabel}
              </span>
            )}
            {dietType === 'both' ? (
              <>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md" style={{ background: 'rgba(22,163,74,0.2)', color: '#86EFAC' }}>Veg</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md" style={{ background: 'rgba(220,38,38,0.2)', color: '#FCA5A5' }}>Non-Veg</span>
              </>
            ) : (
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                style={{
                  background: dietType === 'veg' ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)',
                  color: dietType === 'veg' ? '#86EFAC' : '#FCA5A5',
                }}
              >
                {dietType === 'veg' ? 'Veg' : 'Non-Veg'}
              </span>
            )}
          </div>

          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0 mb-1"
            style={{ background: isComing ? '#F59E0B' : '#22C55E' }}
            title={isComing ? 'Coming soon' : 'Active'}
          />
        </div>
      </div>

      <p className="text-[11px] text-t3 mt-2.5">
        This is how customers will see your deal in the app feed.
      </p>
    </div>
  );
}
