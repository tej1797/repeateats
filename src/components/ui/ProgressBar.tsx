'use client';

type Variant  = 'brand' | 'danger' | 'success' | 'unlimited';

interface ProgressBarProps {
  value:       number;         // current claims
  max?:        number | null;  // null = unlimited
  showLabel?:  boolean;
  variant?:    Variant;
  animated?:   boolean;
  className?:  string;
}

export default function ProgressBar({
  value,
  max,
  showLabel  = true,
  animated   = true,
  className  = '',
}: ProgressBarProps) {
  // Unlimited deal
  if (max === null || max === undefined) {
    return (
      <div className={`flex items-center gap-1.5 text-[11px] text-green-600 font-semibold ${className}`}>
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
        ♾️ Unlimited · {value} claimed
      </div>
    );
  }

  const pct      = Math.min((value / max) * 100, 100);
  const left     = max - value;
  const isSoldOut = left <= 0;
  const isUrgent  = left > 0 && left <= 5;

  const barColor = isSoldOut || isUrgent
    ? 'bg-red-500'
    : 'bg-[#E85D04]';

  return (
    <div className={className}>
      {isUrgent && !isSoldOut && (
        <p className="text-[11px] font-bold text-red-500 mb-1 animate-bounce">
          Only {left} left!
        </p>
      )}
      <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} ${animated ? 'transition-all duration-500' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-[11px] text-t3 mt-1">
          <span>{value} claimed</span>
          <span>{isSoldOut ? 'Sold out' : `${left} left`}</span>
        </div>
      )}
    </div>
  );
}
