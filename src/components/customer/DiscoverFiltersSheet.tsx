'use client';

import { useEffect, useState } from 'react';
import {
  IconCalendar, IconStar, IconTag, IconWallet, IconSortAscending,
} from '@tabler/icons-react';
import { CUSTOMER_UI } from '@/lib/customerUI';
import { SORT_OPTIONS, type SortBy } from '@/lib/discoverFilters';
import { DEAL_FILTERS } from '@/lib/constants';
import type { DealFilterId } from '@/lib/constants';
import DayTabStrip, { type DayTabItem } from '@/components/customer/DayTabStrip';

type FilterSection = 'sort' | 'day' | 'rating' | 'offers' | 'price';

interface DiscoverFiltersSheetProps {
  open:          boolean;
  onClose:       () => void;
  sortBy:        SortBy;
  onSortBy:      (s: SortBy) => void;
  dayTabs:       DayTabItem[];
  activeDay:     string;
  onDaySelect:   (key: string) => void;
  minRating:     number | null;
  onMinRating:   (r: number | null) => void;
  offerType:     DealFilterId;
  onOfferType:   (t: DealFilterId) => void;
  priceFilter:   'all' | 'under10';
  onPriceFilter: (p: 'all' | 'under10') => void;
  onApply:       () => void;
  onClear:       () => void;
}

const SECTIONS: { id: FilterSection; label: string; icon: React.ReactNode }[] = [
  { id: 'sort',   label: 'Sort By',    icon: <IconSortAscending size={16} /> },
  { id: 'day',    label: 'Day',        icon: <IconCalendar size={16} /> },
  { id: 'rating', label: 'Rating',     icon: <IconStar size={16} /> },
  { id: 'offers', label: 'Offers',     icon: <IconTag size={16} /> },
  { id: 'price',  label: 'Dish Price', icon: <IconWallet size={16} /> },
];

const RATING_OPTIONS = [
  { value: null, label: 'Any rating' },
  { value: 3,    label: '3.0+ stars' },
  { value: 3.5,  label: '3.5+ stars' },
  { value: 4,    label: '4.0+ stars' },
  { value: 4.5,  label: '4.5+ stars' },
];

export default function DiscoverFiltersSheet({
  open,
  onClose,
  sortBy,
  onSortBy,
  dayTabs,
  activeDay,
  onDaySelect,
  minRating,
  onMinRating,
  offerType,
  onOfferType,
  priceFilter,
  onPriceFilter,
  onApply,
  onClear,
}: DiscoverFiltersSheetProps) {
  const [section, setSection] = useState<FilterSection>('sort');

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-lg max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ background: CUSTOMER_UI.bgElevated, border: `1px solid ${CUSTOMER_UI.glassBorder}` }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: CUSTOMER_UI.glassBorder }}>
          <h2 className="text-[16px] font-bold" style={{ color: CUSTOMER_UI.textPrimary }}>
            Filters and sorting
          </h2>
          <button type="button" onClick={onClear} className="text-[13px] font-semibold" style={{ color: CUSTOMER_UI.accent }}>
            Clear All
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div className="w-[130px] flex-shrink-0 border-r overflow-y-auto scrollbar-none" style={{ borderColor: CUSTOMER_UI.glassBorder }}>
            {SECTIONS.map(s => {
              const active = section === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSection(s.id)}
                  className="w-full flex items-center gap-2 px-3 py-3 text-left text-[12px] font-semibold transition-colors"
                  style={{
                    color: active ? '#22C55E' : CUSTOMER_UI.textSecondary,
                    borderLeft: active ? '3px solid #22C55E' : '3px solid transparent',
                    background: active ? 'rgba(34,197,94,0.08)' : 'transparent',
                  }}
                >
                  {s.icon}
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Options panel */}
          <div className="flex-1 overflow-y-auto scrollbar-none p-4">
            {section === 'sort' && (
              <div className="space-y-2">
                {SORT_OPTIONS.map(opt => (
                  <label key={opt.id} className="flex items-center gap-2.5 cursor-pointer py-1">
                    <input
                      type="radio"
                      name="sort"
                      checked={sortBy === opt.id}
                      onChange={() => onSortBy(opt.id)}
                      className="accent-[#22C55E]"
                    />
                    <span className="text-[13px]" style={{ color: CUSTOMER_UI.textPrimary }}>{opt.label}</span>
                  </label>
                ))}
              </div>
            )}

            {section === 'day' && (
              <DayTabStrip
                tabs={dayTabs}
                activeKey={activeDay}
                onSelect={onDaySelect}
                showRestaurants={false}
              />
            )}

            {section === 'rating' && (
              <div className="space-y-2">
                {RATING_OPTIONS.map(opt => (
                  <label key={String(opt.value)} className="flex items-center gap-2.5 cursor-pointer py-1">
                    <input
                      type="radio"
                      name="rating"
                      checked={minRating === opt.value}
                      onChange={() => onMinRating(opt.value)}
                      className="accent-[#22C55E]"
                    />
                    <span className="text-[13px]" style={{ color: CUSTOMER_UI.textPrimary }}>{opt.label}</span>
                  </label>
                ))}
              </div>
            )}

            {section === 'offers' && (
              <div className="space-y-2">
                {DEAL_FILTERS.map(opt => (
                  <label key={opt.id} className="flex items-center gap-2.5 cursor-pointer py-1">
                    <input
                      type="radio"
                      name="offers"
                      checked={offerType === opt.id}
                      onChange={() => onOfferType(opt.id)}
                      className="accent-[#22C55E]"
                    />
                    <span className="text-[13px]" style={{ color: CUSTOMER_UI.textPrimary }}>
                      {opt.icon ? `${opt.icon} ` : ''}{opt.label}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {section === 'price' && (
              <div className="space-y-2">
                {[
                  { id: 'all' as const, label: 'Any price' },
                  { id: 'under10' as const, label: 'Under CA$10' },
                ].map(opt => (
                  <label key={opt.id} className="flex items-center gap-2.5 cursor-pointer py-1">
                    <input
                      type="radio"
                      name="price"
                      checked={priceFilter === opt.id}
                      onChange={() => onPriceFilter(opt.id)}
                      className="accent-[#22C55E]"
                    />
                    <span className="text-[13px]" style={{ color: CUSTOMER_UI.textPrimary }}>{opt.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 px-4 py-3 border-t" style={{ borderColor: CUSTOMER_UI.glassBorder }}>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl text-[14px] font-semibold"
            style={{ background: CUSTOMER_UI.glassBg, color: CUSTOMER_UI.textSecondary, border: `1px solid ${CUSTOMER_UI.glassBorder}` }}
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => { onApply(); onClose(); }}
            className="flex-[2] h-11 rounded-xl text-[14px] font-bold text-white"
            style={{ background: CUSTOMER_UI.accent }}
          >
            Show results
          </button>
        </div>
      </div>
    </div>
  );
}
