'use client'

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession:      true,             // keep session in localStorage
        autoRefreshToken:    true,             // auto-refresh before JWT expires
        detectSessionInUrl:  true,             // handle OAuth ?code= callback
        storageKey:          'repeateats-auth',// unique key — avoids collisions
      },
    }
  )
}
