'use client';
// useClaims — claim a deal and retrieve the generated QR code
// Also lets you fetch all past claims for the current user.

import { useState } from 'react';
import type { Claim, ClaimWithDeal } from '@/types/index';

interface UseClaimsResult {
  // Call this to claim a deal — returns the QR code string on success
  claimDeal:   (dealId: string) => Promise<string | null>;
  // All past claims for the current user
  fetchClaims: () => Promise<ClaimWithDeal[]>;
  loading:     boolean;
  error:       string | null;
}

export function useClaims(): UseClaimsResult {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // POST /api/claims — returns the QR code or null on failure
  const claimDeal = async (dealId: string): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      const res  = await fetch('/api/claims', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ deal_id: dealId }),
      });
      const json = await res.json() as { data?: Claim; error?: string };

      if (!res.ok || json.error) throw new Error(json.error ?? 'Failed to claim deal');
      return json.data?.qr_code ?? null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // GET /api/claims — all claims for current user
  const fetchClaims = async (): Promise<ClaimWithDeal[]> => {
    setLoading(true);
    setError(null);

    try {
      const res  = await fetch('/api/claims');
      const json = await res.json() as { data?: ClaimWithDeal[]; error?: string };

      if (!res.ok || json.error) throw new Error(json.error ?? 'Failed to load claims');
      return json.data ?? [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    } finally {
      setLoading(false);
    }
  };

  return { claimDeal, fetchClaims, loading, error };
}
