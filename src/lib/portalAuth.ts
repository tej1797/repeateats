export type Portal = 'customer' | 'restaurant' | 'influencer';

const PORTALS = new Set<Portal>(['customer', 'restaurant', 'influencer']);

export function isPortal(value: string | null | undefined): value is Portal {
  return !!value && PORTALS.has(value as Portal);
}

export function portalPath(portal: Portal): string {
  switch (portal) {
    case 'restaurant': return '/restaurant';
    case 'influencer': return '/influencer';
    default:           return '/customer';
  }
}

/** Persist portal intent in localStorage + HttpOnly-safe cookie (via API). */
export async function setPortalIntent(portal: Portal): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.setItem('rp_portal', portal);
  try {
    await fetch('/api/auth/set-portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portal }),
    });
  } catch {
    // Cookie API failed — localStorage + URL param still cover most cases
  }
}

export function readPortalCookie(): Portal | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)rp_portal=([^;]+)/);
  const value = match?.[1] ? decodeURIComponent(match[1]) : null;
  return isPortal(value) ? value : null;
}

export function resolvePortalIntent(
  queryPortal?: string | null,
  cookiePortal?: string | null,
): Portal {
  if (isPortal(queryPortal)) return queryPortal;
  if (isPortal(cookiePortal)) return cookiePortal;
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('rp_portal');
    if (isPortal(stored)) return stored;
  }
  return 'customer';
}

export function clearPortalIntent(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('rp_portal');
  }
}

export function oauthCallbackUrl(): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  // Must match Supabase Redirect URLs allow list exactly (no query params).
  // Portal intent is stored in localStorage + rp_portal cookie before OAuth starts.
  // Mobile app uses repeateats://auth/callback — separate, unaffected.
  return `${origin}/auth/callback`;
}

type SupabaseBrowserClient = ReturnType<typeof import('@/lib/supabase/client').createClient>;

/** Start Google OAuth and return to the correct portal after sign-in. */
export async function startGoogleOAuth(
  supabase: SupabaseBrowserClient,
  portal: Portal,
): Promise<void> {
  await setPortalIntent(portal);
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: oauthCallbackUrl(),
    },
  });
}
