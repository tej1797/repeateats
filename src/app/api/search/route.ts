// GET /api/search?q=QUERY
// Returns grouped results: restaurants, deals, cities
// Used by the customer homepage search dropdown

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ONTARIO_CITIES } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';

  if (!q || q.length < 2) {
    return NextResponse.json({ restaurants: [], deals: [], cities: [] });
  }

  const supabase = createClient();
  const ql = q.toLowerCase();

  const [{ data: restaurants }, { data: deals }] = await Promise.all([
    supabase
      .from('restaurants')
      .select('id, name, cuisine, city, rating')
      .ilike('name', `%${q}%`)
      .eq('is_live', true)
      .order('rating', { ascending: false })
      .limit(5),
    supabase
      .from('deals')
      .select('id, title, emoji, discount_value, restaurant_id')
      .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
      .eq('is_active', true)
      .limit(5),
  ]);

  const cities = (ONTARIO_CITIES as readonly string[])
    .filter((c) => c.toLowerCase().includes(ql))
    .slice(0, 5);

  return NextResponse.json({
    restaurants: restaurants ?? [],
    deals:       deals ?? [],
    cities,
  });
}
