'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconPlus } from '@tabler/icons-react';
import { C, FONT_DISPLAY, FAQS } from './homeData';
import { Reveal } from './Reveal';

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section data-testid="faq-section" style={{ padding: 'clamp(80px,10vw,128px) 24px', background: C.bg1, borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: C.orange, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>FAQ</p>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(30px,4.5vw,52px)', fontWeight: 800, letterSpacing: '-1.8px', color: '#fff' }}>Questions, answered</h2>
          </div>
        </Reveal>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={f.q} delay={i * 0.04}>
                <div data-testid={`faq-item-${i}`} style={{ background: C.surface, border: `1px solid ${isOpen ? 'rgba(255,107,0,0.4)' : C.border}`, borderRadius: 16, overflow: 'hidden', transition: 'border-color .2s' }}>
                  <button onClick={() => setOpen(isOpen ? null : i)} data-testid={`faq-toggle-${i}`}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '20px 22px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ fontSize: 16.5, fontWeight: 700, color: '#fff', fontFamily: FONT_DISPLAY, letterSpacing: '-0.2px' }}>{f.q}</span>
                    <motion.span animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.25 }} style={{ flexShrink: 0, color: isOpen ? C.orange : C.textMute }}>
                      <IconPlus size={22} />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} style={{ overflow: 'hidden' }}>
                        <p style={{ padding: '0 22px 22px', fontSize: 15, color: C.textSoft, lineHeight: 1.75 }}>{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
