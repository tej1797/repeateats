// POST /api/claims/reveal
// Called by the customer when they tap to show their QR code.
// Enforces the 2-reveal limit and the 2-minute visible window.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let claim_id: string;
  try {
    ({ claim_id } = await req.json() as { claim_id: string });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!claim_id) {
    return NextResponse.json({ error: 'claim_id is required' }, { status: 400 });
  }

  const { data: claim, error: claimError } = await supabase
    .from('claims')
    .select('id, status, expires_at, qr_code, qr_token_current, reveals_used, last_revealed_at')
    .eq('id', claim_id)
    .eq('user_id', user.id)
    .eq('status', 'claimed')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (claimError || !claim) {
    return NextResponse.json({ error: 'Claim not found or expired' }, { status: 404 });
  }

  // The scannable token is the short RE-XXX-XXX code (matches the mobile app QR
  // and the claim-deal redeem normaliser). Fall back to a legacy vanishing token.
  const scanToken = claim.qr_token_current ?? claim.qr_code;

  if ((claim.reveals_used ?? 0) >= 2) {
    return NextResponse.json(
      { error: 'No reveals remaining', reveals_used: 2 },
      { status: 403 },
    );
  }

  // If currently visible (last reveal was < 2 minutes ago), just extend the window
  const VISIBLE_MS = 2 * 60 * 1000;
  const lastReveal = claim.last_revealed_at ? new Date(claim.last_revealed_at).getTime() : 0;
  const isCurrentlyVisible = lastReveal + VISIBLE_MS > Date.now();

  if (isCurrentlyVisible) {
    return NextResponse.json({
      visible:           true,
      qr_token:          scanToken,
      reveals_remaining: 2 - (claim.reveals_used ?? 0),
      visible_until:     new Date(lastReveal + VISIBLE_MS).toISOString(),
    });
  }

  // Consume one reveal
  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from('claims')
    .update({
      reveals_used:     (claim.reveals_used ?? 0) + 1,
      last_revealed_at: now,
    })
    .eq('id', claim_id)
    .select('qr_code, qr_token_current, reveals_used')
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: 'Failed to record reveal' }, { status: 500 });
  }

  return NextResponse.json({
    visible:           true,
    qr_token:          updated.qr_token_current ?? updated.qr_code,
    reveals_remaining: 2 - (updated.reveals_used ?? 0),
    visible_until:     new Date(Date.now() + VISIBLE_MS).toISOString(),
  });
}
