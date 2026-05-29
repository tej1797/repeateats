'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { IconSearch, IconLoader2, IconStar } from '@tabler/icons-react';

interface PlaceResult {
  place_id:  string;
  name:      string;
  address:   string;
  phone?:    string | null;
  website?:  string | null;
  hours?:    string | null;
  rating?:   number | null;
  types?:    string[];
  source?:   'google' | 'database';
}

interface RestaurantSearchProps {
  onSelect:     (restaurant: PlaceResult) => void;
  placeholder?: string;
  className?:   string;
}

export default function RestaurantSearch({
  onSelect,
  placeholder = 'Search for your restaurant…',
  className   = '',
}: RestaurantSearchProps) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapRef  = useRef<HTMLDivElement>(null);

  // Close on outside click
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
      const res  = await fetch(`/api/google-places?q=${encodeURIComponent(q)}`);
      const data = await res.json() as { data?: PlaceResult[]; results?: PlaceResult[] };
      const list = data.data ?? data.results ?? [];
      setResults(list);
      setOpen(list.length > 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
      {/* Input */}
      <div className="relative flex items-center rounded-brands border border-[var(--bd2)] bg-surface focus-within:border-[#E85D04] focus-within:ring-2 focus-within:ring-[#E85D04]/15 transition-all">
        <IconSearch size={16} className="absolute left-3 text-t3 flex-shrink-0" />
        <input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="w-full bg-transparent py-3 pl-9 pr-4 text-[14px] text-tx outline-none rounded-brands"
        />
        {loading && (
          <IconLoader2 size={16} className="absolute right-3 text-t3 animate-spin" />
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-[var(--bd)] rounded-brands shadow-brand2 z-50 overflow-hidden animate-[slideUp_0.15s_ease]">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-[13px] text-t3 text-center">No restaurants found</div>
          ) : (
            <>
              {results.map((place) => (
                <button
                  key={place.place_id}
                  onClick={() => handleSelect(place)}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-surface2 transition-colors text-left border-b border-[var(--bd)] last:border-0"
                >
                  <div className="w-8 h-8 rounded-brands bg-brandlt flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[14px]">🏠</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate">{place.name}</p>
                    <p className="text-[11px] text-t3 truncate">{place.address}</p>
                    {place.rating && (
                      <p className="text-[11px] text-amber-500 flex items-center gap-1 mt-0.5">
                        <IconStar size={10} fill="currentColor" />
                        {place.rating.toFixed(1)}
                      </p>
                    )}
                  </div>
                </button>
              ))}
              <button
                onClick={() => { setOpen(false); onSelect({ place_id: '__manual__', name: query, address: '' }); }}
                className="w-full px-4 py-2.5 text-[12px] text-brand font-semibold hover:bg-brandlt transition-colors text-center"
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
