'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const MARKUP = 1.5 * 1.05

const SOURCES = [
  'Referral', 'Google Call In', 'Google Website Form', 'Barrier Reef',
  'Facebook', 'Instagram', 'TikTok', 'YouTube', 'Vehicle Wrap', 'Other',
]

const STATUS_DOT: Record<string, string> = {
  draft:  '#E24B4A',
  sent:   '#EF9F27',
  viewed: '#378ADD',
  signed: '#639922',
}

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  new:         { bg: '#f5f5f5',  text: '#888' },
  appointment: { bg: '#FAEEDA',  text: '#633806' },
  proposal:    { bg: '#E6F1FB',  text: '#0C447C' },
  pending:     { bg: '#EDE9FE',  text: '#4C1D95' },
}

const RESULT_BADGE: Record<string, { bg: string; text: string }> = {
  sold:       { bg: '#EAF3DE', text: '#27500A' },
  price_high: { bg: '#FCEBEB', text: '#7F1D1D' },
  competitor: { bg: '#FEF3C7', text: '#78350F' },
  future:     { bg: '#E0F2FE', text: '#0C4A6E' },
  finance:    { bg: '#F3E8FF', text: '#581C87' },
}

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

function formatTimestamp(ts: string) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

export default function LeadModal({
  selectedLead, setSelectedLead, notes, noteText, setNoteText,
  addNote, proposals, onProposalDeleted, onLeadUpdated, serviceOptions,
}: any) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editService, setEditService] = useState('')
  const [editSource, setEditSource] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editResult, setEditResult] = useState('')

  useEffect(() => {
    if (selectedLead) {
      setEditName(selectedLead.name || '')
      setEditEmail(selectedLead.email || '')
      setEditPhone(selectedLead.phone || '')
      setEditAddress(selectedLead.address || '')
      setEditService(selectedLead.service || '')
      setEditSource(selectedLead.source || '')
      setEditStatus(selectedLead.status || 'new')
      setEditResult(selectedLead.result || '')
      setEditing(false)
    }
  }, [selectedLead])

  if (!selectedLead) return null

  async function saveLead() {
    const { error } = await supabase.from('leads').update({
      name: editName, email: editEmail, phone: editPhone, address: editAddress,
      service: editService, source: editSource, status: editStatus, result: editResult,
    }).eq('id', selectedLead.id)
    if (error) { console.error(error); return }
    setEditing(false)
    if (onLeadUpdated) onLeadUpdated()
  }

  async function createProposal() {
    const { data, error } = await supabase.from('proposals').insert([{ lead_id: selectedLead.id, title: 'New Proposal' }]).select().single()
    if (error) { console.error(error); return }
    window.location.href = `/proposals/new?proposalId=${data.id}`
  }

  async function deleteProposal(proposalId: string, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    const confirmed = window.confirm('Delete this proposal and all its data? This cannot be undone.')
    if (!confirmed) return
    await supabase.from('proposal_item_rows').delete().eq('proposal_id', proposalId)
    await supabase.from('proposal_items').delete().eq('proposal_id', proposalId)
    await supabase.from('proposal_sections').delete().eq('proposal_id', proposalId)
    await supabase.from('proposals').delete().eq('id', proposalId)
    if (onProposalDeleted) onProposalDeleted()
  }

  const sortedNotes = [...(notes || [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const initials = getInitials(selectedLead.name || '?')
  const statusBadge = STATUS_BADGE[selectedLead.status] || STATUS_BADGE.new
  const resultBadge = selectedLead.result ? RESULT_BADGE[selectedLead.result] : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setSelectedLead(null)}>
      <div
        style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 460, margin: '0 16px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed header */}
        <div style={{ padding: '24px 24px 0', flexShrink: 0 }}>

          {/* Avatar + name + buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#E6F1FB', color: '#0C447C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                {initials}
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#1a1a2e' }}>{selectedLead.name}</p>
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, background: statusBadge.bg, color: statusBadge.text, padding: '2px 8px', borderRadius: 20, fontWeight: 500, textTransform: 'capitalize' }}>
                    {selectedLead.status || 'new'}
                  </span>
                  {resultBadge && (
                    <span style={{ fontSize: 11, background: resultBadge.bg, color: resultBadge.text, padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>
                      {selectedLead.result?.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setEditing(!editing)} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '0.5px solid #e0e0e0', background: 'transparent', color: '#666', cursor: 'pointer' }}>
                {editing ? 'Cancel' : 'Edit'}
              </button>
              <button onClick={() => setSelectedLead(null)} style={{ color: '#ccc', background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>✕</button>
            </div>
          </div>

          {/* Edit form or contact tiles */}
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Name', value: editName, setter: setEditName, type: 'text' },
                { label: 'Email', value: editEmail, setter: setEditEmail, type: 'email' },
                { label: 'Phone', value: editPhone, setter: setEditPhone, type: 'tel' },
                { label: 'Address', value: editAddress, setter: setEditAddress, type: 'text' },
              ].map(({ label, value, setter, type }) => (
                <div key={label}>
                  <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>{label}</label>
                  <input type={type} value={value} onChange={(e) => setter(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 10, border: '0.5px solid #e5e5e5', background: '#fafafa', fontSize: 14, outline: 'none' }} />
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Service</label>
                  <select value={editService} onChange={(e) => setEditService(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '0.5px solid #e5e5e5', background: '#fafafa', fontSize: 13, outline: 'none' }}>
                    <option value="">— Select —</option>
                    {(serviceOptions || []).map((s: string) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Source</label>
                  <select value={editSource} onChange={(e) => setEditSource(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '0.5px solid #e5e5e5', background: '#fafafa', fontSize: 13, outline: 'none' }}>
                    <option value="">— Select —</option>
                    {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Status</label>
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '0.5px solid #e5e5e5', background: '#fafafa', fontSize: 13, outline: 'none' }}>
                    <option value="new">New</option>
                    <option value="appointment">Appointment</option>
                    <option value="proposal">Proposal</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Result</label>
                  <select value={editResult} onChange={(e) => setEditResult(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '0.5px solid #e5e5e5', background: '#fafafa', fontSize: 13, outline: 'none' }}>
                    <option value="">—</option>
                    <option value="sold">Sold</option>
                    <option value="price_high">Price Too High</option>
                    <option value="competitor">Went With Competitor</option>
                    <option value="future">Future Date</option>
                    <option value="finance">Financing Turned Down</option>
                  </select>
                </div>
              </div>
              <button onClick={saveLead} style={{ width: '100%', padding: '10px', borderRadius: 12, background: '#185FA5', color: 'white', fontWeight: 500, fontSize: 14, border: 'none', cursor: 'pointer', marginTop: 4 }}>
                Save Changes
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
              <div style={{ background: '#f9f9f9', borderRadius: 12, padding: '10px 12px' }}>
                <p style={{ fontSize: 11, color: '#aaa', margin: '0 0 2px' }}>Email</p>
                <p style={{ fontSize: 13, color: '#333', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedLead.email || '—'}</p>
              </div>
              <div style={{ background: '#f9f9f9', borderRadius: 12, padding: '10px 12px' }}>
                <p style={{ fontSize: 11, color: '#aaa', margin: '0 0 2px' }}>Phone</p>
                <p style={{ fontSize: 13, color: '#333', margin: 0 }}>{selectedLead.phone || '—'}</p>
              </div>
              <div style={{ background: '#f9f9f9', borderRadius: 12, padding: '10px 12px', gridColumn: '1 / -1' }}>
                <p style={{ fontSize: 11, color: '#aaa', margin: '0 0 2px' }}>Address</p>
                <p style={{ fontSize: 13, color: '#333', margin: 0 }}>{selectedLead.address || '—'}</p>
              </div>
            </div>
          )}

          {/* Create Proposal */}
          <button onClick={createProposal} style={{ width: '100%', padding: '10px', borderRadius: 12, background: '#185FA5', color: 'white', fontWeight: 500, fontSize: 14, border: 'none', cursor: 'pointer', marginBottom: 20 }}>
            + Create Proposal
          </button>
        </div>

        {/* Scrollable section */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 24px 24px' }}>

          {/* Proposals */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>Proposals</p>
            {(!proposals || proposals.length === 0) && <p style={{ fontSize: 13, color: '#bbb' }}>No proposals yet.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {proposals?.map((p: any) => {
                const status = p.status || 'draft'
                const dotColor = STATUS_DOT[status] || STATUS_DOT.draft
                const markedUpTotal = Number(p.total_price || 0) * MARKUP
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <a href={`/proposals/new?proposalId=${p.id}`}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, background: '#f9f9f9', borderRadius: 12, padding: '11px 14px', textDecoration: 'none' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title || 'Untitled Proposal'}</p>
                        <p style={{ fontSize: 12, color: '#aaa', margin: '2px 0 0', textTransform: 'capitalize' }}>
                          {status} &bull; {markedUpTotal > 0 ? `$${markedUpTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                        </p>
                      </div>
                    </a>
                    <button onClick={(e) => deleteProposal(p.id, e)} style={{ fontSize: 12, color: '#f09595', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', flexShrink: 0 }}>
                      Delete
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '0.5px solid #f0f0f0', marginBottom: 20 }} />

          {/* Notes */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 500, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>Notes</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input placeholder="Add a note…" value={noteText} onChange={(e) => setNoteText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNote()}
                style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '0.5px solid #e5e5e5', background: '#f9f9f9', fontSize: 14, outline: 'none' }} />
              <button onClick={addNote} style={{ padding: '9px 16px', borderRadius: 10, background: '#185FA5', color: 'white', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                Add
              </button>
            </div>
            {sortedNotes.length === 0 ? (
              <p style={{ fontSize: 13, color: '#bbb' }}>No notes yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sortedNotes.map((note: any) => (
                  <div key={note.id} style={{ background: '#f9f9f9', borderRadius: 12, padding: '12px 14px' }}>
                    <p style={{ fontSize: 14, color: '#333', margin: 0, lineHeight: 1.5 }}>{note.note}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                      <p style={{ fontSize: 12, color: '#0C447C', fontWeight: 500, margin: 0 }}>{note.created_by}</p>
                      <span style={{ color: '#ddd', fontSize: 12 }}>&bull;</span>
                      <p style={{ fontSize: 12, color: '#aaa', margin: 0 }}>{formatTimestamp(note.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}