// GET  /api/creator/profile — returns influencer row + collab stats + earnings
// PATCH /api/creator/profile — update payment details and profile info

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ─── GET ─────────────────────────────────────────────────────
export async function GET() {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch influencer row
  const { data: influencer } = await supabase
    .from('influencers').select('*').eq('user_id', user.id).maybeSingle();

  if (!influencer) {
    return NextResponse.json({ error: 'No influencer profile found' }, { status: 404 });
  }

  // Fetch all collabs for this influencer
  const { data: collabs } = await supabase
    .from('collabs')
    .select(`
      id, status, offer_amount_min, offer_amount_max, creator_rate,
      deliverables, brief, deadline, draft_content_url, final_post_url,
      payment_deposited_at, payment_released_at, created_at,
      restaurant:restaurants ( id, name, city, cuisine, logo_url )
    `)
    .eq('influencer_id', influencer.id)
    .order('created_at', { ascending: false });

  const allCollabs = collabs ?? [];

  // Compute stats
  type CollabRow = typeof allCollabs[number];
  const completed = allCollabs.filter((c) => c.status === 'completed');
  const active    = allCollabs.filter((c) =>
    ['negotiating', 'accepted', 'content_review'].includes(c.status as string)
  );

  const totalEarned    = completed.reduce((s: number, c: CollabRow) => s + ((c.creator_rate ?? c.offer_amount_max ?? 0) as number), 0);
  const escrowBalance  = active.reduce((s: number, c: CollabRow) =>
    c.status === 'accepted' ? s + ((c.creator_rate ?? c.offer_amount_max ?? 0) as number) : s, 0
  );

  // Monthly earnings for chart (last 6 months)
  const now = new Date();
  const months: { month: string; earned: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString('default', { month: 'short' });
    const earned = completed
      .filter((c: CollabRow) => {
        if (!c.payment_released_at) return false;
        const released = new Date(c.payment_released_at as string);
        return released.getFullYear() === d.getFullYear() && released.getMonth() === d.getMonth();
      })
      .reduce((s: number, c: CollabRow) => s + ((c.creator_rate ?? c.offer_amount_max ?? 0) as number), 0);
    months.push({ month: label, earned });
  }

  return NextResponse.json({
    data: {
      id:               influencer.id,
      user_id:          user.id,
      email:            user.email ?? '',
      display_name:     influencer.display_name ?? user.user_metadata?.full_name ?? null,
      avatar_url:       influencer.avatar_url   ?? user.user_metadata?.avatar_url ?? null,
      instagram_handle: influencer.instagram_handle ?? null,
      tiktok_handle:    influencer.tiktok_handle ?? null,
      niche:            influencer.niche ?? null,
      follower_range:   influencer.follower_range ?? null,
      primary_platform: influencer.primary_platform ?? null,
      city:             influencer.city ?? null,
      bio:              influencer.bio ?? null,
      avg_rating:       influencer.avg_rating ?? influencer.rating ?? 0,
      // Payment details (masked)
      etransfer_email:      influencer.etransfer_email ?? null,
      paypal_email:         influencer.paypal_email ?? null,
      bank_transit:         influencer.bank_transit ?? null,
      bank_institution:     influencer.bank_institution ?? null,
      bank_account_masked:  influencer.bank_account_masked ?? null,
      preferred_payment:    influencer.preferred_payment ?? 'etransfer',
      stats: {
        total_earned:      totalEarned,
        escrow_balance:    escrowBalance,
        completed_collabs: completed.length,
        active_collabs:    active.length,
        avg_rating:        influencer.avg_rating ?? influencer.rating ?? 0,
      },
      active_collabs:  active,
      collab_history:  completed,
      monthly_earnings: months,
    },
  });
}

// ─── PATCH ────────────────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as Record<string, unknown>;
  const allowed = [
    'display_name', 'instagram_handle', 'tiktok_handle', 'niche',
    'follower_range', 'primary_platform', 'city', 'bio',
    'etransfer_email', 'paypal_email', 'bank_transit', 'bank_institution',
    'bank_account_masked', 'preferred_payment',
  ];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  const { data, error } = await supabase
    .from('influencers').update(patch).eq('user_id', user.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
