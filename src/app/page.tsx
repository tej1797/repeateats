'use client';

// RepEAT landing page — clean data-driven hero, Revolut/Robinhood style.
// No 3D, no floating elements, no clutter. Just the numbers.

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// ─── Data ─────────────────────────────────────────────────────────────────────

const HERO_STATS = [
  { emoji: '🔥', end: 89,  suffix: '',  prefix: '',  label: 'deals claimed today', duration: 2000 },
  { emoji: '🍽️', end: 400, suffix: '+', prefix: '',  label: 'restaurants',          duration: 2500 },
  { emoji: '💰', end: 0,   suffix: '',  prefix: '$', label: 'monthly fee',           duration: 0    },
  { emoji: '📍', end: 15,  suffix: '',  prefix: '',  label: 'Ontario cities',        duration: 1500 },
];

const LIVE_CLAIMS = [
  { text: "Pani Puri at India's Taste",    time: 'just claimed'  },
  { text: '30% Off at Nirvana Restaurant', time: '3 min ago'     },
  { text: 'Buy 2 Get 1 Bubble Tea',        time: '5 min ago'     },
  { text: '$10 Off Karahi Boys',           time: 'just claimed'  },
  { text: 'Free Appetizer at Tokyo Garden',time: '8 min ago'     },
  { text: '$15 Off Lancaster Smokehouse',  time: '12 min ago'    },
  { text: 'BOGO Pizza at Pizza Nova',      time: 'just claimed'  },
  { text: 'Free Dessert at Gusto 101',     time: '6 min ago'     },
  { text: '20% Off at Mughal Mahal',       time: '18 min ago'    },
  { text: 'Free Mango Lassi w/ Entrée',    time: '22 min ago'    },
];

const PORTALS = [
  {
    href:     '/customer/login',
    emoji:    '🍽️',
    emojiBg:  'rgba(232,93,4,0.15)',
    title:    'Customer',
    sub:      '/ Foodie',
    desc:     'Browse deals near you, filter by city, cuisine, or deal type.',
    cta:      'Browse deals →',
    ctaColor: '#E85D04',
  },
  {
    href:     '/restaurant',
    emoji:    '🏪',
    emojiBg:  'rgba(16,185,129,0.15)',
    title:    'Restaurant',
    sub:      '/ Business',
    desc:     'List deals, import from Google, track redemptions — free forever.',
    cta:      'List your restaurant →',
    ctaColor: '#10B981',
  },
  {
    href:     '/influencer',
    emoji:    '🎥',
    emojiBg:  'rgba(168,85,247,0.15)',
    title:    'Creator',
    sub:      '/ Influencer',
    desc:     'Find restaurant collabs, negotiate in-app, earn on every deal.',
    cta:      'Find collabs →',
    ctaColor: '#A855F7',
  },
];

const STEPS = [
  { num: '01', emoji: '🍽️', title: 'Restaurant posts a deal',       desc: 'Restaurants list weekly promotions — free, zero commission, no contract.' },
  { num: '02', emoji: '📱', title: 'You claim it with a QR code',    desc: 'Browse deals near you and claim with one tap.' },
  { num: '03', emoji: '✅', title: 'Show it at the door, save money', desc: 'No delivery fees, no apps — just flash your QR code at checkout.' },
];

const RESTAURANTS = [
  'Nirvana Restaurant', 'Mughal Mahal', 'Lancaster Smokehouse', 'Tokyo Garden',
  'Pizza Nova', 'Banh Mi Boys', "Sneaky Dee's", 'The Rec Room', 'Burrito Boyz',
  'Wildcraft Brewery', 'Lahore Tikka House', 'Jerusalem Restaurant',
  'Masala Bay', 'Saffron Indian Bistro', 'The Keg Steakhouse',
];

// ─── Hero stat — count-up number ─────────────────────────────────────────────

