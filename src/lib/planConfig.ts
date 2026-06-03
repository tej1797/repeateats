// Canonical plan limits — single source of truth for backend + frontend.
// Backend (claims route) already reads repeat_plus_tier from DB.
// Frontend uses this to show dynamic quota counters and accent colors.

export const PLAN_LIMITS = {
  free:    { daily: 1, monthly: 3  },
  starter: { daily: 3, monthly: 20 },
  pro:     { daily: 3, monthly: 30 },
} as const;

export type PlanTier = keyof typeof PLAN_LIMITS;

export const PLAN_ACCENT: Record<PlanTier, string> = {
  free:    '#FF7A00', // orange (default)
  starter: '#3B82F6', // blue
  pro:     '#D4AF37', // gold
};

export const PLAN_LABEL: Record<PlanTier, string> = {
  free:    'Free',
  starter: 'Starter',
  pro:     'Pro',
};

export function getPlanLimits(tier: PlanTier) {
  return PLAN_LIMITS[tier] ?? PLAN_LIMITS.free;
}
