'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function MobileHeader({ title, rightAction }: {
  title: string
  rightAction?: React.ReactNode
}) {
  const router = useRouter()
  const [userInitials, setUserInitials] = useState('')
  const [userName, setUserName] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const name = user.user_metadata?.full_name || user.email || ''
        setUserName(name)
        const parts = name.split(' ')
        const initials = parts.length >= 2
          ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
          : name.slice(0, 2).toUpperCase()
        setUserInitials(initials)
      }
    })
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="md:hidden flex-shrink-0 flex items-center justify-between px-4 py-4"
      style={{ background: 'white', borderBottom: '0.5px solid #eee' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: '#1a1a2e' }}>{title}</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {rightAction}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button onClick={() => setShowMenu(!showMenu)}
            style={{ width: 36, height: 36, borderRadius: '50%', background: '#0C447C', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: 'white' }}>
            {userInitials || '?'}
          </button>

          {showMenu && (
            <div style={{ position: 'absolute', right: 0, top: 44, background: 'white', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '0.5px solid #e8e8e8', minWidth: 180, zIndex: 100, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '0.5px solid #f0f0f0' }}>
                <p style={{ fontSize: 12, color: '#aaa', margin: 0 }}>Signed in as</p>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1a2e', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{userName}</p>
              </div>
              <button onClick={signOut}
                style={{ width: '100%', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 14, color: '#E24B4A', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" stroke="#E24B4A" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M10 11l3-3-3-3" stroke="#E24B4A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M13 8H6" stroke="#E24B4A" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}