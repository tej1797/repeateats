'use client';

import { C, FONT_DISPLAY, RESTAURANT_LOGOS } from './homeData';
import { Reveal } from './Reveal';

export default function LogoMarquee() {
  const row = [...RESTAURANT_LOGOS, ...RESTAURANT_LOGOS];
  return (
    <section data-testid="logos-section" style={{ padding: 'clamp(56px,7vw,84px) 0', background: C.bg2, borderTop: `1px solid ${C.border}` }}>
      <Reveal>
        <p style={{ textAlign: 'center', fontSize: 12.5, fontWeight: 700, color: C.textMute, letterSpacing: '0.08em', marginBottom: 32, padding: '0 24px' }}>
          Trusted by <span style={{ color: '#fff' }}>400+ restaurants</span> across Ontario
        </p>
      </Reveal>
      <div style={{ overflow: 'hidden', maskImage: 'linear-gradient(90deg, transparent, black 8%, black 92%, transparent)' }}>
        <div style={{ display: 'flex', gap: 56, width: 'max-content', animation: 'marqueeScroll 40s linear infinite', alignItems: 'center' }}>
          {row.map((name, i) => (
            <span key={i} style={{ flexShrink: 0, fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 800, letterSpacing: '-0.6px', color: '#5a5a5a', whiteSpace: 'nowrap', transition: 'color .2s' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#5a5a5a')}>
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
