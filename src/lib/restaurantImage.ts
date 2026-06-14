/** Client-safe restaurant hero/thumbnail URL — cover_url → Google proxy → cuisine fallback. */

type RestaurantLike = {
  name: string;
  city?: string | null;
  category?: string | null;
  cuisine?: string | null;
  cover_url?: string | null;
};

export function restaurantPhotoProxyUrl(restaurant: RestaurantLike): string {
  const cuisine = (restaurant.category ?? restaurant.cuisine ?? 'default').toLowerCase();
  return `/api/restaurant-photo?name=${encodeURIComponent(restaurant.name)}&city=${encodeURIComponent(restaurant.city ?? '')}&cuisine=${encodeURIComponent(cuisine)}`;
}

export function initialRestaurantImageSrc(
  restaurant: RestaurantLike | null | undefined,
  cuisineFallbacks: Record<string, string>,
): string {
  if (!restaurant) return cuisineFallbacks.default;
  const cuisine = (restaurant.category ?? restaurant.cuisine ?? 'default').toLowerCase();
  const fallback = cuisineFallbacks[cuisine] ?? cuisineFallbacks.default;
  return restaurant.cover_url ?? restaurantPhotoProxyUrl(restaurant) ?? fallback;
}

export function nextRestaurantImageFallback(
  restaurant: RestaurantLike | null | undefined,
  currentSrc: string,
  cuisineFallbacks: Record<string, string>,
): string | null {
  if (!restaurant) return null;
  const cuisine = (restaurant.category ?? restaurant.cuisine ?? 'default').toLowerCase();
  const fallback = cuisineFallbacks[cuisine] ?? cuisineFallbacks.default;
  const proxy = restaurantPhotoProxyUrl(restaurant);

  if (restaurant.cover_url && currentSrc === restaurant.cover_url) return proxy;
  if (currentSrc === proxy || currentSrc.includes('/api/restaurant-photo')) return fallback;
  return null;
}
