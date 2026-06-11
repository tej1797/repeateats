'use client';

import { CUISINES } from '@/lib/constants';
import { CUSTOMER_UI } from '@/lib/customerUI';

interface CuisineCirclesProps {
  selected:  string;
  onChange:  (id: string) => void;
  className?: string;
}

export default function CuisineCircles({ selected, onChange, className = '' }: CuisineCirclesProps) {
  return (
    <div className={`flex gap-4 overflow-x-auto scrollbar-none pb-2 ${className}`}>
      {CUISINES.map(cat => {
        const active = selected === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat.id)}
            className="flex-shrink-0 flex flex-col items-center gap-1.5"
            aria-pressed={active}
          >
            <div
              className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center"
              style={{
                border: active ? `2.5px solid ${CUSTOMER_UI.accent}` : `1.5px solid ${CUSTOMER_UI.glassBorder}`,
                boxShadow: active ? `0 0 0 3px ${CUSTOMER_UI.accentSoft}` : undefined,
                background: CUSTOMER_UI.glassBg,
              }}
            >
              {cat.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cat.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl">{cat.emoji}</span>
              )}
            </div>
            <span
              className="text-[11px] font-semibold"
              style={{ color: active ? CUSTOMER_UI.accent : CUSTOMER_UI.textSecondary }}
            >
              {cat.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
