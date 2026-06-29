'use client';

import { IconQuote } from '@tabler/icons-react';
import { C, FONT_DISPLAY, TESTIMONIALS } from './homeData';
import { Reveal, RevealGroup, RevealItem } from './Reveal';

const ACCENT: Record<string, string> = {
  customer: C.customer,
  restaurant: C.restaurant,
  creator: C.creator,
};

export default function Testimonials() {
  return (
    <section data-testid="testimonials-section" style={{ padding: 'clamp(80px,10vw,128px) 24px', background: C.bg2, borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: C.orange, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>Loved across Ontario</p>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(30px,4.5vw,52px)', fontWeight: 800, letterSpacing: '-1.8px', color: '#fff' }}>Diners, owners & creators</h2>
          </div>
        </Reveal>

        <RevealGroup style={{ columns: '2 320px', columnGap: 18 }}>
          {TESTIMONIALS.map((t) => {
            const accent = ACCENT[t.accent];
            return (
              <RevealItem key={t.name} style={{ breakInside: 'avoid', marginBottom: 18 }}>
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: '26px 24px' }}>
                  <IconQuote size={26} style={{ color: accent, opacity: 0.6, marginBottom: 14 }} />
                  <p style={{ fontSize: 16, color: '#e8e8e8', lineHeight: 1.65, marginBottom: 22 }}>{t.quote}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${accent}22`, border: `1px solid ${accent}55`, color: accent, fontWeight: 800, fontSize: 15, fontFamily: FONT_DISPLAY }}>
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>{t.name}</div>
                      <div style={{ fontSize: 12.5, color: C.textMute }}>{t.role}</div>
                    </div>
                  </div>
                </div>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}
