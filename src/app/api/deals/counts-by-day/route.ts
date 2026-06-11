// GET /api/deals/counts-by-day?days=7
// Returns deal counts per day-of-week for active deals, filtered by the
// caller's plan window (free=1, starter=2, pro=7 days).
// Response: { mon: 4, tue: 6, wed: 3, thu: 8, fri: 12, sat: 5, sun: 2 }
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { USE_SEED_DATA } from '@/lib/seedData';

const DOW_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
type DowKey = typeof DOW_KEYS[number];

// Deals with available_days=['all'] count toward every day
function countsByDay(deals: { available_days: string[] | null }[]): Record<DowKey, number> {
  const counts = Object.fromEntries(DOW_KEYS.map(d => [d, 0])) as Record<DowKey, number>;

  for (const deal of deals) {
    const days = deal.available_days ?? ['all'];
    if (days.includes('all') || !days.length) {
      // Counts for every day
      for (const d of DOW_KEYS) counts[d]++;
    } else {
      // Map 'Mon' → 'mon', 'Tue' → 'tue', etc.
      for (const raw of days) {
        const key = raw.toLowerCase().slice(0, 3) as DowKey;
        if (key in counts) counts[key]++;
      }
    }
  }

  return counts;
}

export async function GET(request: NextRequest) {
  const supabase = createClient();

  // Resolve caller's plan tier
  let tier: 'free' | 'starter' | 'pro' = 'free';
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: row } = await supabase
        .from('users')
        .select('repeat_plus_tier')
        .eq('id', user.id)
        .maybeSingle();
      const raw = row?.repeat_plus_tier as string | null | undefined;
      if (raw === 'starter' || raw === 'pro' || raw === 'yearly') tier = raw === 'yearly' ? 'pro' : raw;
    }
  } catch { /* treat as free */ }

  // Plan window: how many days forward the user can see
  const window = tier === 'pro' ? 7 : tier === 'starter' ? 2 : 1;

  // Build the set of DOW keys within the plan window
  const todayIdx    = new Date().getDay(); // 0=Sun
  const allowedDows = new Set<string>();
  for (let i = 0; i < window; i++) {
    allowedDows.add(DOW_KEYS[(todayIdx + i) % 7]);
  }

  // Fetch active deals (both real and seed in dev)
  const fetches = [
    supabase
      .from('deals')
      .select('available_days')
      .eq('is_active', true)
      .eq('is_coming', false),
  ];

  if (USE_SEED_DATA) {
    fetches.push(
      supabase
        .from('deals_seed')
        .select('available_days')
        .eq('is_active', true)
        .eq('is_coming', false) as typeof fetches[0],
    );
  }

  const results = await Promise.all(fetches);
  const allDeals = results.flatMap(r => r.data ?? []);

  const allCounts = countsByDay(allDeals);

  // Filter to only the days within this user's plan window
  const filtered = Object.fromEntries(
    Object.entries(allCounts).filter(([d]) => allowedDows.has(d)),
  ) as Record<string, number>;

  // Return using `?days=` param as a hint (ignored for now — window drives it)
  const _ = new URL(request.url).searchParams.get('days'); void _;

  return NextResponse.json(filtered);
}
