import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const cookieStore = cookies()

  // Read which portal the user was signing into (set by /api/auth/set-portal before OAuth)
  const intendedPortal = cookieStore.get('intended_portal')?.value
  const portalMap: Record<string, string> = {
    restaurant: '/restaurant',
    influencer:  '/influencer',
    customer:    '/customer',
  }
  const destination = portalMap[intendedPortal ?? ''] ?? '/customer'

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
      // Clear the intended portal cookie then redirect
      const response = NextResponse.redirect(`${origin}${destination}`)
      response.cookies.delete('intended_portal')
      return response
    }

    console.error('OAuth exchangeCodeForSession error:', error.message)
  }

  // On error, send back to the correct portal's login page
  return NextResponse.redirect(`${origin}${destination}?error=auth`)
}
