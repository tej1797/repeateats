// Customer tier limits — must match mobile src/lib/tierLimits.ts + claim-deal edge function.

export type CustomerTier = 'free' | 'starter' | 'pro' | 'yearly';

export interface TierLimits {
  dailyRedemptions:   number;
  monthlyRedemptions: number;
  claimLookaheadDays: number;
  visitWindowMinutes: number;
}

export const TIER_LIMITS: Record<CustomerTier, TierLimits> = {
  free:    { dailyRedemptions: 1,  monthlyRedemptions: 3,  claimLookaheadDays: 1, visitWindowMinutes: 45  },
  starter: { dailyRedemptions: 3,  monthlyRedemptions: 20, claimLookaheadDays: 2, visitWindowMinutes: 120 },
  pro:     { dailyRedemptions: 3,  monthlyRedemptions: 30, claimLookaheadDays: 7, visitWindowMinutes: 180 },
  yearly:  { dailyRedemptions: 3,  monthlyRedemptions: 30, claimLookaheadDays: 7, visitWindowMinutes: 180 },
};

export function getTierLimits(tier: string | null | undefined): TierLimits {
  const key = (tier ?? 'free') as CustomerTier;
  return TIER_LIMITS[key] ?? TIER_LIMITS.free;
}

/** Effective daily cap = tier daily + bonus slots from points rewards. */
export function effectiveDailyCap(tier: string, bonusDaily = 0): number {
  return getTierLimits(tier).dailyRedemptions + bonusDaily;
}

/** Effective monthly cap = tier monthly + bonus slots from points rewards. */
export function effectiveMonthlyCap(tier: string, bonusMonthly = 0): number {
  return getTierLimits(tier).monthlyRedemptions + bonusMonthly;
}

/** Browse window is always 7 days for everyone; claim window varies by tier. */
export const BROWSE_DAYS = 7;
