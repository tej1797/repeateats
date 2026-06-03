// Server-side only — never import from client components.
// Finds a Google Places photo for a restaurant and returns the Places photo URL.
// The URL contains the API key, so callers MUST NOT expose it to browsers.
// Use the /api/restaurant-photo proxy route for <img> src values.

import { searchPlace, getPlaceDetails } from './google-places';

const PHOTO_BASE = 'https://maps.googleapis.com/maps/api/place/photo';

export async function getRestaurantPhotoUrl(
  name: string,
  city: string,
): Promise<string | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  // Reuse existing searchPlace — queries "name city Ontario Canada"
  const placeId = await searchPlace(name, city);
  if (!placeId) return null;

  // Reuse existing getPlaceDetails — returns photos array
  const details = await getPlaceDetails(placeId);
  const photoRef = details?.photos?.[0]?.photo_reference;
  if (!photoRef) return null;

  return `${PHOTO_BASE}?maxwidth=800&photo_reference=${encodeURIComponent(photoRef)}&key=${apiKey}`;
}
