import crypto from 'crypto';

/**
 * Canonical restaurant PIN hash — SHA-256 of pin + restaurantId, lowercase hex.
 * Shared by the set + verify API routes so web and mobile produce identical
 * hashes (matches the legacy client-side scheme already stored on existing rows).
 */
export function hashPin(pin: string, restaurantId: string): string {
  return crypto.createHash('sha256').update(pin + restaurantId).digest('hex');
}
