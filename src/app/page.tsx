'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { resolvePortalIntent, readPortalCookie, clearPortalIntent, portalPath } from '@/lib/portalAuth';
import { handleOAuthReturn as completeOAuthReturn } from '@/lib/oauthCallback';

// ─── Constants ──────────────────────────────────────────────────────────────────
const GOLD = '#D4AF37';
const GOLD_BG = 'rgba(212,175,55,0.12)';
const GOLD_BORDER = 'rgba(212,175,55,0.35)';
const ORANGE = '#FF7A00';

// ─── Static data ───────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: '🔍',
    title: 'Browse Deals',
    desc: 'Filter by city, cuisine, or deal type. New deals drop every week from local restaurants across Ontario.',
  },
  {
    icon: '⚡',
    title: 'Claim Instantly',
    desc: 'One tap to claim. Your QR code is ready immediately — no verification steps, no waiting around.',
  },
  {
    icon: '💸',
    title: 'Dine & Save',
    desc: 'Flash your QR at the door and save. No delivery fees, no third-party apps. Real food, real savings.',
  },
];

const PLUS_PERKS = [
  { icon: '♾️', label: 'Unlimited Claims'  },
  { icon: '🔔', label: 'Priority Alerts'   },
  { icon: '⭐', label: 'Exclusive Deals'   },
  { icon: '📅', label: 'Deal Calendar'     },
];

const TRENDING_DEALS = [
  { emoji: '🍕', title: '30% Off Any Pizza',       restaurant: 'Pizza Nova',         city: 'Toronto',     tag: 'Dine-in', discount: '30%'  },
  { emoji: '🍜', title: 'Buy 2 Get 1 Free Ramen',  restaurant: 'Tokyo Garden',        city: 'Mississauga', tag: 'Takeout', discount: 'B2G1' },
  { emoji: '🍗', title: '$10 Off Karahi Bowl',      restaurant: 'Karahi Boys',         city: 'Brampton',    tag: 'Dine-in', discount: '$10'  },
  { emoji: '🧋', title: 'Free Bubble Tea w/ Order', restaurant: 'Chatime',             city: 'Waterloo',    tag: 'Pickup',  discount: 'Free' },
  { emoji: '🍛', title: 'Free Appetizer w/ Entrée', restaurant: 'Nirvana Restaurant',  city: 'Kitchener',   tag: 'Dine-in', discount: 'Free' },
  { emoji: '🥗', title: '20% Off Entire Order',     restaurant: 'Mughal Mahal',        city: 'Hamilton',    tag: 'Dine-in', discount: '20%'  },
  { emoji: '🍣', title: 'BOGO Sushi Rolls',         restaurant: 'Sushi Garden',        city: 'Oakville',    tag: 'Dine-in', discount: 'BOGO' },
  { emoji: '🌮', title: '$5 Off Any Burrito',       restaurant: 'Burrito Boyz',        city: 'Toronto',     tag: 'Takeout', discount: '$5'   },
];

const FREE_FEATURES = [
  'Browse all deals',
  'Claim up to 3 deals/month',
  'QR code redemption',
  'Filter by city & cuisine',
];

const PLUS_FEATURES = [
  'Unlimited deal claims',
  'Priority access to new deals',
  'Exclusive RepEAT+ only offers',
  'Early access to flash sales',
  'Deal expiry reminders',
  'Savings tracker dashboard',
];

const LIVE_TICKER = [
  { text: "Pani Puri at India's Taste",     time: 'just claimed' },
  { text: '30% Off at Nirvana Restaurant',  time: '3 min ago'    },
  { text: 'Buy 2 Get 1 Bubble Tea',         time: '5 min ago'    },
  { text: '$10 Off Karahi Boys',            time: 'just claimed' },
  { text: 'Free Appetizer at Tokyo Garden', time: '8 min ago'    },
  { text: '$15 Off Lancaster Smokehouse',   time: '12 min ago'   },
  { text: 'BOGO Pizza at Pizza Nova',       time: 'just claimed' },
  { text: 'Free Dessert at Gusto 101',      time: '6 min ago'    },
];

const CLAIM_STEPS = [
  {
    num: '01',
    emoji: '🔍',
    title: 'Browse deals',
    desc: 'Filter by city, cuisine, or deal type. New deals land every week.',
  },
  {
    num: '02',
    emoji: '⚡',
    title: 'Claim with one tap',
    desc: 'Hit Claim Deal — your personal QR code is generated instantly.',
  },
  {
    num: '03',
    emoji: '📱',
    title: 'Show QR at restaurant',
    desc: 'Open your QR at the door. Staff scan it and you pocket the savings.',
  },
];

