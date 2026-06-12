'use client'

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Production answers on both repeateats.ca and www.repeateats.ca (Vercel
  // 307s apex → www). Auth cookies — including the PKCE code verifier written
  // before the Google redirect — must be readable on BOTH hosts, otherwise the
  // OAuth callback lands on the other host and the code exchange fails.
  const onProdDomain =
    typeof window !== 'undefined' &&
    /(^|\.)repeateats\.ca$/.test(window.location.hostname)

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    onProdDomain ? { cookieOptions: { domain: '.repeateats.ca' } } : undefined
  )
}
