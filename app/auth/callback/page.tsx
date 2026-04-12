'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState('Completing sign in…')

  useEffect(() => {
    async function handleCallback() {
      try {
        // Handle hash-based session (implicit flow)
        const hash = window.location.hash
        const query = window.location.search
        console.log('[Callback] hash:', hash ? 'present' : 'empty')
        console.log('[Callback] query:', query)

        // Let Supabase process the URL (handles both hash and query params)
        const { data, error } = await supabase.auth.getSession()
        console.log('[Callback] session:', data?.session?.user?.email)
        console.log('[Callback] error:', error?.message)

        if (data?.session) {
          setStatus('Signed in! Redirecting…')
          // Ensure profile exists
          const user = data.session.user
          const { data: existing } = await supabase.from('profiles').select('id').eq('id', user.id).single()
          if (!existing) {
            await supabase.from('profiles').insert([{
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.email,
              role: 'admin',
            }])
          }
          router.replace('/')
          return
        }

        // If no session yet, try exchanging code from URL params
        const params = new URLSearchParams(query)
        const code = params.get('code')
        console.log('[Callback] code from params:', code ? 'present' : 'missing')

        if (code) {
          const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          console.log('[Callback] exchange user:', exchangeData?.user?.email)
          console.log('[Callback] exchange error:', exchangeError?.message)

          if (exchangeData?.user) {
            setStatus('Signed in! Redirecting…')
            const user = exchangeData.user
            const { data: existing } = await supabase.from('profiles').select('id').eq('id', user.id).single()
            if (!existing) {
              await supabase.from('profiles').insert([{
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || user.email,
                role: 'admin',
              }])
            }
            router.replace('/')
            return
          }
        }

        // Listen for auth state change (handles hash fragment)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('[Callback] auth event:', event, session?.user?.email)
          if (session?.user) {
            setStatus('Signed in! Redirecting…')
            subscription.unsubscribe()
            const user = session.user
            const { data: existing } = await supabase.from('profiles').select('id').eq('id', user.id).single()
            if (!existing) {
              await supabase.from('profiles').insert([{
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || user.email,
                role: 'admin',
              }])
            }
            router.replace('/')
          }
        })

        // Timeout fallback
        setTimeout(() => {
          setStatus('Sign in failed. Redirecting…')
          router.replace('/login?error=timeout')
        }, 8000)

      } catch (err) {
        console.error('[Callback] unexpected error:', err)
        router.replace('/login?error=unexpected')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div style={{ minHeight: '100vh', background: '#f4f7fb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 20, padding: '40px 48px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.08)' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #E6F1FB', borderTop: '3px solid #185FA5', borderRadius: '50%', margin: '0 auto 20px', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: 15, color: '#555', margin: 0 }}>{status}</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}