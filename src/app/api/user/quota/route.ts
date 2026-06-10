// GET /api/user/quota — redemption usage vs plan limits (redeemed-only counting).
// Uses customer_effective_tier() + bonus redemption slots from customer_points.

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  effectiveDailyCap,
  effectiveMonthlyCap,
  getTierLimits,
  type CustomerTier,
} from '@/lib/tierLimits';

export async function GET() {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: effectiveTierRaw } = await supabase
    .rpc('customer_effective_tier', { p_user_id: user.id });

  const tier = (effectiveTierRaw as CustomerTier | null) ?? 'free';
  const limits = getTierLimits(tier);

  const { data: pointsRow } = await supabase
    .from('customer_points')
    .select('balance, bonus_daily_redemptions, bonus_monthly_redemptions, tomorrow_unlock_until')
    .eq('user_id', user.id)
    .maybeSingle();

  const bonusDaily   = pointsRow?.bonus_daily_redemptions   ?? 0;
  const bonusMonthly = pointsRow?.bonus_monthly_redemptions ?? 0;
  const dailyCap     = effectiveDailyCap(tier, bonusDaily);
  const monthlyCap   = effectiveMonthlyCap(tier, bonusMonthly);

  const tomorrowUnlockActive = pointsRow?.tomorrow_unlock_until
    ? new Date(pointsRow.tomorrow_unlock_until) > new Date()
    : false;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { count: dailyUsed } = await supabase
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'redeemed')
    .gte('redeemed_at', todayStart.toISOString());

  const { count: monthlyUsed } = await supabase
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'redeemed')
    .gte('redeemed_at', monthStart.toISOString());

  return NextResponse.json({
    tier,
    points_balance:           pointsRow?.balance ?? 0,
    bonus_daily_redemptions:  bonusDaily,
    bonus_monthly_redemptions: bonusMonthly,
    tomorrow_unlock_active:   tomorrowUnlockActive,
    daily_used:               dailyUsed   ?? 0,
    monthly_used:             monthlyUsed ?? 0,
    daily_limit:              limits.dailyRedemptions,
    monthly_limit:            limits.monthlyRedemptions,
    effective_daily_cap:      dailyCap,
    effective_monthly_cap:    monthlyCap,
    visit_window_minutes:     limits.visitWindowMinutes,
    claim_lookahead_days:     limits.claimLookaheadDays,
  });
}
