import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const handle = searchParams.get('handle')?.replace('@','').trim()

  if (!handle || handle.length < 2) {
    return NextResponse.json({ valid: false })
  }

  // Validate format only — no Instagram API call
  const validFormat = /^[a-zA-Z0-9._]{1,30}$/.test(handle)

  return NextResponse.json({
    valid: validFormat,
    handle,
    url: `https://instagram.com/${handle}`,
    note: validFormat
      ? 'Format valid — we will verify after signup'
      : 'Invalid Instagram handle format',
  })
}
