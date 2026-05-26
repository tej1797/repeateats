'use client';

// Portal chooser — shown when user clicks "Sign in" from the landing page.
// Three cards: Customer, Restaurant, Creator. Dark theme, same style as landing.

import Link from 'next/link';

const PORTALS = [
  {
    href: '/customer/login',
    emoji: '🍽️',
    emojiBg: 'rgba(232,93,4,0.18)',
    title: 'Customer',
    sub: '/ Foodie',
    desc: 'Browse and claim deals at local restaurants near you.',
    cta: 'Sign in as Customer →',
    ctaColor: '#E85D04',
  },
  {
    href: '/restaurant',
    emoji: '🏪',
    emojiBg: 'rgba(16,185,129,0.15)',
    title: 'Restaurant',
    sub: '/ Business',
    desc: 'List your restaurant, post deals, track redemptions — free.',
    cta: 'Sign in as Restaurant →',
    ctaColor: '#10B981',
  },
  {
    href: '/influencer',
    emoji: '🎥',
    emojiBg: 'rgba(168,85,247,0.15)',
    title: 'Creator',
    sub: '/ Influencer',
    desc: 'Find restaurant collabs, negotiate in-app, earn on every deal.',
    cta: 'Sign in as Creator →',
    ctaColor: '#A855F7',
  },
];

export default function LoginChooserPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0A',
      color: '#F2F2F2',
      fontFamily: 'var(--font-jakarta, "Plus Jakarta Sans", sans-serif)',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* Nav */}
      <nav style={{
        height: 60, display: 'flex', alignItems: 'center',
        padding: '0 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <div style={{
          maxWidth: 1100, width: '100%', margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Link href="/" style={{
            fontFamily: 'var(--font-syne, Syne, sans-serif)',
            fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px',
            textDecoration: 'none', color: '#F2F2F2',
          }}>
            Rep<span style={{ color: '#E85D04' }}>EAT</span>
          </Link>
          <Link href="/" style={{
            fontSize: 13, color: '#555', textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            ← Back to home
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(32px,6vw,72px) 24px',
      }}>
        <div style={{ maxWidth: 860, width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{
              fontSize: 11, fontWeight: 700, color: '#E85D04',
              letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12,
            }}>
              Welcome back
            </p>
            <h1 style={{
              fontFamily: 'var(--font-syne, Syne, sans-serif)',
              fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800,
              letterSpacing: '-1.5px', color: '#F2F2F2', marginBottom: 12,
            }}>
              Who are you signing in as?
            </h1>
            <p style={{ fontSize: 15, color: '#555', lineHeight: 1.6 }}>
              Choose your portal to continue.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px,1fr))',
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
                  width: 56, height: 56, borderRadius: 14,
                  background: p.emojiBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26, marginBottom: 18,
                }}>
                  {p.emoji}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: '#F2F2F2' }}>
                  {p.title}{' '}
                  <span style={{ fontSize: 13, color: '#444', fontWeight: 400 }}>{p.sub}</span>
                </div>
                <div style={{ fontSize: 14, color: '#666', lineHeight: 1.65, marginBottom: 20 }}>
                  {p.desc}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: p.ctaColor }}>
                  {p.cta}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
