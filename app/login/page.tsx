'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function signInWithGoogle() {
    setLoading(true)
    setError('')

    const redirectTo = process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
      : `${window.location.origin}/auth/callback`

    console.log('[Login] redirectTo:', redirectTo)

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    console.log('[Login] OAuth data:', data)
    console.log('[Login] OAuth error:', error)

    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f7fb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 20, padding: '40px 48px', width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.08)', textAlign: 'center' }}>

        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="K&D Contracting" style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 12 }} />
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: '0 0 6px' }}>K&D Contracting</h1>
        <p style={{ fontSize: 14, color: '#aaa', margin: '0 0 32px' }}>Sign in to your CRM</p>

        {error && (
          <div style={{ background: '#FCEBEB', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#A32D2D' }}>
            {error}
          </div>
        )}

        <button
          onClick={signInWithGoogle}
          disabled={loading}
          style={{
            width: '100%', padding: '12px 20px', borderRadius: 12,
            border: '0.5px solid #e0e0e0', background: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            cursor: loading ? 'not-allowed' : 'pointer', fontSize: 15, fontWeight: 500,
            color: '#1a1a2e', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            transition: 'box-shadow 0.15s',
          }}
          onMouseOver={(e) => { if (!loading) e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)' }}
          onMouseOut={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          {/* Google icon */}
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? 'Signing in…' : 'Sign in with Google'}
        </button>

        <p style={{ fontSize: 12, color: '#ccc', marginTop: 24 }}>
          Only authorized team members can access this app.
        </p>
      </div>
    </div>
  )
}