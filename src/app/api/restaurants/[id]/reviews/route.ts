// GET /api/restaurants/[id]/reviews
// Returns cached Google reviews from Supabase.
// If the cache is older than 24 hours and a Google API key is set,
// triggers a background refresh (fire-and-forget — response is instant).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteParams = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('restaurants')
    .select('name, city, google_place_id, google_rating, google_review_count, google_reviews, last_synced_at')
    .eq('id', params.id)
    .single();

  if (error) {
    // 404 if not found
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    // If google review columns don't exist yet, return empty data gracefully
    // (PGRST204 = column not found, PostgREST unknown column error)
    return NextResponse.json({
      data: {
        google_place_id:     null,
        google_rating:       null,
        google_review_count: null,
        google_reviews:      null,
      },
    });
  }

  // Trigger a background refresh if data is stale (> 24h) or never synced.
  const lastSync = data.last_synced_at ? new Date(data.last_synced_at).getTime() : 0;
  const isStale  = Date.now() - lastSync > 24 * 60 * 60 * 1000;

  if (isStale && process.env.GOOGLE_PLACES_API_KEY) {
    // Fire-and-forget — response is returned immediately below
    import('@/lib/google-places')
      .then(({ syncRestaurantReviews }) =>
        syncRestaurantReviews(params.id, data.name, data.city).catch(console.error)
      )
      .catch(console.error);
  }

  return NextResponse.json({
    data: {
      google_place_id:     data.google_place_id     ?? null,
      google_rating:       data.google_rating        ?? null,
      google_review_count: data.google_review_count  ?? null,
      google_reviews:      data.google_reviews        ?? null,
    },
  });
}
