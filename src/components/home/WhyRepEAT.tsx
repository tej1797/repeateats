'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconBolt, IconWallet, IconCalendarEvent, IconMapPin, IconShieldCheck, IconBuildingStore, IconQuote, IconX } from '@tabler/icons-react';
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

type T = (typeof TESTIMONIALS)[number];

export default function WhyRepEAT() {
  const trackRef = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const speed = useRef(45);            // px/s — normal
  const [active, setActive] = useState<T | null>(null);
  const row = [...TESTIMONIALS, ...TESTIMONIALS];

  // JS-driven marquee so hover can SLOW (not stop) smoothly.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let last = performance.now();
    const step = (t: number) => {
      const dt = (t - last) / 1000; last = t;
      offset.current += speed.current * dt;
      const half = (trackRef.current?.scrollWidth ?? 0) / 2;
      if (half > 0 && offset.current >= half) offset.current -= half;
      if (trackRef.current) trackRef.current.style.transform = `translateX(${-offset.current}px)`;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  // pause-ish while a quote modal is open
  useEffect(() => { speed.current = active ? 0 : 45; }, [active]);

  return (
    <section data-testid="why-repeat-section" style={{ padding: 'clamp(60px,8vw,100px) 0', borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 38 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: C.orange, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12 }}>Why RepEAT</p>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(28px,4vw,46px)', fontWeight: 800, letterSpacing: '-1.6px', color: '#fff' }}>Built for real savings</h2>
          </div>
        </Reveal>

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

      <Reveal>
        <p style={{ textAlign: 'center', fontSize: 11, fontWeight: 800, color: C.orange, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 22 }}>Loved across Ontario</p>
      </Reveal>

      <div data-testid="testimonials-marquee" style={{ overflow: 'hidden', maskImage: 'linear-gradient(90deg,transparent,black 5%,black 95%,transparent)', WebkitMaskImage: 'linear-gradient(90deg,transparent,black 5%,black 95%,transparent)' }}
        onMouseEnter={() => { if (!active) speed.current = 10; }}
        onMouseLeave={() => { if (!active) speed.current = 45; }}>
        <div ref={trackRef} style={{ display: 'flex', gap: 18, width: 'max-content', padding: '4px 18px', willChange: 'transform' }}>
          {row.map((t, i) => {
            const a = ACCENT[t.accent];
            return (
              <button key={i} data-testid={`testimonial-card-${i}`} onClick={() => setActive(t)}
                style={{ flexShrink: 0, width: 380, maxWidth: '82vw', textAlign: 'left', cursor: 'pointer', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px 22px', transition: 'border-color .2s' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${a}66`)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}>
                <IconQuote size={22} style={{ color: a, opacity: 0.6, marginBottom: 10 }} />
                <p style={{ fontSize: 14.5, color: '#e2e2e2', lineHeight: 1.6, marginBottom: 16, minHeight: 67, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.quote}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${a}22`, border: `1px solid ${a}55`, color: a, fontWeight: 800, fontFamily: FONT_DISPLAY }}>{t.name.charAt(0)}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: C.textMute }}>{t.role}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* full-quote modal */}
      <AnimatePresence>
        {active && (
          <motion.div data-testid="testimonial-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setActive(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
            <motion.div initial={{ scale: 0.92, y: 14 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 14 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{ position: 'relative', maxWidth: 520, width: '100%', background: C.surfaceHi, border: `1px solid ${ACCENT[active.accent]}55`, borderRadius: 22, padding: '34px 32px', boxShadow: `0 30px 80px -20px ${ACCENT[active.accent]}55` }}>
              <button data-testid="testimonial-modal-close" onClick={() => setActive(null)} aria-label="Close"
                style={{ position: 'absolute', top: 16, right: 16, width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border2}`, color: '#aaa', cursor: 'pointer' }}>
                <IconX size={18} />
              </button>
              <IconQuote size={32} style={{ color: ACCENT[active.accent], opacity: 0.7, marginBottom: 16 }} />
              <p style={{ fontSize: 19, color: '#fff', lineHeight: 1.6, marginBottom: 26 }}>{active.quote}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${ACCENT[active.accent]}22`, border: `1px solid ${ACCENT[active.accent]}55`, color: ACCENT[active.accent], fontWeight: 800, fontFamily: FONT_DISPLAY, fontSize: 17 }}>{active.name.charAt(0)}</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{active.name}</div>
                  <div style={{ fontSize: 13, color: C.textMute }}>{active.role}</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
