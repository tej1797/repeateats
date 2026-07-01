'use client';

import { useRef, useState } from 'react';

interface CuisineItem {
  id:    string;
  label: string;
  color: string;
  img:   string | null;
}

const CUISINES: CuisineItem[] = [
  { id: 'all',       label: 'All',         color: '#E85D04', img: null },
  { id: 'pizza',     label: 'Pizza',       color: '#9D174D', img: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&q=70' },
  { id: 'indian',    label: 'Indian',      color: '#C2410C', img: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=200&q=70' },
  { id: 'shawarma',  label: 'Shawarma',    color: '#1F2937', img: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=200&q=70' },
  { id: 'mexican',   label: 'Mexican',     color: '#B45309', img: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=200&q=70' },
  { id: 'desserts',  label: 'Desserts',    color: '#6B21A8', img: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=200&q=70' },
  { id: 'chinese',   label: 'Chinese',     color: '#991B1B', img: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=200&q=70' },
  { id: 'cafe',      label: 'Cafe',        color: '#4B5563', img: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=200&q=70' },
  { id: 'ramen',     label: 'Ramen',       color: '#F97316', img: 'https://img.magnific.com/free-psd/delicious-ramen-bowl-with-soft-boiled-eggs-spring-onions_191095-79612.jpg?ga=GA1.1.2046982588.1782879900&semt=ais_test_b&w=740&q=80' },
  { id: 'burgers',   label: 'Burgers',     color: '#9A3412', img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&q=70' },
  { id: 'italian',   label: 'Italian',     color: '#B45309', img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&q=70' },
  { id: 'bubbletea', label: 'Bubble Tea',  color: '#701A75', img: 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=200&q=70' },
];

interface CuisinePillsProps {
  selected: string;
  onChange: (id: string) => void;
  className?: string;
}

export default function CuisinePills({ selected, onChange, className = '' }: CuisinePillsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(true);

  const updateArrows = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 10);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -240 : 240, behavior: 'smooth' });
  };

  return (
    <div className={`relative group ${className}`}>
      {canLeft && (
        <button
          onClick={() => scroll('left')}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-surface shadow-brand border border-[var(--bd)] items-center justify-center text-t2 hover:text-brand transition-all opacity-0 group-hover:opacity-100 -translate-x-1/2"
          aria-label="Scroll left"
        >
          ‹
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={updateArrows}
        className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1"
      >
        {CUISINES.map((cat, i) => {
          const active = selected === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onChange(cat.id)}
              className="flex-shrink-0 relative overflow-hidden transition-all duration-200 hover:scale-105"
              style={{
                height:    56,
                minWidth:  100,
                borderRadius: 100,
                border:    active ? `2px solid #E85D04` : '1px solid rgba(0,0,0,0.12)',
                boxShadow: active ? '0 0 0 3px rgba(232,93,4,0.18)' : undefined,
                animationDelay: `${i * 40}ms`,
                animation: 'fadeUpIn 0.4s ease both',
              }}
              aria-pressed={active}
              aria-label={cat.label}
            >
              {cat.img ? (
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${cat.img})` }}
                />
              ) : (
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(135deg, #E85D04, #FF9A4D)' }}
                />
              )}
              <div
                className="absolute inset-0 transition-opacity duration-200"
                style={{ background: 'rgba(0,0,0,0.52)', opacity: active ? 0.35 : 1 }}
              />
              <span
                className="relative z-10 font-bold text-white whitespace-nowrap px-5"
                style={{ fontSize: 13, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>

      {canRight && (
        <button
          onClick={() => scroll('right')}
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-surface shadow-brand border border-[var(--bd)] items-center justify-center text-t2 hover:text-brand transition-all opacity-0 group-hover:opacity-100 translate-x-1/2"
          aria-label="Scroll right"
        >
          ›
        </button>
      )}
    </div>
  );
}
