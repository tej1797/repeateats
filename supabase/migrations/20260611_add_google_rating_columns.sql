-- Google Places review cache columns (used by syncRestaurantReviews + customer ratings)
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS google_rating       numeric,
  ADD COLUMN IF NOT EXISTS google_review_count integer,
  ADD COLUMN IF NOT EXISTS google_reviews      jsonb,
  ADD COLUMN IF NOT EXISTS google_photos       jsonb,
  ADD COLUMN IF NOT EXISTS last_synced_at      timestamptz;
