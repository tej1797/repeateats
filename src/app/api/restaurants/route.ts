// GET  /api/restaurants  — list live restaurants (filtered by city)
// POST /api/restaurants  — create a new restaurant (auth required)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CreateRestaurantBody } from '@/types/api';

// ─── GET ─────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const supabase = createClient();

  // Pull query params from the URL: /api/restaurants?city=Mississauga&radius_km=30
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city');
  // radius_km param accepted but filtering done client-side (PostGIS not yet enabled)

  // Start a query against the restaurants table
  let query = supabase
    .from('restaurants')
    .select('*')
    .eq('is_live', true)          // only show published restaurants
    .or('is_paused.eq.false,is_paused.is.null')  // exclude paused restaurants
    .order('created_at', { ascending: false });

  // Optional city filter — "GTA Area" shows all GTA cities
  if (city && city !== 'GTA Area') {
    query = query.eq('city', city);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// ─── POST ────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const supabase = createClient();

  // Check auth — only signed-in users can create restaurants
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse the request body
  let body: CreateRestaurantBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate required fields
  if (!body.name || !body.city) {
    return NextResponse.json(
      { error: 'name and city are required' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('restaurants')
    .insert({
      ...body,
      owner_id: user.id,  // tie the restaurant to the signed-in user
      is_live: false,      // starts as draft; owner must publish manually
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Background: fetch Google reviews for the new restaurant (non-blocking)
  if (process.env.GOOGLE_PLACES_API_KEY && data?.id) {
    import('@/lib/google-places')
      .then(({ syncRestaurantReviews }) =>
        syncRestaurantReviews(data.id, data.name, data.city).catch(console.error)
      )
      .catch(console.error);
  }

  return NextResponse.json({ data }, { status: 201 });
}
