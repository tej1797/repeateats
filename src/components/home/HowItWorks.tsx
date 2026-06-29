'use client';

import { C, FONT_DISPLAY, STEPS } from './homeData';
import { Reveal, RevealGroup, RevealItem } from './Reveal';

export default function HowItWorks() {
  return (
    <section id="how-it-works" data-testid="how-it-works-section" style={{ padding: 'clamp(80px,10vw,128px) 24px', background: C.bg2, borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: C.orange, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>Zero friction</p>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(30px,4.5vw,52px)', fontWeight: 800, letterSpacing: '-1.8px', color: '#fff' }}>How RepEAT works</h2>
          </div>
        </Reveal>

        <RevealGroup style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20, position: 'relative' }}>
          {STEPS.map((s, i) => (
            <RevealItem key={s.num}>
              <div style={{ position: 'relative', height: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: '30px 28px' }}>
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block" aria-hidden style={{ position: 'absolute', top: 44, left: 'calc(100% + 1px)', width: 20, height: 1, borderTop: `1.5px dashed rgba(255,107,0,0.25)` }} />
                )}
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 46, height: 46, borderRadius: 14, background: 'rgba(255,107,0,0.1)', border: '1.5px solid rgba(255,107,0,0.28)', fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 800, color: C.orange, marginBottom: 22 }}>
                  {s.num}
                </div>
                <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, letterSpacing: '-0.4px', color: '#fff', marginBottom: 10 }}>{s.title}</h3>
                <p style={{ fontSize: 14.5, color: C.textSoft, lineHeight: 1.75 }}>{s.desc}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
