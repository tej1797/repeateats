'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { IconArrowRight } from '@tabler/icons-react';
import { C, FONT_DISPLAY, TRENDING_DEALS } from './homeData';
import { Reveal } from './Reveal';

const EASE = [0.22, 1, 0.36, 1] as const;

export default function FeaturedDeals() {
  return (
    <section data-testid="featured-deals-section" style={{ padding: 'clamp(80px,10vw,128px) 24px', background: C.bg1, borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Reveal>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 44, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: C.orange, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>This week</p>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(30px,4.5vw,52px)', fontWeight: 800, letterSpacing: '-1.8px', color: '#fff' }}>Featured deals</h2>
            </div>
            <Link href="/customer/preview" data-testid="view-all-deals"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 46, padding: '0 22px', borderRadius: 12, border: `1.5px solid ${C.border2}`, color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none', transition: 'border-color .2s, background .2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#555'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.background = 'transparent'; }}>
              View all deals <IconArrowRight size={16} />
            </Link>
          </div>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 16 }}>
          {TRENDING_DEALS.map((d, i) => (
            <motion.div key={d.title}
              initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px 0px -40px 0px' }}
              transition={{ duration: 0.55, delay: (i % 4) * 0.07, ease: EASE }}
              whileHover={{ y: -5 }}>
              <Link href="/customer/preview" data-testid={`featured-deal-${i}`}
                style={{ display: 'block', textDecoration: 'none', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', transition: 'border-color .2s' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255,107,0,0.45)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}>
                <div style={{ padding: '20px 18px 14px', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                    <span style={{ fontSize: 34 }}>{d.emoji}</span>
                    <span style={{ background: 'rgba(255,107,0,0.12)', color: C.orange, fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 8 }}>{d.discount}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', lineHeight: 1.35 }}>{d.title}</div>
                </div>
                <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 12.5, color: '#999', fontWeight: 600 }}>{d.restaurant}</div>
                    <div style={{ fontSize: 11.5, color: C.textFaint, marginTop: 2 }}>📍 {d.city}</div>
                  </div>
                  <span style={{ fontSize: 11, background: C.border, color: '#888', padding: '4px 9px', borderRadius: 7, fontWeight: 600 }}>{d.tag}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
