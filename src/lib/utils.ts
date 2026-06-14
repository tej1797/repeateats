export function formatCurrency(cents: number): string {
  return '$' + (cents / 100).toFixed(2)
}

// Normalises discount_value for display — fixes "20$" → "$20"
export function formatDiscountValue(value: string | null | undefined): string {
  if (!value) return '—';
  // Pattern: digits (with optional decimal) followed by a trailing $
  return value.replace(/^(\d+(?:\.\d+)?)\$$/, '$$$1');
}

function titleCaseWords(text: string): string {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Title-case deal names for display (e.g. "ice gola" → "Ice Gola", preserves trailing *). */
export function formatDealTitle(title: string | null | undefined): string {
  if (!title) return '';
  const stars = title.match(/\*+$/)?.[0] ?? '';
  const base = stars ? title.slice(0, -stars.length).trimEnd() : title.trim();
  if (!base) return stars;
  return titleCaseWords(base) + stars;
}

/** Customer-facing title — strips restaurant duplicate marker (*) so diners see "Ice Gola" not "Ice Gola*". */
export function formatCustomerDealTitle(title: string | null | undefined): string {
  if (!title) return '';
  const base = title.replace(/\*+$/, '').trimEnd();
  if (!base) return '';
  return titleCaseWords(base);
}

export function formatRating(rating: number): string {
  return rating.toFixed(1)
}

/** Prefer Google Places rating when the legacy rating column is unset. */
export function getRestaurantRating(
  restaurant?: { rating?: number | null; google_rating?: number | null } | null,
): number {
  if (!restaurant) return 0;
  return restaurant.google_rating ?? restaurant.rating ?? 0;
}

export function getRestaurantReviewCount(
  restaurant?: { review_count?: number | null; google_review_count?: number | null } | null,
): number {
  if (!restaurant) return 0;
  return restaurant.google_review_count ?? restaurant.review_count ?? 0;
}

export function getPortalFromPath(path: string): string {
  if (path.startsWith('/restaurant')) return 'restaurant'
  if (path.startsWith('/influencer')) return 'influencer'
  return 'customer'
}

export function generateQRCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'RE-'
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/** Mobile parity — e.g. "Jun 14 at 1:12 AM" */
export function formatRedeemedAt(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${date} at ${time}`;
}
