'use client';
// useClaims — claim a deal and retrieve the generated QR code

import { useState } from 'react';
import type { Claim, ClaimWithDeal } from '@/types/index';

interface ClaimResult {
  qr_code:         string;
  claim_id?:       string;
  status?:         string;
  expires_at?:     string | null;
  timer_starts_at?: string | null;
  alreadyClaimed?: boolean;
}

interface ClaimFailure {
  error:        string;
  limitReached?: boolean;
}

type ClaimOutcome = ClaimResult | ClaimFailure;

interface ClaimOpts {
  claim_for_date?:  string;
  timer_starts_at?: string;
}

interface UseClaimsResult {
  claimDeal:   (dealId: string, opts?: ClaimOpts) => Promise<ClaimOutcome | null>;
  fetchClaims: () => Promise<ClaimWithDeal[]>;
  loading:     boolean;
  error:       string | null;
}

// Map edge-function error codes to friendly, actionable copy.
const CLAIM_ERROR_COPY: Record<string, string> = {
  already_redeemed:         "You've already redeemed this deal.",
  deal_not_available:       "This deal isn't running today. Upgrade to RepEAT+ to claim deals up to 7 days ahead.",
  'deal not claimable':     'This deal is not currently claimable.',
  'deal sold out':          'This deal is fully claimed.',
  'deal not found':         'This deal could not be found.',
  daily_redemption_limit:   "You've hit your daily redemption limit. Upgrade for more.",
  monthly_redemption_limit: "You've hit your monthly redemption limit. Upgrade for more.",
};

export function friendlyClaimError(code: string | undefined): string {
  if (!code) return 'Could not claim this deal. Please try again.';
  return CLAIM_ERROR_COPY[code] ?? code;
}

export function useClaims(): UseClaimsResult {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const claimDeal = async (
    dealId: string,
    opts?: ClaimOpts,
  ): Promise<ClaimOutcome | null> => {
    setLoading(true);
    setError(null);

    try {
      const res  = await fetch('/api/claims', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          deal_id:         dealId,
          claim_for_date:  opts?.claim_for_date,
          timer_starts_at: opts?.timer_starts_at,
        }),
      });
      const json = await res.json() as {
        data?: Claim & { qr_code: string; claim_id?: string; status?: string; expires_at?: string | null; timer_starts_at?: string | null };
        error?: string;
        limitReached?: boolean;
        alreadyClaimed?: boolean;
      };

      // Real rejection — surface a friendly message instead of swallowing it.
      if (!res.ok && !json.alreadyClaimed) {
        const message = friendlyClaimError(json.error);
        setError(message);
        return { error: message, limitReached: json.limitReached };
      }

      const qrCode = json.data?.qr_code;
      if (!qrCode) {
        const message = friendlyClaimError(json.error);
        setError(message);
        return { error: message };
      }

      return {
        qr_code:         qrCode,
        claim_id:        json.data?.claim_id,
        status:          json.data?.status,
        expires_at:      json.data?.expires_at ?? null,
        timer_starts_at: json.data?.timer_starts_at ?? null,
        alreadyClaimed:  json.alreadyClaimed,
      };
    } catch {
      const message = 'Network error — please try again.';
      setError(message);
      return { error: message };
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
