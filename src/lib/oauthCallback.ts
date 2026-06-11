import type { SupabaseClient } from '@supabase/supabase-js';
import { portalPath, type Portal } from '@/lib/portalAuth';

function isOAuthCallbackPath(pathname: string): boolean {
  return pathname === '/auth/callback' || pathname === '/';
}

/** Poll until session appears (handles Supabase auto-detect racing manual exchange). */
async function waitForSession(supabase: SupabaseClient, maxMs = 4000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) return true;
    await new Promise((r) => setTimeout(r, 120));
  }
  return false;
}

function authErrorPath(portal: Portal): string {
  return portal === 'customer'
    ? '/customer/login?error=auth'
    : `${portalPath(portal)}?error=auth`;
}

/**
 * Handle OAuth return (?code= / provider ?error=) in the browser.
 * PKCE code exchange MUST run client-side — the verifier is not available on the server.
 *
 * Does NOT re-process app-level ?error=auth on /login pages (prevents redirect flicker loop).
 */
export async function handleOAuthReturn(
  supabase: SupabaseClient,
  portal: Portal,
): Promise<'handled' | 'none'> {
  if (typeof window === 'undefined') return 'none';

  const params = new URLSearchParams(window.location.search);
  const code  = params.get('code');
  const error = params.get('error');
  const pathname = window.location.pathname;

  // Nothing to do
  if (!code && !error) return 'none';

  // App error flag on a login page — do NOT re-handle (causes infinite flicker)
  if (!code && error && pathname.includes('/login')) return 'none';

  // Provider OAuth errors only on callback routes
  if (!code && error) {
    if (!isOAuthCallbackPath(pathname)) return 'none';
    window.history.replaceState({}, '', pathname);
    window.location.replace(authErrorPath(portal));
    return 'handled';
  }

  if (!code) return 'none';

  // Allow Supabase client auto-detect a moment, then exchange manually if needed
  await new Promise((r) => setTimeout(r, 80));
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const { error: authError } = await supabase.auth.exchangeCodeForSession(code);
    if (authError) {
      const hasSession = await waitForSession(supabase);
      if (!hasSession) {
        window.history.replaceState({}, '', pathname);
        window.location.replace(authErrorPath(portal));
        return 'handled';
      }
    }
  }

  window.history.replaceState({}, '', pathname);
  return 'handled';
}
