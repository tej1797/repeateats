// Supabase OAuth callback handler.
// After Google (or any OAuth provider) redirects back here,
// Supabase exchanges the one-time code for a user session cookie.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  // 'next' lets us redirect somewhere specific after login (e.g. /restaurant)
  const next = searchParams.get('next') ?? '/customer';

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Use new URL() to safely resolve the redirect path against the request origin
  const redirectUrl = new URL(next, request.url);
  return NextResponse.redirect(redirectUrl);
}
