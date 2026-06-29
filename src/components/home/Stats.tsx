'use client';

import { C, FONT_DISPLAY, STATS } from './homeData';
import Counter from './Counter';
import { Reveal } from './Reveal';

export default function Stats() {
  return (
    <section data-testid="stats-section" style={{ padding: 'clamp(72px,9vw,112px) 24px', background: C.bg1, borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Reveal>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, padding: 'clamp(32px,5vw,52px) clamp(20px,4vw,40px)', position: 'relative', overflow: 'hidden' }}>
            <div aria-hidden style={{ position: 'absolute', left: '50%', top: -40, transform: 'translateX(-50%)', width: '60%', height: 120, background: C.orange, filter: 'blur(120px)', opacity: 0.1 }} />
            <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 28 }}>
              {STATS.map((s, i) => (
                <div key={s.label} style={{ textAlign: 'center', borderRight: i < STATS.length - 1 ? `1px solid ${C.border}` : 'none', padding: '4px 8px' }}>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(34px,5vw,52px)', fontWeight: 800, color: C.orange, letterSpacing: '-2px', lineHeight: 1 }}>
                    <Counter value={s.value} prefix={s.prefix ?? ''} suffix={s.suffix ?? ''} />
                  </div>
                  <div style={{ fontSize: 13.5, color: C.textSoft, marginTop: 10, fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
