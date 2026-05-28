// GET /api/google-places?query=Karahi+Boys+Mississauga
// Proxies the Google Places API so we don't expose the API key to the browser.
// Used in the restaurant onboarding "auto-fill from Google Maps" feature.

import { NextRequest, NextResponse } from 'next/server';
import type { PlaceResult } from '@/types/api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // ── Mode 2: ?fetch=details&place_id=ChIJ… ─────────────────────────────
  // Returns reviews + rating for a known place_id (used by ReviewsSection).
  if (searchParams.get('fetch') === 'details') {
    const placeId = searchParams.get('place_id');
    if (!placeId) {
      return NextResponse.json({ error: 'place_id param is required' }, { status: 400 });
    }
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Google Places API key not configured' }, { status: 503 });
    }
    try {
      const detailUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
      detailUrl.searchParams.set('place_id', placeId);
      detailUrl.searchParams.set('fields', 'place_id,name,rating,user_ratings_total,reviews,photos');
      detailUrl.searchParams.set('key', apiKey);

      const res  = await fetch(detailUrl.toString(), { cache: 'no-store' });
      const data = await res.json() as {
        status: string;
        result?: {
          place_id: string;
          name: string;
          rating?: number;
          user_ratings_total?: number;
          reviews?: Array<{
            author_name: string;
            rating: number;
            text: string;
            relative_time_description: string;
            profile_photo_url?: string;
          }>;
        };
      };
      if (data.status !== 'OK' || !data.result) {
        return NextResponse.json({ data: null });
      }
      return NextResponse.json({ data: data.result });
    } catch (err) {
      console.error('[google-places/details]', err);
      return NextResponse.json({ error: 'Failed to fetch place details' }, { status: 502 });
    }
  }

  // ── Mode 1 (default): ?query=Restaurant+Name — text search ────────────
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'query param is required' }, { status: 400 });
  }

  // GOOGLE_PLACES_API_KEY is a server-only env var (no NEXT_PUBLIC_ prefix)
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Places API key not configured' },
      { status: 503 }
    );
  }

  try {
    // Step 1: Text search to find the place
    const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
    searchUrl.searchParams.set('query', `${query} Ontario Canada`);
    searchUrl.searchParams.set('key', apiKey);

    const searchRes  = await fetch(searchUrl.toString());
    const searchData = await searchRes.json() as {
      results: Array<{
        place_id: string;
        name: string;
        formatted_address: string;
        rating?: number;
        types: string[];
      }>;
      status: string;
    };

    if (searchData.status !== 'OK' || !searchData.results.length) {
      return NextResponse.json({ data: [] });
    }

    // Step 2: Fetch details for the top results (up to 3)
    const topResults = searchData.results.slice(0, 3);

    const detailed: PlaceResult[] = await Promise.all(
      topResults.map(async (place) => {
        const detailUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
        detailUrl.searchParams.set('place_id', place.place_id);
        detailUrl.searchParams.set('fields', 'name,formatted_address,formatted_phone_number,website,opening_hours,rating,types');
        detailUrl.searchParams.set('key', apiKey);

        const detailRes  = await fetch(detailUrl.toString());
        const detailData = await detailRes.json() as {
          result: {
            name: string;
            formatted_address: string;
            formatted_phone_number?: string;
            website?: string;
            opening_hours?: { weekday_text: string[] };
            rating?: number;
            types: string[];
          };
        };

        const r = detailData.result;
        return {
          place_id:  place.place_id,
          name:      r.name,
          address:   r.formatted_address,
          phone:     r.formatted_phone_number ?? null,
          website:   r.website ?? null,
          // weekday_text is an array like ["Monday: 11:00 AM – 10:00 PM", ...]
          hours:     r.opening_hours?.weekday_text?.join(' · ') ?? null,
          rating:    r.rating ?? null,
          types:     r.types ?? [],
        };
      })
    );

    return NextResponse.json({ data: detailed });

  } catch (err) {
    console.error('[google-places]', err);
    return NextResponse.json({ error: 'Failed to fetch from Google Places' }, { status: 502 });
  }
}
