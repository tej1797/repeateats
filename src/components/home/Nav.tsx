'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconMenu2, IconX } from '@tabler/icons-react';
import { C, FONT_DISPLAY } from './homeData';

const LINKS = [
  { label: 'Browse Deals', href: '/customer/preview' },
  { label: 'For Restaurants', href: '/restaurant' },
  { label: 'For Creators', href: '/influencer' },
  { label: 'RepEAT+', href: '/repeat-plus', accent: true },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.nav
      data-testid="home-navbar"
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60, height: 66,
        display: 'flex', alignItems: 'center',
        background: scrolled ? 'rgba(10,10,10,0.72)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: `1px solid ${scrolled ? C.border : 'transparent'}`,
        transition: 'background .3s, border-color .3s, backdrop-filter .3s',
      }}
    >
      <div style={{ maxWidth: 1200, width: '100%', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" data-testid="home-logo" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 25, fontWeight: 800, letterSpacing: '-0.5px', color: '#fff' }}>
            Rep<span style={{ color: C.orange }}>EAT</span>
          </span>
        </Link>

        <div className="hidden md:flex" style={{ alignItems: 'center', gap: 34 }}>
          {LINKS.map((l) => (
            <Link key={l.label} href={l.href} data-testid={`nav-${l.label.toLowerCase().replace(/[^a-z]+/g, '-')}`}
              style={{ fontSize: 14, fontWeight: 500, textDecoration: 'none', color: l.accent ? C.orange : C.textSoft, transition: 'color .15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = l.accent ? C.orangeHi : '#fff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = l.accent ? C.orange : C.textSoft)}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex" style={{ gap: 10, alignItems: 'center' }}>
          <Link href="/customer/login" data-testid="nav-signin" style={{ color: C.textSoft, fontSize: 14, fontWeight: 500, textDecoration: 'none', padding: '8px 14px' }}>
            Sign in
          </Link>
          <Link href="/customer/signup" data-testid="nav-get-started"
            style={{ display: 'inline-flex', alignItems: 'center', height: 40, padding: '0 18px', background: C.orange, color: '#fff', fontSize: 14, fontWeight: 700, borderRadius: 10, textDecoration: 'none' }}
          >
            Get started
          </Link>
        </div>

        <button data-testid="nav-mobile-toggle" aria-label="Menu" className="md:hidden" onClick={() => setOpen((v) => !v)}
          style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 6 }}>
          {open ? <IconX size={24} /> : <IconMenu2 size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="md:hidden"
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            style={{ position: 'absolute', top: 66, left: 0, right: 0, background: 'rgba(10,10,10,0.98)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${C.border}`, padding: '16px 24px 24px' }}
          >
            {LINKS.map((l) => (
              <Link key={l.label} href={l.href} onClick={() => setOpen(false)}
                style={{ display: 'block', padding: '12px 0', fontSize: 16, fontWeight: 600, textDecoration: 'none', color: l.accent ? C.orange : '#eee', borderBottom: `1px solid ${C.border}` }}>
                {l.label}
              </Link>
            ))}
            <Link href="/customer/signup" onClick={() => setOpen(false)}
              style={{ display: 'flex', justifyContent: 'center', marginTop: 16, height: 46, alignItems: 'center', background: C.orange, color: '#fff', fontSize: 15, fontWeight: 700, borderRadius: 12, textDecoration: 'none' }}>
              Get started
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
