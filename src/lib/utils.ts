export function formatCurrency(cents: number): string {
  return '$' + (cents / 100).toFixed(2)
}

// Normalises discount_value for display — fixes "20$" → "$20"
export function formatDiscountValue(value: string | null | undefined): string {
  if (!value) return '—';
  // Pattern: digits (with optional decimal) followed by a trailing $
  return value.replace(/^(\d+(?:\.\d+)?)\$$/, '$$$1');
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
