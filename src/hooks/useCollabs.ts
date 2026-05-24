'use client';
// useCollabs — fetch collab opportunities from /api/collabs

import { useState, useEffect, useCallback } from 'react';
import type { CollabWithDetails } from '@/types/index';
import type { CollabsQuery } from '@/types/api';

interface UseCollabsResult {
  collabs:  CollabWithDetails[];
  loading:  boolean;
  error:    string | null;
  refetch:  () => void;
}

export function useCollabs(filters: CollabsQuery = {}): UseCollabsResult {
  const [collabs,  setCollabs]  = useState<CollabWithDetails[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const fetchCollabs = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (filters.status)  params.set('status',  filters.status);
    if (filters.cuisine) params.set('cuisine', filters.cuisine);
    if (filters.city)    params.set('city',    filters.city);
    if (filters.tag)     params.set('tag',     filters.tag);

    try {
      const res  = await fetch(`/api/collabs?${params.toString()}`);
      const json = await res.json() as { data?: CollabWithDetails[]; error?: string };

      if (!res.ok || json.error) throw new Error(json.error ?? 'Failed to load collabs');
      setCollabs(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.cuisine, filters.city, filters.tag]);

  useEffect(() => { fetchCollabs(); }, [fetchCollabs]);

  return { collabs, loading, error, refetch: fetchCollabs };
}
