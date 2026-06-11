import type { SupabaseClient } from '@supabase/supabase-js';
import { portalPath, type Portal } from '@/lib/portalAuth';

/**
 * Handle OAuth return (?code= / ?error=) in the browser.
 * PKCE code exchange MUST run client-side — the verifier is not available on the server.
 */
export async function handleOAuthReturn(
  supabase: SupabaseClient,
  portal: Portal,
): Promise<'handled' | 'none'> {
  if (typeof window === 'undefined') return 'none';

  const params = new URLSearchParams(window.location.search);
  const code  = params.get('code');
  const error = params.get('error');
  if (!code && !error) return 'none';

  const cleanUrl = () => {
    window.history.replaceState({}, '', window.location.pathname);
  };

  if (error) {
    cleanUrl();
    const dest = portal === 'customer'
      ? `/customer/login?error=${encodeURIComponent(error)}`
      : `${portalPath(portal)}?error=${encodeURIComponent(error)}`;
    window.location.replace(dest);
    return 'handled';
  }

  if (!code) return 'none';

  const { error: authError } = await supabase.auth.exchangeCodeForSession(code);
  if (authError) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      cleanUrl();
      const dest = portal === 'customer'
        ? '/customer/login?error=auth'
        : `${portalPath(portal)}?error=auth`;
      window.location.replace(dest);
      return 'handled';
    }
  }

  cleanUrl();
  return 'handled';
}
