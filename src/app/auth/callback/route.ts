import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isPortal, portalPath, type Portal } from '@/lib/portalAuth';

function resolvePortal(request: NextRequest): Portal {
  const fromQuery = request.nextUrl.searchParams.get('portal');
  if (isPortal(fromQuery)) return fromQuery;
  const fromCookie = request.cookies.get('rp_portal')?.value;
  if (isPortal(fromCookie)) return fromCookie;
  return 'customer';
}

function redirectWithClearedCookie(origin: string, path: string): NextResponse {
  const res = NextResponse.redirect(`${origin}${path}`);
  const host = new URL(origin).host;
  const isProd = host.endsWith('repeateats.ca');
  res.cookies.set('rp_portal', '', {
    path: '/',
    maxAge: 0,
    ...(isProd ? { domain: '.repeateats.ca' } : {}),
  });
  return res;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const portal = resolvePortal(request);
  const code  = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    const loginPath = portal === 'customer'
      ? `/customer/login?error=${encodeURIComponent(error)}`
      : `${portalPath(portal)}?error=${encodeURIComponent(error)}`;
    return redirectWithClearedCookie(origin, loginPath);
  }

  if (code) {
    const supabase = createClient();
    const { error: authError } = await supabase.auth.exchangeCodeForSession(code);
    if (authError) {
      const loginPath = portal === 'customer'
        ? '/customer/login?error=auth'
        : `${portalPath(portal)}?error=auth`;
      return redirectWithClearedCookie(origin, loginPath);
    }
  }

  return redirectWithClearedCookie(origin, portalPath(portal));
}
