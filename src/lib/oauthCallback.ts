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

  // Always exchange the fresh code. A pre-existing session must NOT short-circuit
  // this — otherwise signing in with a different account silently keeps the old
  // session. If @supabase/ssr auto-exchanged the code on client init, the manual
  // call fails ("code already used") but a session exists, which is still success.
  const { error: authError } = await supabase.auth.exchangeCodeForSession(code);
  if (authError) {
    const hasSession = await waitForSession(supabase, 5_000);
    if (!hasSession) {
      console.error('[oauth] exchangeCodeForSession:', authError.message);
      window.history.replaceState({}, '', pathname);
      window.location.replace(authErrorPath(portal));
      return 'error';
    }
  }

  window.history.replaceState({}, '', pathname);
  return 'success';
}
