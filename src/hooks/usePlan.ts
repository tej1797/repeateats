'use client';

import { useState, useEffect } from 'react';
import { PLAN_LIMITS, PLAN_ACCENT, PLAN_LABEL, type PlanTier } from '@/lib/planConfig';

interface QuotaData {
  tier:          PlanTier;
  daily_used:    number;
  monthly_used:  number;
  daily_limit:   number;
  monthly_limit: number;
}

interface UsePlanResult extends QuotaData {
  accent:       string;
  planLabel:    string;
  loading:      boolean;
  error:        string | null;
  dailyHit:     boolean;
  monthlyHit:   boolean;
  // Call after a successful claim to optimistically decrement without a refetch
  optimisticClaim: () => void;
  refetch:      () => void;
}

const DEFAULT: QuotaData = {
  tier:         'free',
  daily_used:   0,
  monthly_used: 0,
  daily_limit:  PLAN_LIMITS.free.daily,
  monthly_limit: PLAN_LIMITS.free.monthly,
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
          tier:          (json.tier         as PlanTier) ?? 'free',
          daily_used:    json.daily_used    ?? 0,
          monthly_used:  json.monthly_used  ?? 0,
          daily_limit:   json.daily_limit   ?? PLAN_LIMITS.free.daily,
          monthly_limit: json.monthly_limit ?? PLAN_LIMITS.free.monthly,
        });
        setError(null);
      })
      .catch(() => { if (!cancelled) setError('Could not load plan info'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tick]);

  const optimisticClaim = () => {
    setData(prev => ({
      ...prev,
      daily_used:   prev.daily_used   + 1,
      monthly_used: prev.monthly_used + 1,
    }));
  };

  return {
    ...data,
    accent:      PLAN_ACCENT[data.tier],
    planLabel:   PLAN_LABEL[data.tier],
    loading,
    error,
    dailyHit:    data.daily_used   >= data.daily_limit,
    monthlyHit:  data.monthly_used >= data.monthly_limit,
    optimisticClaim,
    refetch:     () => setTick(t => t + 1),
  };
}
