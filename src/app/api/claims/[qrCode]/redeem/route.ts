// GET  /api/claims/[qrCode]/redeem  — preview claim details for staff (auth required, ownership check)
// POST /api/claims/[qrCode]/redeem  — mark as redeemed
// QR code format: RE-XXXXXX  (e.g. RE-4A7X2B)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteParams = { params: { qrCode: string } };

// ─── GET — claim preview ──────────────────────────────────────────────────────
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const qrCode = decodeURIComponent(params.qrCode);

  const { data: claim, error: claimError } = await supabase
    .from('claims')
    .select(`
      id, qr_code, status, claimed_at, redeemed_at,
      deal:deals (
        title, emoji, discount_value,
        restaurant:restaurants ( name, owner_id )
      )
    `)
    .eq('qr_code', qrCode)
    .single();

  if (claimError || !claim) {
    return NextResponse.json({ error: 'QR code not found' }, { status: 404 });
  }

  type DealShape = { title: string; emoji: string; discount_value: string | null; restaurant: { name: string; owner_id: string } | null };
  const deal = claim.deal as unknown as DealShape | null;

  if (deal?.restaurant?.owner_id !== user.id) {
    return NextResponse.json({ error: 'This QR code belongs to a different restaurant' }, { status: 403 });
  }

  return NextResponse.json({ data: { ...claim, deal } });
}

// ─── POST — mark as redeemed ──────────────────────────────────────────────────
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
        restaurant_id, discount_type, discount_value,
        restaurant:restaurants ( owner_id )
      )
    `)
    .eq('qr_code', qrCode)
    .single();

  if (claimError || !claim) {
    return NextResponse.json({ error: 'QR code not found' }, { status: 404 });
  }

  // Verify the logged-in user owns the restaurant this deal belongs to
  const deal = claim.deal as {
    restaurant_id: string;
    discount_type: string | null;
    discount_value: string | null;
    restaurant: { owner_id: string } | null;
  } | null;
  if (deal?.restaurant?.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (claim.status === 'redeemed') {
    return NextResponse.json({ error: 'QR code already redeemed' }, { status: 409 });
  }

  if (claim.status === 'expired') {
    return NextResponse.json({ error: 'QR code has expired' }, { status: 409 });
  }

  // Estimate savings based on discount type
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
    if (type === 'percentage') return 1500; // ~$15 estimate
    return 1000;
  })();

  // Mark as redeemed
  const { data: updated, error: updateError } = await supabase
    .from('claims')
    .update({
      status:            'redeemed',
      redeemed_at:       new Date().toISOString(),
      money_saved_cents: moneySavedCents,
    })
    .eq('id', claim.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ data: updated });
}
