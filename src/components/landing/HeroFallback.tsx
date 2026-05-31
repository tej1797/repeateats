'use client';

// CSS-only hero fallback — shown while 3D scene loads or on low-end devices.
// Mirrors the visual style of the 3D scene using CSS animations.

const SAMPLE_DEALS = [
  { emoji: '🍛', title: '30% Off Full Menu',     restaurant: 'Nirvana Restaurant',   discount: '30% OFF', tag: 'dine-in' },
  { emoji: '🍣', title: 'Free Appetizer',          restaurant: 'Tokyo Garden',         discount: 'FREE',    tag: 'pickup'  },
  { emoji: '🥩', title: '$10 Off Any Order $40+', restaurant: 'Lancaster Smokehouse', discount: '$10',     tag: 'dine-in' },
];

const CARD_STYLES = [
  { left: 0,  top: 0,   animation: 'floatA 5s ease-in-out infinite',        zIndex: 3 },
  { left: 44, top: 140, animation: 'floatB 6s 1s ease-in-out infinite',     zIndex: 2 },
  { left: 88, top: 280, animation: 'floatC 4.5s 0.5s ease-in-out infinite', zIndex: 1 },
];

export default function HeroFallback() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0A0A0A', overflow: 'hidden' }}>
      {/* Orange orb — top left */}
      <div style={{
        position: 'absolute', top: '8%', left: '15%',
        width: 700, height: 700, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(232,93,4,0.18) 0%, transparent 70%)',
        filter: 'blur(80px)',
        animation: 'orbDrift1 24s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      {/* Amber orb — bottom right */}
      <div style={{
        position: 'absolute', bottom: '10%', right: '5%',
        width: 550, height: 550, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,154,77,0.1) 0%, transparent 70%)',
        filter: 'blur(80px)',
        animation: 'orbDrift2 32s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* Floating 2D deal cards — desktop right column */}
      <div style={{
        position: 'absolute', right: '8%', top: '50%',
        transform: 'translateY(-50%)',
        width: 320, height: 440,
        display: 'none',
      }} className="lg-cards-visible">
        {SAMPLE_DEALS.map((deal, i) => (
          <div key={deal.restaurant} style={{
            position: 'absolute',
            left: CARD_STYLES[i].left,
            top:  CARD_STYLES[i].top,
            width: 230,
            background: '#141414',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14, padding: 16,
            boxShadow: '0 8px 36px rgba(0,0,0,0.55)',
            animation: CARD_STYLES[i].animation,
            zIndex: CARD_STYLES[i].zIndex,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'rgba(232,93,4,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
              }}>
                {deal.emoji}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: '#555', marginBottom: 2 }}>{deal.restaurant}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#F2F2F2', lineHeight: 1.2 }}>{deal.title}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{
                fontFamily: 'var(--font-syne, Syne, sans-serif)',
                fontSize: 20, fontWeight: 800, color: '#E85D04',
              }}>
                {deal.discount}
              </div>
              <div style={{
                fontSize: 10, fontWeight: 700,
                background: 'rgba(232,93,4,0.15)', color: '#E85D04',
                padding: '3px 8px', borderRadius: 100,
              }}>
                {deal.tag}
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media (min-width: 1024px) { .lg-cards-visible { display: block !important; } }
      `}</style>
    </div>
  );
}
