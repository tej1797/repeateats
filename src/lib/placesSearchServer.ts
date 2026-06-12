import type { PlaceResult } from '@/types/api';

export interface GoogleSearchDiag {
  hasApiKey:    boolean;
  autocomplete: string | null;
  findPlace:    string | null;
  textSearch:   string | null;
  placesNew:    string | null;
  errors:       string[];
}

type Candidate = { place_id: string; name: string; address: string };

function normalizePlaceId(id: string): string {
  return id.replace(/^places\//, '');
}

function locationBiasCircle(lat: number, lng: number, radiusM: number): string {
  return `circle:${radiusM}@${lat},${lng}`;
}

async function fetchLegacyDetails(
  placeId: string,
  apiKey: string,
  fallback?: Candidate,
): Promise<PlaceResult> {
  const detailUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  detailUrl.searchParams.set('place_id', normalizePlaceId(placeId));
  detailUrl.searchParams.set(
    'fields',
    'place_id,name,formatted_address,formatted_phone_number,website,opening_hours,rating,types',
  );
  detailUrl.searchParams.set('key', apiKey);

  const detailRes  = await fetch(detailUrl.toString(), { cache: 'no-store' });
  const detailData = await detailRes.json() as {
    status: string;
    error_message?: string;
    result?: {
      name: string;
      formatted_address: string;
      formatted_phone_number?: string;
      website?: string;
      opening_hours?: { weekday_text: string[] };
      rating?: number;
      types: string[];
    };
  };

  if (detailData.status !== 'OK' || !detailData.result) {
    return {
      place_id:  normalizePlaceId(placeId),
      name:      fallback?.name ?? 'Unknown',
      address:   fallback?.address ?? '',
      phone:     null,
      website:   null,
      hours:     null,
      hours_raw: null,
      rating:    null,
      types:     [],
      source:    'google',
    };
  }

  const r = detailData.result;
  return {
    place_id:  normalizePlaceId(placeId),
    name:      r.name,
    address:   r.formatted_address,
    phone:     r.formatted_phone_number ?? null,
    website:   r.website ?? null,
    hours:     r.opening_hours?.weekday_text?.join(' · ') ?? null,
    hours_raw: r.opening_hours?.weekday_text ?? null,
    rating:    r.rating ?? null,
    types:     r.types ?? [],
    source:    'google',
  };
}

async function autocompleteCandidates(
  query: string,
  lat: number,
  lng: number,
  radiusM: number,
  apiKey: string,
): Promise<{ status: string; error?: string; candidates: Candidate[] }> {
  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
  url.searchParams.set('input', query);
  url.searchParams.set('location', `${lat},${lng}`);
  url.searchParams.set('radius', String(radiusM));
  url.searchParams.set('components', 'country:ca');
  url.searchParams.set('key', apiKey);

  const res  = await fetch(url.toString(), { cache: 'no-store' });
  const data = await res.json() as {
    status: string;
    error_message?: string;
    predictions?: Array<{
      place_id: string;
      description: string;
      structured_formatting: { main_text: string; secondary_text?: string };
      types?: string[];
    }>;
  };

  if (data.status !== 'OK' || !data.predictions?.length) {
    return { status: data.status, error: data.error_message, candidates: [] };
  }

  const candidates = data.predictions
    .filter((p) => !p.types?.every((t) => ['locality', 'political', 'geocode'].includes(t)))
    .slice(0, 6)
    .map((p) => ({
      place_id: p.place_id,
      name:     p.structured_formatting.main_text,
      address:  p.structured_formatting.secondary_text ?? p.description,
    }));

  return { status: data.status, candidates };
}

async function findPlaceCandidates(
  query: string,
  lat: number,
  lng: number,
  radiusM: number,
  apiKey: string,
): Promise<{ status: string; error?: string; candidates: Candidate[] }> {
  const url = new URL('https://maps.googleapis.com/maps/api/place/findplacefromtext/json');
  url.searchParams.set('input', query);
  url.searchParams.set('inputtype', 'textquery');
  url.searchParams.set('fields', 'place_id,name,formatted_address,rating');
  url.searchParams.set('locationbias', locationBiasCircle(lat, lng, radiusM));
  url.searchParams.set('key', apiKey);

  const res  = await fetch(url.toString(), { cache: 'no-store' });
  const data = await res.json() as {
    status: string;
    error_message?: string;
    candidates?: Array<{ place_id: string; name: string; formatted_address: string }>;
  };

  if (data.status !== 'OK' || !data.candidates?.length) {
    return { status: data.status, error: data.error_message, candidates: [] };
  }

  return {
    status: data.status,
    candidates: data.candidates.slice(0, 6).map((p) => ({
      place_id: p.place_id,
      name:     p.name,
      address:  p.formatted_address,
    })),
  };
}

async function textSearchCandidates(
  query: string,
  lat: number,
  lng: number,
  radiusM: number,
  apiKey: string,
): Promise<{ status: string; error?: string; candidates: Candidate[] }> {
  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  url.searchParams.set('query', query);
  url.searchParams.set('location', `${lat},${lng}`);
  url.searchParams.set('radius', String(radiusM));
  url.searchParams.set('type', 'restaurant');
  url.searchParams.set('key', apiKey);

  const res  = await fetch(url.toString(), { cache: 'no-store' });
  const data = await res.json() as {
    status: string;
    error_message?: string;
    results?: Array<{ place_id: string; name: string; formatted_address: string }>;
  };

  if (data.status !== 'OK' || !data.results?.length) {
    return { status: data.status, error: data.error_message, candidates: [] };
  }

  return {
    status: data.status,
    candidates: data.results.slice(0, 6).map((p) => ({
      place_id: p.place_id,
      name:     p.name,
      address:  p.formatted_address,
    })),
  };
}

async function placesNewCandidates(
  query: string,
  lat: number,
  lng: number,
  radiusM: number,
  apiKey: string,
): Promise<{ status: string; error?: string; candidates: Candidate[] }> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method:  'POST',
    cache:   'no-store',
    headers: {
      'Content-Type':     'application/json',
      'X-Goog-Api-Key':   apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.nationalPhoneNumber,places.websiteUri,places.regularOpeningHours,places.types',
    },
    body: JSON.stringify({
      textQuery:            query,
      languageCode:         'en',
      includedRegionCodes:  ['ca'],
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: radiusM,
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { status: `HTTP_${res.status}`, error: text.slice(0, 200), candidates: [] };
  }

  const data = await res.json() as {
    places?: Array<{
      id: string;
      displayName?: { text: string };
      formattedAddress?: string;
      rating?: number;
      nationalPhoneNumber?: string;
      websiteUri?: string;
      regularOpeningHours?: { weekdayDescriptions?: string[] };
      types?: string[];
    }>;
    error?: { message?: string };
  };

  if (!data.places?.length) {
    return { status: data.error ? 'ERROR' : 'ZERO_RESULTS', error: data.error?.message, candidates: [] };
  }

  return {
    status: 'OK',
    candidates: data.places.slice(0, 6).map((p) => ({
      place_id: normalizePlaceId(p.id),
      name:     p.displayName?.text ?? 'Unknown',
      address:  p.formattedAddress ?? '',
    })),
  };
}

function mergeCandidates(...lists: Candidate[][]): Candidate[] {
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const list of lists) {
    for (const c of list) {
      const key = normalizePlaceId(c.place_id);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ...c, place_id: key });
    }
  }
  return out.slice(0, 6);
}

