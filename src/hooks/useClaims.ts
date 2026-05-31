'use client';
// useClaims — claim a deal and retrieve the generated QR code

import { useState } from 'react';
import type { Claim, ClaimWithDeal } from '@/types/index';

interface ClaimResult {
  qr_code: string;
  alreadyClaimed?: boolean;
}

interface UseClaimsResult {
  claimDeal:   (dealId: string) => Promise<ClaimResult | null>;
  fetchClaims: () => Promise<ClaimWithDeal[]>;
  loading:     boolean;
  error:       string | null;
}

export function useClaims(): UseClaimsResult {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const claimDeal = async (dealId: string): Promise<ClaimResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const res  = await fetch('/api/claims', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ deal_id: dealId }),
      });
      const json = await res.json() as {
        data?: Claim & { qr_code: string };
        error?: string;
        alreadyClaimed?: boolean;
      };

      // 409 already-redeemed is a real block — surface the message
      if (res.status === 409) {
        throw new Error(json.error ?? 'Cannot claim this deal');
      }

      if (!res.ok && !json.alreadyClaimed) {
        throw new Error(json.error ?? 'Failed to claim deal');
      }

      const qrCode = json.data?.qr_code;
      if (!qrCode) return null;

      return { qr_code: qrCode, alreadyClaimed: json.alreadyClaimed };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  };

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
