// POST /api/claims  — claim a deal (auth required), returns QR code
// GET  /api/claims  — list all claims for the logged-in user

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CreateClaimBody } from '@/types/api';

// ─── Token generators ────────────────────────────────────────
// Legacy short code for display (kept as qr_code column)
function generateQrCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/I/1
  let code = 'RE-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// Vanishing token: "RE-XXXX-YYYY" — rotated every 5 min by cron
function generateQrToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let t = 'RE-';
  for (let i = 0; i < 4; i++) t += chars[Math.floor(Math.random() * chars.length)];
  t += '-';
  for (let i = 0; i < 4; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t;
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
    return NextResponse.json({ error: 'Please sign in to claim deals' }, { status: 401 });
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

  // ── Fetch user's plan ─────────────────────────────────────
  const { data: userRow } = await supabase
    .from('users')
    .select('is_repeat_plus, repeat_plus_tier')
    .eq('id', user.id)
    .maybeSingle();

  const tier = userRow?.repeat_plus_tier ?? (userRow?.is_repeat_plus ? 'pro' : 'free');

  // ── Daily quota check ─────────────────────────────────────
  // Only claims that have been redeemed (counted_against_limit = true) consume
  // a quota slot. Pending QRs that were never scanned don't block the user.
  const dailyLimit = tier === 'free' ? 1 : 3;
  const today = new Date().toISOString().split('T')[0];

  const { count: dailyCount } = await supabase
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('counted_against_limit', true)
    .gte('claimed_at', `${today}T00:00:00`);

  if ((dailyCount ?? 0) >= dailyLimit) {
    return NextResponse.json({
      error: `Daily limit reached (${dailyLimit}/day). ${tier === 'free' ? 'Upgrade to RepEAT+ for 3 deals/day!' : 'Come back tomorrow!'}`,
      limitReached: true,
      upgradeUrl: '/repeat-plus',
    }, { status: 403 });
  }

  // ── Monthly quota check ───────────────────────────────────
  const monthlyLimits: Record<string, number> = { free: 3, starter: 20, pro: 30 };
  const monthlyLimit = monthlyLimits[tier] ?? 3;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { count: monthlyCount } = await supabase
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('counted_against_limit', true)
    .gte('claimed_at', monthStart.toISOString());

  if ((monthlyCount ?? 0) >= monthlyLimit) {
    const upgradeMsg = tier === 'free'
      ? 'Upgrade to Starter or Pro for more!'
      : tier === 'starter' ? 'Upgrade to Pro for 30/month!' : 'Limit reached for this month.';
    return NextResponse.json({
      error: `Monthly limit reached (${monthlyLimit}/month). ${upgradeMsg}`,
      limitReached: true,
      upgradeUrl: '/repeat-plus',
    }, { status: 403 });
  }

  // ── Check for an existing active claim on this deal ───────
  const { data: existingClaim } = await supabase
    .from('claims')
    .select('id, status, expires_at, qr_code')
    .eq('deal_id', body.deal_id)
    .eq('user_id', user.id)
    .eq('status', 'claimed')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (existingClaim) {
    return NextResponse.json({ data: existingClaim, alreadyClaimed: true });
  }

  // Also block if already fully redeemed
  const { data: redeemedClaim } = await supabase
    .from('claims')
    .select('id')
    .eq('deal_id', body.deal_id)
    .eq('user_id', user.id)
    .eq('status', 'redeemed')
    .maybeSingle();

  if (redeemedClaim) {
    return NextResponse.json({ error: 'You already redeemed this deal' }, { status: 409 });
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
      .from('claims').select('id').eq('qr_code', qr_code).maybeSingle();
    if (!collision) break;
    qr_code = generateQrCode();
  }

  // ── Insert the claim ────────────────────────────────────────
  // status = 'claimed' (active QR, timer running)
  // expires 60 minutes from now
  // qr_token_current starts equal to the token; rotated by cron every 5 min
  const token     = generateQrToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const { data: claim, error: claimError } = await supabase
    .from('claims')
    .insert({
      deal_id:               body.deal_id,
      user_id:               user.id,
      qr_code,
      status:                'claimed',
      expires_at:            expiresAt,
      counted_against_limit: false,
      reveals_used:          0,
      last_revealed_at:      null,
      qr_token_current:      token,
      qr_token_previous:     null,
    })
    .select()
    .single();

  if (claimError) {
    console.error('Claim insert error:', JSON.stringify(claimError));
    return NextResponse.json({ error: claimError.message }, { status: 500 });
  }

  // Increment deal display counter (cosmetic social proof)
  await supabase
    .from('deals')
    .update({ current_claims: deal.current_claims + 1 })
    .eq('id', body.deal_id);

  return NextResponse.json({ data: { ...claim, claim_id: claim.id } }, { status: 201 });
}
