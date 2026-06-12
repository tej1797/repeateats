/** Rough lat/lng for Ontario cities — used to bias Google Places search. */
export const ONTARIO_CITY_COORDS: Record<string, [number, number]> = {
  'GTA Area':           [43.65, -79.38],
  Toronto:              [43.65, -79.38],
  Mississauga:          [43.59, -79.64],
  Brampton:             [43.72, -79.76],
  Markham:              [43.86, -79.27],
  Scarborough:          [43.77, -79.23],
  'North York':         [43.76, -79.41],
  Etobicoke:            [43.62, -79.56],
  Vaughan:              [43.84, -79.51],
  'Richmond Hill':      [43.88, -79.44],
  Oakville:             [43.45, -79.69],
  Burlington:           [43.33, -79.80],
  Hamilton:             [43.26, -79.87],
  Kitchener:            [43.45, -80.49],
  Waterloo:             [43.46, -80.52],
  Cambridge:            [43.36, -80.31],
  'Kitchener-Waterloo': [43.45, -80.49],
  London:               [42.98, -81.25],
  Ottawa:               [45.42, -75.69],
  Oshawa:               [43.90, -78.86],
  Ajax:                 [43.85, -79.02],
  Pickering:            [43.84, -79.09],
  Milton:               [43.52, -79.88],
  Guelph:               [43.54, -80.25],
  Barrie:               [44.39, -79.69],
  'St. Catharines':     [43.16, -79.25],
};

export const DEFAULT_SEARCH_RADIUS_KM = 25;

export interface SearchLocation {
  label:    string;
  lat:      number;
  lng:      number;
  radiusKm: number;
  source:   'device' | 'restaurant' | 'city';
}

export function coordsForCity(city: string | null | undefined): [number, number] {
  if (!city) return ONTARIO_CITY_COORDS['GTA Area'];
  const normalized = city.trim().toLowerCase();
  const exact = Object.entries(ONTARIO_CITY_COORDS).find(
    ([name]) => name.toLowerCase() === normalized,
  );
  if (exact) return exact[1];
  const partial = Object.entries(ONTARIO_CITY_COORDS).find(
    ([name]) => normalized.includes(name.toLowerCase()) || name.toLowerCase().includes(normalized),
  );
  return partial ? partial[1] : ONTARIO_CITY_COORDS['GTA Area'];
}

export function nearestCityName(lat: number, lng: number): string {
  let nearest = 'GTA Area';
  let minDist = Infinity;
  for (const [name, [clat, clon]] of Object.entries(ONTARIO_CITY_COORDS)) {
    const dist = Math.hypot(lat - clat, lng - clon);
    if (dist < minDist) {
      minDist = dist;
      nearest = name;
    }
  }
  return nearest;
}

/** Word-boundary match — avoids "kham" matching "Markham". */
export function tokenMatchesWords(text: string, token: string): boolean {
  const t = token.toLowerCase();
  if (t.length < 2) return false;
  const words = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return words.some((w) => w.startsWith(t) || w === t);
}

export function scorePlaceMatch(
  query: string,
  fields: { name: string; address?: string; city?: string; cuisine?: string },
): number {
  const tokens = query.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
  if (!tokens.length) return 0;

  let score = 0;
  const nameLower = fields.name.toLowerCase();

  for (const token of tokens) {
    if (tokenMatchesWords(fields.name, token)) score += 25;
    else if (nameLower.includes(token)) score += 10;
    if (fields.cuisine && tokenMatchesWords(fields.cuisine, token)) score += 6;
    if (fields.city && tokenMatchesWords(fields.city, token)) score += 4;
    if (fields.address && tokenMatchesWords(fields.address, token)) score += 2;
  }

  return score;
}

export function resolveRestaurantSearchLocation(opts: {
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  deviceLat?: number | null;
  deviceLng?: number | null;
  radiusKm?: number;
}): SearchLocation {
  const radiusKm = opts.radiusKm ?? DEFAULT_SEARCH_RADIUS_KM;

  if (opts.deviceLat != null && opts.deviceLng != null) {
    return {
      label:    nearestCityName(opts.deviceLat, opts.deviceLng),
      lat:      opts.deviceLat,
      lng:      opts.deviceLng,
      radiusKm,
      source:   'device',
    };
  }

  if (opts.lat != null && opts.lng != null) {
    return {
      label:    opts.city?.trim() || nearestCityName(opts.lat, opts.lng),
      lat:      opts.lat,
      lng:      opts.lng,
      radiusKm,
      source:   'restaurant',
    };
  }

  const [lat, lng] = coordsForCity(opts.city);
  return {
    label:    opts.city?.trim() || 'GTA Area',
    lat,
    lng,
    radiusKm,
    source:   'city',
  };
}
