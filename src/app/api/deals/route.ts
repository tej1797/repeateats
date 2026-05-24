// GET  /api/deals  — list deals with restaurant info, supports filtering
// POST /api/deals  — create a deal (restaurant owner only)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CreateDealBody } from '@/types/api';

// ─── GET ─────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);

  const city          = searchParams.get('city');
  const category      = searchParams.get('category');  // e.g. "indian"
  const type          = searchParams.get('type');       // e.g. "dine-in"
  const tab           = searchParams.get('tab') ?? 'active'; // active | coming | all
  const restaurant_id = searchParams.get('restaurant_id');

  // Supabase's nested select: get deal fields + the restaurant's key fields
  let query = supabase
    .from('deals')
    .select(`
      *,
      restaurant:restaurants (
        id, name, cuisine, city, address, rating
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  // Tab filter
  if (tab === 'active')  query = query.eq('is_coming', false);
  if (tab === 'coming')  query = query.eq('is_coming', true);
  // tab === 'all' → no extra filter

  // Optional filters
  if (restaurant_id) {
    query = query.eq('restaurant_id', restaurant_id);
  }

  if (category && category !== 'all') {
    // Filter via the joined restaurant's category column
    query = query.eq('restaurant.category', category);
  }

  if (type && type !== 'all') {
    // deal_types is an array column; @> checks if the array contains the value
    // (Postgres syntax: '{"dine-in"}'::text[])
    query = query.contains('deal_types', [type]);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Optional city filter applied after fetch (avoids complex join filter)
  const filtered = city && city !== 'GTA Area'
    ? (data ?? []).filter((d) => (d.restaurant as { city: string } | null)?.city === city)
    : data ?? [];

  return NextResponse.json({ data: filtered });
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

  // Confirm the user owns this restaurant before inserting
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
