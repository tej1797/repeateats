// Server-side Google Places helpers.
// Only import from Route Handlers or Server Components — never from client code.
// Uses GOOGLE_PLACES_API_KEY (no NEXT_PUBLIC_ prefix, stays server-only).

export interface GoogleReview {
  author_name: string;
  rating: number;                      // 1–5
  text: string;
  relative_time_description: string;   // e.g. "2 months ago"
  profile_photo_url?: string;
}

export interface PlaceDetails {
  place_id: string;
  name: string;
  rating?: number;
  user_ratings_total?: number;
  reviews?: GoogleReview[];
  photos?: { photo_reference: string; height: number; width: number }[];
}

const BASE = 'https://maps.googleapis.com/maps/api/place';

// Returns full place details (including reviews) for a known place_id.
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  const url = new URL(`${BASE}/details/json`);
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', 'place_id,name,rating,user_ratings_total,reviews,photos');
  url.searchParams.set('key', apiKey);

  const res  = await fetch(url.toString(), { cache: 'no-store' });
  const data = await res.json() as { status: string; result?: PlaceDetails };

  if (data.status !== 'OK' || !data.result) return null;
  return data.result;
}

// Searches Google Maps for a restaurant by name + city and returns the best place_id.
export async function searchPlace(name: string, city: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  const url = new URL(`${BASE}/textsearch/json`);
  url.searchParams.set('query', `${name} ${city} Ontario Canada`);
  url.searchParams.set('key', apiKey);

  const res  = await fetch(url.toString(), { cache: 'no-store' });
  const data = await res.json() as { status: string; results?: Array<{ place_id: string }> };

  if (data.status !== 'OK' || !data.results?.length) return null;
  return data.results[0].place_id;
}

// Fetches reviews from Google and writes them to Supabase for the given restaurant.
// Safe to call without awaiting (fire-and-forget background sync).
export async function syncRestaurantReviews(
  restaurantId: string,
  name: string,
  city: string,
): Promise<void> {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = createClient();

  // Use stored place_id if we already have one, otherwise search for it.
  const { data: row } = await supabase
    .from('restaurants')
    .select('google_place_id')
    .eq('id', restaurantId)
    .single();

  let placeId = (row?.google_place_id ?? null) as string | null;
  if (!placeId) {
    placeId = await searchPlace(name, city);
    if (!placeId) return;
  }

  const details = await getPlaceDetails(placeId);
  if (!details) return;

  await supabase
    .from('restaurants')
    .update({
      google_place_id:     placeId,
      google_rating:       details.rating       ?? null,
      google_review_count: details.user_ratings_total ?? null,
      google_reviews:      details.reviews       ?? null,
      google_photos:       details.photos        ?? null,
      last_synced_at:      new Date().toISOString(),
    })
    .eq('id', restaurantId);
}
