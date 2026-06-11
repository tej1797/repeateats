// GET  /api/profile — returns current user's profile + stats + recent claims + fav restaurants
// PATCH /api/profile — update display_name, avatar_url, city, radius_km, favourite_cuisine

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ─── GET ─────────────────────────────────────────────────────
export async function GET() {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch profile row (may include new columns from Part 1 SQL)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single() as any;

  // Aggregate stats directly from claims (only active/redeemed claims count)
  const { data: claimRows } = await supabase
    .from('claims')
    .select('id, claimed_at, deal_id, status, money_saved_cents')
    .eq('user_id', user.id)
    .in('status', ['claimed', 'redeemed']);

  const totalClaims = (claimRows ?? []).length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalSavedCents = (claimRows ?? []).reduce((sum: number, c: any) => sum + (c.money_saved_cents ?? 0), 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastClaimAt = (claimRows ?? []).reduce((latest: string | null, c: any) => {
    if (!latest) return c.claimed_at;
    return c.claimed_at > latest ? c.claimed_at : latest;
  }, null);

  // Recent claims: last 5, with deal + restaurant info
  const { data: recentClaims } = await supabase
    .from('claims')
    .select(`
      id, qr_code, status, claimed_at, redeemed_at, expires_at, reverted_at, money_saved_cents,
      deals (
        title, emoji, discount_value,
        restaurants ( name, city, category )
      )
    `)
    .eq('user_id', user.id)
    .order('claimed_at', { ascending: false })
    .limit(5);

  // Favourite restaurants: tally which restaurants the user has claimed from most (only active/redeemed)
  const { data: allClaims } = await supabase
    .from('claims')
    .select(`deals ( restaurant_id, restaurants ( id, name, cuisine, category, city, rating ) )`)
    .eq('user_id', user.id)
    .in('status', ['claimed', 'redeemed']);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const restCounts: Record<string, { restaurant: any; count: number }> = {};
  for (const c of (allClaims ?? [])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = (c as any).deals?.restaurants;
    if (r?.id) {
      if (!restCounts[r.id]) restCounts[r.id] = { restaurant: r, count: 0 };
      restCounts[r.id].count++;
    }
  }
  const favouriteRestaurants = Object.values(restCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Cities explored (distinct cities from claimed deals' restaurants)
  const citiesSet = new Set<string>();
  for (const c of (allClaims ?? [])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const city = (c as any).deals?.restaurants?.city;
    if (city) citiesSet.add(city);
  }

  // Claims made this month (by claimed_at)
  const monthCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).getTime();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const claimsThisMonth = (claimRows ?? []).filter((c: any) => new Date(c.claimed_at).getTime() >= monthCutoff).length;

  // Saved-deals count
  const { count: savedCount } = await supabase
    .from('saved_deals')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // Points balance
  const { data: pointsRow } = await supabase
    .from('customer_points')
    .select('balance')
    .eq('user_id', user.id)
    .maybeSingle();

  // Effective plus status: paid tier OR an active 3-day trial
  const tier        = profile?.repeat_plus_tier ?? 'free';
  const trialActive = profile?.repeat_plus_trial_ends_at
    ? new Date(profile.repeat_plus_trial_ends_at) > new Date()
    : false;
  const isRepeatPlus = tier !== 'free' || trialActive;

  return NextResponse.json({
    data: {
      id: user.id,
      email: user.email ?? '',
      display_name: profile?.name ?? user.user_metadata?.full_name ?? null,
      avatar_url: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
      phone: profile?.phone ?? null,
      member_since: profile?.member_since ?? user.created_at,
      is_repeat_plus: isRepeatPlus,
      tier,
      city: profile?.city ?? null,
      radius_km: profile?.radius_km ?? 30,
      favourite_cuisine: profile?.favourite_cuisine ?? null,
      streak_days: profile?.streak_days ?? 0,
      points_balance: pointsRow?.balance ?? 0,
      saved_count: savedCount ?? 0,
      stats: {
        total_claims: totalClaims,
        total_saved_cents: totalSavedCents,
        claims_this_month: claimsThisMonth,
        unique_deals: new Set((claimRows ?? []).map((c) => (c as { deal_id: string; status: string }).deal_id)).size,
        cities_explored: citiesSet.size,
        last_claim_at: lastClaimAt,
      },
      recent_claims: recentClaims ?? [],
      favourite_restaurants: favouriteRestaurants,
    },
  });
}

// ─── PATCH ───────────────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as Record<string, unknown>;
  const allowed = ['avatar_url', 'city', 'radius_km', 'favourite_cuisine', 'phone'];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }
  // display_name maps to the users.name column
  if ('display_name' in body) patch.name = body.display_name;

  const { data, error } = await supabase
    .from('users')
    .update(patch)
    .eq('id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
