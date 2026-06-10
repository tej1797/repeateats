// POST /api/claims  — claim a deal via claim-deal edge function
// GET  /api/claims  — list all claims for the logged-in user

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAccessToken, invokeClaimDeal } from '@/lib/claimDeal';
import type { CreateClaimBody } from '@/types/api';

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
      claim_for_date, timer_starts_at, window_minutes,
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

export async function POST(request: NextRequest) {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Please sign in to claim deals' }, { status: 401 });
  }

  let body: CreateClaimBody & { timer_starts_at?: string; claim_for_date?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.deal_id) {
    return NextResponse.json({ error: 'deal_id is required' }, { status: 400 });
  }

  const token = await getAccessToken(supabase);
  if (!token) {
    return NextResponse.json({ error: 'Session expired — please sign in again' }, { status: 401 });
  }

  const { data, error, status } = await invokeClaimDeal(token, {
    action:          'claim',
    deal_id:         body.deal_id,
    timer_starts_at: body.timer_starts_at,
    claim_for_date:  body.claim_for_date,
  });

  if (error) {
    const payload = data as Record<string, unknown> | undefined;
    return NextResponse.json({
      error,
      limitReached: payload?.limitReached ?? payload?.limit_reached,
      upgradeUrl:   '/repeat-plus',
    }, { status: status >= 400 ? status : 400 });
  }

  const result = data as {
    claim?: Record<string, unknown>;
    reused?: boolean;
    error?: string;
  };

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const claim = result.claim;
  if (!claim) {
    return NextResponse.json({ error: 'No claim returned from server' }, { status: 500 });
  }

  if (result.reused) {
    return NextResponse.json({ data: claim, alreadyClaimed: true });
  }

  return NextResponse.json({
    data: { ...claim, claim_id: claim.id },
  }, { status: 201 });
}
