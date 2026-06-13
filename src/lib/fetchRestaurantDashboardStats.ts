import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClaimRow } from '@/lib/restaurantAnalytics';

export interface DashboardStatsPayload {
  active_deals: number;
  redeemed_claims: number;
  awaiting_scan: number;
  claims: ClaimRow[];
}

function normalizeClaimRow(raw: Record<string, unknown>): ClaimRow {
  const deals = raw.deals as Record<string, unknown> | null | undefined;
  return {
    id:          raw.id as string,
    status:      raw.status as string,
    claimed_at:  (raw.claimed_at as string | null) ?? null,
    redeemed_at: (raw.redeemed_at as string | null) ?? null,
    deal_id:     raw.deal_id as string,
    deals: deals ? {
      id:    deals.id as string,
      title: deals.title as string,
      emoji: (deals.emoji as string | null) ?? null,
    } : null,
  };
}

function parseRpcPayload(data: Record<string, unknown>): DashboardStatsPayload {
  const claimsRaw = data.claims;
  const claims = Array.isArray(claimsRaw)
    ? claimsRaw.map((c) => normalizeClaimRow(c as Record<string, unknown>))
    : [];
  return {
    active_deals:    (data.active_deals as number)    ?? 0,
    redeemed_claims: (data.redeemed_claims as number) ?? 0,
    awaiting_scan:   (data.awaiting_scan as number)   ?? 0,
    claims,
  };
}

/** Fetch dashboard stats via RPC, with direct-query fallback if RPC fails. */
export async function fetchRestaurantDashboardStats(
  supabase: SupabaseClient,
  restaurantId: string,
): Promise<DashboardStatsPayload> {
  const rpc = await supabase.rpc('get_restaurant_dashboard_stats', {
    p_restaurant_id: restaurantId,
  });

  if (rpc.data && !rpc.error) {
    return parseRpcPayload(rpc.data as Record<string, unknown>);
  }

  const [dealsRes] = await Promise.all([
    supabase
      .from('deals')
      .select('id, is_active, max_claims, current_claims, title, emoji')
      .eq('restaurant_id', restaurantId),
  ]);

  const deals = dealsRes.data ?? [];
  const dealIds = deals.map((d) => d.id);

  let claims: ClaimRow[] = [];
  if (dealIds.length > 0) {
    const claimsRes = await supabase
      .from('claims')
      .select(`
        id, status, claimed_at, redeemed_at, deal_id,
        deals ( id, title, emoji, max_claims )
      `)
      .in('deal_id', dealIds);

    claims = (claimsRes.data ?? []).map((c) =>
      normalizeClaimRow(c as unknown as Record<string, unknown>),
    );
  }

  const active_deals = deals.filter((d) => d.is_active).length;
  const redeemed_claims = claims.filter((c) => c.status === 'redeemed').length;
  const awaiting_scan = claims.filter((c) => c.status === 'claimed').length;

  return { active_deals, redeemed_claims, awaiting_scan, claims };
}
