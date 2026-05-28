// GET /api/google-places?query=Karahi+Boys+Mississauga
// Proxies the Google Places API when GOOGLE_PLACES_API_KEY is set.
// Falls back to a curated Ontario restaurant database when the key is absent.
// Supports both ?q= and ?query= params for compatibility.

import { NextRequest, NextResponse } from 'next/server';
import type { PlaceResult } from '@/types/api';

// ─── Static Ontario restaurant database (fallback) ────────────────────────────
// Used when GOOGLE_PLACES_API_KEY is not set in the environment.
const ONTARIO_RESTAURANTS = [
  // ── Mississauga ──────────────────────────────────────────────────────────
  { name: 'Karahi Boys', address: '3024 Hurontario St, Mississauga, ON L5B 3C4', city: 'Mississauga', phone: '+1 905-270-0567', cuisine: 'Pakistani', rating: 4.7, place_id: 'static_miss_karahi1' },
  { name: 'Karahi Boys', address: '720 Dixie Rd, Mississauga, ON L4Y 3Y4', city: 'Mississauga', phone: '+1 905-272-9900', cuisine: 'Pakistani', rating: 4.5, place_id: 'static_miss_karahi2' },
  { name: 'Mughal Mahal', address: '2980 Drew Rd, Mississauga, ON L4T 0A7', city: 'Mississauga', phone: '+1 905-677-1234', cuisine: 'Indian', rating: 4.3, place_id: 'static_miss_mughal' },
  { name: 'Spice Route', address: '5230 Dixie Rd, Mississauga, ON L4W 4Y5', city: 'Mississauga', phone: '+1 905-602-8891', cuisine: 'Indian', rating: 4.6, place_id: 'static_miss_spice' },
  { name: 'Indian Sweet Master', address: '2390 Hurontario St, Mississauga, ON L5B 1N1', city: 'Mississauga', phone: '+1 905-273-4321', cuisine: 'Indian Sweets', rating: 4.3, place_id: 'static_miss_ism' },
  { name: 'Indian Sweet Palace', address: '1370 Dundas St E, Mississauga, ON L4X 1L4', city: 'Mississauga', phone: '+1 905-275-5555', cuisine: 'Indian Sweets', rating: 4.2, place_id: 'static_miss_isp' },
  { name: 'Guru Darbar', address: '2425 Hurontario St, Mississauga, ON L5A 2H2', city: 'Mississauga', phone: '+1 905-279-8888', cuisine: 'Indian', rating: 4.4, place_id: 'static_miss_guru' },
  { name: 'Sher-E-Punjab', address: '3415 Dixie Rd, Mississauga, ON L4Y 2B1', city: 'Mississauga', phone: '+1 905-625-2222', cuisine: 'Indian', rating: 4.1, place_id: 'static_miss_sep' },
  { name: 'Dhaba Express', address: '2344 Hurontario St, Mississauga, ON L5A 2G7', city: 'Mississauga', phone: '+1 905-272-4567', cuisine: 'Indian', rating: 4.2, place_id: 'static_miss_dhaba' },
  { name: 'Real Fruit Bubble Tea', address: '1151 Dundas St W, Mississauga, ON L5H 1H3', city: 'Mississauga', phone: '+1 905-891-5432', cuisine: 'Bubble Tea', rating: 4.3, place_id: 'static_miss_rfbt' },
  { name: 'Pita Land', address: '4141 Dixie Rd, Mississauga, ON L4W 1V4', city: 'Mississauga', phone: '+1 905-625-3333', cuisine: 'Mediterranean', rating: 4.2, place_id: 'static_miss_pita' },
  { name: 'Copper Branch', address: '100 City Centre Dr, Mississauga, ON L5B 2C9', city: 'Mississauga', phone: '+1 905-232-1234', cuisine: 'Vegan', rating: 4.3, place_id: 'static_miss_copper' },
  { name: 'Chili\'s Grill & Bar', address: '4141 Living Arts Dr, Mississauga, ON L5B 4C3', city: 'Mississauga', phone: '+1 905-276-0011', cuisine: 'Bar & Grill', rating: 4.1, place_id: 'static_miss_chilis' },
  // ── Brampton ─────────────────────────────────────────────────────────────
  { name: 'Nirvana Restaurant', address: '2130 North Park Dr, Brampton, ON L6S 0C9', city: 'Brampton', phone: '+1 905-792-9111', cuisine: 'Indian', rating: 4.4, place_id: 'static_bram_nirvana' },
  { name: 'Bombay Chowpatty', address: '10 Gillingham Dr, Brampton, ON L6X 5C5', city: 'Brampton', phone: '+1 905-451-9876', cuisine: 'Indian Street Food', rating: 4.5, place_id: 'static_bram_bombay' },
  { name: 'The Great Punjab', address: '45 McMurchy Ave S, Brampton, ON L6Y 1Y2', city: 'Brampton', phone: '+1 905-455-2345', cuisine: 'Indian', rating: 4.3, place_id: 'static_bram_punjab' },
  { name: 'Shan-e-Punjab', address: '197 Queen St E, Brampton, ON L6W 2B3', city: 'Brampton', phone: '+1 905-457-8888', cuisine: 'Indian', rating: 4.2, place_id: 'static_bram_shan' },
  // ── Toronto ───────────────────────────────────────────────────────────────
  { name: 'India\'s Taste', address: '1315 Lawrence Ave E, Toronto, ON M3A 3R3', city: 'Toronto', phone: '+1 416-385-5678', cuisine: 'Indian', rating: 4.5, place_id: 'static_tor_indias' },
  { name: 'King Tandoori', address: '1446 Gerrard St E, Toronto, ON M4L 1Z7', city: 'Toronto', phone: '+1 416-466-5177', cuisine: 'Indian', rating: 4.4, place_id: 'static_tor_king' },
  { name: 'Lahore Tikka House', address: '1365 Gerrard St E, Toronto, ON M4L 1Z1', city: 'Toronto', phone: '+1 416-406-1668', cuisine: 'Pakistani', rating: 4.3, place_id: 'static_tor_lahore' },
  { name: 'Udupi Palace', address: '1460 Gerrard St E, Toronto, ON M4L 2A2', city: 'Toronto', phone: '+1 416-405-8189', cuisine: 'South Indian', rating: 4.5, place_id: 'static_tor_udupi' },
  { name: 'Kinka Izakaya', address: '398 Church St, Toronto, ON M5B 2A2', city: 'Toronto', phone: '+1 416-977-0999', cuisine: 'Japanese', rating: 4.4, place_id: 'static_tor_kinka' },
  { name: 'Pai Northern Thai Kitchen', address: '18 Duncan St, Toronto, ON M5H 3G8', city: 'Toronto', phone: '+1 416-901-4724', cuisine: 'Thai', rating: 4.5, place_id: 'static_tor_pai' },
  { name: 'Jackpot Chicken Rice', address: '306 Adelaide St W, Toronto, ON M5V 1P7', city: 'Toronto', phone: '+1 416-916-7162', cuisine: 'Chinese', rating: 4.4, place_id: 'static_tor_jackpot' },
  { name: 'Richmond Station', address: '1 Richmond St W, Toronto, ON M5H 3W4', city: 'Toronto', phone: '+1 647-748-1444', cuisine: 'Canadian', rating: 4.5, place_id: 'static_tor_richmond' },
  { name: 'Bar Isabel', address: '797 College St, Toronto, ON M6G 1C7', city: 'Toronto', phone: '+1 416-532-2222', cuisine: 'Spanish', rating: 4.6, place_id: 'static_tor_isabel' },
  { name: 'Gusto 101', address: '101 Portland St, Toronto, ON M5V 2N3', city: 'Toronto', phone: '+1 416-504-9669', cuisine: 'Italian', rating: 4.4, place_id: 'static_tor_gusto' },
  // ── Markham ───────────────────────────────────────────────────────────────
  { name: 'Congee Queen', address: '4625 Hwy 7, Markham, ON L3R 1M5', city: 'Markham', phone: '+1 905-947-8282', cuisine: 'Chinese', rating: 4.2, place_id: 'static_mark_congee' },
  { name: 'Spring Rolls', address: '3261 Hwy 7, Markham, ON L3R 3Z6', city: 'Markham', phone: '+1 905-881-1111', cuisine: 'Asian', rating: 4.1, place_id: 'static_mark_spring' },
  { name: 'Fishman Lobster Clubhouse', address: '418 Hwy 7 E, Markham, ON L3R 8H8', city: 'Markham', phone: '+1 905-305-2888', cuisine: 'Seafood', rating: 4.5, place_id: 'static_mark_fish' },
  // ── Vaughan / Richmond Hill ───────────────────────────────────────────────
  { name: 'Buca Yorkville', address: '53 Scollard St, Toronto, ON M5R 1G4', city: 'Toronto', phone: '+1 416-865-1600', cuisine: 'Italian', rating: 4.6, place_id: 'static_tor_buca' },
  { name: 'Maple Yip Chinese Restaurant', address: '8388 Yonge St, Richmond Hill, ON L4C 7A4', city: 'Richmond Hill', phone: '+1 905-883-0083', cuisine: 'Chinese', rating: 4.3, place_id: 'static_rh_maple' },
  // ── Hamilton ──────────────────────────────────────────────────────────────
  { name: 'Mezcal Mexican Cantina', address: '112 King St E, Hamilton, ON L8N 1A8', city: 'Hamilton', phone: '+1 905-527-6100', cuisine: 'Mexican', rating: 4.4, place_id: 'static_ham_mez' },
  { name: 'Rapscallion', address: '61 Young St, Hamilton, ON L8N 1V1', city: 'Hamilton', phone: '+1 905-777-9999', cuisine: 'Bar & Grill', rating: 4.5, place_id: 'static_ham_raps' },
  { name: 'The Ship', address: '23 Barton St E, Hamilton, ON L8L 2W9', city: 'Hamilton', phone: '+1 905-528-8356', cuisine: 'British Pub', rating: 4.3, place_id: 'static_ham_ship' },
  // ── Kitchener-Waterloo ────────────────────────────────────────────────────
  { name: 'Charcoal Steak House', address: '2980 King St E, Kitchener, ON N2A 1A9', city: 'Kitchener', phone: '+1 519-893-6570', cuisine: 'Steakhouse', rating: 4.6, place_id: 'static_kit_charcoal' },
  { name: 'The Bauer Kitchen', address: '187 King St S, Waterloo, ON N2L 0A5', city: 'Waterloo', phone: '+1 519-772-0790', cuisine: 'Canadian', rating: 4.5, place_id: 'static_wat_bauer' },
  { name: 'Lancaster Smokehouse', address: '574 Lancaster St W, Kitchener, ON N2K 1M3', city: 'Kitchener', phone: '+1 519-743-4331', cuisine: 'BBQ', rating: 4.6, place_id: 'static_kit_lanc' },
  { name: 'PUBLIC Kitchen & Bar', address: '300 Victoria St N, Kitchener, ON N2H 6R8', city: 'Kitchener', phone: '+1 519-954-8111', cuisine: 'Bar & Grill', rating: 4.6, place_id: 'static_kit_public' },
  { name: 'Del\'s Italian Kitchen', address: '2980 King St E, Kitchener, ON N2A 1A9', city: 'Kitchener', phone: '+1 519-893-2911', cuisine: 'Italian', rating: 4.6, place_id: 'static_kit_dels' },
  { name: 'Wildcraft Grill', address: '425 King St W, Kitchener, ON N2G 1C4', city: 'Kitchener', phone: '+1 519-804-2790', cuisine: 'Grill', rating: 4.4, place_id: 'static_kit_wild' },
  { name: 'Bhima\'s Warung', address: '102 King St S, Waterloo, ON N2J 1P5', city: 'Waterloo', phone: '+1 519-886-1212', cuisine: 'Indonesian', rating: 4.5, place_id: 'static_wat_bhima' },
  // ── Ottawa ────────────────────────────────────────────────────────────────
  { name: 'Beckta', address: '150 Elgin St, Ottawa, ON K2P 1L4', city: 'Ottawa', phone: '+1 613-238-7063', cuisine: 'Canadian Fine Dining', rating: 4.7, place_id: 'static_ott_beckta' },
  { name: 'El Camino', address: '380 Elgin St, Ottawa, ON K2P 1N1', city: 'Ottawa', phone: '+1 613-422-2800', cuisine: 'Mexican', rating: 4.5, place_id: 'static_ott_camino' },
  { name: 'Murray Street', address: '110 Murray St, Ottawa, ON K1N 5M5', city: 'Ottawa', phone: '+1 613-562-7244', cuisine: 'Canadian', rating: 4.5, place_id: 'static_ott_murray' },
] as const;

