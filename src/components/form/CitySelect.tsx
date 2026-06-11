'use client';

import { useState, useRef, useEffect } from 'react';
import { IconMapPin, IconChevronDown } from '@tabler/icons-react';
import { ONTARIO_CITIES } from '@/lib/constants';

interface CitySelectProps {
  value:      string;
  onChange:   (city: string) => void;
  className?: string;
  label?:     string;
  error?:     string;
}

export default function CitySelect({ value, onChange, className = '', label, error }: CitySelectProps) {
  const [open,   setOpen]   = useState(false);
  const [filter, setFilter] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = ONTARIO_CITIES.filter((c) =>
    c.toLowerCase().includes(filter.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-[13px] font-semibold text-t2 mb-1.5">{label}</label>
      )}
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setFilter(''); }}
        className={[
          'w-full flex items-center gap-2 px-3 py-2.5 rounded-brands border text-left text-[14px] bg-surface transition-all',
          error
            ? 'border-red-400'
            : open ? 'border-[#E85D04] ring-2 ring-[#E85D04]/15' : 'border-[var(--bd2)] hover:border-[#E85D04]',
        ].join(' ')}
      >
        <IconMapPin size={15} className="text-t3 flex-shrink-0" />
        <span className={`flex-1 truncate ${value ? 'text-tx' : 'text-t3'}`}>
          {value || 'Select city…'}
        </span>
        <IconChevronDown
          size={14}
          className={`text-t3 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-[var(--bd)] rounded-brands shadow-brand2 z-50 overflow-hidden animate-[slideUp_0.15s_ease]">
          {/* Filter input */}
          <div className="p-2 border-b border-[var(--bd)]">
            <input
              autoFocus
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search city…"
              className="w-full bg-surface2 rounded-brands px-3 py-1.5 text-[13px] outline-none text-tx"
            />
          </div>
          <div className="max-h-[220px] overflow-y-auto scrollbar-none">
            {filtered.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => { onChange(city); setOpen(false); }}
                className={[
                  'w-full flex items-center gap-2 px-3 py-2.5 text-[13px] text-left hover:bg-surface2 transition-colors',
                  value === city ? 'text-[#E85D04] font-semibold' : 'text-tx',
                ].join(' ')}
              >
                <IconMapPin size={13} className="text-t3 flex-shrink-0" />
                {city}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-[13px] text-t3 text-center">No cities found</p>
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-1 text-[12px] text-red-500">{error}</p>}
    </div>
  );
}
