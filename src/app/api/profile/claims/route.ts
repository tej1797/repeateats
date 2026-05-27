// GET /api/profile/claims — paginated claim history for the signed-in customer
// Query params: page (default 1), limit (default 10), filter (all | month | week)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page   = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10));
  const limit  = Math.min(50, parseInt(searchParams.get('limit') ?? '10', 10));
  const filter = searchParams.get('filter') ?? 'all'; // all | month | week

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('claims')
    .select(`
      id, qr_code, status, claimed_at, redeemed_at, money_saved_cents,
      deals (
        id, title, emoji, discount_value,
        restaurants ( id, name, city, category )
      )
    `, { count: 'exact' })
    .eq('user_id', user.id)
    .order('claimed_at', { ascending: false });

  // Apply time filters
  if (filter === 'week') {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('claimed_at', cutoff);
  } else if (filter === 'month') {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('claimed_at', cutoff);
  }

  const from = (page - 1) * limit;
  query = query.range(from, from + limit - 1);

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [], count: count ?? 0, page, limit });
}
