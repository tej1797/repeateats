// GET  /api/claims/[qrCode]/redeem  — preview claim for restaurant staff
// POST /api/claims/[qrCode]/redeem  — mark as redeemed
//
// Accepts the scanned/typed token in the URL.
// Lookup order: qr_token_current → qr_token_previous (grace) → qr_code (legacy)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteParams = { params: { qrCode: string } };

// ─── GET — preview ────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = decodeURIComponent(params.qrCode);

  // Try token columns first, fall back to legacy qr_code
  const { data: claim, error: claimError } = await supabase
    .from('claims')
    .select(`
      id, qr_code, status, claimed_at, redeemed_at,
      deal:deals (
        title, emoji, discount_value,
        restaurant:restaurants ( name, owner_id )
      )
    `)
    .or(
      [
        `qr_token_current.eq.${token}`,
        `qr_token_previous.eq.${token}`,
        `qr_code.eq.${token}`,
      ].join(',')
    )
    .maybeSingle();

  if (claimError || !claim) {
    return NextResponse.json({ error: 'QR code not found' }, { status: 404 });
  }

  type DealShape = {
    title: string; emoji: string; discount_value: string | null;
    restaurant: { name: string; owner_id: string } | null;
  };
  const deal = claim.deal as unknown as DealShape | null;

  if (deal?.restaurant?.owner_id !== user.id) {
    return NextResponse.json({ error: 'This QR code belongs to a different restaurant' }, { status: 403 });
  }

  return NextResponse.json({ data: { ...claim, deal } });
}

// ─── POST — redeem ────────────────────────────────────────────────────────────
export async function POST(_req: NextRequest, { params }: RouteParams) {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = decodeURIComponent(params.qrCode);

  // Look up by token columns OR legacy qr_code — no expiry filter yet so we
  // can return a specific message if the claim is found but expired/redeemed.
  const { data: claimAny } = await supabase
    .from('claims')
    .select(`
      *,
      deal:deals (
        restaurant_id, discount_type, discount_value,
        restaurant:restaurants ( owner_id )
      )
    `)
    .or(
      [
        `qr_token_current.eq.${token}`,
        `qr_token_previous.eq.${token}`,
        `qr_code.eq.${token}`,
      ].join(',')
    )
    .maybeSingle();

  if (!claimAny) {
    return NextResponse.json({ error: 'Invalid QR code.' }, { status: 404 });
  }

  const deal = claimAny.deal as {
    restaurant_id: string;
    discount_type: string | null;
    discount_value: string | null;
    restaurant: { owner_id: string } | null;
  } | null;

  if (deal?.restaurant?.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Specific errors for found-but-invalid states
  if (claimAny.status === 'redeemed') {
    const at = claimAny.redeemed_at
      ? new Date(claimAny.redeemed_at).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })
      : 'earlier';
    return NextResponse.json(
      { error: `Already redeemed at ${at}.` },
      { status: 409 },
    );
  }

  if (claimAny.status === 'expired' || new Date(claimAny.expires_at) < new Date()) {
    return NextResponse.json(
      { error: 'QR code has expired. Customer must reclaim.' },
      { status: 409 },
    );
  }

  // ── Daily quota check ────────────────────────────────────────────────────
  const { data: customerRow } = await supabase
    .from('users')
    .select('is_repeat_plus, repeat_plus_tier')
    .eq('id', claimAny.user_id)
    .maybeSingle();

  const customerTier = customerRow?.repeat_plus_tier ?? (customerRow?.is_repeat_plus ? 'pro' : 'free');
  const dailyLimit   = customerTier === 'free' ? 1 : 3;
  const today        = new Date().toISOString().split('T')[0];

  const { count: todayRedeemed } = await supabase
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', claimAny.user_id)
    .eq('counted_against_limit', true)
    .gte('claimed_at', `${today}T00:00:00`);

  if ((todayRedeemed ?? 0) >= dailyLimit) {
    return NextResponse.json({
      error: `Customer has already reached their daily limit of ${dailyLimit} deal${dailyLimit !== 1 ? 's' : ''} today.`,
      limitReached: true,
    }, { status: 403 });
  }

  // ── Estimate savings ─────────────────────────────────────────────────────
  const moneySavedCents = (() => {
    if (!deal) return 1000;
    const type = deal.discount_type?.toLowerCase() ?? '';
    const val  = deal.discount_value ?? '';
    if (type === 'fixed') {
      const num = parseFloat(val.replace(/[^0-9.]/g, ''));
      return isNaN(num) ? 1000 : Math.round(num * 100);
    }
    if (type === 'bogo')       return 1500;
    if (type === 'free')       return 1000;
    if (type === 'percentage') return 1500;
    return 1000;
  })();

  // ── Mark redeemed ────────────────────────────────────────────────────────
  const { data: updated, error: updateError } = await supabase
    .from('claims')
    .update({
      status:                'redeemed',
      redeemed_at:           new Date().toISOString(),
      money_saved_cents:     moneySavedCents,
      counted_against_limit: true,
    })
    .eq('id', claimAny.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ data: updated });
}
