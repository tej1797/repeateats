// Supabase OAuth callback handler.
// After Google (or any OAuth provider) redirects back here,
// Supabase exchanges the one-time code for a user session cookie.

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/customer'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Exchange failed — send back to login with an error flag
  return NextResponse.redirect(`${origin}/customer/login?error=auth`)
}
