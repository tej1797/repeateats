'use client';
// useDeals — fetch and filter deals from /api/deals
// Used in the Customer feed to display deal cards.

import { useState, useEffect, useCallback } from 'react';
import type { DealWithRestaurant } from '@/types/index';
import type { DealsQuery } from '@/types/api';

interface UseDealsResult {
  deals:   DealWithRestaurant[];
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

export function useDeals(filters: DealsQuery = {}): UseDealsResult {
  const [deals,   setDeals]   = useState<DealWithRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Build URL search params from the filters object
    // (only include keys that have a value)
    const params = new URLSearchParams();
    if (filters.city)          params.set('city',          filters.city);
    if (filters.category)      params.set('category',      filters.category);
    if (filters.type)          params.set('type',           filters.type);
    if (filters.tab)           params.set('tab',            filters.tab);
    if (filters.restaurant_id) params.set('restaurant_id', filters.restaurant_id);

    try {
      const res = await fetch(`/api/deals?${params.toString()}`);

      // Check status before parsing — a non-200 may return HTML (not JSON)
      if (!res.ok) {
        let msg = `Failed to load deals (${res.status})`;
        try {
          const body = await res.json() as { error?: string };
          if (body.error) msg = body.error;
        } catch { /* response was not JSON */ }
        throw new Error(msg);
      }

      const json = await res.json() as { data?: DealWithRestaurant[]; error?: string };
      if (json.error) throw new Error(json.error);

      setDeals(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.city,
    filters.category,
    filters.type,
    filters.tab,
    filters.restaurant_id,
  ]);

  // Re-run whenever filters change
  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  return { deals, loading, error, refetch: fetchDeals };
}
