/** Shared deal-form options for restaurant portal (CreateDealModal + onboarding DealEditor). */

export type PriceTag = 'under6' | 'under12' | null;

export const PRICE_TAG_OPTIONS: { id: PriceTag; label: string }[] = [
  { id: null,     label: 'None' },
  { id: 'under6',  label: '$6 & under' },
  { id: 'under12', label: '$12 & under' },
];

export type RestaurantDiscountType =
  | 'percentage'
  | 'fixed'
  | 'dollar'
  | 'free_item'
  | 'bogo'
  | 'bogo_half'
  | 'bogo_lb'
  | 'set_price'
  | 'free_delivery'
  | 'other';

export const DISCOUNT_TYPE_OPTIONS: { value: RestaurantDiscountType; label: string }[] = [
  { value: 'percentage',  label: 'Percentage off' },
  { value: 'dollar',      label: 'Dollar off' },
  { value: 'set_price',   label: 'Set price (e.g. $12 special)' },
  { value: 'free_item',   label: 'Free item' },
  { value: 'bogo',        label: 'BOGO (Buy 1 Get 1 Free)' },
  { value: 'bogo_half',   label: 'Buy 1 Get 1 50% Off' },
  { value: 'bogo_lb',     label: 'Buy by weight (lb)' },
  { value: 'other',       label: 'Other' },
];

export function normalizeDiscountType(type: string): RestaurantDiscountType {
  if (type === 'fixed') return 'dollar';
  return type as RestaurantDiscountType;
}

/** Map modal/onboarding values to DB discount_type column. */
export function toDbDiscountType(type: RestaurantDiscountType): string {
  if (type === 'dollar') return 'fixed';
  return type;
}

export function isLbDiscount(type: string): boolean {
  return type === 'bogo_lb';
}

export function discountValuePlaceholder(type: string): string {
  switch (type) {
    case 'percentage':  return '20%';
    case 'dollar':
    case 'fixed':       return '$5 off';
    case 'set_price':   return '$12';
    case 'free_item':   return 'Free appetizer';
    case 'bogo':        return 'Buy 1 Get 1 Free';
    case 'bogo_half':   return '50% off 2nd item';
    case 'bogo_lb':     return '50% off 2nd lb';
    case 'free_delivery': return 'Free delivery';
    default:            return 'Describe the deal';
  }
}

export function defaultDiscountValue(type: string): string {
  switch (type) {
    case 'bogo':        return 'Buy 1 Get 1 Free';
    case 'bogo_half':   return '50% off 2nd item';
    case 'bogo_lb':     return '50% off 2nd lb';
    default:            return '';
  }
}

export function discountValueRequired(type: string): boolean {
  return type !== 'bogo_half' && type !== 'bogo';
}

export function formatLbDealTitle(item: string, lbQty = '1'): string {
  const trimmed = item.trim();
  if (!trimmed) return 'Buy 1 lb — get 50% off 2nd lb';
  return `Buy ${lbQty} lb ${trimmed} — get 50% off 2nd lb`;
}

export function formatBogoHalfTitle(item?: string): string {
  const trimmed = item?.trim();
  if (!trimmed) return 'Buy 1 Get 1 50% Off';
  return `Buy 1 ${trimmed} — Get 1 50% Off 2nd`;
}
