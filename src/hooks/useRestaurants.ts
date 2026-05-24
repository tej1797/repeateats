'use client';
// useRestaurants — fetch live restaurants from /api/restaurants

import { useState, useEffect, useCallback } from 'react';
import type { Restaurant } from '@/types/index';
import type { RestaurantsQuery } from '@/types/api';

interface UseRestaurantsResult {
  restaurants: Restaurant[];
  loading:     boolean;
  error:       string | null;
}

export function useRestaurants(filters: RestaurantsQuery = {}): UseRestaurantsResult {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (filters.city)      params.set('city',      filters.city);
    if (filters.radius_km) params.set('radius_km', String(filters.radius_km));

    try {
      const res  = await fetch(`/api/restaurants?${params.toString()}`);
      const json = await res.json() as { data?: Restaurant[]; error?: string };

      if (!res.ok || json.error) throw new Error(json.error ?? 'Failed to load restaurants');
      setRestaurants(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.city, filters.radius_km]);

  useEffect(() => { fetchRestaurants(); }, [fetchRestaurants]);

  return { restaurants, loading, error };
}
