// GET  /api/collabs  — list open collab opportunities
// POST /api/collabs  — restaurant creates a new collab listing

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CreateCollabBody } from '@/types/api';

// ─── GET ─────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);

  const status  = searchParams.get('status') ?? 'open';
  const cuisine = searchParams.get('cuisine');
  const city    = searchParams.get('city');

  let query = supabase
    .from('collabs')
    .select(`
      *,
      restaurant:restaurants (
        id, name, cuisine, city, logo_url
      ),
      influencer:influencers (
        id, instagram_handle, follower_count
      )
    `)
    .eq('status', status)
    .order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Post-filter by cuisine / city (avoids deep join syntax)
  type RestaurantShape = { cuisine: string | null; city: string } | null;
  let results = data ?? [];

  if (cuisine) {
    results = results.filter((c) => {
      const r = c.restaurant as RestaurantShape;
      return r?.cuisine?.toLowerCase().includes(cuisine.toLowerCase());
    });
  }

  if (city && city !== 'GTA Area') {
    results = results.filter((c) => {
      const r = c.restaurant as RestaurantShape;
      return r?.city === city;
    });
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

  let body: CreateCollabBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.restaurant_id) {
    return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 });
  }

  // Ownership check
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('owner_id')
    .eq('id', body.restaurant_id)
    .single();

  if (!restaurant || restaurant.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('collabs')
    .insert({ ...body, status: 'open' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
