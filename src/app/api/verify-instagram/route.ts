// GET /api/verify-instagram?handle=foodie.kw
// Checks whether an Instagram handle resolves to a real public profile
// by fetching Instagram's public page and reading meta tags.
// No API key required — uses the public web.

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const raw = searchParams.get('handle') ?? ''
  const handle = raw.replace(/^@+/, '').trim()

  if (!handle || handle.length < 1) {
    return NextResponse.json({ valid: false })
  }

  try {
    const url = `https://www.instagram.com/${handle}/`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(6000),
    })

    if (!res.ok) {
      // 404 = handle doesn't exist
      return NextResponse.json({ valid: false, handle })
    }

    const html = await res.text()

    // Instagram's HTML contains JSON-LD / meta tags we can parse
    const fullNameMatch  = html.match(/"full_name":"([^"]+)"/)
    const followerMatch  = html.match(/"edge_followed_by":\{"count":(\d+)\}/)
    const privateMatch   = html.match(/"is_private":(true|false)/)

    // If the page rendered but contains no profile JSON it might be a soft 404
    const looksValid = html.includes('instagram.com') && (
      fullNameMatch || html.includes('"ProfilePage"') || html.includes('username')
    )

    if (!looksValid) {
      return NextResponse.json({ valid: false, handle })
    }

    return NextResponse.json({
      valid:       true,
      handle,
      url:         `https://instagram.com/${handle}`,
      full_name:   fullNameMatch?.[1]  ?? null,
      followers:   followerMatch       ? parseInt(followerMatch[1]) : null,
      is_private:  privateMatch?.[1]   === 'true',
      verified_at: new Date().toISOString(),
    })
  } catch {
    // Network / timeout error — can't verify, but not proof it's invalid
    return NextResponse.json({
      valid:  null,   // null = couldn't verify, not definitively invalid
      handle,
      url:    `https://instagram.com/${handle}`,
    })
  }
}
