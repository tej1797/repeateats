'use client';

// Renders filled gold stars (supports half-stars) for a 0.0–5.0 rating.
// Sizes: sm (12px), md (16px), lg (20px)

interface StarRatingProps {
  rating: number;
  count?: number;        // optional "(312)" label beside rating number
  size?: 'sm' | 'md' | 'lg';
  showNumber?: boolean;  // show the numeric rating next to stars (default true)
}

const PX = { sm: 12, md: 16, lg: 20 } as const;

function Star({ fill, size, id }: { fill: 'full' | 'half' | 'empty'; size: number; id: string }) {
  const path = 'M10 2l2.39 4.84 5.34.78-3.86 3.77.91 5.32L10 14.27l-4.78 2.51.91-5.32L2.27 7.62l5.34-.78z';
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      {fill === 'half' && (
        <defs>
          <clipPath id={id}>
            <rect x="0" y="0" width="10" height="20" />
          </clipPath>
        </defs>
      )}
      {/* Empty star background */}
      <path d={path} fill="#D1D5DB" />
      {/* Filled portion */}
      {fill === 'full' && <path d={path} fill="#F59E0B" />}
      {fill === 'half' && <path d={path} fill="#F59E0B" clipPath={`url(#${id})`} />}
    </svg>
  );
}

export default function StarRating({
  rating,
  count,
  size = 'md',
  showNumber = true,
}: StarRatingProps) {
  const px = PX[size];

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {Array.from({ length: 5 }, (_, i) => {
        const val  = rating - i;
        const fill = val >= 0.75 ? 'full' : val >= 0.25 ? 'half' : 'empty';
        return <Star key={i} fill={fill} size={px} id={`star-${i}-${rating}`} />;
      })}
      {showNumber && (
        <span style={{ fontSize: px * 0.9, fontWeight: 600, color: '#374151', marginLeft: 3, lineHeight: 1 }}>
          {rating.toFixed(1)}
          {count != null && (
            <span style={{ fontWeight: 400, color: '#6B7280', marginLeft: 3 }}>
              ({count.toLocaleString()})
            </span>
          )}
        </span>
      )}
    </span>
  );
}
