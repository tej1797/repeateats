// GET /api/stats
// Returns live platform counts: restaurants, deals, claims.
// Used by the landing page to show real numbers instead of static copy.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();

  const [
    { count: restaurantCount },
    { count: dealCount },
    { count: claimCount },
  ] = await Promise.all([
    supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('is_live', true),
    supabase.from('deals').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('claims').select('*', { count: 'exact', head: true }),
  ]);

  return NextResponse.json({
    restaurant_count: restaurantCount ?? 0,
    deal_count:       dealCount ?? 0,
    claim_count:      claimCount ?? 0,
  });
}
