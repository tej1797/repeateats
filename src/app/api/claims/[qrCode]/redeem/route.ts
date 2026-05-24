// POST /api/claims/[qrCode]/redeem
// Restaurant staff scans the QR code and calls this endpoint to mark it redeemed.
// The QR code is the URL-safe segment, e.g. /api/claims/RE-4A7X2B/redeem

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteParams = { params: { qrCode: string } };

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const supabase = createClient();

  // Restaurant staff must be signed in
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const qrCode = decodeURIComponent(params.qrCode); // handles "RE-4A7X2B"

  // Find the claim by QR code, with deal→restaurant chain for ownership check
  const { data: claim, error: claimError } = await supabase
    .from('claims')
    .select(`
      *,
      deal:deals (
        restaurant_id,
        restaurant:restaurants ( owner_id )
      )
    `)
    .eq('qr_code', qrCode)
    .single();

  if (claimError || !claim) {
    return NextResponse.json({ error: 'QR code not found' }, { status: 404 });
  }

  // Verify the logged-in user owns the restaurant this deal belongs to
  const deal = claim.deal as { restaurant_id: string; restaurant: { owner_id: string } | null } | null;
  if (deal?.restaurant?.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (claim.status === 'redeemed') {
    return NextResponse.json({ error: 'QR code already redeemed' }, { status: 409 });
  }

  if (claim.status === 'expired') {
    return NextResponse.json({ error: 'QR code has expired' }, { status: 409 });
  }

  // Mark as redeemed
  const { data: updated, error: updateError } = await supabase
    .from('claims')
    .update({
      status:      'redeemed',
      redeemed_at: new Date().toISOString(),
    })
    .eq('id', claim.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ data: updated });
}
