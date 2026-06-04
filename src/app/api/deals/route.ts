// GET  /api/deals  — list deals with restaurant info, supports filtering
// POST /api/deals  — create a deal (restaurant owner only)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { USE_SEED_DATA } from '@/lib/seedData';
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

// ─── Shared deal filter helper ───────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyClientFilters(
  rows: Array<{ restaurant: RestaurantInfo & { is_paused?: boolean } }>,
  { category, city }: { category: string | null; city: string | null },
) {
  let r = rows.filter((d) => !(d.restaurant as unknown as Record<string, unknown>)?.is_paused);
  if (category && category !== 'all') r = r.filter((d) => d.restaurant?.category === category);
  if (city && city !== 'GTA Area')    r = r.filter((d) => d.restaurant?.city === city);
  return r;
}

// Strip schedule fields for free-tier users — prevents client inspection of
// available_days, valid_from, valid_until which are Starter/Pro-only info.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripScheduleFields(rows: any[]): any[] {
  return rows.map(d => ({
    ...d,
    available_days: ['all'], // always show as all-day to avoid guessing
    valid_from:     null,
    valid_until:    null,
  }));
}

// ─── GET ─────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);

  const city          = searchParams.get('city');
  const category      = searchParams.get('category');
  const type          = searchParams.get('type');
  const tab           = searchParams.get('tab') ?? 'active';
  const restaurant_id = searchParams.get('restaurant_id');

  // Build a query for either the real or seed deals table
  function buildQuery(table: 'deals' | 'deals_seed', join: 'restaurants' | 'restaurants_seed') {
    const select = `*, restaurant:${join} ( id, name, cuisine, category, city, address, rating${join === 'restaurants' ? ', is_paused' : ''} )`;
    let q = supabase
      .from(table)
      .select(select)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (tab === 'active') q = q.eq('is_coming', false);
    if (tab === 'coming') q = q.eq('is_coming', true);
    if (restaurant_id)    q = q.eq('restaurant_id', restaurant_id);
    if (type && type !== 'all') q = q.contains('deal_types', [type]);

    return q;
  }

  // Optionally resolve caller's plan tier — used to gate schedule fields.
  // No auth = treat as free (public browse). Auth failures fall back to free.
  let callerTier: 'free' | 'starter' | 'pro' = 'free';
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userRow } = await supabase
        .from('users')
        .select('repeat_plus_tier, is_repeat_plus')
        .eq('id', user.id)
        .maybeSingle();
      const raw = userRow?.repeat_plus_tier as string | null | undefined;
      if (raw === 'starter' || raw === 'pro') callerTier = raw;
      else if (userRow?.is_repeat_plus) callerTier = 'pro';
    }
  } catch { /* no-op — public browse remains free */ }

  if (!USE_SEED_DATA) {
    // Production: real deals only
    const { data, error } = await buildQuery('deals', 'restaurants');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let results = applyClientFilters((data ?? []) as any[], { category, city });
    if (callerTier === 'free') results = stripScheduleFields(results);
    return NextResponse.json({ data: results });
  }

  // Development: union real + seed deals so the app looks populated
  const [{ data: real, error: realErr }, { data: seed }] = await Promise.all([
    buildQuery('deals', 'restaurants'),
    buildQuery('deals_seed', 'restaurants_seed'),
  ]);

  if (realErr) return NextResponse.json({ error: realErr.message }, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let merged = applyClientFilters([...(real ?? []), ...(seed ?? [])] as any[], { category, city });
  if (callerTier === 'free') merged = stripScheduleFields(merged);
  return NextResponse.json({ data: merged });
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

  const title         = (body.title as string).trim();
  const discountType  = body.discount_type as string | undefined;
  const discountValue = typeof body.discount_value === 'number'
    ? body.discount_value
    : parseFloat(String(body.discount_value ?? '0').replace(/[^0-9.]/g, ''));

  if (title.length < 3) {
    return NextResponse.json(
      { error: 'Deal title must be at least 3 characters' },
      { status: 400 },
    );
  }
  if (title.length > 80) {
    return NextResponse.json(
      { error: 'Deal title must be under 80 characters' },
      { status: 400 },
    );
  }
  if (discountType === 'percentage' && !isNaN(discountValue) && discountValue > 100) {
    return NextResponse.json(
      { error: 'Percentage discount cannot exceed 100%' },
      { status: 400 },
    );
  }
  if (discountType === 'fixed' && !isNaN(discountValue) && discountValue > 500) {
    return NextResponse.json(
      { error: 'Fixed discount cannot exceed $500' },
      { status: 400 },
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
