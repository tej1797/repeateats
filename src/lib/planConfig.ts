// Canonical plan limits — re-exports tierLimits for backwards compat.
import { CUSTOMER_UI, METALLIC_GOLD, METALLIC_SILVER } from './customerUI';
import { getTierLimits, effectiveDailyCap, effectiveMonthlyCap, type CustomerTier } from './tierLimits';

export type PlanTier = CustomerTier;

export const PLAN_LIMITS = {
  free:    { daily: 1, monthly: 3  },
  starter: { daily: 3, monthly: 20 },
  pro:     { daily: 3, monthly: 30 },
  yearly:  { daily: 3, monthly: 30 },
} as const;

export const PLAN_ACCENT: Record<PlanTier, string> = {
  free:    CUSTOMER_UI.accent,
  starter: METALLIC_SILVER.base,
  pro:     METALLIC_GOLD.base,
  yearly:  METALLIC_GOLD.base,
};

export const PLAN_LABEL: Record<PlanTier, string> = {
  free:    'Free',
  starter: 'Starter',
  pro:     'Pro',
  yearly:  'Pro',
};

export function getPlanLimits(tier: string) {
  const limits = getTierLimits(tier);
  return {
    daily:   limits.dailyRedemptions,
    monthly: limits.monthlyRedemptions,
  };
}

export { effectiveDailyCap, effectiveMonthlyCap, getTierLimits };
