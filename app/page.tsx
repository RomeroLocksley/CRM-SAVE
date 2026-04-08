'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

function NavItem({ href, active, label, icon }: { href: string; active?: boolean; label: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1" style={{ textDecoration: 'none' }}>
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
        style={{ background: active ? 'rgba(255,255,255,0.2)' : 'transparent' }}
      >
        {icon}
      </div>
      <span style={{ fontSize: '10px', color: active ? 'white' : 'rgba(255,255,255,0.5)', fontWeight: active ? 500 : 400 }}>
        {label}
      </span>
    </Link>
  )
}

const LOSS_REASON_LABELS: Record<string, string> = {
  price_high:  'Price Too High',
  competitor:  'Went With Competitor',
  future:      'Future Date',
  finance:     'Financing Turned Down',
}

export default function Dashboard() {
  const [leads, setLeads] = useState<any[]>([])

  useEffect(() => {
    supabase.from('leads').select('*').then(({ data }) => setLeads(data || []))
  }, [])

  const totalLeads = leads.length
  const soldLeads = leads.filter((l) => l.result === 'sold').length
  const lostLeads = leads.filter((l) => l.result && l.result !== 'sold').length
  const closeRate = totalLeads ? ((soldLeads / totalLeads) * 100).toFixed(1) : '0.0'

  const lossReasons: Record<string, number> = {}
  leads.forEach((l) => { if (l.result && l.result !== 'sold') lossReasons[l.result] = (lossReasons[l.result] || 0) + 1 })

  const sources: Record<string, number> = {}
  leads.forEach((l) => { if (l.source) sources[l.source] = (sources[l.source] || 0) + 1 })

  const statusCounts: Record<string, number> = {}
  leads.forEach((l) => { if (l.status) statusCounts[l.status] = (statusCounts[l.status] || 0) + 1 })

  const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    new:         { bg: '#f5f5f5',  text: '#888' },
    appointment: { bg: '#FAEEDA',  text: '#633806' },
    proposal:    { bg: '#E6F1FB',  text: '#0C447C' },
    pending:     { bg: '#EDE9FE',  text: '#4C1D95' },
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f4f7fb' }}>

      {/* ── SLIM SIDEBAR ─────────────────────────────────────────────── */}
      <aside className="flex flex-col items-center py-5 gap-5 flex-shrink-0" style={{ width: '68px', background: '#0C447C' }}>
        <div className="mb-2" style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="5" height="5" rx="1" fill="white"/>
            <rect x="9" y="2" width="5" height="5" rx="1" fill="white" opacity="0.6"/>
            <rect x="2" y="9" width="5" height="5" rx="1" fill="white" opacity="0.6"/>
            <rect x="9" y="9" width="5" height="5" rx="1" fill="white" opacity="0.4"/>
          </svg>
        </div>
        <NavItem href="/" active label="Home" icon={
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 7.5L9 2l7 5.5V16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
            <rect x="6.5" y="10" width="5" height="7" rx="0.5" fill="white"/>
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

      {/* ── MAIN ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div style={{ flexShrink: 0, padding: '16px 32px', background: 'white', borderBottom: '0.5px solid #eee' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: '#1a1a2e' }}>Dashboard</h1>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ padding: 32 }}>

          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Total Leads', value: totalLeads, color: '#1a1a2e' },
              { label: 'Sold', value: soldLeads, color: '#27500A' },
              { label: 'Lost', value: lostLeads, color: '#A32D2D' },
              { label: 'Close Rate', value: `${closeRate}%`, color: '#0C447C' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'white', borderRadius: 14, border: '0.5px solid #e8e8e8', padding: '20px 24px' }}>
                <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                <p style={{ fontSize: 28, fontWeight: 600, margin: 0, color }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Second row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

            {/* Pipeline status */}
            <div style={{ background: 'white', borderRadius: 14, border: '0.5px solid #e8e8e8', padding: '20px 24px' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', margin: '0 0 16px' }}>Pipeline</p>
              {Object.keys(statusCounts).length === 0 ? (
                <p style={{ fontSize: 13, color: '#bbb' }}>No data yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(statusCounts).map(([status, count]) => {
                    const badge = STATUS_COLORS[status] || { bg: '#f5f5f5', text: '#888' }
                    return (
                      <div key={status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, background: badge.bg, color: badge.text, padding: '3px 10px', borderRadius: 20, fontWeight: 500, textTransform: 'capitalize' }}>
                          {status}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>{count}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Why deals are lost */}
            <div style={{ background: 'white', borderRadius: 14, border: '0.5px solid #e8e8e8', padding: '20px 24px' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', margin: '0 0 16px' }}>Why Deals Are Lost</p>
              {Object.keys(lossReasons).length === 0 ? (
                <p style={{ fontSize: 13, color: '#bbb' }}>No data yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {Object.entries(lossReasons).map(([reason, count], i, arr) => (
                    <div key={reason} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < arr.length - 1 ? '0.5px solid #f5f5f5' : 'none' }}>
                      <span style={{ fontSize: 13, color: '#555' }}>{LOSS_REASON_LABELS[reason] || reason.replace('_', ' ')}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lead sources */}
            <div style={{ background: 'white', borderRadius: 14, border: '0.5px solid #e8e8e8', padding: '20px 24px' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', margin: '0 0 16px' }}>Lead Sources</p>
              {Object.keys(sources).length === 0 ? (
                <p style={{ fontSize: 13, color: '#bbb' }}>No data yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {Object.entries(sources)
                    .sort((a, b) => b[1] - a[1])
                    .map(([src, count], i, arr) => (
                      <div key={src} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < arr.length - 1 ? '0.5px solid #f5f5f5' : 'none' }}>
                        <span style={{ fontSize: 13, color: '#555' }}>{src}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {/* Mini bar */}
                          <div style={{ width: 60, height: 4, background: '#f0f0f0', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${Math.round((count / totalLeads) * 100)}%`, height: '100%', background: '#185FA5', borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', minWidth: 16, textAlign: 'right' }}>{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}