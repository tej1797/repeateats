'use client';

import { useEffect, useState } from 'react';
import { C, FONT_DISPLAY } from './homeData';
import Counter from './Counter';
import { Reveal } from './Reveal';

type LiveStats = { restaurant_count: number; deal_count: number; claim_count: number };

// 12000 -> {12, "K+"}, 1500 -> {2, "K+"} (rounded), <1000 -> {n, "+"}
function kify(n: number): { value: number; suffix: string } {
  if (n >= 1000) return { value: Math.max(1, Math.round(n / 1000)), suffix: 'K+' };
  return { value: n, suffix: '+' };
}

export default function Stats() {
  const [live, setLive] = useState<LiveStats | null>(null);

  useEffect(() => {
    let on = true;
    fetch('/api/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: LiveStats | null) => { if (on && d) setLive(d); })
      .catch(() => {});
    return () => { on = false; };
  }, []);

  const claims = live?.claim_count && live.claim_count > 0 ? live.claim_count : 12000;
  const deals = kify(claims);
  const restaurants = live?.restaurant_count && live.restaurant_count > 0 ? live.restaurant_count : 400;

  const items = [
    { value: restaurants, prefix: '', suffix: '+', label: 'Restaurants' },
    { value: deals.value, prefix: '', suffix: deals.suffix, label: 'Deals claimed' },
    { value: 15, prefix: '', suffix: '', label: 'Ontario cities' },
    { value: 0, prefix: '$', suffix: '', label: 'Monthly fee' },
  ];

  return (
    <section data-testid="stats-section" style={{ padding: 'clamp(72px,9vw,112px) 24px', background: C.bg1, borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Reveal>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, padding: 'clamp(32px,5vw,52px) clamp(20px,4vw,40px)', position: 'relative', overflow: 'hidden' }}>
            <div aria-hidden style={{ position: 'absolute', left: '50%', top: -40, transform: 'translateX(-50%)', width: '60%', height: 120, background: C.orange, filter: 'blur(120px)', opacity: 0.1 }} />
            <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 28 }}>
              {items.map((s, i) => (
                <div key={s.label} style={{ textAlign: 'center', borderRight: i < items.length - 1 ? `1px solid ${C.border}` : 'none', padding: '4px 8px' }}>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(32px,4.6vw,50px)', fontWeight: 800, color: C.orange, letterSpacing: '-2px', lineHeight: 1 }}>
                    <Counter value={s.value} prefix={s.prefix} suffix={s.suffix} />
                  </div>
                  <div style={{ fontSize: 13.5, color: C.textSoft, marginTop: 10, fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
