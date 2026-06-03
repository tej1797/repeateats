// GET /api/restaurant-photo?name=...&city=...
// Server-side proxy: fetches a Google Places photo and returns the image bytes.
// The API key never appears in the browser — only this route sees it.
// Response cached for 24 hours so repeated renders don't re-hit the Places API.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getRestaurantPhotoUrl } from '@/lib/getRestaurantPhoto';

// Cuisine-based Unsplash fallbacks — used when Google Places has no photo
const CUISINE_FALLBACKS: Record<string, string> = {
  indian:     'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80',
  pakistani:  'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800&q=80',
  chinese:    'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&q=80',
  italian:    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
  japanese:   'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80',
  mexican:    'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&q=80',
  bbq:        'https://images.unsplash.com/photo-1558030006-450675393462?w=800&q=80',
  burgers:    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
  pizza:      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80',
  thai:       'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=800&q=80',
  default:    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name    = searchParams.get('name')?.trim();
  const city    = searchParams.get('city')?.trim();
  const cuisine = searchParams.get('cuisine')?.toLowerCase() ?? 'default';

  if (!name || !city) {
    return NextResponse.json({ error: 'name and city are required' }, { status: 400 });
  }

  try {
    const placesUrl = await getRestaurantPhotoUrl(name, city);

    if (placesUrl) {
      // Fetch the actual image from Google (they redirect to the real CDN URL)
      const imgRes = await fetch(placesUrl, { redirect: 'follow' });
      if (imgRes.ok) {
        const buffer = await imgRes.arrayBuffer();
        return new NextResponse(buffer, {
          headers: {
            'Content-Type':  imgRes.headers.get('Content-Type') ?? 'image/jpeg',
            'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
          },
        });
      }
    }
  } catch {
    // Fall through to redirect fallback below
  }

  // No Google photo — redirect to a real food photo by cuisine
  const fallback = CUISINE_FALLBACKS[cuisine] ?? CUISINE_FALLBACKS.default;
  return NextResponse.redirect(fallback, { status: 302 });
}
