'use client';

// Landing page — dark theme, world-class design.
// Client component needed for Intersection Observer count-up + scroll effects.

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// ─── Data ─────────────────────────────────────────────────────────────────────

const SAMPLE_DEALS = [
  { emoji: '🍛', title: '30% Off Full Menu',      restaurant: 'Karahi Boys',         discount: '30% OFF', tag: 'dine-in' },
  { emoji: '🍣', title: 'Free Appetizer',           restaurant: 'Tokyo Garden',         discount: 'FREE',    tag: 'pickup'  },
  { emoji: '🥩', title: '$10 Off Any Order $40+',  restaurant: 'Lancaster Smokehouse', discount: '$10',     tag: 'dine-in' },
];

const PORTALS = [
  {
    href: '/customer/login',
    emoji: '🍽️',
    emojiBg: 'rgba(232,93,4,0.18)',
    title: 'Customer',
    sub: '/ Foodie',
    desc: 'Browse deals near you, filter by city, cuisine, or deal type.',
    cta: 'Browse deals →',
    ctaColor: '#E85D04',
  },
  {
    href: '/restaurant',
    emoji: '🏪',
    emojiBg: 'rgba(16,185,129,0.15)',
    title: 'Restaurant',
    sub: '/ Business',
    desc: 'List deals, import from Google, track redemptions — free forever.',
    cta: 'List your restaurant →',
    ctaColor: '#10B981',
  },
  {
    href: '/influencer',
    emoji: '🎥',
    emojiBg: 'rgba(168,85,247,0.15)',
    title: 'Creator',
    sub: '/ Influencer',
    desc: 'Find restaurant collabs, negotiate in-app, earn on every deal.',
    cta: 'Find collabs →',
    ctaColor: '#A855F7',
  },
];

const STATS = [
  { end: 400, suffix: '+', prefix: '',  label: 'Restaurants'    },
  { end: 15,  suffix: '',  prefix: '',  label: 'Ontario cities'  },
  { end: 0,   suffix: '',  prefix: '$', label: 'Monthly fee'     },
  { end: 0,   suffix: '%', prefix: '',  label: 'Commission'      },
];

const STEPS = [
  { num: '01', emoji: '🍽️', title: 'Restaurant posts a deal',       desc: 'Restaurants list weekly promotions — free, zero commission, no contract.' },
  { num: '02', emoji: '📱', title: 'You claim it with a QR code',    desc: 'Browse deals near you and claim with one tap.' },
  { num: '03', emoji: '✅', title: 'Show it at the door, save money', desc: 'No delivery fees, no apps — just flash your QR code at checkout.' },
];

const RESTAURANTS = [
  'Karahi Boys', 'Bombay Chowpatty', 'Lancaster Smokehouse', 'Tokyo Garden',
  'Pizza Nova', 'Banh Mi Boys', "Sneaky Dee's", 'The Rec Room', 'Burrito Boyz',
  'Wildcraft Brewery', 'Lahore Tikka House', 'Jerusalem Restaurant',
  'Masala Bay', 'Saffron Indian Bistro', 'The Keg Steakhouse',
];

const CARD_STYLES = [
  { left: 0,  top: 0,   animation: 'floatA 5s ease-in-out infinite',        zIndex: 3 },
  { left: 44, top: 140, animation: 'floatB 6s 1s ease-in-out infinite',     zIndex: 2 },
  { left: 88, top: 280, animation: 'floatC 4.5s 0.5s ease-in-out infinite', zIndex: 1 },
];

// ─── Count-up stat item ───────────────────────────────────────────────────────

