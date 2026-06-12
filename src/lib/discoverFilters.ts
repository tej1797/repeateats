import type { DealWithRestaurant } from '@/types/index';
import { getRestaurantRating } from '@/lib/utils';

export type SortBy = 'relevance' | 'distance' | 'rating' | 'trending';
export type PriceFilter = 'all' | 'under10';
export type ServiceMode = 'all' | 'dine-in' | 'pickup';

export const SORT_OPTIONS: { id: SortBy; label: string }[] = [
  { id: 'relevance', label: 'Relevance' },
  { id: 'distance',  label: 'Distance: Low to High' },
  { id: 'rating',    label: 'Rating: High to Low' },
  { id: 'trending',  label: 'Trending: Most claimed' },
];

export const QUICK_DEAL_FILTERS = [
  { id: 'all',        label: 'All' },
  { id: 'bogo',       label: 'BOGO',       icon: '🔥' },
  { id: 'percentage', label: '% Off' },
  { id: 'under6',     label: 'Under CA$6' },
  { id: 'under10',    label: 'Under CA$10' },
] as const;

export type QuickDealFilterId = typeof QUICK_DEAL_FILTERS[number]['id'];

function parsePriceCents(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = value.match(/\$?\s*([\d.]+)/);
  return m ? Math.round(parseFloat(m[1]) * 100) : null;
}

export function applyDealTypeFilter(deals: DealWithRestaurant[], dealType: string): DealWithRestaurant[] {
  if (dealType === 'all') return deals;
  if (dealType === 'bogo') {
    return deals.filter(d => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dt = (d as any).discount_type as string | null;
      const t = d.title.toLowerCase();
      return dt === 'bogo' || (t.includes('buy') && t.includes('get'));
    });
  }
  if (dealType === 'percentage') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return deals.filter(d => (d as any).discount_type === 'percentage');
  }
  if (dealType === 'under10' || dealType === 'under6') {
    const cap = dealType === 'under6' ? 600 : 1000;
    return deals.filter(d => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dt = (d as any).discount_type as string | null;
      const cents = parsePriceCents(d.discount_value);
      if (cents !== null) return cents <= cap;
      return dt === 'set_price' || dt === 'fixed';
    });
  }
  if (dealType === 'free') {
    return deals.filter(d => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dt = (d as any).discount_type as string | null;
      return dt === 'free_item' || dt === 'free' || d.title.toLowerCase().includes('free');
    });
  }
  if (dealType === 'combo') {
    return deals.filter(d => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dt = (d as any).discount_type as string | null;
      return dt === 'combo' || d.title.toLowerCase().includes('combo');
    });
  }
  if (dealType === 'happy_hour') {
    return deals.filter(d => (d.title + ' ' + (d.description ?? '')).toLowerCase().includes('happy hour'));
  }
  if (dealType === 'dine-in' || dealType === 'pickup') {
    return deals.filter(d => d.deal_types?.includes(dealType));
  }
  return deals;
}

export function applyServiceMode(deals: DealWithRestaurant[], mode: ServiceMode): DealWithRestaurant[] {
  if (mode === 'all') return deals;
  return deals.filter(d => d.deal_types?.includes(mode));
}

export function applyRatingFilter(deals: DealWithRestaurant[], minRating: number | null): DealWithRestaurant[] {
  if (!minRating) return deals;
  return deals.filter(d => getRestaurantRating(d.restaurant) >= minRating);
}

export function sortDeals(deals: DealWithRestaurant[], sortBy: SortBy): DealWithRestaurant[] {
  const copy = [...deals];
  if (sortBy === 'trending') return copy.sort((a, b) => b.current_claims - a.current_claims);
  if (sortBy === 'rating') {
    return copy.sort((a, b) => getRestaurantRating(b.restaurant) - getRestaurantRating(a.restaurant));
  }
  if (sortBy === 'distance') {
    return copy.sort((a, b) => (a.restaurant?.city ?? '').localeCompare(b.restaurant?.city ?? ''));
  }
  return copy;
}
