'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { IconArrowRight } from '@tabler/icons-react';
import { C, FONT_DISPLAY } from './homeData';
import { Reveal } from './Reveal';

export default function FinalCTA() {
  return (
    <section data-testid="final-cta-section" style={{ padding: 'clamp(80px,11vw,140px) 24px clamp(40px,6vw,72px)', background: C.bg2, borderTop: `1px solid ${C.border}`, position: 'relative', overflow: 'hidden' }}>
      <div aria-hidden style={{ position: 'absolute', left: '50%', top: '40%', transform: 'translate(-50%,-50%)', width: '70%', height: '120%', background: `radial-gradient(ellipse at center, ${C.orange}22, transparent 60%)`, filter: 'blur(40px)' }} />
      <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        <Reveal>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(32px,5.5vw,60px)', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1.08, color: '#fff', marginBottom: 20 }}>
            Ready to start saving<br /><span style={{ color: C.orange }}>at local restaurants?</span>
          </h2>
          <p style={{ fontSize: 17, color: C.textSoft, marginBottom: 38, lineHeight: 1.7 }}>
            Browse deals near you — free, no credit card required.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
              <Link href="/customer/preview" data-testid="final-cta-browse"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 54, padding: '0 30px', background: C.orange, color: '#fff', fontSize: 15.5, fontWeight: 700, borderRadius: 14, textDecoration: 'none', boxShadow: '0 14px 40px -12px rgba(255,107,0,0.6)' }}>
                Browse deals <IconArrowRight size={18} />
              </Link>
            </motion.div>
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
              <Link href="/restaurant" data-testid="final-cta-restaurant"
                style={{ display: 'inline-flex', alignItems: 'center', height: 54, padding: '0 28px', background: 'transparent', color: '#fff', fontSize: 15.5, fontWeight: 600, borderRadius: 14, textDecoration: 'none', border: `1.5px solid ${C.border2}` }}>
                List your restaurant
              </Link>
            </motion.div>
          </div>
        </Reveal>
      </div>

      {/* giant faded brand watermark */}
      <div aria-hidden style={{ position: 'relative', marginTop: 'clamp(48px,7vw,90px)', textAlign: 'center', lineHeight: 0.8, pointerEvents: 'none', overflow: 'hidden' }}>
        <span style={{
          fontFamily: FONT_DISPLAY, fontWeight: 800, letterSpacing: '-0.04em',
          fontSize: 'clamp(80px, 20vw, 320px)', display: 'inline-block',
          background: `linear-gradient(180deg, ${C.orange}33, ${C.orange}05)`,
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          WebkitTextFillColor: 'transparent', userSelect: 'none',
        }}>
          RepEAT
        </span>
      </div>
    </section>
  );
}