function StatItem({ end, suffix = '', prefix = '', label }: {
  end: number; suffix?: string; prefix?: string; label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [triggered, setTriggered] = useState(false);
  const [count,     setCount]     = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setTriggered(true); obs.disconnect(); } },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!triggered || end === 0) { setCount(end); return; }
    const steps = 40;
    const inc   = end / steps;
    let cur = 0;
    const timer = setInterval(() => {
      cur += inc;
      if (cur >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(cur));
    }, 1200 / steps);
    return () => clearInterval(timer);
  }, [triggered, end]);

  return (
    <div ref={ref} style={{ textAlign: 'center' }}>
      <div style={{
        fontFamily: 'var(--font-syne, Syne, sans-serif)',
        fontSize: 'clamp(30px,5vw,46px)',
        fontWeight: 800, color: '#E85D04',
        lineHeight: 1.1, letterSpacing: '-1px',
      }}>
        {prefix}{count}{suffix}
      </div>
      <div style={{ fontSize: 13, color: '#555', marginTop: 6 }}>{label}</div>
    </div>
  );
}

// ─── Main landing page ────────────────────────────────────────────────────────

export default function LandingPage() {
  const portalsRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);

  // Fade out scroll indicator after user scrolls past 80px
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToPortals = () => {
    portalsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0A',
      color: '#F2F2F2',
      fontFamily: 'var(--font-jakarta, "Plus Jakarta Sans", sans-serif)',
      overflowX: 'hidden',
    }}>

      {/* ── NAV ────────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        height: 60,
        display: 'flex', alignItems: 'center',
        background: 'rgba(10,10,10,0.85)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          maxWidth: 1100, width: '100%', margin: '0 auto', padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{
            fontFamily: 'var(--font-syne, Syne, sans-serif)',
            fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px',
          }}>
            Rep<span style={{ color: '#E85D04' }}>EAT</span>
          </div>
          {/* Sign in → portal chooser */}
          <Link href="/login" style={{
            display: 'inline-flex', alignItems: 'center',
            height: 36, padding: '0 16px',
            borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.15)',
            color: '#F2F2F2', fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}>
            Sign in
          </Link>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh', position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', paddingTop: 60,
      }}>

        {/* Animated background orbs */}
        <div style={{
          position: 'absolute', top: '8%', left: '15%',
          width: 700, height: 700, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,93,4,0.16) 0%, transparent 70%)',
          filter: 'blur(80px)',
          animation: 'orbDrift1 24s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', right: '5%',
          width: 550, height: 550, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,154,77,0.1) 0%, transparent 70%)',
          filter: 'blur(80px)',
          animation: 'orbDrift2 32s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        {/* Hero content */}
        <div style={{
          maxWidth: 1100, margin: '0 auto', padding: '0 24px',
          width: '100%', display: 'flex', alignItems: 'center', gap: 60,
          position: 'relative', zIndex: 2,
        }}>

          {/* Left column — text */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Ontario badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(232,93,4,0.12)',
              border: '1px solid rgba(232,93,4,0.3)',
              color: '#E85D04',
              fontSize: 12, fontWeight: 700,
              padding: '5px 14px', borderRadius: 100, marginBottom: 24,
              animation: 'fadeUpIn 0.6s ease forwards',
            }}>
              🇨🇦 Ontario-wide · GTA &amp; KW
            </div>

            {/* Main headline — overflow visible so gradient text isn't clipped */}
            <h1 style={{
              fontFamily: 'var(--font-syne, Syne, sans-serif)',
              fontSize: 'clamp(42px, 6.5vw, 80px)',
              fontWeight: 800, lineHeight: 1.06,
              letterSpacing: '-2px',   /* reduced from -3px to prevent clip */
              marginBottom: 22,
              overflow: 'visible',
              animation: 'fadeUpIn 0.6s 0.1s ease both',
            }}>
              Restaurant deals,<br />
              {/*
                display:inline-block + paddingRight prevents -webkit-background-clip
                from cutting off the last character ("d") when letter-spacing is tight.
              */}
              <span style={{
                display: 'inline-block',
                paddingRight: '4px',
                background: 'linear-gradient(135deg, #E85D04 30%, #FF9A4D 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                claimed in person.
              </span>
            </h1>

            {/* Subheadline */}
            <p style={{
              fontSize: 17, color: '#888', lineHeight: 1.75,
              maxWidth: 480, marginBottom: 36,
              animation: 'fadeUpIn 0.6s 0.2s ease both',
            }}>
              Discover weekly promotions from local restaurants across Ontario.
              No delivery fees, no apps — just show your QR code at the door.
            </p>

            {/* Three CTA buttons */}
            <div style={{
              display: 'flex', gap: 10, flexWrap: 'wrap',
              animation: 'fadeUpIn 0.6s 0.3s ease both',
            }}>
              {/* Primary — Browse deals */}
              <Link href="/customer/preview" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                height: 48, padding: '0 22px',
                background: 'linear-gradient(135deg, #E85D04, #FF7A30)',
                color: '#fff', fontSize: 14, fontWeight: 700, borderRadius: 11,
                textDecoration: 'none',
                boxShadow: '0 4px 24px rgba(232,93,4,0.4)',
              }}>
                Browse deals →
              </Link>

              {/* Ghost — List your restaurant */}
              <Link href="/restaurant" style={{
                display: 'inline-flex', alignItems: 'center',
                height: 48, padding: '0 20px',
                border: '1.5px solid rgba(255,255,255,0.15)',
                color: '#F2F2F2', fontSize: 14, fontWeight: 600, borderRadius: 11,
                textDecoration: 'none',
              }}>
                List your restaurant
              </Link>

              {/* Purple ghost — For food creators */}
              <Link href="/influencer" style={{
                display: 'inline-flex', alignItems: 'center',
                height: 48, padding: '0 20px',
                border: '1.5px solid rgba(168,85,247,0.35)',
                color: '#A855F7', fontSize: 14, fontWeight: 600, borderRadius: 11,
                textDecoration: 'none',
              }}>
                For food creators
              </Link>
            </div>
          </div>

          {/* Right column — floating deal cards (desktop only) */}
          <div className="hidden lg:block" style={{ width: 320, flexShrink: 0, position: 'relative', height: 440 }}>
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
        </div>

        {/* Scroll indicator — fades out after user scrolls, clicks to portals section */}
        <button
          onClick={scrollToPortals}
          style={{
            position: 'absolute', bottom: 32, left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
            color: '#444', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
            background: 'none', border: 'none', cursor: 'pointer',
            animation: 'scrollBounce 2.2s ease-in-out infinite',
            opacity: scrolled ? 0 : 1,
            transition: 'opacity 0.4s ease',
            zIndex: 2,
          }}
          aria-label="Scroll to portal cards"
        >
          <span>Scroll</span>
          {/* Animated chevron */}
          <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
            <path d="M1 1L8 8L15 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </section>

      {/* ── PORTALS ────────────────────────────────────────────────────────── */}
      <section ref={portalsRef} style={{ padding: 'clamp(64px,9vw,110px) 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{
              fontSize: 11, fontWeight: 700, color: '#E85D04',
              letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12,
            }}>
              Three portals
            </p>
            <h2 style={{
              fontFamily: 'var(--font-syne, Syne, sans-serif)',
              fontSize: 'clamp(28px,4vw,46px)', fontWeight: 800,
              letterSpacing: '-1.5px', color: '#F2F2F2',
            }}>
              One platform, every role
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))',
            gap: 16,
          }}>
            {PORTALS.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="portal-card"
                style={{
                  display: 'block',
                  background: '#141414',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 18, padding: 28,
                  textDecoration: 'none', color: 'inherit',
                }}
              >
                <div style={{
                  width: 58, height: 58, borderRadius: 15,
                  background: p.emojiBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, marginBottom: 20,
                }}>
                  {p.emoji}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: '#F2F2F2' }}>
                  {p.title}{' '}
                  <span style={{ fontSize: 13, color: '#444', fontWeight: 400 }}>{p.sub}</span>
                </div>
                <div style={{ fontSize: 14, color: '#666', lineHeight: 1.7, marginBottom: 22 }}>
                  {p.desc}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: p.ctaColor }}>
                  {p.cta}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────────────────────────────── */}
      <section style={{
        padding: 'clamp(48px,7vw,80px) 24px',
        background: '#0D0D0D',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          maxWidth: 860, margin: '0 auto',
          display: 'flex', justifyContent: 'space-around',
          flexWrap: 'wrap', gap: 40,
        }}>
          {STATS.map((s) => (
            <StatItem key={s.label} end={s.end} suffix={s.suffix} prefix={s.prefix} label={s.label} />
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(64px,9vw,110px) 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{
              fontSize: 11, fontWeight: 700, color: '#E85D04',
              letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12,
            }}>
              Simple by design
            </p>
            <h2 style={{
              fontFamily: 'var(--font-syne, Syne, sans-serif)',
              fontSize: 'clamp(28px,4vw,46px)', fontWeight: 800,
              letterSpacing: '-1.5px', color: '#F2F2F2',
            }}>
              How it works
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px,1fr))',
            gap: 24, position: 'relative',
          }}>
            {STEPS.map((s, i) => (
              <div key={s.num} style={{ position: 'relative' }}>
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block" style={{
                    position: 'absolute', top: 30, left: 'calc(100% + 0px)',
                    width: 24, height: 1,
                    borderTop: '2px dashed rgba(232,93,4,0.25)',
                  }} />
                )}
                <div style={{
                  background: '#141414',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 18, padding: 28, height: '100%',
                }}>
                  <div style={{
                    fontSize: 11, fontWeight: 800, color: 'rgba(232,93,4,0.5)',
                    fontFamily: 'var(--font-syne, Syne, sans-serif)',
                    letterSpacing: '0.08em', marginBottom: 18,
                  }}>
                    {s.num}
                  </div>
                  <div style={{ fontSize: 34, marginBottom: 16 }}>{s.emoji}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#F2F2F2', marginBottom: 10 }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: 14, color: '#555', lineHeight: 1.7 }}>
                    {s.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ───────────────────────────────────────────────────── */}
      <section style={{
        padding: 'clamp(48px,6vw,72px) 0',
        background: '#0D0D0D',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}>
        <p style={{
          textAlign: 'center', fontSize: 12, color: '#444',
          marginBottom: 28, letterSpacing: '0.06em', textTransform: 'uppercase',
          fontWeight: 600,
        }}>
          Trusted by restaurants across Ontario
        </p>
        <div style={{
          display: 'flex', overflow: 'hidden',
          maskImage: 'linear-gradient(90deg, transparent 0%, black 12%, black 88%, transparent 100%)',
        }}>
          <div style={{
            display: 'flex', gap: 12, flexShrink: 0,
            animation: 'marqueeScroll 32s linear infinite',
          }}>
            {[...RESTAURANTS, ...RESTAURANTS].map((r, i) => (
              <div key={`${r}-${i}`} style={{
                flexShrink: 0,
                background: '#1A1A1A',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 100,
                padding: '8px 20px',
                fontSize: 13, fontWeight: 600, color: '#666',
                whiteSpace: 'nowrap',
              }}>
                {r}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer style={{
        padding: 'clamp(44px,6vw,64px) 24px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: '#0A0A0A',
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        }}>
          <div style={{
            fontFamily: 'var(--font-syne, Syne, sans-serif)',
            fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px',
          }}>
            Rep<span style={{ color: '#E85D04' }}>EAT</span>
          </div>
          <p style={{ fontSize: 13, color: '#333' }}>
            Made for Ontario restaurants · repeateats.ca
          </p>
          <div style={{ display: 'flex', gap: 28 }}>
            {[
              { href: '/customer/preview', label: 'Customer'   },
              { href: '/restaurant',       label: 'Restaurant' },
              { href: '/influencer',       label: 'Creator'    },
            ].map((l) => (
              <Link key={l.href} href={l.href} style={{
                fontSize: 13, color: '#444', textDecoration: 'none',
              }}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>

    </div>
  );
}
