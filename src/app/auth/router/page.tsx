'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthRouterPage() {
  const router = useRouter()

  useEffect(() => {
    const route = async () => {
      const portal = localStorage.getItem('rp_portal') || 'customer'
      localStorage.removeItem('rp_portal')

      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        // Race condition — cookie may still be propagating
        await new Promise(r => setTimeout(r, 1000))
        const { data: { session: retry } } = await supabase.auth.getSession()

        if (!retry) {
          // Session genuinely missing — send to correct portal's login
          const loginDest = portal === 'customer'
            ? '/customer/login?error=auth'
            : `/${portal}?error=auth`
          router.replace(loginDest)
          return
        }
      }

      switch (portal) {
        case 'restaurant': router.replace('/restaurant'); break
        case 'influencer': router.replace('/influencer'); break
        default:           router.replace('/customer')
      }
    }

    void route()
  }, [router])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0A0A0A',
      color: '#666',
      fontFamily: 'system-ui',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 40, height: 40,
          border: '3px solid rgba(232,93,4,0.2)',
          borderTopColor: '#E85D04',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
          margin: '0 auto 16px',
        }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p>Signing you in...</p>
      </div>
    </div>
  )
}
