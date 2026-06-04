// GET /api/user/quota — returns the user's claim usage vs plan limits.
// Counts only claims where counted_against_limit = true (i.e. redeemed).
// Active QRs that haven't been scanned yet don't consume a slot.
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

  const { data: userRow } = await supabase
    .from('users')
    .select('repeat_plus_tier, is_repeat_plus')
    .eq('id', user.id)
    .maybeSingle();

  const tier: PlanTier =
    (userRow?.repeat_plus_tier as PlanTier | undefined) ??
    (userRow?.is_repeat_plus ? 'pro' : 'free');

  const limits = PLAN_LIMITS[tier];

  const todayStr = new Date().toISOString().split('T')[0];
  const { count: dailyUsed } = await supabase
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('counted_against_limit', true)
    .gte('claimed_at', `${todayStr}T00:00:00`);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const { count: monthlyUsed } = await supabase
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('counted_against_limit', true)
    .gte('claimed_at', monthStart.toISOString());

  return NextResponse.json({
    tier,
    daily_used:    dailyUsed   ?? 0,
    monthly_used:  monthlyUsed ?? 0,
    daily_limit:   limits.daily,
    monthly_limit: limits.monthly,
  });
}
