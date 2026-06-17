// POST /api/claims/redeem
// Restaurant staff — proxies to claim-deal edge function for atomic redeem + points + metering.

import { createClient } from '@/lib/supabase/server';
import { getAccessToken, invokeClaimDeal } from '@/lib/claimDeal';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const body = await req.json() as Record<string, unknown>;
    const raw  = (body.qr_token ?? body.qr_code ?? body.token ?? '') as string;
    const scannedToken = raw.trim().toUpperCase()
      .replace(/\s+/g, '')
      .replace(/[^A-Z0-9-]/g, '');

    if (!scannedToken) {
      return NextResponse.json({ error: 'Missing QR token' }, { status: 400 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Sign in to the restaurant portal.' },
        { status: 401 },
      );
    }

    const token = await getAccessToken(supabase);
    if (!token) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const { data, error, status } = await invokeClaimDeal(token, {
      action:  'redeem',
      qr_code: scannedToken,
    });

    if (error) {
      const payload = data as Record<string, unknown> | undefined;
      return NextResponse.json({
        error,
        error_type: payload?.error_type ?? payload?.errorType,
        limitReached: payload?.limitReached,
        // Forwarded from claim-deal so the scanner can show why it's blocked.
        limits: payload?.limits,
      }, { status: status >= 400 ? status : 400 });
    }

    const result = data as {
      claim?: Record<string, unknown>;
      success?: boolean;
      message?: string;
      limits?: unknown;
    };

    const claim = result.claim as Record<string, unknown> | undefined;

    return NextResponse.json({
      success: true,
      message: result.message ?? 'Deal redeemed successfully!',
      claim:   claim ? {
        id:              claim.id,
        redeemed_at:     claim.redeemed_at,
        deal_title:      claim.deal_title,
        discount_value:  claim.discount_value,
        discount_type:   claim.discount_type,
        restaurant_name: claim.restaurant_name,
      } : undefined,
      // Customer's remaining redemptions (daily + monthly). Present once claim-deal
      // returns it; the scanner renders it defensively only when available.
      limits: result.limits,
    });

  } catch (err: unknown) {
    console.error('Redeem route crashed:', err);
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
