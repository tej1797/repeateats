// PATCH /api/claims/revert/[id] — cancel an active claim (user-initiated)
// Sets status to 'reverted', records reason, and decrements deal's current_claims

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const claimId = params.id;

  // Fetch the claim — must belong to this user and be in 'claimed' status
  const { data: claim, error: fetchError } = await supabase
    .from('claims')
    .select('id, deal_id, status, user_id')
    .eq('id', claimId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !claim) {
    return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  }

  // Allow cancelling both active ('claimed') and reserved ('scheduled') claims
  if (claim.status !== 'claimed' && claim.status !== 'scheduled') {
    return NextResponse.json(
      { error: `Cannot revert a claim with status '${claim.status}'` },
      { status: 409 },
    );
  }

  let body: { reason?: string } = {};
  try { body = await request.json(); } catch { /* reason is optional */ }
  const reason = body.reason ?? 'User cancelled';

  // Mark claim as reverted
  const { error: updateError } = await supabase
    .from('claims')
    .update({
      status:         'reverted',
      reverted_at:    new Date().toISOString(),
      revert_reason:  reason,
    })
    .eq('id', claimId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Decrement deal's current_claims (floor at 0) via RPC if it exists,
  // otherwise do a manual safe decrement
  const { error: rpcError } = await supabase.rpc('decrement_claims', { deal_id_input: claim.deal_id });
  if (rpcError) {
    // Fallback: fetch current count and decrement manually
    const { data: dealRow } = await supabase
      .from('deals')
      .select('current_claims')
      .eq('id', claim.deal_id)
      .single();
    if (dealRow && dealRow.current_claims > 0) {
      await supabase
        .from('deals')
        .update({ current_claims: dealRow.current_claims - 1 })
        .eq('id', claim.deal_id);
    }
  }

  return NextResponse.json({ success: true });
}
