'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconPlus, IconChevronDown } from '@tabler/icons-react';
import { C, FONT_DISPLAY, FAQS } from './homeData';
import { Reveal } from './Reveal';

const EASE = [0.22, 1, 0.36, 1] as const;

export default function FAQ() {
  const [mainOpen, setMainOpen] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section data-testid="faq-section" style={{ padding: 'clamp(64px,9vw,110px) 24px', borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <Reveal>
          {/* master FAQ dropdown */}
          <button data-testid="faq-master-toggle" onClick={() => setMainOpen((v) => !v)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: 'clamp(20px,4vw,26px)', borderRadius: 18, background: C.surface, border: `1px solid ${mainOpen ? 'rgba(255,107,0,0.45)' : C.border}`, cursor: 'pointer', transition: 'border-color .2s' }}>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: C.orange, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6 }}>FAQ</p>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(22px,3.6vw,34px)', fontWeight: 800, letterSpacing: '-1px', color: '#fff' }}>Frequently asked questions</span>
            </div>
            <motion.span animate={{ rotate: mainOpen ? 180 : 0 }} transition={{ duration: 0.3 }} style={{ color: mainOpen ? C.orange : C.textMute, flexShrink: 0 }}>
              <IconChevronDown size={28} />
            </motion.span>
          </button>
        </Reveal>

        <AnimatePresence initial={false}>
          {mainOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }} style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
                {FAQS.map((f, i) => {
                  const isOpen = open === i;
                  return (
                    <div key={f.q} data-testid={`faq-item-${i}`} style={{ background: C.surface, border: `1px solid ${isOpen ? 'rgba(255,107,0,0.4)' : C.border}`, borderRadius: 14, overflow: 'hidden', transition: 'border-color .2s' }}>
                      <button data-testid={`faq-toggle-${i}`} onClick={() => setOpen(isOpen ? null : i)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '18px 20px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                        <span style={{ fontSize: 15.5, fontWeight: 700, color: '#fff', fontFamily: FONT_DISPLAY, letterSpacing: '-0.2px' }}>{f.q}</span>
                        <motion.span animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.25 }} style={{ flexShrink: 0, color: isOpen ? C.orange : C.textMute }}>
                          <IconPlus size={20} />
                        </motion.span>
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} style={{ overflow: 'hidden' }}>
                            <p style={{ padding: '0 20px 20px', fontSize: 14.5, color: C.textSoft, lineHeight: 1.75 }}>{f.a}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
