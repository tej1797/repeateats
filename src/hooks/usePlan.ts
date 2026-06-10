'use client';

import { useState, useEffect } from 'react';
import { PLAN_ACCENT, PLAN_LABEL, type PlanTier } from '@/lib/planConfig';

interface QuotaData {
  tier:                      PlanTier;
  daily_used:                number;
  monthly_used:              number;
  daily_limit:               number;
  monthly_limit:             number;
  effective_daily_cap:       number;
  effective_monthly_cap:     number;
  points_balance:            number;
  bonus_daily_redemptions:   number;
  bonus_monthly_redemptions: number;
  tomorrow_unlock_active:    boolean;
  visit_window_minutes:      number;
  claim_lookahead_days:      number;
}

interface UsePlanResult extends QuotaData {
  accent:       string;
  planLabel:    string;
  loading:      boolean;
  error:        string | null;
  dailyHit:     boolean;
  monthlyHit:   boolean;
  refetch:      () => void;
}

const DEFAULT: QuotaData = {
  tier:                      'free',
  daily_used:                0,
  monthly_used:              0,
  daily_limit:               1,
  monthly_limit:             3,
  effective_daily_cap:       1,
  effective_monthly_cap:     3,
  points_balance:            0,
  bonus_daily_redemptions:   0,
  bonus_monthly_redemptions: 0,
  tomorrow_unlock_active:    false,
  visit_window_minutes:      45,
  claim_lookahead_days:      1,
};

export function usePlan(): UsePlanResult {
  const [data,    setData]    = useState<QuotaData>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [tick,    setTick]    = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/user/quota')
      .then(r => r.json())
      .then((json: Partial<QuotaData> & { error?: string }) => {
        if (cancelled) return;
        if (json.error) { setError(json.error); return; }
        setData({
          tier:                      (json.tier as PlanTier) ?? 'free',
          daily_used:                json.daily_used                ?? 0,
          monthly_used:              json.monthly_used              ?? 0,
          daily_limit:               json.daily_limit               ?? 1,
          monthly_limit:             json.monthly_limit             ?? 3,
          effective_daily_cap:       json.effective_daily_cap       ?? json.daily_limit ?? 1,
          effective_monthly_cap:     json.effective_monthly_cap     ?? json.monthly_limit ?? 3,
          points_balance:            json.points_balance            ?? 0,
          bonus_daily_redemptions:   json.bonus_daily_redemptions   ?? 0,
          bonus_monthly_redemptions: json.bonus_monthly_redemptions ?? 0,
          tomorrow_unlock_active:    json.tomorrow_unlock_active    ?? false,
          visit_window_minutes:      json.visit_window_minutes      ?? 45,
          claim_lookahead_days:      json.claim_lookahead_days      ?? 1,
        });
        setError(null);
      })
      .catch(() => { if (!cancelled) setError('Could not load plan info'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tick]);

  return {
    ...data,
    accent:     PLAN_ACCENT[data.tier],
    planLabel:  PLAN_LABEL[data.tier],
    loading,
    error,
    dailyHit:   data.daily_used   >= data.effective_daily_cap,
    monthlyHit: data.monthly_used >= data.effective_monthly_cap,
    refetch:    () => setTick(t => t + 1),
  };
}
