'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  isRewardVisible,
  sortedRewards,
  type PointsReward,
  type RewardKey,
} from '@/lib/customerPoints';

interface UseCustomerPointsResult {
  balance:        number;
  rewards:        PointsReward[];
  loading:        boolean;
  redeeming:      RewardKey | null;
  error:          string | null;
  redeemReward:   (key: RewardKey) => Promise<boolean>;
  refetch:        () => void;
}

export function useCustomerPoints(effectiveTier = 'free'): UseCustomerPointsResult {
  const [balance,   setBalance]   = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [redeeming, setRedeeming] = useState<RewardKey | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const [tick,      setTick]      = useState(0);

  const rewards = sortedRewards().filter(r => isRewardVisible(r, effectiveTier));

  const fetchBalance = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setBalance(0); return; }

      const { data } = await supabase
        .from('customer_points')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      setBalance(data?.balance ?? 0);
      setError(null);
    } catch {
      setError('Could not load points');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchBalance(); }, [fetchBalance, tick]);

  const redeemReward = async (key: RewardKey): Promise<boolean> => {
    setRedeeming(key);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc('customer_redeem_points_reward', {
        p_reward_key: key,
      });

      if (rpcError) {
        setError(rpcError.message);
        return false;
      }

      const result = data as { ok?: boolean; error?: string; balance?: number };
      if (!result.ok) {
        setError(result.error ?? 'Could not redeem reward');
        return false;
      }

      if (typeof result.balance === 'number') setBalance(result.balance);
      setTick(t => t + 1);
      return true;
    } catch {
      setError('Network error');
      return false;
    } finally {
      setRedeeming(null);
    }
  };

  return {
    balance,
    rewards,
    loading,
    redeeming,
    error,
    redeemReward,
    refetch: () => setTick(t => t + 1),
  };
}
