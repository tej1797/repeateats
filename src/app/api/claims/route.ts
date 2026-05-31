// POST /api/claims  — claim a deal (auth required), returns QR code
// GET  /api/claims  — list all claims for the logged-in user

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CreateClaimBody } from '@/types/api';

// ─── Generates a short, readable QR code like "RE-4A7X2B" ───
function generateQrCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/I/1 to avoid confusion
  let code = 'RE-';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ─── GET ─────────────────────────────────────────────────────
export async function GET() {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('claims')
    .select(`
      id, qr_code, status, claimed_at, redeemed_at, expires_at, deal_id,
      deal:deals (
        title, emoji, discount_value, valid_until,
        restaurant:restaurants ( name, address )
      )
    `)
    .eq('user_id', user.id)
    .order('claimed_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// ─── POST ────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Please sign in to claim deals' },
      { status: 401 },
    );
  }

  let body: CreateClaimBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.deal_id) {
    return NextResponse.json({ error: 'deal_id is required' }, { status: 400 });
  }

  // ── Check for any existing claim for this deal ─────────────
  const { data: existingClaim } = await supabase
    .from('claims')
    .select('id, status, expires_at, qr_code')
    .eq('deal_id', body.deal_id)
    .eq('user_id', user.id)
    .not('status', 'in', '("reverted","expired")')
    .maybeSingle();

  if (existingClaim) {
    // Redeemed deals cannot be claimed again
    if (existingClaim.status === 'redeemed') {
      return NextResponse.json(
        { error: 'You already redeemed this deal' },
        { status: 409 },
      );
    }

    // Active 'claimed' — check if it has expired
    if (existingClaim.status === 'claimed') {
      const isExpired = existingClaim.expires_at
        ? new Date(existingClaim.expires_at) < new Date()
        : false;

      if (isExpired) {
        // Auto-expire it so the user can re-claim
        await supabase
          .from('claims')
          .update({ status: 'expired' })
          .eq('id', existingClaim.id);
        // Fall through to create a new claim below
      } else {
        // Still active — return the existing QR code instead of erroring
        return NextResponse.json({
          data: existingClaim,
          alreadyClaimed: true,
        });
      }
    }
  }

  // ── Check deal availability ────────────────────────────────
  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .select('id, max_claims, current_claims, is_active')
    .eq('id', body.deal_id)
    .single();

  if (dealError || !deal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
  }

  if (!deal.is_active) {
    return NextResponse.json({ error: 'Deal is no longer active' }, { status: 409 });
  }

  if (deal.max_claims !== null && deal.current_claims >= deal.max_claims) {
    return NextResponse.json({ error: 'Deal is fully claimed' }, { status: 409 });
  }

  // ── Generate unique QR code ─────────────────────────────────
  let qr_code = generateQrCode();
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: collision } = await supabase
      .from('claims')
      .select('id')
      .eq('qr_code', qr_code)
      .maybeSingle();
    if (!collision) break;
    qr_code = generateQrCode();
  }

  // ── Insert the claim — expires 45 minutes from now ─────────
  const expiresAt = new Date(Date.now() + 45 * 60 * 1000).toISOString();
  const { data: claim, error: claimError } = await supabase
    .from('claims')
    .insert({
      deal_id:    body.deal_id,
      user_id:    user.id,
      qr_code,
      status:     'claimed',
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (claimError) {
    console.error('Claim insert error:', claimError);
    return NextResponse.json({ error: claimError.message }, { status: 500 });
  }

  // Increment claim counter
  await supabase
    .from('deals')
    .update({ current_claims: deal.current_claims + 1 })
    .eq('id', body.deal_id);

  return NextResponse.json({ data: claim }, { status: 201 });
}
