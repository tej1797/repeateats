'use client';

import { CUISINES } from '@/lib/constants';
import { CUSTOMER_UI } from '@/lib/customerUI';

interface CuisineCarouselProps {
  selected:  string;
  onChange:  (id: string) => void;
  className?: string;
}

export default function CuisineCarousel({ selected, onChange, className = '' }: CuisineCarouselProps) {
  return (
    <div className={`flex gap-2.5 overflow-x-auto scrollbar-none pb-1 ${className}`}>
      {CUISINES.map(cat => {
        const active = selected === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat.id)}
            className="flex-shrink-0 relative overflow-hidden transition-transform hover:scale-105"
            style={{
              height:       52,
              minWidth:     active ? 96 : 88,
              borderRadius: 100,
              border:       active ? `2px solid ${CUSTOMER_UI.accent}` : `1px solid ${CUSTOMER_UI.glassBorder}`,
              boxShadow:    active ? `0 0 0 3px ${CUSTOMER_UI.accentSoft}` : undefined,
            }}
            aria-pressed={active}
          >
            {cat.image ? (
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${cat.image})` }} />
            ) : (
              <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${CUSTOMER_UI.accent}, ${CUSTOMER_UI.gold})` }} />
            )}
            <div className="absolute inset-0" style={{ background: active ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.55)' }} />
            <span
              className="relative z-10 flex items-center justify-center h-full font-bold text-white whitespace-nowrap px-4"
              style={{ fontSize: 12, textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
            >
              {cat.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
