// GET   /api/deals/[id]  — single deal with restaurant info
// PATCH /api/deals/[id]  — update deal (restaurant owner only)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UpdateDealBody } from '@/types/api';

type RouteParams = { params: { id: string } };

// ─── GET ─────────────────────────────────────────────────────
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('deals')
    .select(`
      *,
      restaurant:restaurants (
        id, name, cuisine, city, address, rating
      )
    `)
    .eq('id', params.id)
    .single();

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ data });
}

// ─── PATCH ───────────────────────────────────────────────────
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify the user owns the restaurant this deal belongs to
  const { data: deal } = await supabase
    .from('deals')
    .select('restaurant_id, restaurants(owner_id)')
    .eq('id', params.id)
    .single();

  // Supabase returns joined rows as an array; we cast via unknown to avoid TS overlap error
  const ownerCheck = deal?.restaurants as unknown as { owner_id: string } | null;
  if (!deal || ownerCheck?.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: UpdateDealBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('deals')
    .update(body)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
