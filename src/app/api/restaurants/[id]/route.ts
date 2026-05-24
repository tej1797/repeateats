// GET   /api/restaurants/[id]  — single restaurant + its active deals
// PATCH /api/restaurants/[id]  — update restaurant (owner only)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UpdateRestaurantBody } from '@/types/api';

// In Next.js App Router, dynamic segment values come via the second argument.
type RouteParams = { params: { id: string } };

// ─── GET ─────────────────────────────────────────────────────
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const supabase = createClient();

  // Fetch the restaurant and all its active deals in one query.
  // Supabase lets you join related tables inline using "deals(*)" syntax.
  const { data, error } = await supabase
    .from('restaurants')
    .select(`
      *,
      deals ( * )
    `)
    .eq('id', params.id)
    .eq('deals.is_active', true)  // only include active deals
    .single();                    // .single() returns one object instead of an array

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500; // PGRST116 = row not found
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ data });
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
