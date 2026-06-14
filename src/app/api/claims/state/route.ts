// GET /api/claims/state?claim_id=<uuid>
// Returns the current reveal state for a claim so VanishingQR can
// restore the correct reveals_remaining count on every mount.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const claimId = new URL(req.url).searchParams.get('claim_id');
  if (!claimId) {
    return NextResponse.json({ error: 'claim_id is required' }, { status: 400 });
  }

  const { data: claim, error } = await supabase
    .from('claims')
    .select('reveals_used, last_revealed_at, qr_code, qr_token_current, status, expires_at, redeemed_at')
    .eq('id', claimId)
    .eq('user_id', user.id)
    .single();

  if (error || !claim) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    reveals_used:      claim.reveals_used      ?? 0,
    last_revealed_at:  claim.last_revealed_at,
    // Scannable token = short RE-XXX-XXX code (matches mobile app + redeem normaliser).
    qr_token_current:  claim.qr_token_current ?? claim.qr_code,
    status:            claim.status,
    expires_at:        claim.expires_at,
    redeemed_at:       claim.redeemed_at,
  });
}
