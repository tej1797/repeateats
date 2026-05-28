// POST /api/auth/set-portal
// Stores the intended portal in a short-lived cookie BEFORE the OAuth redirect.
// Named rp_portal; httpOnly:false so the value isn't secret (just a routing hint).
// auth/callback reads this to redirect to the right portal after OAuth completes.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json() as { portal?: string }
  const allowed = ['customer', 'restaurant', 'influencer'] as const
  const portal  = body.portal

  if (!portal || !(allowed as readonly string[]).includes(portal)) {
    return NextResponse.json({ error: 'Invalid portal' }, { status: 400 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('rp_portal', portal, {
    httpOnly: false,                                          // not a secret — just a routing hint
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   300,                                            // 5 minutes — enough for OAuth flow
    path:     '/',
  })
  return response
}
