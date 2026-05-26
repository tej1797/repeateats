import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect /customer (but not /customer/login or /customer/preview)
  const protectedPaths = ['/customer', '/restaurant/dashboard', '/influencer/feed']
  const isProtected = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path))

  // Pages that are themselves login/entry pages — don't redirect these
  const loginPaths = [
    '/customer/login', '/customer/preview',
    '/restaurant/login', '/influencer/login',
    '/restaurant', '/influencer', '/login',
  ]
  const isLoginPage = loginPaths.some(path =>
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/'))

  if (isProtected && !user && !isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/customer/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
