// POST /api/claims/redeem
// Restaurant staff endpoint — uses admin client to bypass RLS so ownership
// is verified in application code rather than relying on row-level policies.

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

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

    const adminClient = getAdminClient();

    // Verify the signed-in user owns a restaurant
    const { data: restaurant } = await adminClient
      .from('restaurants')
      .select('id, name, owner_id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!restaurant) {
      return NextResponse.json(
        { error: 'No restaurant found for this account.' },
        { status: 403 },
      );
    }

    // Find the claim by token — searches qr_token_current, qr_token_previous, qr_code
    const { data: claims, error: rpcError } = await adminClient
      .rpc('find_claim_by_token', { p_token: scannedToken });

    if (rpcError) {
      console.error('RPC error:', rpcError);
      return NextResponse.json(
        { error: 'Database error: ' + rpcError.message },
        { status: 500 },
      );
    }

    const claim = (claims as Array<{
      id: string; status: string; expires_at: string; redeemed_at: string | null;
      restaurant_id: string; restaurant_name: string; deal_title: string;
      discount_value: string | null; discount_type: string | null; deal_category: string | null;
    }> | null)?.[0];

    if (!claim) {
      return NextResponse.json(
        { error: 'Invalid QR code. Ask the customer to show their QR again.', error_type: 'invalid' },
        { status: 404 },
      );
    }

    // Ownership check — this token belongs to a different restaurant
    if (claim.restaurant_id !== restaurant.id) {
      return NextResponse.json(
        {
          error: `This deal belongs to ${claim.restaurant_name}, not ${restaurant.name}.`,
          error_type: 'wrong_restaurant',
        },
        { status: 403 },
      );
    }

    if (claim.status === 'redeemed') {
      const at = claim.redeemed_at
        ? new Date(claim.redeemed_at).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })
        : 'earlier';
      return NextResponse.json(
        { error: `Already redeemed at ${at}.`, error_type: 'already_redeemed' },
        { status: 409 },
      );
    }

    if (claim.status === 'expired' || new Date(claim.expires_at) < new Date()) {
      await adminClient
        .from('claims')
        .update({ status: 'expired' })
        .eq('id', claim.id);
      return NextResponse.json(
        { error: 'QR code has expired. Customer must claim again.', error_type: 'expired' },
        { status: 410 },
      );
    }

    if (claim.status !== 'claimed') {
      return NextResponse.json(
        { error: `Invalid claim status: ${claim.status}` },
        { status: 400 },
      );
    }

    const { data: redeemed, error: redeemError } = await adminClient
      .from('claims')
      .update({
        status:                'redeemed',
        redeemed_at:           new Date().toISOString(),
        counted_against_limit: true,
      })
      .eq('id', claim.id)
      .eq('status', 'claimed')
      .select()
      .single();

    if (redeemError || !redeemed) {
      console.error('Redeem update error:', redeemError);
      return NextResponse.json(
        { error: 'Failed to redeem. Please try again.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success:  true,
      message:  'Deal redeemed successfully!',
      claim: {
        id:              redeemed.id,
        redeemed_at:     redeemed.redeemed_at,
        deal_title:      claim.deal_title,
        discount_value:  claim.discount_value,
        discount_type:   claim.discount_type,
        deal_category:   claim.deal_category,
        restaurant_name: claim.restaurant_name,
      },
    });

  } catch (err: unknown) {
    console.error('Redeem route crashed:', err);
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
