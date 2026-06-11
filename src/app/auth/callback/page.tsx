'use client';

// Fallback OAuth landing page when Supabase redirects here instead of a portal URL.
// PKCE exchange must run in the browser (not a Route Handler).

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  resolvePortalIntent,
  readPortalCookie,
  clearPortalIntent,
  portalPath,
} from '@/lib/portalAuth';
import { handleOAuthReturn } from '@/lib/oauthCallback';

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [msg, setMsg] = useState('Signing you in…');

  useEffect(() => {
    const run = async () => {
      const portal = resolvePortalIntent(
        searchParams.get('portal'),
        readPortalCookie(),
      );
      const supabase = createClient();
      const result = await handleOAuthReturn(supabase, portal);
      if (result === 'handled') return;

      clearPortalIntent();
      router.replace(portalPath(portal));
    };
    void run().catch(() => {
      setMsg('Sign-in failed. Redirecting…');
      router.replace('/customer/login?error=auth');
    });
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#111]">
      <p className="text-[#888] text-sm">{msg}</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#111]">
        <p className="text-[#888] text-sm">Signing you in…</p>
      </div>
    }>
      <CallbackInner />
    </Suspense>
  );
}
