// GET  /api/restaurants  — list live restaurants (filtered by city)
// POST /api/restaurants  — create a new restaurant (auth required)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { USE_SEED_DATA } from '@/lib/seedData';
import type { CreateRestaurantBody } from '@/types/api';

// ─── GET ─────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const supabase = createClient();

  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city');

  // Real restaurants query
  let realQuery = supabase
    .from('restaurants')
    .select('*')
    .eq('is_live', true)
    .or('is_paused.eq.false,is_paused.is.null')
    .order('created_at', { ascending: false });

  if (city && city !== 'GTA Area') {
    realQuery = realQuery.eq('city', city);
  }

  if (!USE_SEED_DATA) {
    // Production: real restaurants only
    const { data, error } = await realQuery;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  // Development: union real + seed so the app looks populated
  let seedQuery = supabase
    .from('restaurants_seed')
    .select('*')
    .order('name', { ascending: true });

  if (city && city !== 'GTA Area') {
    seedQuery = seedQuery.eq('city', city);
  }

  const [{ data: real, error: realErr }, { data: seed }] = await Promise.all([
    realQuery,
    seedQuery,
  ]);

  if (realErr) return NextResponse.json({ error: realErr.message }, { status: 500 });

  return NextResponse.json({ data: [...(real ?? []), ...(seed ?? [])] });
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

  // Duplicate guard — one restaurant per owner account.
  // Always key on owner_id (Supabase Auth UUID), never email, because emails can change.
  const { data: existing } = await supabase
    .from('restaurants')
    .select('id, name')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      {
        error: 'A restaurant is already registered to your account.',
        restaurant: existing,
      },
      { status: 409 },
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
