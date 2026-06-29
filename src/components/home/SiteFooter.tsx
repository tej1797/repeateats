'use client';

import Link from 'next/link';
import { IconBrandInstagram, IconBrandTiktok, IconBrandX } from '@tabler/icons-react';
import { C, FONT_DISPLAY } from './homeData';

const COLS = [
  { title: 'Explore', links: [
    { label: 'Browse Deals', href: '/customer/preview' },
    { label: 'How it works', href: '/#how-it-works' },
    { label: 'RepEAT+', href: '/repeat-plus' },
  ]},
  { title: 'Cities', links: ['Toronto', 'Mississauga', 'Brampton', 'Kitchener', 'Hamilton', 'Waterloo'].map((c) => ({ label: c, href: `/customer/preview?city=${c}` })) },
  { title: 'For Business', links: [
    { label: 'List your restaurant', href: '/restaurant' },
    { label: 'Post a deal', href: '/restaurant' },
    { label: 'Work with creators', href: '/influencer' },
  ]},
];

const SOCIALS = [
  { icon: <IconBrandInstagram size={17} />, label: 'Instagram' },
  { icon: <IconBrandTiktok size={17} />, label: 'TikTok' },
  { icon: <IconBrandX size={15} />, label: 'X' },
];

export default function SiteFooter() {
  return (
    <footer data-testid="home-footer" style={{ background: C.bg0, borderTop: `1px solid ${C.border}`, padding: 'clamp(56px,8vw,88px) 24px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 64, marginBottom: 52, flexWrap: 'wrap' }}>
          <div style={{ flex: '0 0 240px', minWidth: 200 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 27, fontWeight: 800, letterSpacing: '-0.5px', color: '#fff', marginBottom: 14 }}>
              Rep<span style={{ color: C.orange }}>EAT</span>
            </div>
            <p style={{ fontSize: 14, color: C.textMute, lineHeight: 1.7, maxWidth: 200, marginBottom: 22 }}>
              Restaurant deals, claimed in person. Ontario-wide.
            </p>
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

          <div style={{ display: 'flex', gap: 56, flex: 1, flexWrap: 'wrap' }}>
            {COLS.map((col) => (
              <div key={col.title}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 18 }}>{col.title}</p>
                {col.links.map((l) => (
                  <Link key={l.label} href={l.href}
                    style={{ display: 'block', fontSize: 13.5, color: C.textMute, textDecoration: 'none', marginBottom: 11, transition: 'color .15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = C.textMute)}>
                    {l.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 12.5, color: '#444' }}>© 2026 RepEAT · Ontario, Canada 🇨🇦</p>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Privacy', 'Terms', 'Contact'].map((l) => (
              <a key={l} href="#" style={{ fontSize: 12.5, color: '#444', textDecoration: 'none' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#444')}>{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
