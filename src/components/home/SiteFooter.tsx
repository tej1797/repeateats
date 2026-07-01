'use client';

import Link from 'next/link';
import { IconBrandInstagram, IconBrandTiktok, IconBrandX, IconMail } from '@tabler/icons-react';
import { C, FONT_DISPLAY } from './homeData';

const SUPPORT_EMAIL = 'support@repeateats.ca';

const COLS = [
  { title: 'Explore', links: [
    { label: 'Browse Deals', href: '/customer/preview' },
    { label: 'How it works', href: '/#how-it-works' },
    { label: 'RepEAT+', href: '/repeat-plus' },
  ]},
  { title: 'For Business', links: [
    { label: 'List your restaurant', href: '/restaurant' },
    { label: 'Post a deal', href: '/restaurant' },
    { label: 'Work with creators', href: '/influencer' },
  ]},
  { title: 'Support', links: [
    { label: 'Help Centre', href: `mailto:${SUPPORT_EMAIL}` },
    { label: 'Contact Support', href: `mailto:${SUPPORT_EMAIL}` },
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
  ]},
];

const SOCIALS = [
  { icon: <IconBrandInstagram size={17} />, label: 'Instagram' },
  { icon: <IconBrandTiktok size={17} />, label: 'TikTok' },
  { icon: <IconBrandX size={15} />, label: 'X' },
];

export default function SiteFooter() {
  return (
    <footer data-testid="home-footer" style={{ background: C.bg0, borderTop: `1px solid ${C.border}`, padding: 'clamp(56px,8vw,88px) 24px 0', overflow: 'hidden' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 'clamp(32px,5vw,64px)', marginBottom: 52, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 260px', minWidth: 240 }}>
            <div className="site-logo" style={{ color: '#fff', marginBottom: 14 }}>
              Rep<span style={{ color: C.orange }}>EAT</span>
            </div>
            <p style={{ fontSize: 14, color: C.textMute, lineHeight: 1.7, maxWidth: 240, marginBottom: 18 }}>
              Restaurant deals, claimed in person. Ontario-wide. Questions? We&apos;re here to help.
            </p>
            {/* support email */}
            <a href={`mailto:${SUPPORT_EMAIL}`} data-testid="footer-support-email"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 14, fontWeight: 600, color: C.orange, textDecoration: 'none', marginBottom: 22 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.orangeHi)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.orange)}>
              <IconMail size={17} /> {SUPPORT_EMAIL}
            </a>
            <div style={{ display: 'flex', gap: 10 }}>
              {SOCIALS.map((s) => (
                <a key={s.label} href="#" aria-label={s.label}
                  style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.surfaceHi, border: `1px solid ${C.border2}`, color: '#888', transition: 'color .15s, border-color .15s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = C.orange; e.currentTarget.style.borderColor = C.orange; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = C.border2; }}>
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'clamp(28px,5vw,56px)', flex: '2 1 420px', flexWrap: 'wrap' }}>
            {COLS.map((col) => (
              <div key={col.title} style={{ flex: '1 1 130px', minWidth: 120 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 18 }}>{col.title}</p>
                {col.links.map((l) => (
                  l.href.startsWith('mailto:') || l.href === '#' ? (
                    <a key={l.label} href={l.href}
                      style={{ display: 'block', fontSize: 13.5, color: C.textMute, textDecoration: 'none', marginBottom: 11, transition: 'color .15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = C.textMute)}>
                      {l.label}
                    </a>
                  ) : (
                    <Link key={l.label} href={l.href}
                      style={{ display: 'block', fontSize: 13.5, color: C.textMute, textDecoration: 'none', marginBottom: 11, transition: 'color .15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = C.textMute)}>
                      {l.label}
                    </Link>
                  )
                ))}
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24, paddingBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 12.5, color: '#555' }}>© 2026 RepEAT · Ontario, Canada 🇨🇦</p>
          <div style={{ display: 'flex', gap: 20 }}>
            <a href="#" style={{ fontSize: 12.5, color: '#555', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')} onMouseLeave={(e) => (e.currentTarget.style.color = '#555')}>Privacy</a>
            <a href="#" style={{ fontSize: 12.5, color: '#555', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')} onMouseLeave={(e) => (e.currentTarget.style.color = '#555')}>Terms</a>
            <a href={`mailto:${SUPPORT_EMAIL}`} style={{ fontSize: 12.5, color: '#555', textDecoration: 'none' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')} onMouseLeave={(e) => (e.currentTarget.style.color = '#555')}>Contact</a>
          </div>
        </div>
      </div>

      {/* giant brand wordmark at the very end (responsive, fits any screen) */}
      <div aria-hidden style={{ textAlign: 'center', lineHeight: 0.78, pointerEvents: 'none', userSelect: 'none', marginTop: 8 }}>
        <span style={{
          fontFamily: FONT_DISPLAY, fontWeight: 800, letterSpacing: '-0.04em',
          fontSize: 'min(20vw, 230px)', display: 'inline-block', whiteSpace: 'nowrap',
          background: `linear-gradient(180deg, ${C.orange}55, ${C.orange}08)`,
          WebkitBackgroundClip: 'text', backgroundClip: 'text',
          color: 'transparent', WebkitTextFillColor: 'transparent',
        }}>
          RepEAT
        </span>
      </div>
    </footer>
  );
}
