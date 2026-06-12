import type { SupabaseClient } from '@supabase/supabase-js';
import { portalPath, type Portal } from '@/lib/portalAuth';

function isOAuthCallbackPath(pathname: string): boolean {
  return pathname === '/auth/callback' || pathname === '/';
}

function authErrorPath(portal: Portal): string {
  return portal === 'customer'
    ? '/customer/login?error=auth'
    : `${portalPath(portal)}?error=auth`;
}

/** Wait until session exists or timeout. */
async function waitForSession(supabase: SupabaseClient, maxMs = 10_000): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) return true;

  return new Promise((resolve) => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      subscription.unsubscribe();
      resolve(ok);
    };

    const timer = setTimeout(() => finish(false), maxMs);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        finish(true);
      }
    });
  });
}

/**
 * Handle OAuth return (?code= / provider ?error=) in the browser.
 * PKCE code exchange MUST run client-side — the verifier is not available on the server.
 *
 * Returns:
 * - `success` — session established, caller should navigate to portal
 * - `error`   — exchange failed, caller should show error (or rely on redirect)
 * - `none`    — nothing to handle
 */
export async function handleOAuthReturn(
  supabase: SupabaseClient,
  portal: Portal,
): Promise<'success' | 'error' | 'none'> {
  if (typeof window === 'undefined') return 'none';

  const params = new URLSearchParams(window.location.search);
  const code  = params.get('code');
  const error = params.get('error');
  const pathname = window.location.pathname;

  if (!code && !error) return 'none';

  // App error flag on a login page — do NOT re-handle (causes infinite flicker)
  if (!code && error && pathname.includes('/login')) return 'none';

  // Provider OAuth errors only on callback routes
  if (!code && error) {
    if (!isOAuthCallbackPath(pathname)) return 'none';
    window.history.replaceState({}, '', pathname);
    window.location.replace(authErrorPath(portal));
    return 'error';
  }

  if (!code) return 'none';

  // @supabase/ssr may auto-exchange the code on client init — wait for that first.
  const autoSession = await waitForSession(supabase, 3_000);
  if (autoSession) {
    window.history.replaceState({}, '', pathname);
    return 'success';
  }

  // Manual exchange fallback
  const { error: authError } = await supabase.auth.exchangeCodeForSession(code);
  if (authError) {
    console.error('[oauth] exchangeCodeForSession:', authError.message);
    const hasSession = await waitForSession(supabase, 5_000);
    if (!hasSession) {
      window.history.replaceState({}, '', pathname);
      window.location.replace(authErrorPath(portal));
      return 'error';
    }
  }

  window.history.replaceState({}, '', pathname);
  return 'success';
}
