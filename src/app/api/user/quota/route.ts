// GET /api/user/quota
// Returns the authenticated user's claim usage + plan-based limits.
// Used by both the web customer page and mobile app to show the quota chip.
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PLAN_LIMITS, type PlanTier } from '@/lib/planConfig';

export async function GET() {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch user's plan tier
  const { data: userRow } = await supabase
    .from('users')
    .select('repeat_plus_tier, is_repeat_plus')
    .eq('id', user.id)
    .maybeSingle();

  const tier: PlanTier =
    (userRow?.repeat_plus_tier as PlanTier | undefined) ??
    (userRow?.is_repeat_plus ? 'pro' : 'free');

  const limits = PLAN_LIMITS[tier];

  // Count today's claims
  const todayStr = new Date().toISOString().split('T')[0];
  const { count: dailyUsed } = await supabase
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('claimed_at', `${todayStr}T00:00:00`)
    .in('status', ['claimed', 'redeemed']);

  // Count this month's claims
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const { count: monthlyUsed } = await supabase
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('claimed_at', monthStart.toISOString())
    .in('status', ['claimed', 'redeemed']);

  return NextResponse.json({
    tier,
    daily_used:    dailyUsed   ?? 0,
    monthly_used:  monthlyUsed ?? 0,
    daily_limit:   limits.daily,
    monthly_limit: limits.monthly,
  });
}
