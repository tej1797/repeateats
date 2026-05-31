// POST /api/claims  — claim a deal (auth required), returns QR code
// GET  /api/claims  — list all claims for the logged-in user

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CreateClaimBody } from '@/types/api';

// ─── Generates a short, readable QR code like "RE-4A7X2B" ───
// We take 6 characters from a random UUID — short enough to
// read aloud, long enough to be effectively unique.
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

  // Fetch claims with deal and restaurant name for display
  const { data, error } = await supabase
    .from('claims')
    .select(`
      *,
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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  // Fetch the deal to check availability
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

  // Check if the deal is sold out (max_claims = null means unlimited)
  if (deal.max_claims !== null && deal.current_claims >= deal.max_claims) {
    return NextResponse.json({ error: 'Deal is fully claimed' }, { status: 409 });
  }

  // Prevent double-claiming the same deal (allow re-claim after revert/expire)
  const { data: existing } = await supabase
    .from('claims')
    .select('id')
    .eq('deal_id', body.deal_id)
    .eq('user_id', user.id)
    .in('status', ['claimed', 'redeemed'])
    .single();

  if (existing) {
    return NextResponse.json({ error: 'You have already claimed this deal' }, { status: 409 });
  }

  // Generate a unique QR code (retry up to 3 times on collision)
  let qr_code = generateQrCode();
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: collision } = await supabase
      .from('claims')
      .select('id')
      .eq('qr_code', qr_code)
      .single();
    if (!collision) break;
    qr_code = generateQrCode();
  }

  // Insert the claim — expires 45 minutes from now
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
    return NextResponse.json({ error: claimError.message }, { status: 500 });
  }

  // Increment the claim counter on the deal
  await supabase
    .from('deals')
    .update({ current_claims: deal.current_claims + 1 })
    .eq('id', body.deal_id);

  return NextResponse.json({ data: claim }, { status: 201 });
}
