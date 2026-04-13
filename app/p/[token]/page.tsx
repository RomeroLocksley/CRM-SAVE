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
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

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
      if (structured.length > 0) setExpandedSection(structured[0].id)
      setLoading(false)
    }
    if (token) load()
  }, [token])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #e8e0d4', borderTop: '2px solid #8B6F47', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#aaa', fontSize: 14, fontFamily: 'Georgia, serif' }}>Loading your proposal…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#555', fontSize: 16, fontFamily: 'Georgia, serif' }}>This proposal link is no longer available.</p>
        <p style={{ color: '#aaa', fontSize: 13, marginTop: 8, fontFamily: 'sans-serif' }}>Please contact K&D Contracting for assistance — (540) 940-0002</p>
      </div>
    </div>
  )

  const grandTotal = sections.reduce((sT, s) =>
    sT + s.items.reduce((iT: number, i: any) =>
      iT + i.rows.reduce((rT: number, r: any) =>
        rT + Number(r.quantity || 0) * Number(r.unit_cost || 0), 0), 0), 0) * MARKUP

  const WHY_US = [
    { icon: '◆', title: 'All Trades In-House', desc: 'From excavation to electrical — our own crews handle every phase. No subcontractors, no handoffs.' },
    { icon: '◆', title: 'Locally Rooted', desc: 'Born and raised in Fredericksburg. We build in the community we call home.' },
    { icon: '◆', title: 'Fully Licensed & Insured', desc: 'Every permit, every inspection, fully covered. You have complete peace of mind.' },
    { icon: '◆', title: 'Transparent Pricing', desc: 'The number you see is the number you pay. No surprises, ever.' },
  ]

  return (
    <div style={{ background: 'white', minHeight: '100vh', fontFamily: 'Georgia, serif', color: '#1a1a1a' }}>

      {/* ── HEADER BAR ─────────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid #f0ece6', padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="K&D" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'contain' }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, margin: 0, letterSpacing: '0.01em', fontFamily: 'sans-serif' }}>K&D Contracting</p>
            <p style={{ fontSize: 11, color: '#8B6F47', margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>Fredericksburg, Virginia</p>
          </div>
        </div>
        <a href="tel:5409400002" style={{ fontSize: 13, color: '#8B6F47', textDecoration: 'none', fontFamily: 'sans-serif', letterSpacing: '0.02em' }}>(540) 940-0002</a>
      </div>

      {/* ── HERO ───────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '72px 40px 0' }}>

        {/* Eyebrow */}
        <p style={{ fontSize: 11, color: '#8B6F47', letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 20px', fontFamily: 'sans-serif' }}>
          Custom Proposal · {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </p>

        {/* Title */}
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 400, color: '#0f1a2b', margin: '0 0 20px', lineHeight: 1.1, letterSpacing: '-0.01em' }}>
          {proposal.title}
        </h1>

        {/* Subtitle */}
        <p style={{ fontSize: 18, color: '#666', margin: '0 0 48px', lineHeight: 1.6, fontFamily: 'sans-serif' }}>
          Prepared exclusively for <span style={{ color: '#0f1a2b', fontWeight: 600 }}>{lead?.name}</span>
          {lead?.address && <><br /><span style={{ fontSize: 14, color: '#999' }}>{lead.address}</span></>}
        </p>

        {/* Divider with gold accent */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 72 }}>
          <div style={{ height: 1, background: '#f0ece6', flex: 1 }} />
          <div style={{ width: 6, height: 6, background: '#8B6F47', transform: 'rotate(45deg)', flexShrink: 0 }} />
          <div style={{ height: 1, background: '#f0ece6', flex: 1 }} />
        </div>

        {/* Team photo placeholder */}
        <div style={{ background: '#f9f7f5', borderRadius: 4, overflow: 'hidden', aspectRatio: '21/8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, marginBottom: 80, border: '1px solid #f0ece6' }}>
          <p style={{ fontSize: 13, color: '#bbb', fontFamily: 'sans-serif', margin: 0, letterSpacing: '0.05em' }}>TEAM PHOTO</p>
          <p style={{ fontSize: 11, color: '#ccc', fontFamily: 'sans-serif', margin: 0 }}>Replace /public/team.jpg and update img src below</p>
        </div>

      </div>

      {/* ── WHY CHOOSE US ──────────────────────────────────────────── */}
      <div style={{ background: '#f9f7f5', padding: '72px 40px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px 80px', alignItems: 'start' }}>
            <div>
              <p style={{ fontSize: 11, color: '#8B6F47', letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 16px', fontFamily: 'sans-serif' }}>The K&D Difference</p>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 400, color: '#0f1a2b', margin: '0 0 20px', lineHeight: 1.2 }}>
                Built by neighbors,<br />for neighbors.
              </h2>
              <p style={{ fontSize: 15, color: '#666', lineHeight: 1.8, margin: 0, fontFamily: 'sans-serif' }}>
                K&D Contracting is a locally owned pool and outdoor living company based in Fredericksburg, Virginia. We don't just build pools — we build lasting relationships with the families we serve.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {WHY_US.map((item) => (
                <div key={item.title} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <span style={{ color: '#8B6F47', fontSize: 8, marginTop: 7, flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#0f1a2b', margin: '0 0 4px', fontFamily: 'sans-serif' }}>{item.title}</p>
                    <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6, margin: 0, fontFamily: 'sans-serif' }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── PROPOSAL SECTIONS ──────────────────────────────────────── */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '72px 40px' }}>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <p style={{ fontSize: 11, color: '#8B6F47', letterSpacing: '0.18em', textTransform: 'uppercase', margin: 0, fontFamily: 'sans-serif' }}>Your Proposal</p>
          <p style={{ fontSize: 11, color: '#bbb', fontFamily: 'sans-serif', margin: 0 }}>Click any section to expand</p>
        </div>
        <h2 style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 400, color: '#0f1a2b', margin: '0 0 40px', lineHeight: 1.2 }}>
          {sections.length} section{sections.length !== 1 ? 's' : ''} included in this project
        </h2>

        {/* Accordion sections */}
        <div style={{ border: '1px solid #f0ece6', borderRadius: 4, overflow: 'hidden' }}>
          {sections.map((section, idx) => {
            const sectionTotal = section.items.reduce((sum: number, item: any) =>
              sum + item.rows.reduce((rSum: number, row: any) =>
                rSum + Number(row.quantity || 0) * Number(row.unit_cost || 0), 0), 0) * MARKUP
            const isOpen = expandedSection === section.id

            return (
              <div key={section.id} style={{ borderBottom: idx < sections.length - 1 ? '1px solid #f0ece6' : 'none' }}>
                {/* Section header — always visible */}
                <button
                  onClick={() => setExpandedSection(isOpen ? null : section.id)}
                  style={{ width: '100%', background: isOpen ? '#f9f7f5' : 'white', border: 'none', cursor: 'pointer', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left', transition: 'background 0.15s' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: isOpen ? '#8B6F47' : '#ccc', fontFamily: 'sans-serif', minWidth: 24 }}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 600, color: '#0f1a2b', margin: 0, fontFamily: 'sans-serif' }}>{section.name}</p>
                      <p style={{ fontSize: 12, color: '#aaa', margin: '2px 0 0', fontFamily: 'sans-serif' }}>{section.items.length} item{section.items.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#0f1a2b', margin: 0, fontFamily: 'sans-serif' }}>{fmtMoney(sectionTotal)}</p>
                    <span style={{ fontSize: 18, color: '#ccc', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'block' }}>⌄</span>
                  </div>
                </button>

                {/* Expanded items */}
                {isOpen && (
                  <div style={{ background: '#fdfcfb', borderTop: '1px solid #f0ece6', padding: '8px 0 16px' }}>
                    {section.items.map((item: any, iIdx: number) => (
                      <div key={item.id} style={{ padding: '12px 28px 12px 68px', borderBottom: iIdx < section.items.length - 1 ? '1px solid #f7f5f2' : 'none', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: '#333', margin: '0 0 2px', fontFamily: 'sans-serif' }}>{item.name}</p>
                          {item.description && <p style={{ fontSize: 13, color: '#999', margin: 0, lineHeight: 1.5, fontFamily: 'sans-serif' }}>{item.description}</p>}
                        </div>
                        {(item.display_quantity || item.display_unit) && (
                          <p style={{ fontSize: 12, color: '#bbb', margin: 0, flexShrink: 0, fontFamily: 'sans-serif' }}>
                            {item.display_quantity} {item.display_unit}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Total */}
        <div style={{ marginTop: 2, background: '#0f1a2b', padding: '24px 28px', borderRadius: '0 0 4px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'sans-serif', margin: '0 0 2px' }}>Total Investment</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'sans-serif', margin: 0 }}>All materials, labor & permits</p>
          </div>
          <p style={{ fontSize: 32, fontWeight: 400, color: '#C9A96E', margin: 0, fontFamily: 'Georgia, serif', letterSpacing: '-0.01em' }}>{fmtMoney(grandTotal)}</p>
        </div>

      </div>

      {/* ── FOOTER / CTA ───────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid #f0ece6', padding: '60px 40px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <p style={{ fontSize: 11, color: '#8B6F47', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'sans-serif', margin: '0 0 16px' }}>Questions?</p>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 400, color: '#0f1a2b', margin: '0 0 16px', lineHeight: 1.3 }}>
            We're here to help
          </h2>
          <p style={{ fontSize: 15, color: '#888', lineHeight: 1.7, fontFamily: 'sans-serif', margin: '0 0 36px' }}>
            This proposal was crafted specifically for you. Reach out any time with questions or to move forward.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="tel:5409400002" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#0f1a2b', color: 'white', textDecoration: 'none', padding: '13px 24px', borderRadius: 3, fontSize: 14, fontFamily: 'sans-serif', fontWeight: 500, letterSpacing: '0.02em' }}>
              Call Us
            </a>
            <a href="mailto:admin@romerolocksley.com" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'white', color: '#0f1a2b', textDecoration: 'none', padding: '13px 24px', borderRadius: 3, fontSize: 14, fontFamily: 'sans-serif', fontWeight: 500, border: '1px solid #e8e0d4', letterSpacing: '0.02em' }}>
              Send an Email
            </a>
          </div>
          <div style={{ marginTop: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="K&D" style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'contain' }} />
            <p style={{ fontSize: 13, color: '#bbb', fontFamily: 'sans-serif', margin: 0 }}>K&D Contracting LLC · 4611 Carr Dr, Fredericksburg VA 22408</p>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

    </div>
  )
}