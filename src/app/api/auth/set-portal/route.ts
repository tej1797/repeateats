// POST /api/auth/set-portal
// Stores the intended portal in a short-lived cookie BEFORE the OAuth redirect.
// The auth/callback route reads this cookie to redirect the user to the right portal.

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
  response.cookies.set('intended_portal', portal, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   600, // 10 minutes — enough to complete OAuth flow
    path:     '/',
  })
  return response
}
