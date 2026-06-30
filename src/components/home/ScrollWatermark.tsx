'use client';

import { useEffect, useState } from 'react';
import { C, FONT_DISPLAY } from './homeData';

// Giant faded "RepEAT" wordmark fixed behind the whole landing page.
// Hidden on the hero (first screen), gently fades in as the user scrolls.
// Responsive: font-size scales with viewport so it always fits.
export default function ScrollWatermark() {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const vh = window.innerHeight || 800;
      const y = window.scrollY;
      const start = vh * 0.55;   // begin appearing just after the hero
      const end = vh * 1.5;      // fully visible by ~1.5 screens down
      const t = Math.min(Math.max((y - start) / (end - start), 0), 1);
      setOpacity(t * 0.07);      // very faded ceiling
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', overflow: 'hidden' }}>
      <span style={{
        fontFamily: FONT_DISPLAY, fontWeight: 800, letterSpacing: '-0.04em',
        fontSize: 'min(26vw, 40vh)', lineHeight: 1, whiteSpace: 'nowrap',
        background: `linear-gradient(180deg, ${C.orange}, ${C.orange}22)`,
        WebkitBackgroundClip: 'text', backgroundClip: 'text',
        color: 'transparent', WebkitTextFillColor: 'transparent',
        opacity, transition: 'opacity .25s linear', userSelect: 'none',
      }}>
        RepEAT
      </span>
    </div>
  );
}
