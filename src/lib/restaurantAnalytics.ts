export interface ClaimRow {
  id: string;
  status: string;
  claimed_at: string | null;
  redeemed_at: string | null;
  deal_id: string;
  deals?: {
    id: string;
    title: string;
    emoji: string | null;
  } | null;
}

export interface DayClaimStats {
  key: string;
  label: string;
  claimed: number;
  redeemed: number;
}

export interface TopDealStats {
  id: string;
  title: string;
  emoji: string;
  claims: number;
  redeemed: number;
  maxClaims: number | null;
}

export interface AnalyticsSummary {
  activeDeals: number;
  redeemedAllTime: number;
  claims7d: number;
  redemptionPct: number;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayKey(d: Date): string {
  return startOfDay(d).toISOString().slice(0, 10);
}

export function computeRestaurantAnalytics(
  claims: ClaimRow[],
  activeDealCount: number,
  days = 14,
  dealLimits: Map<string, { max_claims: number | null }> = new Map(),
): { summary: AnalyticsSummary; daily: DayClaimStats[]; topDeals: TopDealStats[] } {
  const now = new Date();
  const since7 = new Date(now.getTime() - 7 * 86_400_000);
  const since14 = new Date(now.getTime() - (days - 1) * 86_400_000);

  const countable = claims.filter((c) => c.status !== 'cancelled' && c.status !== 'reverted');

  const redeemedAllTime = countable.filter((c) => c.status === 'redeemed').length;
  const claims7d = countable.filter((c) => {
    if (!c.claimed_at) return false;
    return new Date(c.claimed_at) >= since7;
  }).length;

  const redemptionPct = countable.length > 0
    ? Math.round((redeemedAllTime / countable.length) * 100)
    : 0;

  const daily: DayClaimStats[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000);
    const key = dayKey(d);
    const nextKey = dayKey(new Date(d.getTime() + 86_400_000));
    const claimed = countable.filter((c) => {
      if (!c.claimed_at) return false;
      const t = c.claimed_at.slice(0, 10);
      return t === key;
    }).length;
    const redeemed = countable.filter((c) => {
      if (!c.redeemed_at) return false;
      const t = c.redeemed_at.slice(0, 10);
      return t === key;
    }).length;
    daily.push({
      key,
      label: DAY_LABELS[d.getDay()],
      claimed,
      redeemed,
    });
    void nextKey;
    void since14;
  }

  const dealMap = new Map<string, TopDealStats>();
  for (const c of countable) {
    const id = c.deal_id;
    const limits = dealLimits.get(id);
    const existing = dealMap.get(id) ?? {
      id,
      title: c.deals?.title ?? 'Unknown deal',
      emoji: c.deals?.emoji ?? '🍽️',
      claims: 0,
      redeemed: 0,
      maxClaims: limits?.max_claims ?? null,
    };
    existing.claims += 1;
    if (c.status === 'redeemed') existing.redeemed += 1;
    dealMap.set(id, existing);
  }

  const topDeals = Array.from(dealMap.values())
    .filter((d) => d.redeemed > 0)
    .sort((a, b) => b.redeemed - a.redeemed || b.claims - a.claims || a.title.localeCompare(b.title))
    .slice(0, 5);

  return {
    summary: {
      activeDeals: activeDealCount,
      redeemedAllTime,
      claims7d,
      redemptionPct,
    },
    daily,
    topDeals,
  };
}
