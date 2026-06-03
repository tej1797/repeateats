// GET   /api/restaurants/[id]  — single restaurant + its active deals
// PATCH /api/restaurants/[id]  — update restaurant (owner only)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { USE_SEED_DATA } from '@/lib/seedData';
import type { UpdateRestaurantBody } from '@/types/api';

type RouteParams = { params: { id: string } };

// ─── GET ─────────────────────────────────────────────────────
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('restaurants')
    .select('*, deals ( * )')
    .eq('id', params.id)
    .eq('deals.is_active', true)
    .single();

  // Found in real table — return immediately
  if (!error) return NextResponse.json({ data });

  // Real table 500 — don't fall through to seed
  if (error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Row not found (PGRST116) — try restaurants_seed in dev mode
  if (USE_SEED_DATA) {
    const { data: seedData, error: seedErr } = await supabase
      .from('restaurants_seed')
      .select('*, deals_seed ( * )')
      .eq('id', params.id)
      .eq('deals_seed.is_active', true)
      .single();

    if (!seedErr && seedData) {
      // Normalize the shape: expose seed deals under the 'deals' key so
      // callers don't need to distinguish between real and seed restaurants.
      const normalized = { ...seedData, deals: seedData.deals_seed ?? [] };
      return NextResponse.json({ data: normalized });
    }
  }

  return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
}

// ─── PATCH ───────────────────────────────────────────────────
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const supabase = createClient();

  // Verify auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify ownership — the RLS policy handles this too, but we check
  // explicitly to return a clear 403 instead of an empty result.
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('owner_id')
    .eq('id', params.id)
    .single();

  if (!restaurant || restaurant.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: UpdateRestaurantBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('restaurants')
    .update(body)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
