// GET /api/search?q=QUERY
// Returns grouped results: restaurants, deals, cities
// Used by the customer homepage search dropdown

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ONTARIO_CITIES } from '@/lib/constants';
import { USE_SEED_DATA } from '@/lib/seedData';

export async function GET(request: NextRequest) {
  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';

  if (!q || q.length < 2) {
    return NextResponse.json({ restaurants: [], deals: [], cities: [] });
  }

  const supabase = createClient();
  const ql = q.toLowerCase();

  // Real-table queries always run
  const realPromises = Promise.all([
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

  // Seed-table queries only run when flag is on
  const seedPromises = USE_SEED_DATA
    ? Promise.all([
        supabase
          .from('restaurants_seed')
          .select('id, name, cuisine, city, rating')
          .ilike('name', `%${q}%`)
          .order('name', { ascending: true })
          .limit(5),
        supabase
          .from('deals_seed')
          .select('id, title, emoji, discount_value, restaurant_id')
          .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
          .eq('is_active', true)
          .limit(5),
      ])
    : Promise.resolve([{ data: null }, { data: null }] as const);

  const [[rReal, dReal], [rSeed, dSeed]] = await Promise.all([realPromises, seedPromises]);

  const restaurants = [...(rReal.data ?? []), ...(rSeed.data ?? [])].slice(0, 6);
  const deals       = [...(dReal.data ?? []), ...(dSeed.data ?? [])].slice(0, 6);

  const cities = (ONTARIO_CITIES as readonly string[])
    .filter((c) => c.toLowerCase().includes(ql))
    .slice(0, 5);

  return NextResponse.json({ restaurants, deals, cities });
}
