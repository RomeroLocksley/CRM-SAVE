'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const MARKUP = 1.5 * 1.05

const SOURCES = [
  'Referral', 'Google Call In', 'Google Website Form', 'Barrier Reef',
  'Facebook', 'Instagram', 'TikTok', 'YouTube', 'Vehicle Wrap', 'Other',
]

const APPOINTMENT_TYPES = [
  'Initial Consultation On-Site',
  'Initial Consultation Virtual',
  'Follow-up On-Site',
  'Follow-up Virtual',
  'Office Visit',
]

const STATUS_DOT: Record<string, string> = {
  draft:  '#E24B4A',
  sent:   '#EF9F27',
  viewed: '#378ADD',
  signed: '#639922',
}

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  uncontacted:      { bg: '#f5f5f5',  text: '#888' },
  appointment_set:  { bg: '#FAEEDA',  text: '#633806' },
  proposal_sent:    { bg: '#E6F1FB',  text: '#0C447C' },
  needs_reschedule: { bg: '#F3E8FF',  text: '#581C87' },
}

const STATUS_LABELS: Record<string, string> = {
  uncontacted:      'Uncontacted',
  appointment_set:  'Appointment Set',
  proposal_sent:    'Proposal Sent',
  needs_reschedule: 'Needs Reschedule',
}

const RESULT_BADGE: Record<string, { bg: string; text: string }> = {
  working:          { bg: '#E6F1FB',  text: '#0C447C' },
  sold:             { bg: '#EAF3DE',  text: '#27500A' },
  competitor:       { bg: '#FEF3C7',  text: '#78350F' },
  not_interested:   { bg: '#FCEBEB',  text: '#7F1D1D' },
  future_date:      { bg: '#E0F2FE',  text: '#0C4A6E' },
  finance_turndown: { bg: '#F3E8FF',  text: '#581C87' },
}

const RESULT_LABELS: Record<string, string> = {
  working:          'Working',
  sold:             'Sold',
  competitor:       'Went With Competitor',
  not_interested:   'Not Interested',
  future_date:      'Future Date',
  finance_turndown: 'Finance Turndown',
}

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

