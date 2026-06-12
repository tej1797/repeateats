'use client';

import { useCallback, useEffect, useState } from 'react';

const CITY_KEY   = 'repeateats.customer_city';
const RADIUS_KEY = 'repeateats.customer_radius';

export function useCustomerLocation() {
  const [city,   setCity]   = useState('GTA Area');
  const [radius, setRadius] = useState(30);
  const [ready,  setReady]  = useState(false);

  useEffect(() => {
    try {
      const storedCity   = localStorage.getItem(CITY_KEY);
      const storedRadius = localStorage.getItem(RADIUS_KEY);
      if (storedCity) setCity(storedCity);
      if (storedRadius) setRadius(parseInt(storedRadius, 10) || 30);
    } catch { /* ignore */ }
    setReady(true);
  }, []);

  const applyLocation = useCallback((nextCity: string, nextRadius: number) => {
    setCity(nextCity);
    setRadius(nextRadius);
    try {
      localStorage.setItem(CITY_KEY, nextCity);
      localStorage.setItem(RADIUS_KEY, String(nextRadius));
    } catch { /* ignore */ }
  }, []);

  return { city, radius, applyLocation, ready };
}
