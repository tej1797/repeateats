'use client';

// Shows Google reviews inside the DealModal.
// Fetches from /api/restaurants/[id]/reviews — returns cached data instantly,
// then the server triggers a background refresh if the cache is > 24h old.

import { useState, useEffect, useRef } from 'react';
import StarRating from './StarRating';

interface GoogleReview {
  author_name: string;
  rating: number;
  text: string;
  relative_time_description: string;
}

interface ReviewsData {
  google_place_id:     string | null;
  google_rating:       number | null;
  google_review_count: number | null;
  google_reviews:      GoogleReview[] | null;
}

export default function ReviewsSection({
  restaurantId,
}: {
  restaurantId: string;
}) {
  const [data,    setData]    = useState<ReviewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return; // only fetch once per mount
    fetched.current = true;
    fetch(`/api/restaurants/${restaurantId}/reviews`)
      .then((r) => r.json())
      .then((json) => { if (json.data) setData(json.data); })
      .catch(() => { /* no reviews available */ })
      .finally(() => setLoading(false));
  }, [restaurantId]);

  if (loading) {
    return (
      <div className="mt-5 pt-4 border-t border-[var(--bd)]">
        <div className="h-4 w-36 bg-surface2 rounded-full animate-pulse mb-3" />
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[72px] bg-surface2 rounded-brands animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Nothing to show if no reviews or rating
  if (!data || (!data.google_rating && !data.google_reviews?.length)) return null;

  return (
    <div className="mt-5 pt-4 border-t border-[var(--bd)]">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-body font-bold text-[13px]">Google Reviews</span>
        {data.google_rating !== null && (
          <StarRating
            rating={data.google_rating}
            count={data.google_review_count ?? undefined}
            size="sm"
          />
        )}
      </div>

      {/* Review cards */}
      {data.google_reviews && data.google_reviews.length > 0 && (
        <div className="space-y-2.5 mb-3">
          {data.google_reviews.slice(0, 4).map((review, i) => (
            <div key={i} className="bg-surface2 rounded-brands p-3">
              <div className="flex items-center gap-2 mb-1.5">
                {/* Initials avatar */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[11px] font-bold"
                  style={{ background: '#E85D04' }}
                >
                  {review.author_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold truncate leading-none mb-0.5">
                    {review.author_name}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <StarRating rating={review.rating} size="sm" showNumber={false} />
                    <span className="text-[11px] text-t3">{review.relative_time_description}</span>
                  </div>
                </div>
              </div>
              <p className="text-[12px] text-t2 leading-relaxed line-clamp-3">{review.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Google attribution */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-t3">Powered by Google</span>
        {data.google_place_id && (
          <a
            href={`https://www.google.com/maps/place/?q=place_id:${data.google_place_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-brand hover:underline font-medium"
          >
            View on Google Maps
          </a>
        )}
      </div>
    </div>
  );
}
