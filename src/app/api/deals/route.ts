// GET  /api/deals  — list deals with restaurant info, supports filtering
// POST /api/deals  — create a deal (restaurant owner only)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CreateDealBody } from '@/types/api';

// Local shape of the joined row returned by Supabase
type RestaurantInfo = {
  id: string;
  name: string;
  cuisine: string | null;
  category: string | null;
  city: string;
  address: string | null;
  rating: number;
} | null;

// ─── GET ─────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);

  const city          = searchParams.get('city');
  const category      = searchParams.get('category');  // e.g. "indian"
  const type          = searchParams.get('type');       // e.g. "dine-in"
  const tab           = searchParams.get('tab') ?? 'active';
  const restaurant_id = searchParams.get('restaurant_id');

  // Include category in the restaurant join so client can filter by it
  let query = supabase
    .from('deals')
    .select(`
      *,
      restaurant:restaurants (
        id, name, cuisine, category, city, address, rating
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  // Tab filter (done at DB level — efficient)
  if (tab === 'active')  query = query.eq('is_coming', false);
  if (tab === 'coming')  query = query.eq('is_coming', true);

  // restaurant_id and deal_type filters are reliable on the deals table itself
  if (restaurant_id) query = query.eq('restaurant_id', restaurant_id);
  if (type && type !== 'all') {
    // deal_types is a Postgres text[] column; @> checks array containment
    query = query.contains('deal_types', [type]);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Category and city filters applied after fetch.
  // Filtering on joined/aliased tables via .eq() has inconsistent behaviour
  // across Supabase SDK versions, so we do it in JS — the dataset is small.
  let results = (data ?? []) as Array<typeof data[number] & { restaurant: RestaurantInfo }>;

  if (category && category !== 'all') {
    results = results.filter((d) => d.restaurant?.category === category);
  }
  if (city && city !== 'GTA Area') {
    results = results.filter((d) => d.restaurant?.city === city);
  }

  return NextResponse.json({ data: results });
}

// ─── POST ────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: CreateDealBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.restaurant_id || !body.title) {
    return NextResponse.json(
      { error: 'restaurant_id and title are required' },
      { status: 400 }
    );
  }

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('owner_id')
    .eq('id', body.restaurant_id)
    .single();

  if (!restaurant || restaurant.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('deals')
    .insert(body)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
