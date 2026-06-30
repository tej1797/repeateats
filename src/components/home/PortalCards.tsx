'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { IconToolsKitchen2, IconBuildingStore, IconCamera, IconArrowRight } from '@tabler/icons-react';
import { C, FONT_DISPLAY, PORTALS } from './homeData';
import { Reveal } from './Reveal';

const ICONS: Record<string, React.ReactNode> = {
  customer: <IconToolsKitchen2 size={26} />,
  restaurant: <IconBuildingStore size={26} />,
  creator: <IconCamera size={26} />,
};

const EASE = [0.22, 1, 0.36, 1] as const;

export default function PortalCards() {
  return (
    <section data-testid="portals-section" style={{ padding: 'clamp(80px,10vw,128px) 24px', background: C.bg1, borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Reveal className="" >
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: C.orange, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>Three portals</p>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(30px,4.5vw,52px)', fontWeight: 800, letterSpacing: '-1.8px', color: '#fff', marginBottom: 16 }}>
              One platform, every role
            </h2>
            <p style={{ fontSize: 16.5, color: C.textSoft, maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
              Choose how you want to use RepEAT. Tap a card to jump straight in.
            </p>
          </div>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 22 }}>
          {PORTALS.map((p, i) => (
            <motion.div key={p.key}
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px 0px -60px 0px' }}
              transition={{ duration: 0.7, delay: i * 0.12, ease: EASE }}
            >
              <Link href={p.href} data-testid={`portal-card-${p.key}`}
                style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
                <motion.div
                  whileHover={{ y: -8 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  style={{
                    position: 'relative', height: '100%', borderRadius: 22, overflow: 'hidden',
                    background: C.surface, border: `1px solid ${C.border}`,
                    padding: '30px 28px 26px',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = p.color; e.currentTarget.style.boxShadow = `0 24px 60px -20px ${p.glow}`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  {/* left accent bar */}
                  <div style={{ position: 'absolute', left: 0, top: 24, bottom: 24, width: 4, borderRadius: 4, background: p.color }} />
                  {/* color wash */}
                  <div aria-hidden style={{ position: 'absolute', right: -60, top: -60, width: 220, height: 220, borderRadius: '50%', background: p.color, filter: 'blur(90px)', opacity: 0.14, pointerEvents: 'none' }} />

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: p.color, boxShadow: `0 8px 24px -6px ${p.glow}` }}>
                      {ICONS[p.key]}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: p.color, background: `${p.color}1A`, border: `1px solid ${p.color}33`, padding: '5px 11px', borderRadius: 100 }}>
                      {p.label}
                    </span>
                  </div>

                  <p style={{ fontSize: 12.5, fontWeight: 700, color: p.color, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>{p.kicker}</p>
                  <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 25, fontWeight: 800, letterSpacing: '-0.6px', color: '#fff', marginBottom: 12 }}>{p.title}</h3>
                  <p style={{ fontSize: 14.5, color: C.textSoft, lineHeight: 1.7, marginBottom: 28 }}>{p.desc}</p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${C.border}`, paddingTop: 18 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>{p.cta}</span>
                    <span style={{ width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: p.color, border: `1.5px solid ${p.color}55` }}>
                      <IconArrowRight size={18} />
                    </span>
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
