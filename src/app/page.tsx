'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { resolvePortalIntent, readPortalCookie, clearPortalIntent, portalPath } from '@/lib/portalAuth';
import { handleOAuthReturn as completeOAuthReturn } from '@/lib/oauthCallback';

import LenisProvider from '@/components/home/LenisProvider';
import ScrollWatermark from '@/components/home/ScrollWatermark';
import Nav from '@/components/home/Nav';
import Hero from '@/components/home/Hero';
import LiveTicker from '@/components/home/LiveTicker';
import PortalCards from '@/components/home/PortalCards';
import LogoMarquee from '@/components/home/LogoMarquee';
import HowItWorks from '@/components/home/HowItWorks';
import Stats from '@/components/home/Stats';
import WhyRepEAT from '@/components/home/WhyRepEAT';
import FAQ from '@/components/home/FAQ';
import FinalCTA from '@/components/home/FinalCTA';
import SiteFooter from '@/components/home/SiteFooter';

const ORANGE = '#FF6B00';

export default function LandingPage() {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);

  // ── OAuth code exchange — must be preserved (unchanged) ──────────────────
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

  if (processing) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0A' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, border: '3px solid rgba(255,107,0,0.15)', borderTopColor: ORANGE, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ color: '#666', fontSize: 14 }}>Signing you in...</p>
        </div>
      </div>
    );
  }

  return (
    <LenisProvider>
      <div style={{ position: 'relative', background: '#0A0A0A', color: '#fff', overflowX: 'hidden', fontFamily: 'var(--font-jakarta, "Plus Jakarta Sans", sans-serif)' }}>
        <ScrollWatermark />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Nav />
          <main>
            <Hero />
            <LiveTicker />
            <PortalCards />
            <LogoMarquee />
            <HowItWorks />
            <Stats />
            <WhyRepEAT />
            <FAQ />
            <FinalCTA />
          </main>
          <SiteFooter />
        </div>
      </div>
    </LenisProvider>
  );
}