// ─── Sub-components ─────────────────────────────────────────────────────────────

function FadeSection({
  children, delay = 0, style = {},
}: {
  children: React.ReactNode; delay?: number; style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShow(true); obs.disconnect(); } },
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      opacity: show ? 1 : 0,
      transform: show ? 'translateY(0)' : 'translateY(24px)',
      transition: `opacity 0.6s ${delay}ms ease, transform 0.6s ${delay}ms ease`,
      ...style,
    }}>
      {children}
    </div>
  );
}

function CheckRow({ label, gold = false }: { label: string; gold?: boolean }) {
  const color = gold ? GOLD : ORANGE;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0',
      borderBottom: `1px solid ${gold ? 'rgba(212,175,55,0.1)' : '#1E1E1E'}`,
      fontSize: 14, color: gold ? '#ddd' : '#888',
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
        background: gold ? 'rgba(212,175,55,0.18)' : 'rgba(255,122,0,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {label}
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [city, setCity] = useState('');
  const [scrolled, setScrolled] = useState(false);

  // ── OAuth code exchange — must be preserved ──────────────────────────────────
  useEffect(() => {
    const processOAuthReturn = async () => {
      const params = new URLSearchParams(window.location.search);
      const code   = params.get('code');
      const error  = params.get('error');
      if (error) {
        const portal = resolvePortalIntent(null, readPortalCookie());
        clearPortalIntent();
        router.replace(portal === 'customer' ? `/customer/login?error=${error}` : `${portalPath(portal)}?error=${error}`);
        return;
      }
      if (!code) return;
      setProcessing(true);
      try {
        const portal = resolvePortalIntent(null, readPortalCookie());
        const supabase = createClient();
        const result = await completeOAuthReturn(supabase, portal);
        clearPortalIntent();
        if (result === 'error') return;
        window.history.replaceState({}, '', '/');
        router.replace(portalPath(portal));
      } catch {
        const portal = resolvePortalIntent(null, readPortalCookie());
        router.replace(portal === 'customer' ? '/customer/login?error=auth' : `${portalPath(portal)}?error=auth`);
      }
    };
    void processOAuthReturn();
  }, [router]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = city.trim();
    router.push(q ? `/customer/preview?city=${encodeURIComponent(q)}` : '/customer/preview');
  };

  if (processing) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44,
            border: '3px solid rgba(255,122,0,0.15)', borderTopColor: ORANGE,
            borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px',
          }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ color: '#555', fontSize: 14 }}>Signing you in...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#111', color: '#fff',
      fontFamily: 'var(--font-jakarta, "Plus Jakarta Sans", sans-serif)',
      overflowX: 'hidden',
    }}>

      {/* ── Global styles ───────────────────────────────────────────────────── */}
      <style>{`
        @keyframes fadeUp   { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes marquee  { from { transform:translateX(0); } to { transform:translateX(-50%); } }
        @keyframes livePulse{ 0%,100%{opacity:1;} 50%{opacity:0.35;} }

        .hero-input { flex:1; background:transparent; border:none; padding:16px 14px; font-size:15px; color:#fff; font-family:inherit; }
        .hero-input::placeholder { color:#444; }
        .hero-input:focus { outline:none; }
        .hero-form:focus-within { border-color:${ORANGE} !important; }

        .nav-link { color:#666; font-size:14px; font-weight:500; text-decoration:none; transition:color 0.15s; }
        .nav-link:hover { color:#fff; }

        /* General orange CTA */
        .cta-btn { display:inline-flex; align-items:center; justify-content:center; height:52px; padding:0 28px; background:${ORANGE}; color:#fff; font-size:15px; font-weight:700; border-radius:12px; text-decoration:none; border:none; cursor:pointer; transition:background 0.15s, transform 0.15s; white-space:nowrap; }
        .cta-btn:hover { background:#e86e00; transform:translateY(-1px); }

        /* Gold CTA — RepEAT+ upgrade only */
        .cta-gold { display:inline-flex; align-items:center; justify-content:center; height:52px; padding:0 28px; background:${GOLD}; color:#1a1100; font-size:15px; font-weight:800; border-radius:12px; text-decoration:none; border:none; cursor:pointer; transition:background 0.15s, transform 0.15s; white-space:nowrap; letter-spacing:0.01em; }
        .cta-gold:hover { background:#c4a030; transform:translateY(-1px); }

        .cta-outline { display:inline-flex; align-items:center; justify-content:center; height:52px; padding:0 24px; background:transparent; color:#fff; font-size:15px; font-weight:600; border-radius:12px; text-decoration:none; border:1.5px solid #2A2A2A; cursor:pointer; transition:border-color 0.15s, background 0.15s; white-space:nowrap; }
        .cta-outline:hover { border-color:#555; background:rgba(255,255,255,0.04); }

        .feature-card { background:#161616; border:1px solid #1E1E1E; border-radius:16px; padding:32px; transition:border-color 0.2s, transform 0.2s; }
        .feature-card:hover { border-color:rgba(255,122,0,0.4); transform:translateY(-2px); }

        .deal-card { background:#161616; border:1px solid #1E1E1E; border-radius:14px; overflow:hidden; transition:border-color 0.2s, transform 0.2s; cursor:pointer; display:block; text-decoration:none; color:inherit; }
        .deal-card:hover { border-color:rgba(255,122,0,0.4); transform:translateY(-3px); }

        /* Plan cards */
        .plan-free { background:#161616; border:1px solid #1E1E1E; border-radius:20px; padding:32px; }
        .plan-plus { background:#130F04; border:1px solid ${GOLD}; border-radius:20px; padding:32px; position:relative; }

        /* RepEAT+ perk pills (horizontal scroll row) */
        .perk-row { display:flex; gap:10px; overflow-x:auto; padding-bottom:4px; scrollbar-width:none; }
        .perk-row::-webkit-scrollbar { display:none; }
        .perk-pill { flex-shrink:0; display:flex; align-items:center; gap:7px; background:rgba(212,175,55,0.08); border:1px solid rgba(212,175,55,0.22); border-radius:100px; padding:7px 14px; font-size:12px; font-weight:700; color:${GOLD}; white-space:nowrap; }

        /* Step cards (How claiming works) */
        .step-card { background:#161616; border:1px solid #1E1E1E; border-radius:16px; padding:28px; position:relative; transition:border-color 0.2s; }
        .step-card:hover { border-color:rgba(255,122,0,0.3); }

        /* Mock deal card states */
        .mock-card { background:#1A1A1A; border:1px solid #2A2A2A; border-radius:14px; overflow:hidden; width:200px; flex-shrink:0; }

        .footer-link { color:#444; font-size:13px; text-decoration:none; transition:color 0.15s; display:block; margin-bottom:10px; }
        .footer-link:hover { color:#fff; }
        .social-btn { width:36px; height:36px; background:#1A1A1A; border:1px solid #222; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#555; transition:color 0.15s, border-color 0.15s; text-decoration:none; }
        .social-btn:hover { color:${ORANGE}; border-color:${ORANGE}; }

        /* Payment method badges */
        .pay-badge { display:inline-flex; align-items:center; gap:5px; background:#1E1E1E; border:1px solid #2A2A2A; border-radius:8px; padding:5px 10px; font-size:11px; font-weight:700; color:#888; }

        @media(max-width:900px) {
          .deals-grid { grid-template-columns:repeat(2,1fr) !important; }
          .steps-grid  { grid-template-columns:1fr !important; }
        }
        @media(max-width:768px) {
          .nav-links     { display:none !important; }
          .features-grid { grid-template-columns:1fr !important; }
          .plans-grid    { grid-template-columns:1fr !important; }
          .footer-inner  { flex-direction:column !important; gap:40px !important; }
          .footer-links  { flex-wrap:wrap !important; gap:32px !important; }
          .mock-cards-row { flex-direction:column !important; align-items:center !important; }
        }
        @media(max-width:540px) {
          .deals-grid { grid-template-columns:1fr !important; }
        }
        @media(prefers-reduced-motion:reduce) {
          *, *::before, *::after { animation-duration:0.01ms !important; transition-duration:0.01ms !important; }
        }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        height: 64, display: 'flex', alignItems: 'center',
        background: scrolled ? 'rgba(17,17,17,0.96)' : '#111',
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        borderBottom: `1px solid ${scrolled ? '#1E1E1E' : 'transparent'}`,
        transition: 'background 0.3s, border-color 0.3s',
      }}>
        <div style={{
          maxWidth: 1200, width: '100%', margin: '0 auto', padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontFamily: 'var(--font-syne, Syne, sans-serif)', fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>
            Rep<span style={{ color: ORANGE }}>EAT</span>
          </div>
          <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <Link href="/customer/preview" className="nav-link">Browse Deals</Link>
            <Link href="/restaurant"       className="nav-link">For Restaurants</Link>
            <Link href="/influencer"       className="nav-link">Creators</Link>
            <Link href="/repeat-plus"      className="nav-link" style={{ color: GOLD }}>RepEAT+</Link>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link href="/customer/login" style={{ color: '#555', fontSize: 14, fontWeight: 500, textDecoration: 'none', padding: '8px 14px', transition: 'color 0.15s' }}>
              Sign in
            </Link>
            <Link href="/customer/signup" className="cta-btn" style={{ height: 38, padding: '0 16px', fontSize: 13, borderRadius: 10 }}>
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        paddingTop: 64, background: '#111', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '60%', height: 1,
          background: `linear-gradient(90deg, transparent, rgba(255,122,0,0.6), transparent)`,
          zIndex: 0,
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 820, width: '100%', padding: '0 24px 100px', textAlign: 'center' }}>
          <div style={{ animation: 'fadeUp 0.5s 0.2s ease both' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,122,0,0.08)', border: '1px solid rgba(255,122,0,0.22)',
              color: ORANGE, fontSize: 12, fontWeight: 700,
              padding: '5px 14px', borderRadius: 100, marginBottom: 28, letterSpacing: '0.04em',
            }}>
              🇨🇦 Free deals across Ontario — no subscription needed
            </span>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-syne, Syne, sans-serif)',
            fontSize: 'clamp(46px, 8vw, 92px)', fontWeight: 800,
            lineHeight: 1.04, letterSpacing: '-3.5px', marginBottom: 22,
            animation: 'fadeUp 0.6s 0.4s ease both',
          }}>
            Find the best<br />
            <span style={{ color: ORANGE }}>food deals</span> near you
          </h1>

          <p style={{
            fontSize: 18, color: '#666', lineHeight: 1.75,
            maxWidth: 480, margin: '0 auto 40px',
            animation: 'fadeUp 0.6s 0.7s ease both',
          }}>
            Claim real restaurant discounts across Ontario. No delivery apps, no hidden fees — just show your QR and save.
          </p>

          <form className="hero-form" onSubmit={handleSearch} style={{
            display: 'flex', maxWidth: 520, margin: '0 auto 16px',
            background: '#161616', border: '1px solid #2A2A2A', borderRadius: 14,
            overflow: 'hidden', transition: 'border-color 0.2s',
            animation: 'fadeUp 0.6s 0.9s ease both',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 18, color: '#444', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <input
              className="hero-input"
              type="text"
              placeholder="Enter your city (e.g. Toronto, Brampton...)"
              value={city}
              onChange={e => setCity(e.target.value)}
            />
            <button type="submit" className="cta-btn" style={{ borderRadius: '0 12px 12px 0', height: 56, flexShrink: 0 }}>
              Find deals →
            </button>
          </form>

          <div style={{ animation: 'fadeUp 0.6s 1.1s ease both' }}>
            <p style={{ fontSize: 13, color: '#3A3A3A' }}>
              Or{' '}
              <Link href="/customer/preview" style={{ color: ORANGE, textDecoration: 'none', fontWeight: 600 }}>
                browse all deals
              </Link>{' '}
              across Ontario
            </p>
          </div>

          <div style={{
            display: 'flex', gap: 0, justifyContent: 'center',
            marginTop: 56, paddingTop: 40, borderTop: '1px solid #1A1A1A',
            animation: 'fadeUp 0.6s 1.3s ease both',
          }}>
            {[
              { val: '400+', label: 'Restaurants'   },
              { val: '89',   label: 'Claimed today'  },
              { val: '15',   label: 'Ontario cities' },
              { val: '$0',   label: 'Monthly fee'    },
            ].map(({ val, label }, i) => (
              <div key={label} style={{
                flex: 1, textAlign: 'center', padding: '8px 0',
                borderRight: i < 3 ? '1px solid #1A1A1A' : 'none',
              }}>
                <div style={{ fontFamily: 'var(--font-syne, Syne, sans-serif)', fontSize: 'clamp(24px, 3vw, 38px)', fontWeight: 800, color: ORANGE, letterSpacing: '-1.5px', lineHeight: 1 }}>
                  {val}
                </div>
                <div style={{ fontSize: 12, color: '#444', marginTop: 4, fontWeight: 500 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE TICKER ─────────────────────────────────────────────────────── */}
      <div style={{ background: '#0E0E0E', borderTop: '1px solid #1A1A1A', borderBottom: '1px solid #1A1A1A', padding: '13px 0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7, padding: '0 20px 0 24px', borderRight: '1px solid #1E1E1E' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px rgba(34,197,94,0.8)', animation: 'livePulse 2s ease-in-out infinite' }} />
            <span style={{ fontSize: 10, fontWeight: 800, color: '#22C55E', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Live</span>
          </div>
          <div style={{ flex: 1, overflow: 'hidden', maskImage: 'linear-gradient(90deg, transparent 0%, black 6%, black 94%, transparent 100%)' }}>
            <div style={{ display: 'flex', gap: 48, flexShrink: 0, animation: 'marquee 44s linear infinite' }}>
              {[...LIVE_TICKER, ...LIVE_TICKER].map((item, i) => (
                <div key={i} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, whiteSpace: 'nowrap' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
                  <span style={{ color: '#ccc', fontWeight: 600 }}>{item.text}</span>
                  <span style={{ color: '#444' }}>— {item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── FEATURES + SMART CTA CALLOUT ───────────────────────────────────── */}
      <section style={{ padding: 'clamp(80px, 10vw, 128px) 24px', background: '#0E0E0E', borderTop: '1px solid #1A1A1A' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeSection style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: ORANGE, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12 }}>
              Simple by design
            </p>
            <h2 style={{ fontFamily: 'var(--font-syne, Syne, sans-serif)', fontSize: 'clamp(30px, 4vw, 50px)', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 16 }}>
              Three steps to saving
            </h2>
            <p style={{ fontSize: 16, color: '#555', maxWidth: 420, margin: '0 auto', lineHeight: 1.7 }}>
              No complex apps, no minimum spends, no delivery surcharges.
            </p>
          </FadeSection>

          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, marginBottom: 24 }}>
            {FEATURES.map((f, i) => (
              <FadeSection key={f.title} delay={i * 80}>
                <div className="feature-card">
                  <div style={{ fontSize: 40, marginBottom: 20 }}>{f.icon}</div>
                  <h3 style={{ fontFamily: 'var(--font-syne, Syne, sans-serif)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 12 }}>
                    {f.title}
                  </h3>
                  <p style={{ fontSize: 15, color: '#555', lineHeight: 1.75 }}>{f.desc}</p>
                </div>
              </FadeSection>
            ))}
          </div>

          {/* ── Smart CTA callout ──────────────────────────────────────────── */}
          <FadeSection delay={200}>
            <div style={{
              background: '#111', border: '1px solid #1E1E1E', borderRadius: 20,
              padding: 'clamp(24px, 4vw, 40px)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 32, flexWrap: 'wrap',
            }}>
              {/* Copy */}
              <div style={{ flex: '1 1 300px', maxWidth: 440 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'rgba(255,122,0,0.08)', border: '1px solid rgba(255,122,0,0.2)',
                  color: ORANGE, fontSize: 11, fontWeight: 700, padding: '4px 12px',
                  borderRadius: 100, marginBottom: 16, letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>
                  Smart CTA
                </div>
                <h3 style={{ fontFamily: 'var(--font-syne, Syne, sans-serif)', fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, letterSpacing: '-0.75px', marginBottom: 14, lineHeight: 1.2 }}>
                  Claimed? Your QR is ready.<br />
                  <span style={{ color: GOLD }}>Hit your limit? Upgrade with one tap.</span>
                </h3>
                <p style={{ fontSize: 15, color: '#555', lineHeight: 1.75, marginBottom: 20 }}>
                  The claim button adapts to your status. Already claimed a deal? It instantly shows your QR. Reached your monthly limit? One tap takes you to RepEAT+ — no dead ends.
                </p>
                <Link href="/repeat-plus" className="cta-gold" style={{ height: 42, padding: '0 20px', fontSize: 14, borderRadius: 10, display: 'inline-flex' }}>
                  See RepEAT+ →
                </Link>
              </div>

              {/* Mock deal detail cards */}
              <div className="mock-cards-row" style={{ display: 'flex', gap: 16, flexShrink: 0, alignItems: 'flex-start' }}>
                {/* State 1: Already claimed */}
                <div className="mock-card">
                  <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid #222' }}>
                    <div style={{ fontSize: 26, marginBottom: 8 }}>🍕</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>30% Off Any Pizza</div>
                    <div style={{ fontSize: 11, color: '#555' }}>Pizza Nova · Toronto</div>
                  </div>
                  <div style={{ padding: '10px 14px' }}>
                    <div style={{
                      background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                      borderRadius: 8, padding: '8px 10px',
                      display: 'flex', alignItems: 'center', gap: 7,
                      fontSize: 12, fontWeight: 700, color: '#22C55E',
                    }}>
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <path d="M2 7L5 10L11 3" stroke="#22C55E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      View my QR code
                    </div>
                    <div style={{ fontSize: 10, color: '#3A3A3A', marginTop: 6, textAlign: 'center' }}>Claimed · expires in 4 days</div>
                  </div>
                </div>

                {/* State 2: Limit reached → upgrade */}
                <div className="mock-card" style={{ border: `1px solid ${GOLD_BORDER}` }}>
                  <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid #222' }}>
                    <div style={{ fontSize: 26, marginBottom: 8 }}>🍜</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>B2G1 Ramen</div>
                    <div style={{ fontSize: 11, color: '#555' }}>Tokyo Garden · Mississauga</div>
                  </div>
                  <div style={{ padding: '10px 14px' }}>
                    <div style={{
                      background: GOLD_BG, border: `1px solid ${GOLD_BORDER}`,
                      borderRadius: 8, padding: '8px 10px',
                      display: 'flex', alignItems: 'center', gap: 7,
                      fontSize: 12, fontWeight: 700, color: GOLD,
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                      Upgrade to claim
                    </div>
                    <div style={{ fontSize: 10, color: '#3A3A3A', marginTop: 6, textAlign: 'center' }}>3/3 free claims used</div>
                  </div>
                </div>
              </div>
            </div>
          </FadeSection>
        </div>
      </section>

      {/* ── HOW CLAIMING WORKS ──────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(80px, 10vw, 128px) 24px', background: '#111', borderTop: '1px solid #1A1A1A' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeSection style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: ORANGE, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12 }}>
              Zero friction
            </p>
            <h2 style={{ fontFamily: 'var(--font-syne, Syne, sans-serif)', fontSize: 'clamp(30px, 4vw, 50px)', fontWeight: 800, letterSpacing: '-1.5px' }}>
              How claiming works
            </h2>
          </FadeSection>

          <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, position: 'relative' }}>
            {CLAIM_STEPS.map((step, i) => (
              <FadeSection key={step.num} delay={i * 90}>
                <div className="step-card">
                  {/* Connector line — desktop only */}
                  {i < CLAIM_STEPS.length - 1 && (
                    <div style={{
                      display: 'block',
                      position: 'absolute', top: 38, left: 'calc(100% + 1px)',
                      width: 'calc(100% / 3 - 20px)',
                      height: 1, borderTop: '1.5px dashed rgba(255,122,0,0.2)',
                      pointerEvents: 'none',
                    }} />
                  )}
                  {/* Step number */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'rgba(255,122,0,0.1)', border: '1.5px solid rgba(255,122,0,0.25)',
                    fontFamily: 'var(--font-syne, Syne, sans-serif)',
                    fontSize: 13, fontWeight: 800, color: ORANGE,
                    marginBottom: 20,
                  }}>
                    {step.num}
                  </div>
                  <div style={{ fontSize: 36, marginBottom: 14 }}>{step.emoji}</div>
                  <h3 style={{ fontFamily: 'var(--font-syne, Syne, sans-serif)', fontSize: 19, fontWeight: 700, letterSpacing: '-0.4px', marginBottom: 10 }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: 14, color: '#555', lineHeight: 1.75 }}>{step.desc}</p>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRENDING DEALS ──────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(80px, 10vw, 128px) 24px', background: '#0E0E0E', borderTop: '1px solid #1A1A1A' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeSection style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 48, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: ORANGE, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12 }}>
                This week
              </p>
              <h2 style={{ fontFamily: 'var(--font-syne, Syne, sans-serif)', fontSize: 'clamp(30px, 4vw, 50px)', fontWeight: 800, letterSpacing: '-1.5px' }}>
                Trending Deals
              </h2>
            </div>
            <Link href="/customer/preview" className="cta-outline" style={{ height: 44, padding: '0 20px', fontSize: 14, borderRadius: 10 }}>
              View all deals →
            </Link>
          </FadeSection>

          <div className="deals-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
            {TRENDING_DEALS.map((deal, i) => (
              <FadeSection key={deal.title} delay={i * 50}>
                <Link href="/customer/preview" className="deal-card">
                  <div style={{ padding: '20px 18px 14px', borderBottom: '1px solid #1E1E1E' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ fontSize: 32 }}>{deal.emoji}</div>
                      <div style={{ background: 'rgba(255,122,0,0.12)', color: ORANGE, fontSize: 12, fontWeight: 800, padding: '4px 9px', borderRadius: 7 }}>
                        {deal.discount}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', lineHeight: 1.35 }}>{deal.title}</div>
                  </div>
                  <div style={{ padding: '11px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#777', fontWeight: 600 }}>{deal.restaurant}</div>
                      <div style={{ fontSize: 11, color: '#3A3A3A', marginTop: 2 }}>📍 {deal.city}</div>
                    </div>
                    <div style={{ fontSize: 11, background: '#1E1E1E', color: '#555', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>{deal.tag}</div>
                  </div>
                </Link>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(80px, 10vw, 128px) 24px', background: '#111', borderTop: '1px solid #1A1A1A' }}>
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          <FadeSection style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: ORANGE, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12 }}>
              Pricing
            </p>
            <h2 style={{ fontFamily: 'var(--font-syne, Syne, sans-serif)', fontSize: 'clamp(30px, 4vw, 50px)', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 16 }}>
              Start free, upgrade anytime
            </h2>
            <p style={{ fontSize: 16, color: '#555', maxWidth: 420, margin: '0 auto', lineHeight: 1.7 }}>
              RepEAT is free forever. Upgrade to RepEAT+ for unlimited claims and exclusive deals.
            </p>
          </FadeSection>

          <div className="plans-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 20, alignItems: 'start' }}>

            {/* ── Free plan ─────────────────────────────────────────────────── */}
            <FadeSection delay={0}>
              <div className="plan-free">
                <div style={{ marginBottom: 28 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#444', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>Free</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontFamily: 'var(--font-syne, Syne, sans-serif)', fontSize: 48, fontWeight: 800, letterSpacing: '-2px' }}>$0</span>
                    <span style={{ color: '#444', fontSize: 14 }}>/month</span>
                  </div>
                  <p style={{ fontSize: 14, color: '#444', lineHeight: 1.6 }}>For casual diners exploring local deals.</p>
                </div>
                <div style={{ marginBottom: 28 }}>
                  {FREE_FEATURES.map(f => <CheckRow key={f} label={f} />)}
                </div>
                <Link href="/customer/signup" className="cta-outline" style={{ display: 'flex', width: '100%', borderRadius: 12 }}>
                  Get started free
                </Link>
              </div>
            </FadeSection>

            {/* ── RepEAT+ ───────────────────────────────────────────────────── */}
            <FadeSection delay={100}>
              <div className="plan-plus">
                {/* POPULAR badge */}
                <div style={{
                  position: 'absolute', top: -1, right: 28,
                  background: GOLD, color: '#1a1100',
                  fontSize: 10, fontWeight: 900, padding: '4px 12px',
                  borderRadius: '0 0 10px 10px', letterSpacing: '0.12em',
                }}>
                  POPULAR
                </div>

                {/* Header */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    <p style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: '0.14em', textTransform: 'uppercase' }}>RepEAT+</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontFamily: 'var(--font-syne, Syne, sans-serif)', fontSize: 48, fontWeight: 800, letterSpacing: '-2px', color: '#fff' }}>$4.99</span>
                    <span style={{ color: '#666', fontSize: 14 }}>/month</span>
                  </div>
                  <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>For regular diners who want unlimited savings.</p>
                </div>

                {/* Horizontal perk highlights */}
                <div style={{ marginBottom: 24 }}>
                  <div className="perk-row">
                    {PLUS_PERKS.map(p => (
                      <div key={p.label} className="perk-pill">
                        <span style={{ fontSize: 14 }}>{p.icon}</span>
                        {p.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Feature checklist */}
                <div style={{ marginBottom: 28 }}>
                  {PLUS_FEATURES.map(f => <CheckRow key={f} label={f} gold />)}
                </div>

                {/* Gold CTA */}
                <Link href="/repeat-plus" className="cta-gold" style={{ display: 'flex', width: '100%', borderRadius: 12, marginBottom: 20 }}>
                  Upgrade to RepEAT+
                </Link>

                {/* Payment methods */}
                <div style={{ borderTop: `1px solid rgba(212,175,55,0.12)`, paddingTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    {/* Apple Pay */}
                    <div className="pay-badge">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#ccc' }}>
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                      </svg>
                      Apple Pay
                    </div>
                    {/* Google Pay */}
                    <div className="pay-badge">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M12 10.2v3.6h5.1c-.22 1.17-.88 2.16-1.87 2.82l3.03 2.35C20.12 17.12 21 15.2 21 12.9c0-.55-.05-1.09-.14-1.6L12 10.2z" fill="#4285F4"/>
                        <path d="M5.75 14.32A7.27 7.27 0 0 1 4.73 12c0-.81.14-1.6.4-2.32L2.09 7.34A11.99 11.99 0 0 0 1 12c0 1.93.46 3.75 1.27 5.37l3.48-3.05z" fill="#FBBC05"/>
                        <path d="M12 21.99c3.05 0 5.61-1.01 7.48-2.74l-3.03-2.35c-1.01.68-2.3 1.08-4.45 1.08-3.42 0-6.32-2.31-7.35-5.43l-3.49 2.71C3.27 19.51 7.37 21.99 12 21.99z" fill="#34A853"/>
                        <path d="M4.65 9.68A7.25 7.25 0 0 1 12 4.99c1.95 0 3.7.71 5.08 1.88L19.93 4A11.97 11.97 0 0 0 12 2.01c-4.63 0-8.73 2.5-10.91 6.19l3.56 1.48z" fill="#EA4335"/>
                      </svg>
                      Google Pay
                    </div>
                    {/* Card */}
                    <div className="pay-badge">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#888' }}>
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                        <line x1="1" y1="10" x2="23" y2="10"/>
                      </svg>
                      Visa / MC
                    </div>
                  </div>
                  <p style={{ fontSize: 11, color: '#3A3A3A', lineHeight: 1.5 }}>
                    Subscription only — claiming deals is always free.
                  </p>
                </div>
              </div>
            </FadeSection>

          </div>
        </div>
      </section>

      {/* ── CTA BANNER ──────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(72px, 10vw, 100px) 24px', background: '#0E0E0E', borderTop: '1px solid #1A1A1A' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <FadeSection>
            <h2 style={{ fontFamily: 'var(--font-syne, Syne, sans-serif)', fontSize: 'clamp(30px, 5vw, 56px)', fontWeight: 800, letterSpacing: '-2px', marginBottom: 20, lineHeight: 1.1 }}>
              Ready to start saving<br /><span style={{ color: ORANGE }}>at local restaurants?</span>
            </h2>
            <p style={{ fontSize: 16, color: '#555', marginBottom: 36, lineHeight: 1.7 }}>
              Browse deals near you — free, no credit card required.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/customer/preview" className="cta-btn">Browse deals →</Link>
              <Link href="/restaurant" className="cta-outline">List your restaurant</Link>
            </div>
          </FadeSection>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{ background: '#0A0A0A', borderTop: '1px solid #1A1A1A', padding: 'clamp(56px, 8vw, 88px) 24px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="footer-inner" style={{ display: 'flex', gap: 72, marginBottom: 52, flexWrap: 'wrap' }}>
            {/* Brand */}
            <div style={{ flex: '0 0 220px', minWidth: 180 }}>
              <div style={{ fontFamily: 'var(--font-syne, Syne, sans-serif)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 12 }}>
                Rep<span style={{ color: ORANGE }}>EAT</span>
              </div>
              <p style={{ fontSize: 14, color: '#3A3A3A', lineHeight: 1.7, maxWidth: 180, marginBottom: 20 }}>
                Restaurant deals, claimed in person. Ontario-wide.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <a href="#" className="social-btn" aria-label="Instagram">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4c0 3.2-2.6 5.8-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8C2 4.6 4.6 2 7.8 2zm-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8c1.99 0 3.6-1.61 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6zm9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25zM12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>
                  </svg>
                </a>
                <a href="#" className="social-btn" aria-label="TikTok">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.78a4.85 4.85 0 0 1-1.01-.09z"/>
                  </svg>
                </a>
                <a href="#" className="social-btn" aria-label="Twitter / X">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Link columns */}
            <div className="footer-links" style={{ display: 'flex', gap: 56, flex: 1 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 18 }}>About</p>
                <Link href="/customer/preview" className="footer-link">Browse Deals</Link>
                <Link href="/repeat-plus"      className="footer-link">RepEAT+</Link>
                <Link href="/#how-it-works"    className="footer-link">How it works</Link>
                <Link href="/restaurant"       className="footer-link">Blog</Link>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 18 }}>Cities</p>
                {['Toronto', 'Mississauga', 'Brampton', 'Kitchener', 'Hamilton', 'Waterloo'].map(c => (
                  <Link key={c} href={`/customer/preview?city=${c}`} className="footer-link">{c}</Link>
                ))}
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 18 }}>For Restaurants</p>
                <Link href="/restaurant" className="footer-link">List your restaurant</Link>
                <Link href="/restaurant" className="footer-link">Post a deal</Link>
                <Link href="/influencer" className="footer-link">Work with creators</Link>
                <Link href="/restaurant" className="footer-link">Restaurant guide</Link>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #1A1A1A', paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ fontSize: 12, color: '#2E2E2E' }}>© 2026 RepEAT · Ontario, Canada 🇨🇦</p>
            <div style={{ display: 'flex', gap: 20 }}>
              <Link href="#" className="footer-link" style={{ marginBottom: 0 }}>Privacy</Link>
              <Link href="#" className="footer-link" style={{ marginBottom: 0 }}>Terms</Link>
              <Link href="#" className="footer-link" style={{ marginBottom: 0 }}>Contact</Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
