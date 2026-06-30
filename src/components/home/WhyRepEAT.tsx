'use client';

import { useState } from 'react';
import { IconBolt, IconWallet, IconCalendarEvent, IconMapPin, IconShieldCheck, IconBuildingStore, IconQuote } from '@tabler/icons-react';
import { C, FONT_DISPLAY, BENEFITS, TESTIMONIALS } from './homeData';
import { Reveal, RevealGroup, RevealItem } from './Reveal';

const ICONS: Record<string, React.ReactNode> = {
  bolt: <IconBolt size={18} />,
  wallet: <IconWallet size={18} />,
  calendar: <IconCalendarEvent size={18} />,
  mapPin: <IconMapPin size={18} />,
  shield: <IconShieldCheck size={18} />,
  store: <IconBuildingStore size={18} />,
};
const ACCENT: Record<string, string> = { customer: C.customer, restaurant: C.restaurant, creator: C.creator };

export default function WhyRepEAT() {
  const [paused, setPaused] = useState(false);
  const row = [...TESTIMONIALS, ...TESTIMONIALS];

  return (
    <section data-testid="why-repeat-section" style={{ padding: 'clamp(60px,8vw,100px) 0', borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 38 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: C.orange, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12 }}>Why RepEAT</p>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(28px,4vw,46px)', fontWeight: 800, letterSpacing: '-1.6px', color: '#fff' }}>Built for real savings</h2>
          </div>
        </Reveal>

        {/* compact benefits */}
        <RevealGroup style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(232px,1fr))', gap: 12, marginBottom: 50 }}>
          {BENEFITS.map((b) => (
            <RevealItem key={b.title}>
              <div style={{ height: '100%', display: 'flex', gap: 13, alignItems: 'flex-start', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '15px 16px' }}>
                <span style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,107,0,0.1)', color: C.orange }}>{ICONS[b.icon]}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 3 }}>{b.title}</div>
                  <div style={{ fontSize: 12.5, color: C.textSoft, lineHeight: 1.5 }}>{b.desc}</div>
                </div>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>

      {/* auto-scrolling testimonials (live row) */}
      <Reveal>
        <p style={{ textAlign: 'center', fontSize: 11, fontWeight: 800, color: C.orange, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 22 }}>Loved across Ontario</p>
      </Reveal>
      <div data-testid="testimonials-marquee" style={{ overflow: 'hidden', maskImage: 'linear-gradient(90deg,transparent,black 5%,black 95%,transparent)', WebkitMaskImage: 'linear-gradient(90deg,transparent,black 5%,black 95%,transparent)' }}
        onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <div style={{ display: 'flex', gap: 18, width: 'max-content', padding: '4px 18px', animation: 'marqueeScroll 60s linear infinite', animationPlayState: paused ? 'paused' : 'running' }}>
          {row.map((t, i) => {
            const a = ACCENT[t.accent];
            return (
              <div key={i} style={{ flexShrink: 0, width: 380, maxWidth: '82vw', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px 22px' }}>
                <IconQuote size={22} style={{ color: a, opacity: 0.6, marginBottom: 10 }} />
                <p style={{ fontSize: 14.5, color: '#e2e2e2', lineHeight: 1.6, marginBottom: 16, minHeight: 67 }}>{t.quote}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${a}22`, border: `1px solid ${a}55`, color: a, fontWeight: 800, fontFamily: FONT_DISPLAY }}>{t.name.charAt(0)}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: C.textMute }}>{t.role}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
