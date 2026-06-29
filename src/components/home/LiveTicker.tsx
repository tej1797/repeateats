'use client';

import { C } from './homeData';
import { LIVE_TICKER } from './homeData';

export default function LiveTicker() {
  const items = [...LIVE_TICKER, ...LIVE_TICKER];
  return (
    <div data-testid="live-ticker" style={{ background: C.bg0, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: '13px 0', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7, padding: '0 20px 0 24px', borderRight: `1px solid ${C.border}` }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, animation: 'livePulse 2s ease-in-out infinite' }} />
          <span style={{ fontSize: 10, fontWeight: 800, color: C.green, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Live</span>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', maskImage: 'linear-gradient(90deg, transparent 0%, black 6%, black 94%, transparent 100%)' }}>
          <div style={{ display: 'flex', gap: 48, width: 'max-content', animation: 'marqueeScroll 44s linear infinite' }}>
            {items.map((item, i) => (
              <div key={i} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, whiteSpace: 'nowrap' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, flexShrink: 0 }} />
                <span style={{ color: '#ccc', fontWeight: 600 }}>{item.text}</span>
                <span style={{ color: C.textMute }}>— {item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
