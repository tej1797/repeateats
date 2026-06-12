'use client';

import { useState } from 'react';
import { IconSearch, IconMapPin, IconX } from '@tabler/icons-react';
import { CUSTOMER_UI } from '@/lib/customerUI';
import { ONTARIO_CITIES } from '@/lib/constants';

const CITY_COORDS: Record<string, [number, number]> = {
  'GTA Area':           [43.65, -79.38],
  'Toronto':            [43.65, -79.38],
  'Mississauga':        [43.59, -79.64],
  'Brampton':           [43.72, -79.76],
  'Markham':            [43.86, -79.27],
  'Kitchener-Waterloo': [43.45, -80.49],
  'Hamilton':           [43.26, -79.87],
  'Oakville':           [43.45, -79.69],
};

const RADIUS_CHIPS = [2, 5, 10, 25, 50, 100];

interface Props {
  city:     string;
  radius:   number;
  onApply:  (city: string, radius: number) => void;
  onClose:  () => void;
}

export default function LocationModal({ city, radius, onApply, onClose }: Props) {
  const [localCity,   setLocalCity]   = useState(city);
  const [localRadius, setLocalRadius] = useState(radius);
  const [query,       setQuery]       = useState('');
  const [locating,    setLocating]    = useState(false);
  const [locateErr,   setLocateErr]   = useState('');

  const matches = query.trim()
    ? ONTARIO_CITIES.filter(c => c.toLowerCase().includes(query.toLowerCase()))
    : ONTARIO_CITIES;

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) { setLocateErr('Geolocation not supported'); return; }
    setLocating(true);
    setLocateErr('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        let nearest = 'GTA Area';
        let minDist = Infinity;
        for (const [name, [clat, clon]] of Object.entries(CITY_COORDS)) {
          const dist = Math.hypot(lat - clat, lon - clon);
          if (dist < minDist) { minDist = dist; nearest = name; }
        }
        setLocalCity(nearest);
        setLocating(false);
      },
      () => { setLocateErr('Could not get location. Please select manually.'); setLocating(false); },
      { timeout: 8000 },
    );
  };

  const apply = (nextCity = localCity, nextRadius = localRadius) => {
    onApply(nextCity, nextRadius);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.65)' }} onClick={onClose} />
      <div
        className="relative w-full sm:max-w-md rounded-t-[24px] sm:rounded-[24px] px-5 pt-5 pb-[max(20px,env(safe-area-inset-bottom))] animate-[slideUp_0.22s_ease] max-h-[88vh] overflow-y-auto scrollbar-none"
        style={{ background: CUSTOMER_UI.bgElevated, color: CUSTOMER_UI.textPrimary, border: `1px solid ${CUSTOMER_UI.glassBorder}` }}
      >
        <div className="flex items-start justify-between mb-1">
          <h2 className="font-display text-[22px] font-extrabold">Location</h2>
          <button type="button" onClick={onClose} className="p-1" style={{ color: CUSTOMER_UI.textSecondary }}><IconX size={20} /></button>
        </div>
        <p className="text-[14px] mb-4" style={{ color: CUSTOMER_UI.textSecondary }}>
          Search a city or adjust your search radius
        </p>

        <div className="relative mb-2">
          <IconSearch size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: CUSTOMER_UI.textMuted }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search city (e.g. Mississauga)"
            className="w-full h-12 pl-10 pr-3 rounded-xl text-[14px] outline-none placeholder:opacity-60"
            style={{ background: CUSTOMER_UI.glassBg, border: `1px solid ${CUSTOMER_UI.glassBorder}`, color: CUSTOMER_UI.textPrimary }}
          />
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {matches.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => { setLocalCity(c); setQuery(''); }}
              className="text-[13px] font-semibold px-3 py-1.5 rounded-full transition-all"
              style={localCity === c
                ? { background: CUSTOMER_UI.accent, color: '#fff' }
                : { background: CUSTOMER_UI.glassBg, border: `1px solid ${CUSTOMER_UI.glassBorder}`, color: CUSTOMER_UI.textSecondary }}
            >
              {c}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={locating}
          className="w-full h-10 mb-5 flex items-center justify-center gap-2 rounded-xl text-[13px] font-semibold disabled:opacity-60"
          style={{ border: `1px solid ${CUSTOMER_UI.accent}`, color: CUSTOMER_UI.accent }}
        >
          <IconMapPin size={14} />
          {locating ? 'Detecting location…' : 'Use my location'}
        </button>
        {locateErr && <p className="text-[12px] mb-3 -mt-3" style={{ color: '#f87171' }}>{locateErr}</p>}

        <h3 className="font-display text-[18px] font-bold mb-0.5">Search radius</h3>
        <p className="text-[13px] mb-3" style={{ color: CUSTOMER_UI.textSecondary }}>Show restaurants within</p>
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {RADIUS_CHIPS.map(r => {
            const active = localRadius === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setLocalRadius(r)}
                className="h-12 rounded-xl text-[14px] font-bold transition-all"
                style={active
                  ? { background: CUSTOMER_UI.accent, color: '#fff' }
                  : { background: CUSTOMER_UI.glassBg, border: `1px solid ${CUSTOMER_UI.glassBorder}`, color: CUSTOMER_UI.textSecondary }}
              >
                {r} km
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => apply()}
          className="w-full py-3.5 rounded-2xl text-[16px] font-bold text-white"
          style={{ background: CUSTOMER_UI.accent }}
        >
          Show deals in {localCity}
        </button>
      </div>
    </div>
  );
}
