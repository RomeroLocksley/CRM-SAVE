'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import LeadModal from '../components/LeadModal'
import NavSidebar from '../components/NavSidebar'

const SOURCES = [
  'Referral', 'Google Call In', 'Google Website Form', 'Barrier Reef',
  'Facebook', 'Instagram', 'TikTok', 'YouTube', 'Vehicle Wrap', 'Other',
]

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  new:         { bg: '#f5f5f5',  text: '#888',    label: 'New' },
  appointment: { bg: '#FAEEDA',  text: '#633806', label: 'Appointment' },
  proposal:    { bg: '#E6F1FB',  text: '#0C447C', label: 'Proposal' },
  pending:     { bg: '#EDE9FE',  text: '#4C1D95', label: 'Pending' },
}

const RESULT_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  sold:       { bg: '#EAF3DE',  text: '#27500A', label: 'Sold' },
  price_high: { bg: '#FCEBEB',  text: '#7F1D1D', label: 'Price High' },
  competitor: { bg: '#FEF3C7',  text: '#78350F', label: 'Competitor' },
  future:     { bg: '#E0F2FE',  text: '#0C4A6E', label: 'Future Date' },
  finance:    { bg: '#F3E8FF',  text: '#581C87', label: 'Financing' },
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [selectedLead, setSelectedLead] = useState<any | null>(null)
  const [notes, setNotes] = useState<any[]>([])
  const [noteText, setNoteText] = useState('')
  const [search, setSearch] = useState('')
  const [proposals, setProposals] = useState<any[]>([])
  const [serviceOptions, setServiceOptions] = useState<string[]>([])
  const [showAddLead, setShowAddLead] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [service, setService] = useState('')
  const [source, setSource] = useState('')
  const [address, setAddress] = useState('')

  async function getLeads() {
    const { data } = await supabase.from('leads').select('*')
    setLeads((data || []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
  }

  async function getServiceOptions() {
    const { data, error } = await supabase.from('templates').select('name').order('created_at', { ascending: true })
    if (error) { console.error(error); return }
    setServiceOptions((data || []).map((t: any) => t.name))
  }

  async function getNotes(leadId: string) {
    const { data } = await supabase.from('lead_notes').select('*').eq('lead_id', leadId).order('created_at', { ascending: false })
    setNotes(data || [])
  }

  async function getProposals(leadId: string) {
    const { data, error } = await supabase.from('proposals').select('*').eq('lead_id', leadId).order('created_at', { ascending: false })
    if (error) { console.error(error); return }
    setProposals(data || [])
  }

  async function addLead(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await supabase.from('leads').insert([{ name, email, phone, service, source, address, status: 'new' }])
    setName(''); setEmail(''); setPhone(''); setService(''); setSource(''); setAddress('')
    setShowAddLead(false)
    getLeads()
  }

  async function deleteLead(leadId: string, e: React.MouseEvent) {
    e.stopPropagation()
    const confirmed = window.confirm('Delete this lead and all its notes and proposals? This cannot be undone.')
    if (!confirmed) return
    const { data: leadProposals } = await supabase.from('proposals').select('id').eq('lead_id', leadId)
    const proposalIds = (leadProposals || []).map((p: any) => p.id)
    if (proposalIds.length > 0) {
      await supabase.from('proposal_item_rows').delete().in('proposal_id', proposalIds)
      await supabase.from('proposal_items').delete().in('proposal_id', proposalIds)
      await supabase.from('proposal_sections').delete().in('proposal_id', proposalIds)
      await supabase.from('proposals').delete().in('id', proposalIds)
    }
    await supabase.from('lead_notes').delete().eq('lead_id', leadId)
    await supabase.from('leads').delete().eq('id', leadId)
    if (selectedLead?.id === leadId) setSelectedLead(null)
    getLeads()
  }

  async function addNote() {
    if (!noteText || !selectedLead) return
    await supabase.from('lead_notes').insert([{ lead_id: selectedLead.id, note: noteText, created_by: 'Henrry' }])
    setNoteText('')
    getNotes(selectedLead.id)
  }

  async function updateStatus(id: string, newStatus: string) {
    await supabase.from('leads').update({ status: newStatus }).eq('id', id)
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status: newStatus } : l))
  }

  async function updateResult(id: string, newResult: string) {
    await supabase.from('leads').update({ result: newResult }).eq('id', id)
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, result: newResult } : l))
  }

  useEffect(() => { getLeads(); getServiceOptions() }, [])

  const filteredLeads = leads.filter((lead) =>
    (lead.name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f4f7fb' }}>

      <NavSidebar />

      {/* ── MAIN ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <div className="flex-shrink-0 flex items-center justify-between px-8 py-4" style={{ background: 'white', borderBottom: '0.5px solid #eee' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: '#1a1a2e' }}>Leads</h1>
          <button
            onClick={() => setShowAddLead(true)}
            style={{ background: '#185FA5', color: 'white', border: 'none', padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          >
            + Add Lead
          </button>
        </div>

        {/* Search */}
        <div className="flex-shrink-0 px-8 py-4">
          <input
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '9px 14px', borderRadius: 10, border: '0.5px solid #e0e0e0', background: 'white', fontSize: 14, outline: 'none' }}
          />
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          <div style={{ background: 'white', borderRadius: 14, border: '0.5px solid #e8e8e8', overflow: 'hidden' }}>

            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 130px 140px 160px 60px', padding: '9px 16px', borderBottom: '0.5px solid #f0f0f0', background: '#fafafa' }}>
              {['Name', 'Address', 'Source', 'Status', 'Result', ''].map((h) => (
                <span key={h} style={{ fontSize: 11, fontWeight: 500, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
              ))}
            </div>

            {filteredLeads.length === 0 && (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#bbb', fontSize: 14 }}>
                No leads yet — click + Add Lead to get started.
              </div>
            )}

            {filteredLeads.map((lead, i) => (
              <div
                key={lead.id}
                style={{ display: 'grid', gridTemplateColumns: '180px 1fr 130px 140px 160px 60px', alignItems: 'center', padding: '12px 16px', borderBottom: i < filteredLeads.length - 1 ? '0.5px solid #f5f5f5' : 'none', cursor: 'pointer', transition: 'background 0.1s', gap: 8 }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#fafafa')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'white')}
                onClick={() => { setSelectedLead(lead); getNotes(lead.id); getProposals(lead.id) }}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name}</p>
                  <p style={{ fontSize: 12, color: '#aaa', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.service || '—'}</p>
                </div>

                <p style={{ fontSize: 13, color: '#555', margin: 0, lineHeight: 1.4 }}>{lead.address || '—'}</p>
                <p style={{ fontSize: 13, color: '#555', margin: 0 }}>{lead.source || '—'}</p>

                <div onClick={(e) => e.stopPropagation()}>
                  <select
                    value={lead.status || 'new'}
                    onChange={(e) => updateStatus(lead.id, e.target.value)}
                    style={{ fontSize: 12, fontWeight: 500, padding: '5px 10px', borderRadius: 20, border: 'none', outline: 'none', cursor: 'pointer', background: STATUS_BADGE[lead.status]?.bg || '#f5f5f5', color: STATUS_BADGE[lead.status]?.text || '#888', appearance: 'none', WebkitAppearance: 'none' }}
                  >
                    <option value="new">New</option>
                    <option value="appointment">Appointment</option>
                    <option value="proposal">Proposal</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                <div onClick={(e) => e.stopPropagation()}>
                  <select
                    value={lead.result || ''}
                    onChange={(e) => updateResult(lead.id, e.target.value)}
                    style={{ fontSize: 12, fontWeight: 500, padding: '5px 10px', borderRadius: 20, border: 'none', outline: 'none', cursor: 'pointer', background: lead.result ? (RESULT_BADGE[lead.result]?.bg || '#f5f5f5') : '#f5f5f5', color: lead.result ? (RESULT_BADGE[lead.result]?.text || '#888') : '#bbb', appearance: 'none', WebkitAppearance: 'none' }}
                  >
                    <option value="">—</option>
                    <option value="sold">Sold</option>
                    <option value="price_high">Price Too High</option>
                    <option value="competitor">Competitor</option>
                    <option value="future">Future Date</option>
                    <option value="finance">Financing</option>
                  </select>
                </div>

                <button onClick={(e) => deleteLead(lead.id, e)} style={{ fontSize: 12, color: '#f09595', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ADD LEAD MODAL ────────────────────────────────────────────── */}
      {showAddLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowAddLead(false)}>
          <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 440, margin: '0 16px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '24px 24px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#1a1a2e' }}>New Lead</p>
                <button onClick={() => setShowAddLead(false)} style={{ color: '#ccc', background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>
              </div>
            </div>
            <form onSubmit={addLead} style={{ padding: '0 24px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                {[
                  { placeholder: 'Name *', value: name, setter: setName, type: 'text' },
                  { placeholder: 'Email', value: email, setter: setEmail, type: 'email' },
                  { placeholder: 'Phone', value: phone, setter: setPhone, type: 'tel' },
                  { placeholder: 'Address', value: address, setter: setAddress, type: 'text' },
                ].map(({ placeholder, value, setter, type }) => (
                  <input key={placeholder} type={type} placeholder={placeholder} value={value} onChange={(e) => setter(e.target.value)}
                    style={{ padding: '10px 12px', borderRadius: 12, border: '0.5px solid #e5e5e5', background: '#fafafa', fontSize: 14, outline: 'none' }} />
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <select value={service} onChange={(e) => setService(e.target.value)} style={{ padding: '10px 12px', borderRadius: 12, border: '0.5px solid #e5e5e5', background: '#fafafa', fontSize: 14, outline: 'none', color: service ? '#1a1a2e' : '#aaa' }}>
                  <option value="">— Service —</option>
                  {serviceOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={source} onChange={(e) => setSource(e.target.value)} style={{ padding: '10px 12px', borderRadius: 12, border: '0.5px solid #e5e5e5', background: '#fafafa', fontSize: 14, outline: 'none', color: source ? '#1a1a2e' : '#aaa' }}>
                  <option value="">— Source —</option>
                  {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <button type="submit" style={{ width: '100%', padding: '11px', borderRadius: 12, background: '#185FA5', color: 'white', fontWeight: 500, fontSize: 14, border: 'none', cursor: 'pointer' }}>
                Add Lead
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── LEAD DETAIL MODAL ─────────────────────────────────────────── */}
      <LeadModal
        selectedLead={selectedLead}
        setSelectedLead={setSelectedLead}
        notes={notes}
        noteText={noteText}
        setNoteText={setNoteText}
        addNote={addNote}
        proposals={proposals}
        onProposalDeleted={() => selectedLead && getProposals(selectedLead.id)}
        onLeadUpdated={getLeads}
        serviceOptions={serviceOptions}
      />

    </div>
  )
}