// POST /api/admin/backfill-photos
// Fetches a Google Places photo, uploads image bytes to Supabase Storage,
// and writes the permanent Storage URL to cover_url.
//
// Mode A — single restaurant (called from browser after onboarding):
//   Body: { id: "restaurant-uuid" }
//   Auth: Supabase session cookie (owner must match restaurant.owner_id)
//
// Mode B — all restaurants (one-time admin backfill):
//   Body: {} (no id field)
//   Auth: Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
//   curl -X POST https://repeateats.ca/api/admin/backfill-photos \
//        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getRestaurantPhotoUrl } from '@/lib/getRestaurantPhoto';

// Fetches the Google Places photo, uploads to Storage, updates the row.
// Returns true if cover_url was successfully written.
async function backfillOne(restaurantId: string, name: string, city: string): Promise<boolean> {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const placesUrl = await getRestaurantPhotoUrl(name, city);
    if (!placesUrl) return false;

    const imgRes = await fetch(placesUrl, { redirect: 'follow' });
    if (!imgRes.ok) return false;

    const buffer      = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get('Content-Type') ?? 'image/jpeg';
    const ext         = contentType.includes('png') ? 'png' : 'jpg';
    const storagePath = `covers/${restaurantId}.${ext}`;

    const { error: upErr } = await admin.storage
      .from('restaurant-photos')
      .upload(storagePath, buffer, { contentType, upsert: true });

    if (upErr) return false;

    const { data: pub } = admin.storage
      .from('restaurant-photos')
      .getPublicUrl(storagePath);

    if (!pub.publicUrl) return false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from('restaurants')
      .update({ cover_url: pub.publicUrl })
      .eq('id', restaurantId);

    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  let body: { id?: string } = {};
  try { body = await request.json(); } catch { /* empty body is fine */ }

  // ── Mode A: single restaurant ─────────────────────────────────────────────
  if (body.id) {
    // Authenticate via session cookie (owner must match restaurant.owner_id)
    const cookieStore = cookies();
    const userSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cs) {
            try { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
            catch { /* read-only in middleware */ }
          },
        },
      },
    );

    const { data: { user } } = await userSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch the restaurant to verify ownership
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: r } = await (admin as any)
      .from('restaurants')
      .select('id, name, city, owner_id, cover_url')
      .eq('id', body.id)
      .maybeSingle();

    if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (r.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (r.cover_url) return NextResponse.json({ skipped: true, reason: 'already has cover_url' });

    const ok = await backfillOne(r.id, r.name, r.city);
    return NextResponse.json({ updated: ok ? 1 : 0, skipped: ok ? 0 : 1 });
  }

  // ── Mode B: all restaurants — requires service-role Bearer token ──────────
  const auth  = request.headers.get('authorization') ?? '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token || token !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Forbidden — pass SUPABASE_SERVICE_ROLE_KEY as Bearer token for bulk backfill' },
      { status: 403 },
    );
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: restaurants } = await (admin as any)
    .from('restaurants')
    .select('id, name, city')
    .is('cover_url', null);

  let updated = 0;
  let skipped = 0;

  for (const r of (restaurants ?? []) as { id: string; name: string; city: string }[]) {
    const ok = await backfillOne(r.id, r.name, r.city);
    if (ok) updated++; else skipped++;
  }

  return NextResponse.json({ total: (restaurants ?? []).length, updated, skipped });
}
