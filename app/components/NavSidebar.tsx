'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function NavItem({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const pathname = usePathname()
  const active = pathname === href || (href !== '/' && pathname.startsWith(href))
  return (
    <Link href={href} className="flex flex-col items-center gap-1" style={{ textDecoration: 'none' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors" style={{ background: active ? 'rgba(255,255,255,0.2)' : 'transparent' }}>
        {icon}
      </div>
      <span style={{ fontSize: '10px', color: active ? 'white' : 'rgba(255,255,255,0.5)', fontWeight: active ? 500 : 400, textAlign: 'center', lineHeight: 1.2 }}>
        {label}
      </span>
    </Link>
  )
}

function MobileNavItem({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const pathname = usePathname()
  const active = pathname === href || (href !== '/' && pathname.startsWith(href))
  return (
    <Link href={href} style={{ textDecoration: 'none', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '10px 0' }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? 'rgba(255,255,255,0.2)' : 'transparent' }}>
        {icon}
      </div>
      <span style={{ fontSize: 11, color: active ? 'white' : 'rgba(255,255,255,0.5)', fontWeight: active ? 500 : 400 }}>{label}</span>
    </Link>
  )
}

const NAV_ITEMS = [
  {
    href: '/', label: 'Home',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
        <path d="M2 7.5L9 2l7 5.5V16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5z" stroke={active ? 'white' : 'rgba(255,255,255,0.6)'} strokeWidth="1.5" strokeLinejoin="round"/>
        <rect x="6.5" y="10" width="5" height="7" rx="0.5" fill={active ? 'white' : 'rgba(255,255,255,0.6)'}/>
      </svg>
    )
  },
  {
    href: '/leads', label: 'Leads',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="6" r="3.5" stroke={active ? 'white' : 'rgba(255,255,255,0.6)'} strokeWidth="1.5"/>
        <path d="M2 16c0-3.866 3.134-6 7-6s7 2.134 7 6" stroke={active ? 'white' : 'rgba(255,255,255,0.6)'} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    )
  },
  {
    href: '/lead-calendar', label: 'Lead Cal',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
        <rect x="1" y="3" width="16" height="14" rx="1.5" stroke={active ? 'white' : 'rgba(255,255,255,0.6)'} strokeWidth="1.5"/>
        <path d="M1 7h16" stroke={active ? 'white' : 'rgba(255,255,255,0.6)'} strokeWidth="1.5"/>
        <path d="M5 1v4M13 1v4" stroke={active ? 'white' : 'rgba(255,255,255,0.6)'} strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="9" cy="12" r="2" fill={active ? 'white' : 'rgba(255,255,255,0.6)'}/>
      </svg>
    )
  },
  {
    href: '/projects', label: 'Projects',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
        <rect x="1" y="5" width="16" height="11" rx="1.5" stroke={active ? 'white' : 'rgba(255,255,255,0.6)'} strokeWidth="1.5"/>
        <path d="M6 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" stroke={active ? 'white' : 'rgba(255,255,255,0.6)'} strokeWidth="1.5"/>
        <path d="M1 9h16" stroke={active ? 'white' : 'rgba(255,255,255,0.6)'} strokeWidth="1.5"/>
      </svg>
    )
  },
  {
    href: '/calendar', label: 'Prod Cal',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
        <rect x="1" y="3" width="16" height="14" rx="1.5" stroke={active ? 'white' : 'rgba(255,255,255,0.6)'} strokeWidth="1.5"/>
        <path d="M1 7h16" stroke={active ? 'white' : 'rgba(255,255,255,0.6)'} strokeWidth="1.5"/>
        <path d="M5 1v4M13 1v4" stroke={active ? 'white' : 'rgba(255,255,255,0.6)'} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M5 11h8M5 14h5" stroke={active ? 'white' : 'rgba(255,255,255,0.6)'} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    )
  },
  {
    href: '/catalog', label: 'Catalog',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
        <path d="M3 4h12M3 9h12M3 14h7" stroke={active ? 'white' : 'rgba(255,255,255,0.6)'} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    )
  },
  {
    href: '/templates', label: 'Templates',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
        <rect x="1" y="1" width="16" height="5" rx="1.5" stroke={active ? 'white' : 'rgba(255,255,255,0.6)'} strokeWidth="1.5"/>
        <rect x="1" y="9" width="7" height="8" rx="1.5" stroke={active ? 'white' : 'rgba(255,255,255,0.6)'} strokeWidth="1.5"/>
        <rect x="10" y="9" width="7" height="8" rx="1.5" stroke={active ? 'white' : 'rgba(255,255,255,0.6)'} strokeWidth="1.5"/>
      </svg>
    )
  },
]

export default function NavSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [userInitials, setUserInitials] = useState('')
  const [userName, setUserName] = useState('')

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

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Mobile bottom nav — show 5 most relevant items
  const mobileItems = [NAV_ITEMS[0], NAV_ITEMS[1], NAV_ITEMS[2], NAV_ITEMS[3], NAV_ITEMS[4]]

  return (
    <>
      {/* ── DESKTOP SIDEBAR ─────────────────────────── */}
      <aside className="hidden md:flex flex-col items-center py-5 gap-4 flex-shrink-0 print:hidden" style={{ width: '68px', background: '#0C447C' }}>
        <div className="mb-1" style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="5" height="5" rx="1" fill="white"/>
            <rect x="9" y="2" width="5" height="5" rx="1" fill="white" opacity="0.6"/>
            <rect x="2" y="9" width="5" height="5" rx="1" fill="white" opacity="0.6"/>
            <rect x="9" y="9" width="5" height="5" rx="1" fill="white" opacity="0.4"/>
          </svg>
        </div>

        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <NavItem key={item.href} href={item.href} label={item.label} icon={item.icon(active)} />
          )
        })}

        <div style={{ flex: 1 }} />

        <div className="flex flex-col items-center gap-2">
          {userInitials && (
            <div title={userName} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: 'white' }}>
              {userInitials}
            </div>
          )}
          <button onClick={signOut} title="Sign out"
            style={{ width: 32, height: 32, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M10 11l3-3-3-3" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13 8H6" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* ── MOBILE BOTTOM NAV ───────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center print:hidden" style={{ background: '#0C447C', borderTop: '1px solid rgba(255,255,255,0.1)', paddingBottom: 'env(safe-area-inset-bottom)', paddingTop: 4 }}>
        {mobileItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <MobileNavItem key={item.href} href={item.href} label={item.label} icon={item.icon(active)} />
          )
        })}
      </nav>
    </>
  )
}