function formatTimestamp(ts: string) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatAppt(ts: string) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function LeadModal({
  selectedLead, setSelectedLead, notes, noteText, setNoteText,
  addNote, proposals, onProposalDeleted, onLeadUpdated, serviceOptions,
}: any) {
  const [editing, setEditing] = useState(false)
  const [currentUser, setCurrentUser] = useState('Unknown')
  const [isAdmin, setIsAdmin] = useState(false)
  const [contactLog, setContactLog] = useState<any[]>([])
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editService, setEditService] = useState('')
  const [editSource, setEditSource] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editResult, setEditResult] = useState('')

  // Appointments
  const [appointments, setAppointments] = useState<any[]>([])
  const [showSchedule, setShowSchedule] = useState(false)
  const [apptType, setApptType] = useState('')
  const [apptDate, setApptDate] = useState('')
  const [apptTime, setApptTime] = useState('')
  const [apptNotes, setApptNotes] = useState('')
  const [savingAppt, setSavingAppt] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setCurrentUser(user.user_metadata?.full_name || user.email || 'Unknown')
        const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        setIsAdmin(data?.role === 'admin')
      }
    })
  }, [])

  useEffect(() => {
    if (selectedLead) {
      setEditName(selectedLead.name || '')
      setEditEmail(selectedLead.email || '')
      setEditPhone(selectedLead.phone || '')
      setEditAddress(selectedLead.address || '')
      setEditService(selectedLead.service || '')
      setEditSource(selectedLead.source || '')
      setEditStatus(selectedLead.status || 'uncontacted')
      setEditResult(selectedLead.result || '')
      setEditing(false)
      setShowSchedule(false)
      loadAppointments(selectedLead.id)
      loadContactLog(selectedLead.id)
    }
  }, [selectedLead])

  async function loadAppointments(leadId: string) {
    const { data } = await supabase.from('lead_appointments').select('*').eq('lead_id', leadId).order('appointment_date', { ascending: true })
    setAppointments(data || [])
  }

  async function loadContactLog(leadId: string) {
    const { data } = await supabase.from('lead_contact_log').select('*').eq('lead_id', leadId).order('created_at', { ascending: false })
    setContactLog(data || [])
  }

  async function logContact(type: string) {
    await supabase.from('lead_contact_log').insert([{
      lead_id: selectedLead.id,
      contact_type: type,
      contacted_by: currentUser,
    }])
    loadContactLog(selectedLead.id)
  }

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

  async function scheduleAppointment() {
    if (!apptType || !apptDate || !apptTime) return
    setSavingAppt(true)
    const dateTime = new Date(`${apptDate}T${apptTime}`).toISOString()
    await supabase.from('lead_appointments').insert([{
      lead_id: selectedLead.id,
      appointment_type: apptType,
      appointment_date: dateTime,
      notes: apptNotes || null,
      created_by: currentUser,
    }])
    // Auto-update lead status to appointment_set
    await supabase.from('leads').update({ status: 'appointment_set' }).eq('id', selectedLead.id)
    setApptType(''); setApptDate(''); setApptTime(''); setApptNotes('')
    setShowSchedule(false)
    setSavingAppt(false)
    loadAppointments(selectedLead.id)
    if (onLeadUpdated) onLeadUpdated()
  }

  async function markApptComplete(apptId: string) {
    await supabase.from('lead_appointments').update({ completed: true }).eq('id', apptId)
    loadAppointments(selectedLead.id)
  }

  async function rescheduleAppt(apptId: string) {
    await supabase.from('lead_appointments').update({ rescheduled: true }).eq('id', apptId)
    // Auto-update lead status to needs_reschedule
    await supabase.from('leads').update({ status: 'needs_reschedule' }).eq('id', selectedLead.id)
    loadAppointments(selectedLead.id)
    if (onLeadUpdated) onLeadUpdated()
  }

  async function deleteAppt(apptId: string) {
    const confirmed = window.confirm('Delete this appointment?')
    if (!confirmed) return
    await supabase.from('lead_appointments').delete().eq('id', apptId)
    loadAppointments(selectedLead.id)
  }

  const sortedNotes = [...(notes || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const initials = getInitials(selectedLead.name || '?')
  const statusBadge = STATUS_BADGE[selectedLead.status] || STATUS_BADGE.uncontacted
  const resultBadge = selectedLead.result ? RESULT_BADGE[selectedLead.result] : null

  const inputStyle = { width: '100%', boxSizing: 'border-box' as const, padding: '9px 12px', borderRadius: 10, border: '0.5px solid #e5e5e5', background: '#fafafa', fontSize: 13, outline: 'none' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setSelectedLead(null)}>
      <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 480, margin: '0 16px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}>

        {/* Fixed header */}
        <div style={{ padding: '24px 24px 0', flexShrink: 0 }}>

          {/* Avatar + name */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#E6F1FB', color: '#0C447C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                {initials}
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#1a1a2e' }}>{selectedLead.name}</p>
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, background: statusBadge.bg, color: statusBadge.text, padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>
                    {STATUS_LABELS[selectedLead.status] || selectedLead.status || 'Uncontacted'}
                  </span>
                  {resultBadge && (
                    <span style={{ fontSize: 11, background: resultBadge.bg, color: resultBadge.text, padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>
                      {RESULT_LABELS[selectedLead.result] || selectedLead.result}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setEditing(!editing)} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '0.5px solid #e0e0e0', background: 'transparent', color: '#666', cursor: 'pointer' }}>
                {editing ? 'Cancel' : 'Edit'}
              </button>
              <button onClick={() => setSelectedLead(null)} style={{ color: '#ccc', background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>✕</button>
            </div>
          </div>

          {/* Edit form or tiles */}
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Name', value: editName, setter: setEditName, type: 'text' },
                { label: 'Email', value: editEmail, setter: setEditEmail, type: 'email' },
                { label: 'Phone', value: editPhone, setter: setEditPhone, type: 'tel' },
                { label: 'Address', value: editAddress, setter: setEditAddress, type: 'text' },
              ].map(({ label, value, setter, type }) => (
                <div key={label}>
                  <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>{label}</label>
                  <input type={type} value={value} onChange={(e) => setter(e.target.value)} style={inputStyle} />
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Service</label>
                  <select value={editService} onChange={(e) => setEditService(e.target.value)} style={{ ...inputStyle, padding: '8px 12px' }}>
                    <option value="">— Select —</option>
                    {(serviceOptions || []).map((s: string) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Source</label>
                  <select value={editSource} onChange={(e) => setEditSource(e.target.value)} style={{ ...inputStyle, padding: '8px 12px' }}>
                    <option value="">— Select —</option>
                    {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Status</label>
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} style={{ ...inputStyle, padding: '8px 12px' }}>
                    <option value="uncontacted">Uncontacted</option>
                    <option value="appointment_set">Appointment Set</option>
                    <option value="proposal_sent">Proposal Sent</option>
                    <option value="needs_reschedule">Needs Reschedule</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Result</label>
                  <select value={editResult} onChange={(e) => setEditResult(e.target.value)} style={{ ...inputStyle, padding: '8px 12px' }}>
                    <option value="">—</option>
                    <option value="working">Working</option>
                    <option value="sold">Sold</option>
                    <option value="competitor">Went With Competitor</option>
                    <option value="not_interested">Not Interested in Pool</option>
                    <option value="future_date">Waiting for Future Date</option>
                    <option value="finance_turndown">Finance Turndown</option>
                  </select>
                </div>
              </div>
              <button onClick={saveLead} style={{ width: '100%', padding: '10px', borderRadius: 12, background: '#185FA5', color: 'white', fontWeight: 500, fontSize: 14, border: 'none', cursor: 'pointer', marginTop: 4 }}>
                Save Changes
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {/* Mobile: tap-to-call/text/email action buttons */}
              {(selectedLead.phone || selectedLead.email) && (
                <div className="md:hidden" style={{ display: 'grid', gridTemplateColumns: selectedLead.phone && selectedLead.email ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: 8 }}>
                  {selectedLead.phone && (
                    <a href={`tel:${selectedLead.phone}`} onClick={() => logContact('Call')} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: '#E6F1FB', borderRadius: 12, padding: '12px 8px', cursor: 'pointer' }}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M4 2a1 1 0 0 0-1 1v1.5c0 7.456 6.044 13.5 13.5 13.5H18a1 1 0 0 0 1-1v-3a1 1 0 0 0-.684-.949l-3-1a1 1 0 0 0-1.084.3l-1.2 1.44a11.06 11.06 0 0 1-5.323-5.323l1.44-1.2a1 1 0 0 0 .3-1.084l-1-3A1 1 0 0 0 7.5 2H4z" fill="#185FA5"/>
                      </svg>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#185FA5' }}>Call</span>
                    </a>
                  )}
                  {selectedLead.phone && (
                    <a href={`sms:${selectedLead.phone}`} onClick={() => logContact('Text')} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: '#EAF3DE', borderRadius: 12, padding: '12px 8px', cursor: 'pointer' }}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M2 3a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5l-4 4V3z" fill="#27500A"/>
                      </svg>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#27500A' }}>Text</span>
                    </a>
                  )}
                  {selectedLead.email && (
                    <a href={`mailto:${selectedLead.email}`} onClick={() => logContact('Email')} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: '#FEF3C7', borderRadius: 12, padding: '12px 8px', cursor: 'pointer' }}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M2 4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4z" fill="#78350F" opacity="0.15"/>
                        <path d="M2 4l8 7 8-7" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round"/>
                        <rect x="2" y="4" width="16" height="12" rx="1" stroke="#78350F" strokeWidth="1.5"/>
                      </svg>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#78350F' }}>Email</span>
                    </a>
                  )}
                </div>
              )}
              {/* Desktop and mobile: info tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <button onClick={createProposal} style={{ flex: 1, padding: '10px', borderRadius: 12, background: '#185FA5', color: 'white', fontWeight: 500, fontSize: 13, border: 'none', cursor: 'pointer' }}>
              + Create Proposal
            </button>
            <button onClick={() => setShowSchedule(!showSchedule)} style={{ flex: 1, padding: '10px', borderRadius: 12, background: showSchedule ? '#FAEEDA' : '#f9f9f9', color: showSchedule ? '#633806' : '#555', fontWeight: 500, fontSize: 13, border: '0.5px solid #e5e5e5', cursor: 'pointer' }}>
              📅 Schedule Appointment
            </button>
          </div>

          {/* Schedule Appointment form */}
          {showSchedule && (
            <div style={{ background: '#f9f9f9', borderRadius: 14, padding: '14px', marginBottom: 16, border: '0.5px solid #e8e8e8' }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1a2e', margin: '0 0 12px' }}>New Appointment</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <select value={apptType} onChange={(e) => setApptType(e.target.value)} style={{ ...inputStyle, padding: '8px 12px', color: apptType ? '#1a1a2e' : '#aaa' }}>
                  <option value="">— Appointment Type —</option>
                  {APPOINTMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Date</label>
                    <input type="date" value={apptDate} onChange={(e) => setApptDate(e.target.value)} style={{ ...inputStyle }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Time</label>
                    <input type="time" value={apptTime} onChange={(e) => setApptTime(e.target.value)} style={{ ...inputStyle }} />
                  </div>
                </div>
                <textarea placeholder="Notes (optional)" value={apptNotes} onChange={(e) => setApptNotes(e.target.value)} rows={2}
                  style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={scheduleAppointment} disabled={!apptType || !apptDate || !apptTime || savingAppt}
                    style={{ flex: 1, padding: '9px', borderRadius: 10, background: apptType && apptDate && apptTime ? '#185FA5' : '#f0f0f0', color: apptType && apptDate && apptTime ? 'white' : '#bbb', fontWeight: 500, fontSize: 13, border: 'none', cursor: apptType && apptDate && apptTime ? 'pointer' : 'not-allowed' }}>
                    {savingAppt ? 'Saving…' : 'Save Appointment'}
                  </button>
                  <button onClick={() => setShowSchedule(false)} style={{ padding: '9px 14px', borderRadius: 10, background: 'white', color: '#888', fontSize: 13, border: '0.5px solid #e5e5e5', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable section */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 24px 24px' }}>

          {/* Appointments */}
          {appointments.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 500, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Appointments</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {appointments.map((appt) => (
                  <div key={appt.id} style={{ background: appt.completed ? '#f0faf0' : appt.rescheduled ? '#fff8f0' : '#f9f9f9', borderRadius: 12, padding: '12px 14px', border: `0.5px solid ${appt.completed ? '#c0dd97' : appt.rescheduled ? '#f5c5a3' : '#e8e8e8'}` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1a2e', margin: 0 }}>{appt.appointment_type}</p>
                        <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>{formatAppt(appt.appointment_date)}</p>
                        {appt.notes && <p style={{ fontSize: 12, color: '#666', margin: '4px 0 0' }}>{appt.notes}</p>}
                        {appt.completed && <span style={{ fontSize: 11, color: '#27500A', fontWeight: 500 }}>✓ Completed</span>}
                        {appt.rescheduled && !appt.completed && <span style={{ fontSize: 11, color: '#BA7517', fontWeight: 500 }}>↻ Rescheduled</span>}
                      </div>
                      {!appt.completed && (
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => markApptComplete(appt.id)} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, background: '#EAF3DE', color: '#27500A', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Done</button>
                          {!appt.rescheduled && <button onClick={() => rescheduleAppt(appt.id)} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, background: '#FAEEDA', color: '#633806', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Reschedule</button>}
                          <button onClick={() => deleteAppt(appt.id)} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, background: '#fff5f5', color: '#c0392b', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                    <a href={`/proposals/new?proposalId=${p.id}`} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, background: '#f9f9f9', borderRadius: 12, padding: '11px 14px', textDecoration: 'none' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title || 'Untitled Proposal'}</p>
                        <p style={{ fontSize: 12, color: '#aaa', margin: '2px 0 0', textTransform: 'capitalize' }}>
                          {status} &bull; {markedUpTotal > 0 ? `$${markedUpTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                        </p>
                      </div>
                    </a>
                    <button onClick={(e) => deleteProposal(p.id, e)} style={{ fontSize: 12, color: '#f09595', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', flexShrink: 0 }}>Delete</button>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ borderTop: '0.5px solid #f0f0f0', marginBottom: 20 }} />

          {/* Notes */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 500, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>Notes</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input placeholder="Add a note…" value={noteText} onChange={(e) => setNoteText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNote()}
                style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '0.5px solid #e5e5e5', background: '#f9f9f9', fontSize: 14, outline: 'none' }} />
              <button onClick={addNote} style={{ padding: '9px 16px', borderRadius: 10, background: '#185FA5', color: 'white', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', flexShrink: 0 }}>Add</button>
            </div>
            {sortedNotes.length === 0 ? (
              <p style={{ fontSize: 13, color: '#bbb' }}>No notes yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sortedNotes.map((note: any) => (
                  <div key={note.id} style={{ background: '#f9f9f9', borderRadius: 12, padding: '12px 14px' }}>
                    <p style={{ fontSize: 14, color: '#333', margin: 0, lineHeight: 1.5 }}>{note.note}</p>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                      <p style={{ fontSize: 12, color: '#0C447C', fontWeight: 500, margin: 0 }}>{note.created_by}</p>
                      <span style={{ color: '#ddd', fontSize: 12 }}>&bull;</span>
                      <p style={{ fontSize: 12, color: '#aaa', margin: 0 }}>{formatTimestamp(note.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Admin-only contact log */}
          {isAdmin && (
            <div style={{ marginTop: 8 }}>
              <div style={{ borderTop: '0.5px solid #f0f0f0', marginBottom: 16 }} />
              <p style={{ fontSize: 11, fontWeight: 500, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>
                Contact Log <span style={{ fontSize: 10, background: '#f0f0f0', color: '#888', padding: '1px 6px', borderRadius: 20, marginLeft: 4 }}>Admin</span>
              </p>
              {contactLog.length === 0 ? (
                <p style={{ fontSize: 13, color: '#bbb' }}>No contacts logged yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {contactLog.map((log) => {
                    const typeColors: Record<string, { bg: string; text: string }> = {
                      Call:  { bg: '#E6F1FB', text: '#0C447C' },
                      Text:  { bg: '#EAF3DE', text: '#27500A' },
                      Email: { bg: '#FEF3C7', text: '#78350F' },
                    }
                    const colors = typeColors[log.contact_type] || { bg: '#f5f5f5', text: '#888' }
                    return (
                      <div key={log.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#fafafa', borderRadius: 10, border: '0.5px solid #f0f0f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, background: colors.bg, color: colors.text, padding: '2px 8px', borderRadius: 20 }}>{log.contact_type}</span>
                          <span style={{ fontSize: 12, color: '#555' }}>{log.contacted_by}</span>
                        </div>
                        <span style={{ fontSize: 11, color: '#aaa' }}>
                          {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}