export async function googlePlacesSearch(
  query: string,
  lat: number,
  lng: number,
  radiusKm: number,
  apiKey: string,
  city?: string | null,
): Promise<{ places: PlaceResult[]; diag: GoogleSearchDiag }> {
  const radiusM = Math.min(50_000, Math.round(radiusKm * 1000));
  const diag: GoogleSearchDiag = {
    hasApiKey:    true,
    autocomplete: null,
    findPlace:    null,
    textSearch:   null,
    placesNew:    null,
    errors:       [],
  };

  const boosted = city?.trim() ? `${query} ${city.trim()}` : query;

  const [auto, find, text, placesNew] = await Promise.all([
    autocompleteCandidates(query, lat, lng, radiusM, apiKey),
    findPlaceCandidates(boosted, lat, lng, radiusM, apiKey),
    textSearchCandidates(boosted, lat, lng, radiusM, apiKey),
    placesNewCandidates(boosted, lat, lng, radiusM, apiKey),
  ]);

  diag.autocomplete = auto.status;
  diag.findPlace    = find.status;
  diag.textSearch   = text.status;
  diag.placesNew    = placesNew.status;

  for (const block of [auto, find, text, placesNew]) {
    if (block.error) diag.errors.push(block.error);
  }

  const candidates = mergeCandidates(
    auto.candidates,
    find.candidates,
    text.candidates,
    placesNew.candidates,
  );

  if (!candidates.length) {
    if (diag.errors.length) {
      console.error('[google-places]', query, JSON.stringify(diag));
    }
    return { places: [], diag };
  }

  const detailed = await Promise.all(
    candidates.map((c) => fetchLegacyDetails(c.place_id, apiKey, c)),
  );

  return { places: detailed, diag };
}

export { fetchLegacyDetails as fetchGooglePlaceDetails };
