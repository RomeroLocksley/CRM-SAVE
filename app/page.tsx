'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import NavSidebar from './components/NavSidebar'
import MobileHeader from './components/MobileHeader'
import Link from 'next/link'

const MARKUP = 1.5 * 1.05

const LOSS_REASON_LABELS: Record<string, string> = {
  competitor:       'Went With Competitor',
  not_interested:   'Not Interested in Pool',
  future_date:      'Waiting for Future Date',
  finance_turndown: 'Finance Turndown',
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  uncontacted:      { bg: '#f5f5f5',  text: '#888',    label: 'Uncontacted' },
  appointment_set:  { bg: '#FAEEDA',  text: '#633806', label: 'Appointment Set' },
  proposal_sent:    { bg: '#E6F1FB',  text: '#0C447C', label: 'Proposal Sent' },
  needs_reschedule: { bg: '#F3E8FF',  text: '#581C87', label: 'Needs Reschedule' },
}

export default function Dashboard() {
  const [leads, setLeads] = useState<any[]>([])
  const [proposals, setProposals] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [userName, setUserName] = useState('')

  useEffect(() => {
    supabase.from('leads').select('*').then(({ data }) => setLeads(data || []))
    supabase.from('proposals').select('id, status, total_price').then(({ data }) => setProposals(data || []))
    supabase.from('projects').select('id, status').then(({ data }) => setProjects(data || []))
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const name = user.user_metadata?.full_name || user.email || ''
        setUserName(name.split(' ')[0] || name)
      }
    })
  }, [])

  const totalLeads = leads.length
  const soldLeads = leads.filter((l) => l.result === 'sold').length
  const lostLeads = leads.filter((l) => l.result && l.result !== 'sold' && l.result !== 'working').length
  const closeRate = totalLeads ? ((soldLeads / totalLeads) * 100).toFixed(1) : '0.0'

  const signedProposals = proposals.filter((p) => p.status === 'signed')
  const totalSoldValue = signedProposals.reduce((sum, p) => sum + Number(p.total_price || 0), 0) * MARKUP
  const avgContractPrice = signedProposals.length > 0 ? totalSoldValue / signedProposals.length : 0
  const activeProjects = projects.filter((p) => p.status === 'active').length

  const lossReasons: Record<string, number> = {}
  leads.forEach((l) => {
    if (l.result && l.result !== 'sold' && l.result !== 'working') {
      lossReasons[l.result] = (lossReasons[l.result] || 0) + 1
    }
  })

  const sources: Record<string, number> = {}
  leads.forEach((l) => { if (l.source) sources[l.source] = (sources[l.source] || 0) + 1 })

  const statusCounts: Record<string, number> = {
    uncontacted: 0, appointment_set: 0, proposal_sent: 0, needs_reschedule: 0,
  }
  leads.forEach((l) => {
    const s = l.status || 'uncontacted'
    if (s in statusCounts) statusCounts[s]++
  })

  function fmtMoney(n: number) {
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div style={{ background: '#f4f7fb', minHeight: '100vh' }}>
      <div className="flex h-screen overflow-hidden">
        <NavSidebar />

        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ── MOBILE WELCOME SCREEN ── */}
          <div className="md:hidden flex-1 flex flex-col overflow-y-auto pb-24">
            <MobileHeader title="" />

            {/* Greeting banner */}
            <div style={{ background: '#0C447C', padding: '28px 24px 32px' }}>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '0 0 4px' }}>{dateStr}</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: 'white', margin: '0 0 2px' }}>{greeting}{userName ? `, ${userName}` : ''}.</p>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: 0 }}>K&D Contracting CRM</p>
            </div>

            {/* Quick stats */}
            <div style={{ padding: '20px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: -16 }}>
              {[
                { label: 'Total Leads', value: totalLeads, color: '#1a1a2e' },
                { label: 'Close Rate', value: `${closeRate}%`, color: '#0C447C' },
                { label: 'Active Projects', value: activeProjects, color: '#0F6E56' },
                { label: 'Sold', value: soldLeads, color: '#27500A' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: 'white', borderRadius: 14, padding: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                  <p style={{ fontSize: 11, color: '#aaa', margin: '0 0 6px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                  <p style={{ fontSize: 28, fontWeight: 700, margin: 0, color }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Quick nav links */}
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '4px 0 6px' }}>Quick Access</p>
              {[
                { href: '/leads', label: 'Leads', sub: `${totalLeads} total`, color: '#185FA5' },
                { href: '/lead-calendar', label: 'Lead Calendar', sub: 'Appointments', color: '#8B3FC8' },
                { href: '/projects', label: 'Projects', sub: `${activeProjects} active`, color: '#0F6E56' },
                { href: '/calendar', label: 'Production Calendar', sub: 'Schedule', color: '#D4810A' },
              ].map(({ href, label, sub, color }) => (
                <Link key={href} href={href} style={{ textDecoration: 'none', background: 'white', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e', margin: 0 }}>{label}</p>
                      <p style={{ fontSize: 12, color: '#aaa', margin: '2px 0 0' }}>{sub}</p>
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </Link>
              ))}
            </div>
          </div>

          {/* ── DESKTOP DASHBOARD ── */}
          <div className="hidden md:flex flex-col overflow-hidden flex-1">
            <div style={{ flexShrink: 0, padding: '16px 32px', background: 'white', borderBottom: '0.5px solid #eee' }}>
              <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: '#1a1a2e' }}>Dashboard</h1>
            </div>

            <div className="flex-1 overflow-y-auto" style={{ padding: 32 }}>

              {/* Lead KPIs — 4 columns */}
              <p style={{ fontSize: 11, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Leads</p>
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

              {/* Business KPIs — 3 columns */}
              <p style={{ fontSize: 11, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Business</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
                {[
                  { label: 'Total Sold Value', value: fmtMoney(totalSoldValue), color: '#27500A', sub: `${signedProposals.length} signed contract${signedProposals.length !== 1 ? 's' : ''}` },
                  { label: 'Avg Contract Price', value: fmtMoney(avgContractPrice), color: '#185FA5', sub: 'Per signed proposal' },
                  { label: 'Active Projects', value: activeProjects, color: '#0F6E56', sub: `${projects.filter(p => p.status === 'completed').length} completed` },
                ].map(({ label, value, color, sub }) => (
                  <div key={label} style={{ background: 'white', borderRadius: 14, border: '0.5px solid #e8e8e8', padding: '20px 24px' }}>
                    <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                    <p style={{ fontSize: 28, fontWeight: 600, margin: '0 0 4px', color }}>{value}</p>
                    <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>{sub}</p>
                  </div>
                ))}
              </div>

              {/* Bottom row — 3 columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

                <div style={{ background: 'white', borderRadius: 14, border: '0.5px solid #e8e8e8', padding: '20px 24px' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', margin: '0 0 16px' }}>Lead Pipeline</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {Object.entries(statusCounts).map(([status, count]) => {
                      const s = STATUS_COLORS[status]
                      return (
                        <div key={status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, background: s.bg, color: s.text, padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>{s.label}</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div style={{ background: 'white', borderRadius: 14, border: '0.5px solid #e8e8e8', padding: '20px 24px' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', margin: '0 0 16px' }}>Why Deals Are Lost</p>
                  {Object.keys(lossReasons).length === 0 ? (
                    <p style={{ fontSize: 13, color: '#bbb' }}>No data yet</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {Object.entries(lossReasons).map(([reason, count], i, arr) => (
                        <div key={reason} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < arr.length - 1 ? '0.5px solid #f5f5f5' : 'none' }}>
                          <span style={{ fontSize: 13, color: '#555' }}>{LOSS_REASON_LABELS[reason] || reason}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ background: 'white', borderRadius: 14, border: '0.5px solid #e8e8e8', padding: '20px 24px' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', margin: '0 0 16px' }}>Lead Sources</p>
                  {Object.keys(sources).length === 0 ? (
                    <p style={{ fontSize: 13, color: '#bbb' }}>No data yet</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {Object.entries(sources).sort((a, b) => b[1] - a[1]).map(([src, count], i, arr) => (
                        <div key={src} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < arr.length - 1 ? '0.5px solid #f5f5f5' : 'none' }}>
                          <span style={{ fontSize: 13, color: '#555' }}>{src}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
      </div>
    </div>
  )
}