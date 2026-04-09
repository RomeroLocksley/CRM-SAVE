'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

function NavItem({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const pathname = usePathname()
  const active = pathname === href || (href !== '/' && pathname.startsWith(href))
  return (
    <Link href={href} className="flex flex-col items-center gap-1" style={{ textDecoration: 'none' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors" style={{ background: active ? 'rgba(255,255,255,0.2)' : 'transparent' }}>
        {icon}
      </div>
      <span style={{ fontSize: '10px', color: active ? 'white' : 'rgba(255,255,255,0.5)', fontWeight: active ? 500 : 400 }}>
        {label}
      </span>
    </Link>
  )
}

export default function NavSidebar() {
  return (
    <aside className="flex flex-col items-center py-5 gap-5 flex-shrink-0 print:hidden" style={{ width: '68px', background: '#0C447C' }}>

      {/* Logo mark */}
      <div className="mb-2" style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="5" height="5" rx="1" fill="white"/>
          <rect x="9" y="2" width="5" height="5" rx="1" fill="white" opacity="0.6"/>
          <rect x="2" y="9" width="5" height="5" rx="1" fill="white" opacity="0.6"/>
          <rect x="9" y="9" width="5" height="5" rx="1" fill="white" opacity="0.4"/>
        </svg>
      </div>

      <NavItem href="/" label="Home" icon={
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M2 7.5L9 2l7 5.5V16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" style={{ color: 'rgba(255,255,255,0.6)' }}/>
          <rect x="6.5" y="10" width="5" height="7" rx="0.5" fill="rgba(255,255,255,0.6)"/>
        </svg>
      }/>

      <NavItem href="/leads" label="Leads" icon={
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="6" r="3.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
          <path d="M2 16c0-3.866 3.134-6 7-6s7 2.134 7 6" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      }/>

      <NavItem href="/projects" label="Projects" icon={
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="1" y="5" width="16" height="11" rx="1.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
          <path d="M6 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
          <path d="M1 9h16" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
        </svg>
      }/>

      <NavItem href="/calendar" label="Calendar" icon={
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="1" y="3" width="16" height="14" rx="1.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
          <path d="M1 7h16" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
          <path d="M5 1v4M13 1v4" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      }/>

      <NavItem href="/catalog" label="Catalog" icon={
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M3 4h12M3 9h12M3 14h7" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      }/>

      <NavItem href="/templates" label="Templates" icon={
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="1" y="1" width="16" height="5" rx="1.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
          <rect x="1" y="9" width="7" height="8" rx="1.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
          <rect x="10" y="9" width="7" height="8" rx="1.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
        </svg>
      }/>

    </aside>
  )
}