// ─── Details mode: /api/google-places?fetch=details&place_id=ChIJ… ────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  if (searchParams.get('fetch') === 'details') {
    const placeId = searchParams.get('place_id');
    if (!placeId) {
      return NextResponse.json({ error: 'place_id param is required' }, { status: 400 });
    }
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ data: null });
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
          place_id: string; name: string; rating?: number;
          user_ratings_total?: number;
          reviews?: Array<{
            author_name: string; rating: number; text: string;
            relative_time_description: string; profile_photo_url?: string;
          }>;
        };
      };
      if (data.status !== 'OK' || !data.result) return NextResponse.json({ data: null });
      return NextResponse.json({ data: data.result });
    } catch (err) {
      console.error('[google-places/details]', err);
      return NextResponse.json({ error: 'Failed to fetch place details' }, { status: 502 });
    }
  }

  // ── Text search mode: ?query= or ?q= ─────────────────────────────────────
  // Support both param names for compatibility with existing UI calls
  const query = searchParams.get('query') ?? searchParams.get('q') ?? '';

  if (!query || query.length < 2) {
    return NextResponse.json({ data: [] });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  // ── Try Google Places API ─────────────────────────────────────────────────
  if (apiKey) {
    try {
      const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
      searchUrl.searchParams.set('query', `${query} Ontario Canada`);
      searchUrl.searchParams.set('key', apiKey);

      const searchRes  = await fetch(searchUrl.toString());
      const searchData = await searchRes.json() as {
        results: Array<{
          place_id: string; name: string; formatted_address: string;
          rating?: number; types: string[];
        }>;
        status: string;
      };

      if (searchData.status === 'OK' && searchData.results.length > 0) {
        const topResults = searchData.results.slice(0, 5);

        const detailed: PlaceResult[] = await Promise.all(
          topResults.map(async (place) => {
            const detailUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
            detailUrl.searchParams.set('place_id', place.place_id);
            detailUrl.searchParams.set('fields', 'name,formatted_address,formatted_phone_number,website,opening_hours,rating,types');
            detailUrl.searchParams.set('key', apiKey);

            const detailRes  = await fetch(detailUrl.toString());
            const detailData = await detailRes.json() as {
              result: {
                name: string; formatted_address: string;
                formatted_phone_number?: string; website?: string;
                opening_hours?: { weekday_text: string[] };
                rating?: number; types: string[];
              };
            };

            const r = detailData.result;
            return {
              place_id: place.place_id,
              name:     r.name,
              address:  r.formatted_address,
              phone:    r.formatted_phone_number ?? null,
              website:  r.website ?? null,
              hours:    r.opening_hours?.weekday_text?.join(' · ') ?? null,
              rating:   r.rating ?? null,
              types:    r.types ?? [],
              source:   'google' as const,
            };
          })
        );

        return NextResponse.json({ data: detailed });
      }
    } catch (err) {
      console.error('[google-places/google-api]', err);
      // Fall through to static fallback
    }
  }

  // ── Static Ontario fallback ───────────────────────────────────────────────
  const q = query.toLowerCase();
  const matches = ONTARIO_RESTAURANTS.filter((r) =>
    r.name.toLowerCase().includes(q)    ||
    r.address.toLowerCase().includes(q) ||
    r.city.toLowerCase().includes(q)    ||
    r.cuisine.toLowerCase().includes(q)
  ).slice(0, 8);

  const results: PlaceResult[] = matches.map((r) => ({
    place_id: r.place_id,
    name:     r.name,
    address:  r.address,
    phone:    r.phone,
    website:  null,
    hours:    null,
    rating:   r.rating,
    types:    [],
    source:   'database' as const,
  }));

  return NextResponse.json({ data: results });
}
