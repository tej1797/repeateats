'use client';

// Fallback OAuth landing page when Supabase redirects here instead of a portal URL.
// PKCE exchange must run in the browser (not a Route Handler).

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  resolvePortalIntent,
  readPortalCookie,
  clearPortalIntent,
  portalPath,
} from '@/lib/portalAuth';
import { handleOAuthReturn } from '@/lib/oauthCallback';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [msg, setMsg] = useState('Signing you in…');
  const ranRef = useRef(false);

  useEffect(() => {
    // Run EXACTLY once. handleOAuthReturn cleans ?code= from the URL via
    // history.replaceState, which Next.js intercepts and re-renders — if this
    // effect re-ran, the portal intent would already be cleared and the second
    // pass would default to 'customer', overriding the correct navigation.
    if (ranRef.current) return;
    ranRef.current = true;

    // Resolve the portal once, before anything can clear the intent.
    const params = new URLSearchParams(window.location.search);
    const portal = resolvePortalIntent(params.get('portal'), readPortalCookie());

    const run = async () => {
      const supabase = createClient();
      const result = await handleOAuthReturn(supabase, portal);
      clearPortalIntent();

      if (result === 'error') {
        return; // handleOAuthReturn already redirected
      }

      router.replace(portalPath(portal));
    };

    void run().catch(() => {
      setMsg('Sign-in failed. Redirecting…');
      window.location.replace(
        portal === 'customer' ? '/customer/login?error=auth' : `${portalPath(portal)}?error=auth`,
      );
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#111]">
      <p className="text-[#888] text-sm">{msg}</p>
    </div>
  );
}
