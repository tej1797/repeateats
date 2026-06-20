// Restaurant subscription ladder — single source of truth for the plans page,
// tier gating, and limits. Mirrors docs/restaurant-plans.md. Keep in sync with mobile.

export type RestaurantTier = 'free' | 'starter' | 'pro' | 'trial';
export type BillingMode = 'flat' | 'usage';
export type BillingCycle = 'monthly' | 'yearly';

export interface RestaurantPlanLimits {
  /** Max active deals. null = unlimited. */
  activeDeals: number | null;
  /** Monthly scanner-verified redemption cap. null = unlimited (paid). */
  redemptionCap: number | null;
  /** Creator collab access. */
  collabs: 'none' | 'view' | 'yes' | 'unlimited';
  /** Analytics depth. */
  analytics: 'stat' | 'basic' | 'full';
  dinerInsights: boolean;
  scheduling: boolean;
  discover: 'standard' | 'improved' | 'priority';
}

// Trial = full Pro access.
export const RESTAURANT_LIMITS: Record<RestaurantTier, RestaurantPlanLimits> = {
  free:    { activeDeals: 4,    redemptionCap: 60,   collabs: 'view',      analytics: 'stat',  dinerInsights: false, scheduling: false, discover: 'standard' },
  starter: { activeDeals: 8,    redemptionCap: null, collabs: 'yes',       analytics: 'basic', dinerInsights: false, scheduling: true,  discover: 'improved' },
  pro:     { activeDeals: null, redemptionCap: null, collabs: 'unlimited', analytics: 'full',  dinerInsights: true,  scheduling: true,  discover: 'priority' },
  trial:   { activeDeals: null, redemptionCap: null, collabs: 'unlimited', analytics: 'full',  dinerInsights: true,  scheduling: true,  discover: 'priority' },
};

export function limitsForTier(tier: string | null | undefined): RestaurantPlanLimits {
  return RESTAURANT_LIMITS[(tier as RestaurantTier) ?? 'free'] ?? RESTAURANT_LIMITS.free;
}

// ── Pricing (CA$) ──────────────────────────────────────────────────────────
// Flat = unlimited redemptions. Usage = lower base + 60 free then 5¢ each.
// Yearly = 20% off the monthly rate (shown as the per-month equivalent).
export interface PlanPrice { flatMonthly: number; usageMonthly: number }
export const RESTAURANT_PRICES: Record<'starter' | 'pro', PlanPrice> = {
  starter: { flatMonthly: 49, usageMonthly: 34 },
  pro:     { flatMonthly: 99, usageMonthly: 84 },
};

export const USAGE_FREE_REDEMPTIONS = 60;
export const USAGE_OVERAGE_CENTS = 5; // per redemption past the free bucket
export const TRIAL_DAYS = 90;
export const YEARLY_DISCOUNT = 0.2;

/** Per-month price for a plan given billing mode + cycle (yearly = 20% off). */
export function planMonthlyPrice(plan: 'starter' | 'pro', mode: BillingMode, cycle: BillingCycle): number {
  const base = mode === 'flat' ? RESTAURANT_PRICES[plan].flatMonthly : RESTAURANT_PRICES[plan].usageMonthly;
  return cycle === 'yearly' ? Math.round(base * (1 - YEARLY_DISCOUNT)) : base;
}

export const PLAN_FEATURES: Record<'free' | 'starter' | 'pro', string[]> = {
  free: [
    '4 active deals',
    '60 redemptions / month',
    'Standard Discover placement',
    'Browse creator collabs (view-only)',
  ],
  starter: [
    'Up to 8 active deals',
    'Improved Discover placement',
    'Creator collabs',
    'Basic analytics',
  ],
  pro: [
    'Unlimited active deals',
    'Priority Discover + featured slot',
    'Unlimited creator collabs',
    'Full analytics + integrity dashboard',
    'RepEAT+ diner insights',
  ],
};
