'use client';

import { usePlan } from './usePlan';

/** Redemption caps + bonus slots — wraps usePlan for mobile parity. */
export function useClaimLimits() {
  const plan = usePlan();

  return {
    tier:                  plan.tier,
    dailyUsed:             plan.daily_used,
    monthlyUsed:           plan.monthly_used,
    dailyLimit:            plan.daily_limit,
    monthlyLimit:          plan.monthly_limit,
    effectiveDailyCap:     plan.effective_daily_cap,
    effectiveMonthlyCap:   plan.effective_monthly_cap,
    bonusDaily:            plan.bonus_daily_redemptions,
    bonusMonthly:          plan.bonus_monthly_redemptions,
    tomorrowUnlockActive:  plan.tomorrow_unlock_active,
    visitWindowMinutes:    plan.visit_window_minutes,
    claimLookaheadDays:    plan.claim_lookahead_days,
    pointsBalance:         plan.points_balance,
    loading:               plan.loading,
    dailyHit:              plan.dailyHit,
    monthlyHit:            plan.monthlyHit,
    refetch:               plan.refetch,
  };
}
