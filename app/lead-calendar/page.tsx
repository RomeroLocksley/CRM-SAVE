'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import NavSidebar from '../components/NavSidebar'

const APPT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'Initial Consultation On-Site':  { bg: '#185FA5', text: 'white', dot: '#185FA5' },
  'Initial Consultation Virtual':  { bg: '#0F6E56', text: 'white', dot: '#0F6E56' },
  'Follow-up On-Site':             { bg: '#8B3FC8', text: 'white', dot: '#8B3FC8' },
  'Follow-up Virtual':             { bg: '#C0392B', text: 'white', dot: '#C0392B' },
  'Office Visit':                  { bg: '#D4810A', text: 'white', dot: '#D4810A' },
}

function formatTime(ts: string) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatFullDate(ts: string) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function LeadCalendarPage() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [today] = useState(new Date())
  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(new Date().getMonth())
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [mobileView, setMobileView] = useState<'calendar' | 'list'>('list')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const { data: appts } = await supabase.from('lead_appointments').select('*, leads(name, phone, email)').order('appointment_date', { ascending: true })
    setAppointments(appts || [])
  }

  function daysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate() }
  function firstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay() }

  const totalDays = daysInMonth(viewYear, viewMonth)
  const startDay = firstDayOfMonth(viewYear, viewMonth)
  const todayStr = today.toISOString().slice(0, 10)

  function toDateStr(year: number, month: number, day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function getApptsForDay(dateStr: string) {
    return appointments.filter((a) => a.appointment_date?.slice(0, 10) === dateStr)
      .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime())
  }

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1) }
    else setViewMonth(viewMonth - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1) }
    else setViewMonth(viewMonth + 1)
  }

  async function markComplete(apptId: string) {
    await supabase.from('lead_appointments').update({ completed: true }).eq('id', apptId)
    setSelectedAppt(null); loadAll()
  }

  async function markReschedule(apptId: string, leadId: string) {
    await supabase.from('lead_appointments').update({ rescheduled: true }).eq('id', apptId)
    await supabase.from('leads').update({ status: 'needs_reschedule' }).eq('id', leadId)
    setSelectedAppt(null); loadAll()
  }

  async function saveApptNotes(apptId: string) {
    await supabase.from('lead_appointments').update({ notes: editNotes }).eq('id', apptId)
    setSelectedAppt((prev: any) => ({ ...prev, notes: editNotes }))
    loadAll()
  }

  const cells: (number | null)[] = []
  for (let i = 0; i < startDay; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  // Upcoming appointments for list view
  const upcomingAppts = appointments
    .filter((a) => !a.completed && new Date(a.appointment_date) >= new Date(today.toDateString()))
    .slice(0, 20)

  return (
    <div style={{ background: '#f4f7fb', minHeight: '100vh' }}>
      <div className="flex h-screen overflow-hidden">
        <NavSidebar />

        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Top bar */}
          <div style={{ flexShrink: 0, background: 'white', borderBottom: '0.5px solid #eee', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: '#1a1a2e' }}>Lead Calendar</h1>
              {/* Mobile view toggle */}
              <div className="md:hidden flex" style={{ border: '0.5px solid #e5e5e5', borderRadius: 8, overflow: 'hidden' }}>
                <button onClick={() => setMobileView('list')} style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer', background: mobileView === 'list' ? '#185FA5' : 'white', color: mobileView === 'list' ? 'white' : '#666' }}>List</button>
                <button onClick={() => setMobileView('calendar')} style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer', background: mobileView === 'calendar' ? '#185FA5' : 'white', color: mobileView === 'calendar' ? 'white' : '#666' }}>Calendar</button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={prevMonth} style={{ width: 28, height: 28, borderRadius: 8, border: '0.5px solid #e5e5e5', background: 'white', cursor: 'pointer', fontSize: 16, color: '#555' }}>‹</button>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', minWidth: 120, textAlign: 'center' }}>{monthName}</span>
              <button onClick={nextMonth} style={{ width: 28, height: 28, borderRadius: 8, border: '0.5px solid #e5e5e5', background: 'white', cursor: 'pointer', fontSize: 16, color: '#555' }}>›</button>
              <button onClick={() => { setViewMonth(today.getMonth()); setViewYear(today.getFullYear()) }} style={{ padding: '5px 10px', borderRadius: 8, border: '0.5px solid #e5e5e5', background: 'white', cursor: 'pointer', fontSize: 12, color: '#555' }}>Today</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-24 md:pb-4" style={{ padding: '0 12px 12px' }}>

            {/* ── MOBILE LIST VIEW ── */}
            <div className="md:hidden">
              {mobileView === 'list' && (
                <div style={{ paddingTop: 12 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Upcoming Appointments</p>
                  {upcomingAppts.length === 0 ? (
                    <p style={{ fontSize: 14, color: '#bbb', textAlign: 'center', marginTop: 32 }}>No upcoming appointments</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {upcomingAppts.map((appt) => {
                        const colors = APPT_COLORS[appt.appointment_type] || { bg: '#185FA5', text: 'white', dot: '#185FA5' }
                        return (
                          <div key={appt.id} onClick={() => { setSelectedAppt(appt); setEditNotes(appt.notes || '') }}
                            style={{ background: 'white', borderRadius: 14, padding: '14px 16px', border: '0.5px solid #e8e8e8', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                              <div>
                                <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: '#1a1a2e' }}>{appt.leads?.name}</p>
                                <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>
                                  {new Date(appt.appointment_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {formatTime(appt.appointment_date)}
                                </p>
                              </div>
                              <span style={{ fontSize: 11, background: colors.bg, color: colors.text, padding: '3px 8px', borderRadius: 20, fontWeight: 500, whiteSpace: 'nowrap', marginLeft: 8 }}>
                                {appt.appointment_type.split(' ').slice(0, 2).join(' ')}
                              </span>
                            </div>
                            {appt.leads?.phone && <p style={{ fontSize: 13, color: '#555', margin: 0 }}>{appt.leads.phone}</p>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {mobileView === 'calendar' && (
                <div style={{ paddingTop: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                      <div key={i} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#aaa', padding: '4px 0' }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                    {cells.map((day, idx) => {
                      if (!day) return <div key={`e-${idx}`} />
                      const dateStr = toDateStr(viewYear, viewMonth, day)
                      const isToday = dateStr === todayStr
                      const dayAppts = getApptsForDay(dateStr)
                      return (
                        <div key={dateStr} style={{ minHeight: 44, background: 'white', borderRadius: 8, padding: '4px', border: isToday ? '1.5px solid #E24B4A' : '0.5px solid #f0f0f0' }}>
                          <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? '#E24B4A' : '#1a1a2e', textAlign: 'right', marginBottom: 2 }}>{day}</div>
                          {dayAppts.slice(0, 2).map((appt) => {
                            const colors = APPT_COLORS[appt.appointment_type] || { bg: '#185FA5', text: 'white', dot: '#185FA5' }
                            return (
                              <div key={appt.id} onClick={() => { setSelectedAppt(appt); setEditNotes(appt.notes || '') }}
                                style={{ width: 6, height: 6, borderRadius: '50%', background: colors.dot, margin: '1px auto', cursor: 'pointer' }} />
                            )
                          })}
                          {dayAppts.length > 2 && <div style={{ fontSize: 8, color: '#aaa', textAlign: 'center' }}>+{dayAppts.length - 2}</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── DESKTOP CALENDAR VIEW ── */}
            <div className="hidden md:block" style={{ paddingTop: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 1 }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 0' }}>{d}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: '#e8e8e8', border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden' }}>
                {cells.map((day, idx) => {
                  if (!day) return <div key={`empty-${idx}`} style={{ background: '#fafafa', minHeight: 120 }} />
                  const dateStr = toDateStr(viewYear, viewMonth, day)
                  const isToday = dateStr === todayStr
                  const dayAppts = getApptsForDay(dateStr)
                  return (
                    <div key={dateStr} style={{ background: 'white', minHeight: 120, padding: '6px 4px 4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4, paddingRight: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: isToday ? 600 : 400, width: 22, height: 22, borderRadius: '50%', background: isToday ? '#E24B4A' : 'transparent', color: isToday ? 'white' : '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{day}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {dayAppts.map((appt) => {
                          const colors = APPT_COLORS[appt.appointment_type] || { bg: '#185FA5', text: 'white' }
                          return (
                            <div key={appt.id} onClick={() => { setSelectedAppt(appt); setEditNotes(appt.notes || '') }}
                              style={{ padding: '3px 6px', borderRadius: 5, cursor: 'pointer', background: appt.completed ? '#f0f0f0' : appt.rescheduled ? '#FEF3C7' : colors.bg, color: appt.completed ? '#aaa' : appt.rescheduled ? '#78350F' : colors.text, fontSize: 10, fontWeight: 500, lineHeight: 1.4 }}>
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatTime(appt.appointment_date)} {appt.leads?.name}</div>
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.85 }}>{appt.appointment_type}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Appointment detail modal */}
      {selectedAppt && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setSelectedAppt(null)}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '100%', boxShadow: '0 -10px 40px rgba(0,0,0,0.15)', padding: '24px', maxHeight: '85vh', overflowY: 'auto' }}
            className="md:rounded-[20px] md:max-w-md md:m-4"
            onClick={(e) => e.stopPropagation()}>
            {/* Handle bar for mobile */}
            <div className="md:hidden" style={{ width: 40, height: 4, borderRadius: 2, background: '#e0e0e0', margin: '-8px auto 16px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#1a1a2e' }}>{selectedAppt.leads?.name}</p>
                <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>{selectedAppt.appointment_type}</p>
                <p style={{ fontSize: 13, color: '#555', margin: '2px 0 0', fontWeight: 500 }}>{formatFullDate(selectedAppt.appointment_date)}</p>
              </div>
              <button onClick={() => setSelectedAppt(null)} style={{ color: '#ccc', background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            {/* Contact info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {selectedAppt.leads?.phone && (
                <a href={`tel:${selectedAppt.leads.phone}`} style={{ background: '#f9f9f9', borderRadius: 10, padding: '10px 12px', textDecoration: 'none', display: 'block' }}>
                  <p style={{ fontSize: 11, color: '#aaa', margin: '0 0 2px' }}>📞 Call</p>
                  <p style={{ fontSize: 13, color: '#185FA5', margin: 0, fontWeight: 500 }}>{selectedAppt.leads.phone}</p>
                </a>
              )}
              {selectedAppt.leads?.phone && (
                <a href={`sms:${selectedAppt.leads.phone}`} style={{ background: '#f9f9f9', borderRadius: 10, padding: '10px 12px', textDecoration: 'none', display: 'block' }}>
                  <p style={{ fontSize: 11, color: '#aaa', margin: '0 0 2px' }}>💬 Text</p>
                  <p style={{ fontSize: 13, color: '#185FA5', margin: 0, fontWeight: 500 }}>{selectedAppt.leads.phone}</p>
                </a>
              )}
            </div>

            {selectedAppt.completed && <span style={{ fontSize: 12, background: '#EAF3DE', color: '#27500A', padding: '4px 10px', borderRadius: 20, fontWeight: 500, display: 'inline-block', marginBottom: 12 }}>✓ Completed</span>}
            {selectedAppt.rescheduled && !selectedAppt.completed && <span style={{ fontSize: 12, background: '#FAEEDA', color: '#633806', padding: '4px 10px', borderRadius: 20, fontWeight: 500, display: 'inline-block', marginBottom: 12 }}>↻ Needs Reschedule</span>}

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</label>
              <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} placeholder="Add notes…"
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 10, border: '0.5px solid #e5e5e5', background: '#fafafa', fontSize: 13, outline: 'none', resize: 'none', lineHeight: 1.5 }} />
              <button onClick={() => saveApptNotes(selectedAppt.id)} style={{ marginTop: 8, padding: '7px 14px', borderRadius: 8, background: '#185FA5', color: 'white', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
                Save Notes
              </button>
            </div>

            {!selectedAppt.completed && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button onClick={() => markComplete(selectedAppt.id)} style={{ padding: '12px', borderRadius: 12, background: '#EAF3DE', color: '#27500A', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
                  ✓ Mark Complete
                </button>
                {!selectedAppt.rescheduled && (
                  <button onClick={() => markReschedule(selectedAppt.id, selectedAppt.lead_id)} style={{ padding: '12px', borderRadius: 12, background: '#FAEEDA', color: '#633806', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
                    ↻ Reschedule
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}