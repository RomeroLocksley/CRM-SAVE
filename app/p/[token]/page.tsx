'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const MARKUP = 1.5 * 1.05

function fmtMoney(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function CustomerProposalPage() {
  const { token } = useParams()
  const [proposal, setProposal] = useState<any>(null)
  const [lead, setLead] = useState<any>(null)
  const [sections, setSections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: prop } = await supabase
        .from('proposals')
        .select('*, leads(name, phone, email, address, service)')
        .eq('public_token', token)
        .single()

      if (!prop) { setNotFound(true); setLoading(false); return }

      setProposal(prop)
      setLead(prop.leads)

      const { data: sectionsData } = await supabase
        .from('proposal_sections').select('*').eq('proposal_id', prop.id).order('created_at', { ascending: true })
      const { data: itemsData } = await supabase
        .from('proposal_items').select('*').eq('proposal_id', prop.id)
      const { data: rowsData } = await supabase
        .from('proposal_item_rows').select('*').eq('proposal_id', prop.id)

      const structured = (sectionsData || []).map((section: any) => ({
        ...section,
        items: (itemsData || [])
          .filter((item: any) => item.section_id === section.id)
          .map((item: any) => ({
            ...item,
            rows: (rowsData || []).filter((row: any) => row.item_id === item.id),
          })),
      }))

      setSections(structured)
      setLoading(false)
    }
    if (token) load()
  }, [token])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #C9A96E', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Loading your proposal…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16 }}>This proposal link is no longer available.</p>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, marginTop: 8 }}>Please contact K&D Contracting for assistance.</p>
      </div>
    </div>
  )

  const grandTotal = sections.reduce((sT, s) =>
    sT + s.items.reduce((iT: number, i: any) =>
      iT + i.rows.reduce((rT: number, r: any) =>
        rT + Number(r.quantity || 0) * Number(r.unit_cost || 0), 0), 0), 0) * MARKUP

  const WHY_US = [
    { icon: '🏠', title: 'Local & Family Owned', desc: 'Based right here in Fredericksburg — we live and work in the same community as you.' },
    { icon: '🔧', title: 'We Handle Every Trade', desc: 'From excavation to electrical, our in-house crews do it all. No strangers on your property.' },
    { icon: '🏆', title: 'Premium Quality', desc: 'We use only top-tier materials and proven techniques to build pools that last a lifetime.' },
    { icon: '📋', title: 'Fully Licensed & Insured', desc: 'Complete peace of mind — we handle all permits, inspections, and carry full insurance coverage.' },
    { icon: '🤝', title: 'Transparent Pricing', desc: 'No surprises. The price you see is the price you pay. We believe in honest, upfront communication.' },
    { icon: '⭐', title: 'Customer Focused', desc: 'Your vision is our mission. We stay in close communication from contract to completion.' },
  ]

  return (
    <div style={{ background: '#faf8f5', minHeight: '100vh', fontFamily: "'Georgia', serif" }}>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', minHeight: '100vh', background: 'linear-gradient(135deg, #0C2340 0%, #1a3a5c 50%, #0C447C 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '80px 24px', overflow: 'hidden' }}>

        {/* Background texture */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(201,169,110,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(201,169,110,0.05) 0%, transparent 50%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 60, zIndex: 1 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="K&D Contracting" style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'contain' }} />
          <div>
            <p style={{ fontSize: 22, fontWeight: 700, color: 'white', margin: 0, letterSpacing: '0.02em' }}>K&D Contracting</p>
            <p style={{ fontSize: 13, color: '#C9A96E', margin: '2px 0 0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Fredericksburg, Virginia</p>
          </div>
        </div>

        {/* Hero text */}
        <div style={{ textAlign: 'center', maxWidth: 700, zIndex: 1 }}>
          <p style={{ fontSize: 13, color: '#C9A96E', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 16px', fontFamily: 'sans-serif' }}>Your Custom Proposal</p>
          <h1 style={{ fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 700, color: 'white', margin: '0 0 16px', lineHeight: 1.15 }}>
            {proposal.title}
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', margin: '0 0 8px' }}>Prepared exclusively for</p>
          <p style={{ fontSize: 24, color: '#C9A96E', fontWeight: 600, margin: 0 }}>{lead?.name}</p>
        </div>

        {/* Team photo placeholder */}
        <div style={{ marginTop: 60, width: '100%', maxWidth: 800, zIndex: 1 }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,169,110,0.3)', borderRadius: 20, overflow: 'hidden', aspectRatio: '16/7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontSize: 40 }}>📸</span>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, fontFamily: 'sans-serif', margin: 0 }}>Team photo goes here</p>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, fontFamily: 'sans-serif', margin: 0 }}>Replace with /public/team.jpg</p>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 1 }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'sans-serif', margin: 0 }}>Scroll to explore</p>
          <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, rgba(201,169,110,0.5), transparent)' }} />
        </div>
      </div>

      {/* ── WHY CHOOSE US ────────────────────────────────────────────── */}
      <div style={{ background: '#faf8f5', padding: '80px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 12, color: '#C9A96E', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'sans-serif', margin: '0 0 12px' }}>The K&D Difference</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, color: '#1a2535', margin: '0 0 16px' }}>Why Homeowners Choose Us</h2>
            <p style={{ fontSize: 16, color: '#666', maxWidth: 560, margin: '0 auto', lineHeight: 1.7, fontFamily: 'sans-serif' }}>
              We're not just pool builders — we're your neighbors. When you work with K&D, you get a dedicated local team that treats your home like our own.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
            {WHY_US.map((item) => (
              <div key={item.title} style={{ background: 'white', borderRadius: 16, padding: '28px 24px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 20px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{item.icon}</div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#1a2535', margin: '0 0 8px' }}>{item.title}</p>
                <p style={{ fontSize: 14, color: '#777', lineHeight: 1.6, margin: 0, fontFamily: 'sans-serif' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── DIVIDER ──────────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, #0C2340, #1a3a5c)', padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <p style={{ fontSize: 13, color: '#C9A96E', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'sans-serif', margin: '0 0 16px' }}>Your Investment</p>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 700, color: 'white', margin: '0 0 16px', lineHeight: 1.3 }}>
            A custom outdoor space, built to last a lifetime
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: 0, fontFamily: 'sans-serif' }}>
            Every detail of your project is outlined below. We've carefully planned each phase to deliver an exceptional result.
          </p>
        </div>
      </div>

      {/* ── PROPOSAL SECTIONS ────────────────────────────────────────── */}
      <div style={{ background: '#faf8f5', padding: '80px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {sections.map((section, idx) => {
              const sectionTotal = section.items.reduce((sum: number, item: any) =>
                sum + item.rows.reduce((rSum: number, row: any) =>
                  rSum + Number(row.quantity || 0) * Number(row.unit_cost || 0), 0), 0) * MARKUP

              return (
                <div key={section.id} style={{ background: 'white', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
                  {/* Section header */}
                  <div style={{ background: 'linear-gradient(135deg, #0C2340, #1a3a5c)', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(201,169,110,0.2)', border: '1px solid rgba(201,169,110,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#C9A96E', fontFamily: 'sans-serif' }}>{idx + 1}</span>
                      </div>
                      <h3 style={{ fontSize: 18, fontWeight: 700, color: 'white', margin: 0 }}>{section.name}</h3>
                    </div>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#C9A96E', margin: 0, fontFamily: 'sans-serif' }}>{fmtMoney(sectionTotal)}</p>
                  </div>

                  {/* Items */}
                  <div style={{ padding: '8px 0' }}>
                    {section.items.map((item: any, iIdx: number) => (
                      <div key={item.id} style={{ padding: '16px 28px', borderBottom: iIdx < section.items.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 15, fontWeight: 600, color: '#1a2535', margin: '0 0 4px' }}>{item.name}</p>
                          {item.description && <p style={{ fontSize: 13, color: '#888', margin: 0, lineHeight: 1.5, fontFamily: 'sans-serif' }}>{item.description}</p>}
                        </div>
                        {(item.display_quantity || item.display_unit) && (
                          <p style={{ fontSize: 13, color: '#aaa', margin: 0, flexShrink: 0, fontFamily: 'sans-serif' }}>
                            {item.display_quantity} {item.display_unit}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Grand total */}
          <div style={{ marginTop: 40, background: 'linear-gradient(135deg, #0C2340, #1a3a5c)', borderRadius: 20, padding: '32px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'sans-serif', margin: '0 0 4px' }}>Total Investment</p>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: 0, fontFamily: 'sans-serif' }}>All materials, labor, and permits included</p>
            </div>
            <p style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 700, color: '#C9A96E', margin: 0, fontFamily: 'sans-serif' }}>{fmtMoney(grandTotal)}</p>
          </div>
        </div>
      </div>

      {/* ── CONTACT / FOOTER ─────────────────────────────────────────── */}
      <div style={{ background: '#0C2340', padding: '60px 24px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#C9A96E', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'sans-serif', margin: '0 0 16px' }}>Ready to get started?</p>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, color: 'white', margin: '0 0 24px', lineHeight: 1.3 }}>
            We'd love to answer any questions
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, fontFamily: 'sans-serif', margin: '0 0 40px' }}>
            This proposal was prepared specifically for you. If you have any questions or would like to discuss any details, don't hesitate to reach out.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="tel:5409400002" style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '14px 24px', textDecoration: 'none', color: 'white', fontFamily: 'sans-serif', fontSize: 15, fontWeight: 500 }}>
              📞 (540) 940-0002
            </a>
            <a href="mailto:admin@romerolocksley.com" style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(201,169,110,0.15)', border: '1px solid rgba(201,169,110,0.3)', borderRadius: 12, padding: '14px 24px', textDecoration: 'none', color: '#C9A96E', fontFamily: 'sans-serif', fontSize: 15, fontWeight: 500 }}>
              ✉️ Send us an email
            </a>
          </div>
          <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.jpg" alt="K&D Contracting" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain' }} />
              <p style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: 0 }}>K&D Contracting LLC</p>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontFamily: 'sans-serif', margin: 0 }}>4611 Carr Dr, Fredericksburg VA 22408</p>
          </div>
        </div>
      </div>

    </div>
  )
}