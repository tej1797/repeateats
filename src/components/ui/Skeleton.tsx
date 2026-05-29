'use client';

type Variant = 'text' | 'avatar' | 'card' | 'dealCard' | 'restaurantCard';

interface SkeletonProps {
  variant?:  Variant;
  count?:    number;
  className?: string;
}

function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-surface2 animate-pulse rounded ${className}`}
    />
  );
}

function DealCardSkeleton() {
  return (
    <div className="bg-surface rounded-brand shadow-brand overflow-hidden border border-[var(--bd)]">
      <div className="h-[140px] bg-surface2 animate-pulse" />
      <div className="p-3.5 space-y-3">
        <Shimmer className="h-3 w-14 rounded-full" />
        <Shimmer className="h-4 w-3/4 rounded-full" />
        <Shimmer className="h-7 w-1/2 rounded-full" />
        <Shimmer className="h-1.5 w-full rounded-full" />
        <Shimmer className="h-3 w-1/3 rounded-full" />
      </div>
    </div>
  );
}

function RestaurantCardSkeleton() {
  return (
    <div className="bg-surface rounded-brand shadow-brand overflow-hidden border border-[var(--bd)] p-4 flex gap-3">
      <Shimmer className="w-16 h-16 rounded-brands flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Shimmer className="h-4 w-2/3 rounded-full" />
        <Shimmer className="h-3 w-1/2 rounded-full" />
        <Shimmer className="h-3 w-1/4 rounded-full" />
      </div>
    </div>
  );
}

export default function Skeleton({ variant = 'text', count = 1, className = '' }: SkeletonProps) {
  const items = Array.from({ length: count });

  if (variant === 'dealCard') {
    return (
      <>
        {items.map((_, i) => <DealCardSkeleton key={i} />)}
      </>
    );
  }

  if (variant === 'restaurantCard') {
    return (
      <>
        {items.map((_, i) => <RestaurantCardSkeleton key={i} />)}
      </>
    );
  }

  if (variant === 'avatar') {
    return (
      <>
        {items.map((_, i) => (
          <Shimmer key={i} className={`rounded-full w-10 h-10 ${className}`} />
        ))}
      </>
    );
  }

  if (variant === 'card') {
    return (
      <>
        {items.map((_, i) => (
          <div key={i} className={`bg-surface rounded-brand shadow-brand border border-[var(--bd)] p-4 space-y-3 ${className}`}>
            <Shimmer className="h-4 w-3/4 rounded-full" />
            <Shimmer className="h-3 w-full rounded-full" />
            <Shimmer className="h-3 w-2/3 rounded-full" />
          </div>
        ))}
      </>
    );
  }

  // text (default)
  return (
    <>
      {items.map((_, i) => (
        <Shimmer key={i} className={`h-4 rounded-full ${className}`} />
      ))}
    </>
  );
}
