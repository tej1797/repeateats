'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { IconSearch, IconLoader2, IconStar } from '@tabler/icons-react';

export interface PlaceResult {
  place_id:   string;
  name:       string;
  address:    string;
  phone?:     string | null;
  website?:   string | null;
  hours?:     string | null;
  hours_raw?: string[] | null;
  rating?:    number | null;
  types?:     string[];
  source?:    'google' | 'database';
}

interface RestaurantSearchProps {
  onSelect:     (restaurant: PlaceResult) => void;
  placeholder?: string;
  className?:   string;
  variant?:     'light' | 'dark';
  restaurantId?: string;
}

export default function RestaurantSearch({
  onSelect,
  placeholder = 'Search for your restaurant…',
  className   = '',
  variant     = 'light',
  restaurantId,
}: RestaurantSearchProps) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapRef  = useRef<HTMLDivElement>(null);

  const isDark = variant === 'dark';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ q });
      if (restaurantId) params.set('restaurant_id', restaurantId);
      const res  = await fetch(`/api/google-places?${params.toString()}`);
      const data = await res.json() as { data?: PlaceResult[]; results?: PlaceResult[] };
      const list = data.data ?? data.results ?? [];
      setResults(list);
      setOpen(list.length > 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  const handleChange = (value: string) => {
    setQuery(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(value), 300);
  };

  const handleSelect = (place: PlaceResult) => {
    setQuery(place.name);
    setOpen(false);
    onSelect(place);
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <div
        className={`relative flex items-center rounded-xl border transition-all ${
          isDark
            ? 'border-[#333] bg-[#1A1A1A] focus-within:border-[#1249A9]'
            : 'border-[var(--bd2)] bg-surface focus-within:border-[#1249A9] focus-within:ring-2 focus-within:ring-[#1249A9]/15'
        }`}
      >
        <IconSearch size={16} className={`absolute left-3 flex-shrink-0 ${isDark ? 'text-[#666]' : 'text-t3'}`} />
        <input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={`w-full bg-transparent py-3 pl-9 pr-4 text-[14px] outline-none rounded-xl ${
            isDark ? 'text-white placeholder:text-[#555]' : 'text-tx'
          }`}
        />
        {loading && (
          <IconLoader2 size={16} className={`absolute right-3 animate-spin ${isDark ? 'text-[#666]' : 'text-t3'}`} />
        )}
      </div>

      {open && (
        <div
          className={`absolute top-full left-0 right-0 mt-1 rounded-xl shadow-brand2 z-50 overflow-hidden animate-[slideUp_0.15s_ease] ${
            isDark ? 'bg-[#1A1A1A] border border-[#333]' : 'bg-surface border border-[var(--bd)]'
          }`}
        >
          {results.length === 0 ? (
            <div className={`px-4 py-3 text-[13px] text-center ${isDark ? 'text-[#666]' : 'text-t3'}`}>
              No restaurants found
            </div>
          ) : (
            <>
              {results.map((place) => (
                <button
                  key={place.place_id}
                  onClick={() => handleSelect(place)}
                  className={`w-full flex items-start gap-3 px-4 py-3 transition-colors text-left border-b last:border-0 ${
                    isDark
                      ? 'hover:bg-[#222] border-[#333]'
                      : 'hover:bg-surface2 border-[var(--bd)]'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isDark ? 'bg-[#1249A9]/20' : 'bg-brandlt'
                  }`}>
                    <span className="text-[14px]">🏠</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-semibold truncate ${isDark ? 'text-white' : ''}`}>{place.name}</p>
                    <p className={`text-[11px] truncate ${isDark ? 'text-[#888]' : 'text-t3'}`}>{place.address}</p>
                    {place.rating != null && place.rating > 0 && (
                      <p className="text-[11px] text-amber-500 flex items-center gap-1 mt-0.5">
                        <IconStar size={10} fill="currentColor" />
                        {place.rating.toFixed(1)}
                      </p>
                    )}
                  </div>
                  {place.source === 'google' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-950/50 text-green-400 border border-green-800/50 flex-shrink-0">
                      Google
                    </span>
                  )}
                </button>
              ))}
              <button
                onClick={() => { setOpen(false); onSelect({ place_id: '__manual__', name: query, address: '' }); }}
                className={`w-full px-4 py-2.5 text-[12px] font-semibold transition-colors text-center ${
                  isDark ? 'text-[#5B9BD5] hover:bg-[#222]' : 'text-brand hover:bg-brandlt'
                }`}
              >
                Not finding it? Enter details manually →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
