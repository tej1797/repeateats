import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const cookieStore = cookies()

  // Read which portal the user intended (set by /api/auth/set-portal before OAuth started)
  const portal = cookieStore.get('rp_portal')?.value
  const destinations: Record<string, string> = {
    restaurant: '/restaurant',
    influencer:  '/influencer',
    customer:    '/customer',
  }
  const destination = destinations[portal ?? ''] ?? '/customer'

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Called from a Server Component — safe to ignore
            }
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const response = NextResponse.redirect(`${origin}${destination}`)
      response.cookies.delete('rp_portal')
      return response
    }

    console.error('OAuth error:', error.message)
  }

  // On failure, redirect to the correct portal's login
  return NextResponse.redirect(`${origin}${destination}?error=auth`)
}
