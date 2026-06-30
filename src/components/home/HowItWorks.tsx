'use client';

import { motion } from 'framer-motion';
import { IconSearch, IconBolt, IconQrcode } from '@tabler/icons-react';
import { C, FONT_DISPLAY } from './homeData';
import { Reveal } from './Reveal';

const NODES = [
  { icon: <IconSearch size={26} />, num: '01', title: 'Browse deals', desc: 'Filter by city, cuisine or deal type. Fresh deals land every week from local spots.' },
  { icon: <IconBolt size={26} />, num: '02', title: 'Claim with one tap', desc: 'Hit Claim — your personal QR is generated instantly. No verification, no waiting.' },
  { icon: <IconQrcode size={26} />, num: '03', title: 'Show QR at the door', desc: 'Staff scan your QR at the restaurant and you pocket the savings on the spot.' },
];

// Animated dots travelling along the connector (Influish-style).
function Connector() {
  return (
    <div className="hidden md:block" aria-hidden style={{ flex: 1, position: 'relative', height: 56, minWidth: 60 }}>
      <div style={{ position: 'absolute', top: 27, left: 0, right: 0, borderTop: `1.5px dashed rgba(255,107,0,0.28)` }} />
      {[0, 0.8, 1.6].map((delay, i) => (
        <motion.span key={i}
          initial={{ left: '0%', opacity: 0 }}
          animate={{ left: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2.4, delay, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', top: 22, width: 10, height: 10, borderRadius: '50%', background: C.orange, boxShadow: `0 0 12px 2px ${C.orange}` }}
        />
      ))}
    </div>
  );
}

export default function HowItWorks() {
  return (
    <section id="how-it-works" data-testid="how-it-works-section" style={{ padding: 'clamp(80px,10vw,128px) 24px', background: C.bg2, borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: C.orange, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>Zero friction</p>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(30px,4.5vw,52px)', fontWeight: 800, letterSpacing: '-1.8px', color: '#fff' }}>How RepEAT works</h2>
          </div>
        </Reveal>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }} className="md:!flex-row md:items-start">
          {NODES.map((n, i) => (
            <div key={n.num} style={{ display: 'contents' }}>
              <motion.div
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '0px 0px -50px 0px' }}
                transition={{ duration: 0.6, delay: i * 0.18, ease: [0.22, 1, 0.36, 1] }}
                style={{ flex: 1, textAlign: 'center', maxWidth: 300, margin: '0 auto' }}
              >
                <div style={{ position: 'relative', width: 64, height: 64, margin: '0 auto 22px', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,107,0,0.1)', border: '1.5px solid rgba(255,107,0,0.3)', color: C.orange }}>
                  {n.icon}
                  <span style={{ position: 'absolute', top: -10, right: -10, fontFamily: FONT_DISPLAY, fontSize: 11, fontWeight: 800, color: '#fff', background: C.orange, borderRadius: 8, padding: '2px 7px' }}>{n.num}</span>
                </div>
                <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, letterSpacing: '-0.4px', color: '#fff', marginBottom: 10 }}>{n.title}</h3>
                <p style={{ fontSize: 14.5, color: C.textSoft, lineHeight: 1.7, maxWidth: 260, margin: '0 auto' }}>{n.desc}</p>
              </motion.div>
              {i < NODES.length - 1 && <Connector />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
