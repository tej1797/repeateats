'use client';

import { IconBolt, IconWallet, IconCalendarEvent, IconMapPin, IconShieldCheck, IconBuildingStore } from '@tabler/icons-react';
import { C, FONT_DISPLAY, BENEFITS } from './homeData';
import { Reveal, RevealGroup, RevealItem } from './Reveal';

const ICONS: Record<string, React.ReactNode> = {
  bolt: <IconBolt size={22} />,
  wallet: <IconWallet size={22} />,
  calendar: <IconCalendarEvent size={22} />,
  mapPin: <IconMapPin size={22} />,
  shield: <IconShieldCheck size={22} />,
  store: <IconBuildingStore size={22} />,
};

export default function Benefits() {
  return (
    <section data-testid="benefits-section" style={{ padding: 'clamp(80px,10vw,128px) 24px', background: C.bg2, borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: C.orange, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>Why RepEAT</p>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(30px,4.5vw,52px)', fontWeight: 800, letterSpacing: '-1.8px', color: '#fff', marginBottom: 16 }}>Built for real savings</h2>
            <p style={{ fontSize: 16.5, color: C.textSoft, maxWidth: 460, margin: '0 auto', lineHeight: 1.7 }}>No complex apps, no minimum spends, no delivery surcharges.</p>
          </div>
        </Reveal>

        <RevealGroup style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 18 }}>
          {BENEFITS.map((b) => (
            <RevealItem key={b.title}>
              <div style={{ height: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '26px 24px', transition: 'border-color .2s' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255,107,0,0.35)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}>
                <div style={{ width: 46, height: 46, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,107,0,0.1)', color: C.orange, marginBottom: 18 }}>
                  {ICONS[b.icon]}
                </div>
                <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 18.5, fontWeight: 700, letterSpacing: '-0.3px', color: '#fff', marginBottom: 9 }}>{b.title}</h3>
                <p style={{ fontSize: 14.5, color: C.textSoft, lineHeight: 1.7 }}>{b.desc}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
