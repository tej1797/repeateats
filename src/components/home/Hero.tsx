'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { IconMapPin, IconArrowRight } from '@tabler/icons-react';
import { C, FONT_DISPLAY } from './homeData';
import FloatingCutouts from './FloatingCutouts';

const EASE = [0.22, 1, 0.36, 1] as const;

const LINE1 = ['Find', 'the', 'best'];
const LINE2 = ['food', 'deals'];
const LINE3 = ['near', 'you'];

function Word({ children, delay, color }: { children: string; delay: number; color?: string }) {
  return (
    <span style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: '0.06em' }}>
      <motion.span
        style={{ display: 'inline-block', color }}
        initial={{ y: '110%' }}
        animate={{ y: 0 }}
        transition={{ duration: 0.85, delay, ease: EASE }}
      >
        {children}
      </motion.span>
    </span>
  );
}

export default function Hero({
  city, setCity, onSearch,
}: { city: string; setCity: (v: string) => void; onSearch: (e: React.FormEvent) => void }) {
  return (
    <section data-testid="hero-section" style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 88, paddingBottom: 60, background: C.bg2, overflow: 'hidden' }}>
      {/* grid backdrop */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)', backgroundSize: '64px 64px', maskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%, black, transparent 80%)' }} />
      {/* soft top glow */}
      <div aria-hidden style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '70%', height: '50%', background: C.orange, filter: 'blur(160px)', opacity: 0.1, zIndex: 0 }} />
      {/* bottom accent line */}
      <div aria-hidden style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '60%', height: 1, background: `linear-gradient(90deg, transparent, ${C.orange}, transparent)`, opacity: 0.6, zIndex: 0 }} />

      <FloatingCutouts />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 860, width: '100%', padding: '0 24px', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.22)', color: C.orange, fontSize: 12.5, fontWeight: 700, padding: '6px 15px', borderRadius: 100, marginBottom: 26, letterSpacing: '0.02em' }}>
            🇨🇦 Free deals across Ontario — no subscription needed
          </span>
        </motion.div>

        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(44px, 8vw, 90px)', fontWeight: 800, lineHeight: 1.02, letterSpacing: '-3px', marginBottom: 24, color: '#fff' }}>
          <span style={{ display: 'block' }}>
            {LINE1.map((w, i) => (<span key={w}><Word delay={0.25 + i * 0.08}>{w}</Word>{' '}</span>))}
          </span>
          <span style={{ display: 'block' }}>
            {LINE2.map((w, i) => (<span key={w}><Word delay={0.45 + i * 0.08} color={C.orange}>{w}</Word>{' '}</span>))}
            {LINE3.map((w, i) => (<span key={w}><Word delay={0.6 + i * 0.08}>{w}</Word>{' '}</span>))}
          </span>
        </h1>

        <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.8, ease: EASE }}
          style={{ fontSize: 18, color: C.textSoft, lineHeight: 1.7, maxWidth: 500, margin: '0 auto 38px' }}>
          Claim real restaurant discounts across Ontario. No delivery apps, no hidden fees — just show your QR and save.
        </motion.p>

        <motion.form data-testid="hero-search-form" onSubmit={onSearch}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.95, ease: EASE }}
          style={{ display: 'flex', maxWidth: 540, margin: '0 auto 18px', background: 'rgba(21,21,21,0.85)', backdropFilter: 'blur(8px)', border: `1px solid ${C.border2}`, borderRadius: 16, overflow: 'hidden' }}
          onFocusCapture={(e) => (e.currentTarget.style.borderColor = C.orange)}
          onBlurCapture={(e) => (e.currentTarget.style.borderColor = C.border2)}
        >
          <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 18, color: C.textMute, flexShrink: 0 }}>
            <IconMapPin size={19} />
          </div>
          <input data-testid="hero-city-input" type="text" placeholder="Enter your city (e.g. Toronto, Brampton...)"
            value={city} onChange={(e) => setCity(e.target.value)}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', padding: '17px 14px', fontSize: 15, color: '#fff', fontFamily: 'inherit' }} />
          <button type="submit" data-testid="hero-search-button"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0 24px', height: 58, background: C.orange, color: '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', flexShrink: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.orangeHi)}
            onMouseLeave={(e) => (e.currentTarget.style.background = C.orange)}
          >
            Find deals <IconArrowRight size={17} />
          </button>
        </motion.form>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 1.15 }}
          style={{ fontSize: 13.5, color: C.textMute }}>
          Or{' '}
          <Link href="/customer/preview" style={{ color: C.orange, textDecoration: 'none', fontWeight: 600 }}>browse all deals</Link>{' '}
          across Ontario
        </motion.p>
      </div>
    </section>
  );
}
