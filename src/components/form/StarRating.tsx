'use client';

import { useState } from 'react';

type Size = 'sm' | 'md' | 'lg';

const SIZE_PX: Record<Size, number> = { sm: 12, md: 16, lg: 24 };

interface StarRatingProps {
  rating:      number;
  size?:       Size;
  showNumber?: boolean;
  interactive?: boolean;
  onChange?:   (rating: number) => void;
  max?:        number;
}

export default function StarRating({
  rating,
  size        = 'md',
  showNumber  = false,
  interactive = false,
  onChange,
  max         = 5,
}: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const px   = SIZE_PX[size];
  const active = interactive ? (hover || rating) : rating;

  return (
    <div className="inline-flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < active;
        return (
          <svg
            key={i}
            width={px}
            height={px}
            viewBox="0 0 24 24"
            className={interactive ? 'cursor-pointer transition-transform hover:scale-110' : ''}
            onMouseEnter={() => interactive && setHover(i + 1)}
            onMouseLeave={() => interactive && setHover(0)}
            onClick={() => interactive && onChange?.(i + 1)}
            aria-label={interactive ? `Rate ${i + 1} star${i > 0 ? 's' : ''}` : undefined}
          >
            <polygon
              points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              fill={filled ? '#F59E0B' : 'none'}
              stroke={filled ? '#F59E0B' : '#D1D5DB'}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
      {showNumber && (
        <span className="text-[12px] font-semibold text-t2 ml-0.5">{rating.toFixed(1)}</span>
      )}
    </div>
  );
}
