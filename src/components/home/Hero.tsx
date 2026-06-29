'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { IconBolt, IconArrowRight } from '@tabler/icons-react';
import { C, FONT_DISPLAY } from './homeData';

const EASE = [0.22, 1, 0.36, 1] as const;

const LINE1 = ['Find', 'the', 'best'];
const LINE2 = ['food', 'deals'];
const LINE3 = ['near', 'you'];

function Word({ children, delay, color }: { children: string; delay: number; color?: string }) {
  return (
    <span style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: '0.06em' }}>
      <motion.span style={{ display: 'inline-block', color }} initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ duration: 0.85, delay, ease: EASE }}>
        {children}
      </motion.span>
    </span>
  );
}

// Glassy floating value-prop pills (Influish-style).
type Pill = { label: string; pos: string; depth: number; delay: number; floatDur: number; hideSm?: boolean };
const PILLS: Pill[] = [
  { label: 'Instant QR Claim',   pos: 'top-[15%] left-1/2 -translate-x-1/2',     depth: 18, delay: 1.0, floatDur: 6.5 },
  { label: 'No Delivery Fees',   pos: 'top-[33%] left-[8%] lg:left-[13%]',        depth: 30, delay: 1.15, floatDur: 7.2 },
  { label: 'Weekly Deals',       pos: 'top-[33%] right-[8%] lg:right-[13%]',      depth: 30, delay: 1.25, floatDur: 6.8 },
  { label: '$0 Subscription',    pos: 'top-[60%] left-[4%] lg:left-[9%]',         depth: 40, delay: 1.35, floatDur: 7.6 },
  { label: 'Dine-in & Takeout',  pos: 'top-[60%] right-[4%] lg:right-[9%]',       depth: 40, delay: 1.45, floatDur: 7 },
];

function GlassPill({ pill, mx, my }: { pill: Pill; mx: any; my: any }) {
  const x = useTransform(mx, (v: number) => v * pill.depth);
  const y = useTransform(my, (v: number) => v * pill.depth);
  return (
    <motion.div
      className={`absolute ${pill.pos} hidden md:flex`}
      style={{ x, y, zIndex: 2 }}
      initial={{ opacity: 0, scale: 0.85, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.7, delay: pill.delay, ease: EASE }}
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: pill.floatDur, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 18px', borderRadius: 100,
          background: 'rgba(255,255,255,0.045)',
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          boxShadow: '0 8px 30px -10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
          fontSize: 14, fontWeight: 600, color: '#EDEDED', whiteSpace: 'nowrap',
        }}
      >
        <IconBolt size={15} style={{ color: C.orange, fill: C.orange }} />
        {pill.label}
      </motion.div>
    </motion.div>
  );
}

export default function Hero() {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const mx = useSpring(rawX, { stiffness: 55, damping: 18, mass: 0.4 });
  const my = useSpring(rawY, { stiffness: 55, damping: 18, mass: 0.4 });

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const onMove = (e: MouseEvent) => {
      rawX.set((e.clientX / window.innerWidth - 0.5) * 2);
      rawY.set((e.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [rawX, rawY]);

  // faint concentric ring borders (sonar style)
  const rings = [560, 860, 1180, 1520];

  return (
    <section data-testid="hero-section" style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 96, paddingBottom: 80, background: C.bg2, overflow: 'hidden' }}>
      {/* faded concentric rings */}
      <div aria-hidden style={{ position: 'absolute', top: '42%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 0, pointerEvents: 'none' }}>
        {rings.map((d, i) => (
          <div key={d} style={{
            position: 'absolute', top: -d / 2, left: -d / 2, width: d, height: d, borderRadius: '50%',
            border: `1px solid rgba(255,255,255,${0.05 - i * 0.009})`,
          }} />
        ))}
      </div>
      {/* soft radial glow */}
      <div aria-hidden style={{ position: 'absolute', top: '-6%', left: '50%', transform: 'translateX(-50%)', width: '78%', height: '60%', background: `radial-gradient(ellipse at center, ${C.orange}1f, transparent 62%)`, filter: 'blur(60px)', zIndex: 0 }} />
      {/* faint grid, masked */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(255,255,255,0.014) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.014) 1px, transparent 1px)', backgroundSize: '72px 72px', maskImage: 'radial-gradient(ellipse 70% 65% at 50% 42%, black, transparent 78%)' }} />
      {/* bottom accent line */}
      <div aria-hidden style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '55%', height: 1, background: `linear-gradient(90deg, transparent, ${C.orange}, transparent)`, opacity: 0.5, zIndex: 0 }} />

      {/* floating glass pills */}
      {PILLS.map((p) => <GlassPill key={p.label} pill={p} mx={mx} my={my} />)}

      <div style={{ position: 'relative', zIndex: 3, maxWidth: 900, width: '100%', padding: '0 24px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(46px, 8.5vw, 96px)', fontWeight: 800, lineHeight: 1.02, letterSpacing: '-3px', marginBottom: 28, color: '#fff' }}>
          <span style={{ display: 'block' }}>
            {LINE1.map((w) => (<span key={w}><Word delay={0.25}>{w}</Word>{' '}</span>))}
          </span>
          <span style={{ display: 'block' }}>
            {LINE2.map((w) => (<span key={w}><Word delay={0.42} color={C.orange}>{w}</Word>{' '}</span>))}
            {LINE3.map((w) => (<span key={w}><Word delay={0.58}>{w}</Word>{' '}</span>))}
          </span>
        </h1>

        {/* glassy trust strip */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.8, ease: EASE }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'center', padding: '11px 22px', borderRadius: 100, marginBottom: 38, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: '#ddd' }}>🇨🇦 Ontario-wide</span>
          <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.14)' }} />
          <span style={{ fontSize: 13.5, color: C.textSoft }}>No subscription needed</span>
          <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.14)' }} />
          <span style={{ fontSize: 13.5, color: C.green, fontWeight: 600 }}>Verified local deals</span>
        </motion.div>

        {/* CTAs (search removed) */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.95, ease: EASE }}
          style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/customer/preview" data-testid="hero-browse-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 54, padding: '0 30px', background: C.orange, color: '#fff', fontSize: 15.5, fontWeight: 700, borderRadius: 14, textDecoration: 'none', boxShadow: '0 14px 40px -12px rgba(255,107,0,0.6)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.orangeHi)}
            onMouseLeave={(e) => (e.currentTarget.style.background = C.orange)}>
            Browse deals <IconArrowRight size={18} />
          </Link>
          <Link href="/restaurant" data-testid="hero-restaurant-btn"
            style={{ display: 'inline-flex', alignItems: 'center', height: 54, padding: '0 26px', color: '#fff', fontSize: 15.5, fontWeight: 600, borderRadius: 14, textDecoration: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.14)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}>
            List your restaurant
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