function HeroStat({
  emoji, end, suffix, prefix, label, duration, index,
}: {
  emoji: string; end: number; suffix: string; prefix: string;
  label: string; duration: number; index: number;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Start counting after a staggered delay tied to the hero fade-in
    const startDelay = setTimeout(() => {
      if (end === 0 || duration === 0) { setCount(end); return; }
      const steps    = 60;
      const interval = duration / steps;
      let cur = 0;
      const timer = setInterval(() => {
        cur += end / steps;
        if (cur >= end) { setCount(end); clearInterval(timer); }
        else { setCount(Math.floor(cur)); }
      }, interval);
      return () => clearInterval(timer);
    }, 2200 + index * 80); // start once hero has faded in
    return () => clearTimeout(startDelay);
  }, [end, duration, index]);

  return (
    <div style={{ textAlign: 'center', padding: '28px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>{emoji}</span>
        <span style={{
          fontFamily: 'var(--font-syne, Syne, sans-serif)',
          fontSize: 'clamp(30px, 3.5vw, 44px)',
          fontWeight: 800, color: '#E85D04',
          letterSpacing: '-1.5px', lineHeight: 1,
        }}>
          {prefix}{count}{suffix}
        </span>
      </div>
      <div style={{ fontSize: 13, color: '#666', fontWeight: 500, letterSpacing: '0.01em' }}>{label}</div>
    </div>
  );
}

// ─── Scroll-reveal section wrapper ───────────────────────────────────────────

function FadeSection({
  children, delay = 0, style = {},
}: {
  children: React.ReactNode; delay?: number; style?: React.CSSProperties;
}) {
  const ref   = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setShow(true); obs.disconnect(); } },
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity:    show ? 1 : 0,
        transform:  show ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.65s ${delay}ms ease, transform 0.65s ${delay}ms ease`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Main landing page ────────────────────────────────────────────────────────

export default function LandingPage() {
  const router      = useRouter();
  const portalsRef  = useRef<HTMLElement>(null);
  const [scrolled,    setScrolled]    = useState(false);
  const [processing,  setProcessing]  = useState(false);

  // ── Client-side OAuth code exchange ─────────────────────────────────────────
  useEffect(() => {
    const handleOAuthReturn = async () => {
      const params = new URLSearchParams(window.location.search);
      const code   = params.get('code');
      const error  = params.get('error');

      if (error) {
        const portal = localStorage.getItem('rp_portal') || 'customer';
        localStorage.removeItem('rp_portal');
        router.replace(portal === 'customer' ? `/customer/login?error=${error}` : `/${portal}?error=${error}`);
        return;
      }
      if (!code) return;

      setProcessing(true);
      try {
        const supabase = createClient();
        const { error: authError } = await supabase.auth.exchangeCodeForSession(code);
        if (authError) {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            const portal = localStorage.getItem('rp_portal') || 'customer';
            localStorage.removeItem('rp_portal');
            router.replace(portal === 'customer' ? '/customer/login?error=auth' : `/${portal}?error=auth`);
            return;
          }
        }
        const portal = localStorage.getItem('rp_portal') || 'customer';
        localStorage.removeItem('rp_portal');
        window.history.replaceState({}, '', '/');
        switch (portal) {
          case 'restaurant': router.replace('/restaurant'); break;
          case 'influencer': router.replace('/influencer'); break;
          default:           router.replace('/customer');
        }
      } catch {
        router.replace('/customer/login?error=auth');
      }
    };
    void handleOAuthReturn();
  }, [router]);

  // Fade out scroll indicator after scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToPortals = () =>
    portalsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // ── OAuth processing spinner ─────────────────────────────────────────────────
  if (processing) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0A' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48,
            border: '3px solid rgba(232,93,4,0.15)', borderTopColor: '#E85D04',
            borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 20px',
          }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ color: '#888', fontSize: 15 }}>Signing you in...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0A',
      color: '#F2F2F2',
      fontFamily: 'var(--font-jakarta, "Plus Jakarta Sans", sans-serif)',
      overflowX: 'hidden',
    }}>

      {/* ── Global CSS ──────────────────────────────────────────────────────── */}
      <style>{`
        /* Buttons */
        .btn-primary {
          display: inline-flex; align-items: center; gap: 6px;
          height: 52px; padding: 0 28px;
          background: #E85D04; color: #fff;
          font-size: 15px; font-weight: 700; border-radius: 12px;
          text-decoration: none; border: none; cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
          white-space: nowrap;
        }
        .btn-primary:hover {
          background: #C94E00; transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(232,93,4,0.45);
        }
        .btn-secondary {
          display: inline-flex; align-items: center;
          height: 52px; padding: 0 24px;
          background: transparent; color: #F2F2F2;
          font-size: 15px; font-weight: 600; border-radius: 12px;
          text-decoration: none; border: 1.5px solid rgba(255,255,255,0.2); cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
          white-space: nowrap;
        }
        .btn-secondary:hover { background: #fff; color: #0A0A0A; border-color: #fff; }
        .btn-ghost-orange {
          display: inline-flex; align-items: center;
          height: 52px; padding: 0 24px;
          background: transparent; color: #E85D04;
          font-size: 15px; font-weight: 600; border-radius: 12px;
          text-decoration: none; border: 1.5px solid rgba(232,93,4,0.35); cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
          white-space: nowrap;
        }
        .btn-ghost-orange:hover { background: #E85D04; color: #fff; border-color: #E85D04; }

        /* Portal cards */
        .portal-card {
          display: block;
          background: #141414; border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px; padding: 32px;
          text-decoration: none; color: inherit;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .portal-card:hover {
          transform: translateY(-4px);
          border-color: rgba(255,255,255,0.16);
          box-shadow: 0 20px 56px rgba(0,0,0,0.5);
        }

        /* Hero stat separators */
        .stat-col { border-right: 1px solid rgba(255,255,255,0.07); }
        .stat-col:last-child { border-right: none; }

        /* Mobile overrides */
        @media (max-width: 768px) {
          .hero-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .stat-col:nth-child(2) { border-right: none; }
          .stat-col:nth-child(1),
          .stat-col:nth-child(2) { border-bottom: 1px solid rgba(255,255,255,0.07); }
          .cta-row { flex-direction: column !important; align-items: stretch !important; }
          .cta-row a, .cta-row button {
            width: 100% !important; justify-content: center !important; height: 52px !important;
          }
          .portals-grid { grid-template-columns: 1fr !important; }
          .steps-grid   { grid-template-columns: 1fr !important; }
          .step-connector { display: none !important; }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        height: 60, display: 'flex', alignItems: 'center',
        background: 'rgba(10,10,10,0.88)', backdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        transition: 'background 0.3s ease',
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
          <Link href="/login" style={{
            display: 'inline-flex', alignItems: 'center',
            height: 36, padding: '0 16px',
            borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.14)',
            color: '#F2F2F2', fontSize: 13, fontWeight: 600, textDecoration: 'none',
            transition: 'border-color 0.15s ease, background 0.15s ease',
          }}>
            Sign in
          </Link>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh', position: 'relative',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        paddingTop: 60, overflow: 'hidden',
      }}>

        {/* Single clean radial glow — no blobs, no particles */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 80% 50% at 50% 40%, rgba(232,93,4,0.08) 0%, transparent 70%)',
        }} />

        {/* Content */}
        <div style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: 860,
          padding: '0 24px 140px',
          textAlign: 'center',
        }}>

          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(232,93,4,0.10)', border: '1px solid rgba(232,93,4,0.28)',
            color: '#E85D04', fontSize: 12, fontWeight: 700,
            padding: '5px 15px', borderRadius: 100, marginBottom: 28,
            animation: 'fadeUpIn 0.5s 0.5s ease both',
          }}>
            🇨🇦 Ontario-wide · GTA &amp; KW
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: 'var(--font-syne, Syne, sans-serif)',
            fontSize: 'clamp(48px, 8vw, 96px)',
            fontWeight: 800, lineHeight: 1.04,
            letterSpacing: '-3px', marginBottom: 24,
            animation: 'fadeUpIn 0.6s 0.8s ease both',
          }}>
            Restaurant deals,<br />
            <span style={{ color: '#E85D04' }}>claimed in person.</span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: 18, color: '#888', lineHeight: 1.7,
            maxWidth: 500, margin: '0 auto 40px',
            animation: 'fadeUpIn 0.6s 1.2s ease both',
          }}>
            Discover weekly promotions from local restaurants across Ontario.
            No delivery fees, no apps — just show your QR code at the door.
          </p>

          {/* CTAs */}
          <div
            className="cta-row"
            style={{
              display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap',
              animation: 'fadeUpIn 0.6s 1.5s ease both',
            }}
          >
            <Link href="/customer/preview" className="btn-primary">Browse deals →</Link>
            <Link href="/restaurant"       className="btn-secondary">List your restaurant</Link>
            <Link href="/influencer"       className="btn-ghost-orange">For food creators</Link>
          </div>

          {/* Stats row */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            marginTop: 52,
            animation: 'fadeUpIn 0.6s 2s ease both',
          }}>
            <div
              className="hero-stats-grid"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}
            >
              {HERO_STATS.map((stat, i) => (
                <div key={stat.label} className="stat-col">
                  <HeroStat {...stat} index={i} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <button
          onClick={scrollToPortals}
          style={{
            position: 'absolute', bottom: 28, left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            color: '#444', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase',
            background: 'none', border: 'none', cursor: 'pointer',
            animation: 'scrollBounce 2.2s ease-in-out infinite',
            opacity: scrolled ? 0 : 1, transition: 'opacity 0.4s ease',
            zIndex: 2,
          }}
          aria-label="Scroll to portal cards"
        >
          <span>Scroll</span>
          <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
            <path d="M1 1L8 8L15 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </section>

      {/* ── LIVE DEAL TICKER ────────────────────────────────────────────────── */}
      <div style={{
        background: '#0D0D0D',
        borderTop:    '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '14px 0',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* Fixed LIVE badge */}
          <div style={{
            flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0 20px 0 24px',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            marginRight: 0,
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#22C55E',
              boxShadow: '0 0 6px rgba(34,197,94,0.8)',
              animation: 'livePulse 2s ease-in-out infinite',
            }} />
            <span style={{
              fontSize: 10, fontWeight: 800, color: '#22C55E',
              letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>
              Live
            </span>
          </div>

          {/* Scrolling claims */}
          <div style={{
            flex: 1, overflow: 'hidden',
            maskImage: 'linear-gradient(90deg, transparent 0%, black 6%, black 94%, transparent 100%)',
          }}>
            <div style={{
              display: 'flex', gap: 48, flexShrink: 0,
              animation: 'marqueeScroll 50s linear infinite',
            }}>
              {[...LIVE_CLAIMS, ...LIVE_CLAIMS].map((claim, i) => (
                <div key={i} style={{
                  flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
                  fontSize: 13, whiteSpace: 'nowrap',
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#22C55E', flexShrink: 0,
                  }} />
                  <span style={{ color: '#F2F2F2', fontWeight: 600 }}>{claim.text}</span>
                  <span style={{ color: '#555' }}>— {claim.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── PORTALS ─────────────────────────────────────────────────────────── */}
      <section ref={portalsRef} style={{ padding: 'clamp(64px, 9vw, 110px) 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeSection style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{
              fontSize: 11, fontWeight: 700, color: '#E85D04',
              letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12,
            }}>
              Three portals
            </p>
            <h2 style={{
              fontFamily: 'var(--font-syne, Syne, sans-serif)',
              fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 800,
              letterSpacing: '-1.5px', color: '#F2F2F2',
            }}>
              One platform, every role
            </h2>
          </FadeSection>

          <div
            className="portals-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}
          >
            {PORTALS.map((p, i) => (
              <FadeSection key={p.href} delay={i * 80}>
                <Link href={p.href} className="portal-card">
                  <div style={{
                    width: 56, height: 56, borderRadius: 14,
                    background: p.emojiBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 26, marginBottom: 20,
                  }}>
                    {p.emoji}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6, color: '#F2F2F2' }}>
                    {p.title}{' '}
                    <span style={{ fontSize: 13, color: '#3A3A3A', fontWeight: 400 }}>{p.sub}</span>
                  </div>
                  <div style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 24 }}>
                    {p.desc}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: p.ctaColor }}>
                    {p.cta}
                  </div>
                </Link>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section style={{
        padding: 'clamp(64px, 9vw, 110px) 24px',
        background: '#0D0D0D',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeSection style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={{
              fontSize: 11, fontWeight: 700, color: '#E85D04',
              letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12,
            }}>
              Simple by design
            </p>
            <h2 style={{
              fontFamily: 'var(--font-syne, Syne, sans-serif)',
              fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 800,
              letterSpacing: '-1.5px', color: '#F2F2F2',
            }}>
              How it works
            </h2>
          </FadeSection>

          <div
            className="steps-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, position: 'relative' }}
          >
            {STEPS.map((s, i) => (
              <FadeSection key={s.num} delay={i * 100}>
                <div style={{ position: 'relative', paddingTop: 8 }}>
                  {/* Connecting dotted line to next step */}
                  {i < STEPS.length - 1 && (
                    <div className="step-connector" style={{
                      position: 'absolute', top: 26, left: 'calc(100% + 4px)',
                      width: 'calc(100% - 8px)', height: 1,
                      borderTop: '2px dashed rgba(232,93,4,0.22)',
                    }} />
                  )}

                  {/* Step number circle */}
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'rgba(232,93,4,0.12)',
                    border: '1.5px solid rgba(232,93,4,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-syne, Syne, sans-serif)',
                    fontSize: 13, fontWeight: 800, color: '#E85D04',
                    marginBottom: 20,
                  }}>
                    {s.num}
                  </div>

                  <div style={{ fontSize: 36, marginBottom: 14 }}>{s.emoji}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#F2F2F2', marginBottom: 10 }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: 14, color: '#555', lineHeight: 1.75 }}>
                    {s.desc}
                  </div>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF MARQUEE ────────────────────────────────────────────── */}
      <section style={{
        padding: 'clamp(48px, 6vw, 72px) 0',
        background: '#0A0A0A',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}>
        <p style={{
          textAlign: 'center', fontSize: 11, color: '#333',
          marginBottom: 28, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
        }}>
          Trusted by restaurants across Ontario
        </p>
        <div style={{
          display: 'flex', overflow: 'hidden',
          maskImage: 'linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)',
        }}>
          <div style={{
            display: 'flex', gap: 12, flexShrink: 0,
            animation: 'marqueeScroll 32s linear infinite',
          }}>
            {[...RESTAURANTS, ...RESTAURANTS].map((r, i) => (
              <div key={`${r}-${i}`} style={{
                flexShrink: 0,
                background: '#141414', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 100, padding: '8px 20px',
                fontSize: 13, fontWeight: 600, color: '#555', whiteSpace: 'nowrap',
              }}>
                {r}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{
        padding: 'clamp(44px, 6vw, 64px) 24px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: '#0A0A0A',
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            fontFamily: 'var(--font-syne, Syne, sans-serif)',
            fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px',
          }}>
            Rep<span style={{ color: '#E85D04' }}>EAT</span>
          </div>
          <p style={{ fontSize: 13, color: '#2E2E2E' }}>
            Restaurant deals, claimed in person.
          </p>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { href: '/customer/preview', label: 'Customer'    },
              { href: '/restaurant',       label: 'Restaurant'  },
              { href: '/influencer',       label: 'Creator'     },
              { href: '/repeat-plus',      label: 'RepEAT+'     },
            ].map((l) => (
              <Link key={l.href} href={l.href} style={{
                fontSize: 13, color: '#3A3A3A', textDecoration: 'none',
                transition: 'color 0.15s ease',
              }}>
                {l.label}
              </Link>
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#222', marginTop: 4 }}>
            © 2026 RepEAT · Ontario, Canada 🇨🇦
          </p>
        </div>
      </footer>

    </div>
  );
}
