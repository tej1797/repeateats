export function formatCurrency(cents: number): string {
  return '$' + (cents / 100).toFixed(2)
}

// Normalises discount_value for display — fixes "20$" → "$20"
export function formatDiscountValue(value: string | null | undefined): string {
  if (!value) return '—';
  // Pattern: digits (with optional decimal) followed by a trailing $
  return value.replace(/^(\d+(?:\.\d+)?)\$$/, '$$$1');
}

/** Title-case deal names for display (e.g. "ice gola" → "Ice Gola", preserves trailing *). */
export function formatDealTitle(title: string | null | undefined): string {
  if (!title) return '';
  const stars = title.match(/\*+$/)?.[0] ?? '';
  const base = stars ? title.slice(0, -stars.length).trimEnd() : title.trim();
  if (!base) return stars;
  const formatted = base
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  return formatted + stars;
}

export function formatRating(rating: number): string {
  return rating.toFixed(1)
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
