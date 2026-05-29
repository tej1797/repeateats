export function formatCurrency(cents: number): string {
  return '$' + (cents / 100).toFixed(2)
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
