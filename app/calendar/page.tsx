'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import NavSidebar from '../components/NavSidebar'
import MobileHeader from '../components/MobileHeader'

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export default function CalendarPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [stages, setStages] = useState<any[]>([])
  const [today] = useState(new Date())
  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(new Date().getMonth())
  // Mobile week view — start of current week (Sunday)
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay())
    d.setHours(0, 0, 0, 0)
    return d
  })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const { data: projs } = await supabase
      .from('projects').select('id, name, color, status, leads(name)')
      .order('created_at', { ascending: true })
    setProjects(projs || [])
    if (projs && projs.length > 0) {
      const ids = projs.map((p: any) => p.id)
      const { data: stgs } = await supabase
        .from('project_stages').select('*').in('project_id', ids)
        .or('planned_start.not.is.null,started_at.not.is.null')
        .order('sort_order', { ascending: true })
      setStages(stgs || [])
    }
  }

  function daysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate() }
  function firstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay() }

  const totalDays = daysInMonth(viewYear, viewMonth)
  const startDay = firstDayOfMonth(viewYear, viewMonth)
  const todayStr = toDateStr(today)

  function dateInRange(dateStr: string, start: string | null, end: string | null): boolean {
    if (!start) return false
    const d = new Date(dateStr).getTime()
    const s = new Date(start).getTime()
    const e = end ? new Date(end).getTime() : s
    return d >= s && d <= e
  }

  function getEventsForProjectDay(projectId: string, dateStr: string) {
    const color = projects.find((p) => p.id === projectId)?.color || '#185FA5'
    const projectStages = stages.filter((s) => s.project_id === projectId)
    const events: any[] = []
    for (const stage of projectStages) {
      if (stage.started_at) {
        const start = stage.started_at.slice(0, 10)
        const end = stage.completed_at ? stage.completed_at.slice(0, 10) : start
        if (dateInRange(dateStr, start, end)) {
          events.push({ stepName: stage.step_name, isPlanned: false, isStart: dateStr === start, isEnd: dateStr === end, color })
          continue
        }
      }
      if (!stage.started_at && stage.planned_start) {
        const start = stage.planned_start
        const end = stage.planned_end || start
        if (dateInRange(dateStr, start, end)) {
          events.push({ stepName: stage.step_name, isPlanned: true, isStart: dateStr === start, isEnd: dateStr === end, color })
        }
      }
    }
    return events
  }

  const activeProjects = projects.filter((p) => p.status !== 'completed')

  const maxRowsPerProject: Record<string, number> = {}
  for (const project of activeProjects) {
    let max = 1
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const count = getEventsForProjectDay(project.id, dateStr).length
      if (count > max) max = count
    }
    maxRowsPerProject[project.id] = max
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

  function prevWeek() { setWeekStart(addDays(weekStart, -7)) }
  function nextWeek() { setWeekStart(addDays(weekStart, 7)) }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${addDays(weekStart, 6).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  const cells: (number | null)[] = []
  for (let i = 0; i < startDay; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const minCellHeight = 80 + activeProjects.reduce((sum, p) => sum + (maxRowsPerProject[p.id] || 1) * 20 + 2, 0)

  return (
    <div style={{ background: '#f4f7fb', minHeight: '100vh' }}>
      <div className="flex h-screen overflow-hidden">
        <NavSidebar />

        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ── MOBILE HEADER ── */}
          <MobileHeader title="Production Calendar" />

          {/* ── DESKTOP TOP BAR ── */}
          <div className="hidden md:block" style={{ flexShrink: 0, background: 'white', borderBottom: '0.5px solid #eee', padding: '14px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: '#1a1a2e' }}>Production Calendar</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={prevMonth} style={{ width: 28, height: 28, borderRadius: 8, border: '0.5px solid #e5e5e5', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#555' }}>‹</button>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e', minWidth: 160, textAlign: 'center' }}>{monthName}</span>
                  <button onClick={nextMonth} style={{ width: 28, height: 28, borderRadius: 8, border: '0.5px solid #e5e5e5', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#555' }}>›</button>
                  <button onClick={() => { setViewMonth(today.getMonth()); setViewYear(today.getFullYear()) }} style={{ padding: '5px 12px', borderRadius: 8, border: '0.5px solid #e5e5e5', background: 'white', cursor: 'pointer', fontSize: 12, color: '#555', fontWeight: 500 }}>Today</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', maxWidth: 500, alignItems: 'center' }}>
                {activeProjects.map((p) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color || '#185FA5' }} />
                    <span style={{ fontSize: 12, color: '#555', fontWeight: 500 }}>{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── MOBILE WEEK NAV ── */}
          <div className="md:hidden flex-shrink-0" style={{ background: 'white', borderBottom: '0.5px solid #eee', padding: '10px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <button onClick={prevWeek} style={{ width: 32, height: 32, borderRadius: 8, border: '0.5px solid #e5e5e5', background: 'white', cursor: 'pointer', fontSize: 18, color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', textAlign: 'center' }}>{weekLabel}</span>
              <button onClick={nextWeek} style={{ width: 32, height: 32, borderRadius: 8, border: '0.5px solid #e5e5e5', background: 'white', cursor: 'pointer', fontSize: 18, color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
            </div>
            <button onClick={() => {
              const d = new Date()
              d.setDate(d.getDate() - d.getDay())
              d.setHours(0, 0, 0, 0)
              setWeekStart(d)
            }} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 8, border: '0.5px solid #e5e5e5', background: 'white', cursor: 'pointer', color: '#555' }}>
              This Week
            </button>
            {/* Project legend */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
              {activeProjects.map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || '#185FA5' }} />
                  <span style={{ fontSize: 11, color: '#555' }}>{p.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-24 md:pb-4">

            {/* ── MOBILE WEEK CALENDAR ── */}
            <div className="md:hidden" style={{ padding: '0 8px 12px' }}>
              {/* Day headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', paddingTop: 8, marginBottom: 2 }}>
                {weekDays.map((day) => {
                  const isToday = toDateStr(day) === todayStr
                  return (
                    <div key={toDateStr(day)} style={{ textAlign: 'center', paddingBottom: 4 }}>
                      <p style={{ fontSize: 10, color: '#aaa', margin: 0, textTransform: 'uppercase' }}>{day.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1)}</p>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: isToday ? '#E24B4A' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '2px auto 0' }}>
                        <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? 'white' : '#1a1a2e' }}>{day.getDate()}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Project lanes */}
              <div style={{ border: '0.5px solid #e8e8e8', borderRadius: 12, overflow: 'hidden', background: 'white' }}>
                {activeProjects.map((project, pi) => {
                  const color = project.color || '#185FA5'
                  // Get max rows for this project this week
                  let maxRows = 1
                  for (const day of weekDays) {
                    const count = getEventsForProjectDay(project.id, toDateStr(day)).length
                    if (count > maxRows) maxRows = count
                  }

                  return (
                    <div key={project.id} style={{ borderBottom: pi < activeProjects.length - 1 ? '0.5px solid #f0f0f0' : 'none' }}>
                      {/* Project label row */}
                      <div style={{ padding: '6px 10px', background: `rgba(${hexToRgb(color)}, 0.06)` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</span>
                        </div>
                      </div>
                      {/* Event bars per day */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minHeight: maxRows * 22 + 6, padding: '3px 0' }}>
                        {weekDays.map((day) => {
                          const dateStr = toDateStr(day)
                          const isToday = dateStr === todayStr
                          const dayOfWeek = day.getDay()
                          const isSunday = dayOfWeek === 0
                          const isSaturday = dayOfWeek === 6
                          const events = getEventsForProjectDay(project.id, dateStr)

                          return (
                            <div key={dateStr} style={{ position: 'relative', borderLeft: isToday ? `1.5px solid rgba(${hexToRgb(color)}, 0.3)` : '0.5px solid #f5f5f5', padding: '0 1px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                              {events.map((ev, ei) => {
                                const isStarting = ev.isStart || isSunday
                                const isEnding = ev.isEnd || isSaturday
                                return (
                                  <div key={ei}
                                    title={ev.stepName}
                                    style={{
                                      height: 18, fontSize: 8, fontWeight: 500, lineHeight: '18px',
                                      paddingLeft: isStarting ? 4 : 0,
                                      background: ev.isPlanned ? `rgba(${hexToRgb(color)}, 0.15)` : `rgba(${hexToRgb(color)}, 0.85)`,
                                      color: ev.isPlanned ? color : 'white',
                                      border: ev.isPlanned ? `1px dashed rgba(${hexToRgb(color)}, 0.6)` : 'none',
                                      borderLeft: !ev.isPlanned ? 'none' : isStarting ? `1px dashed rgba(${hexToRgb(color)}, 0.6)` : 'none',
                                      borderRight: !ev.isPlanned ? 'none' : isEnding ? `1px dashed rgba(${hexToRgb(color)}, 0.6)` : 'none',
                                      borderRadius: `${isStarting ? 3 : 0}px ${isEnding ? 3 : 0}px ${isEnding ? 3 : 0}px ${isStarting ? 3 : 0}px`,
                                      overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                                      marginLeft: isStarting ? 1 : -1,
                                      marginRight: isEnding ? 1 : -1,
                                    }}>
                                    {isStarting ? ev.stepName.split('/')[0].trim().slice(0, 10) : ''}
                                  </div>
                                )
                              })}
                              {Array.from({ length: Math.max(0, maxRows - events.length) }).map((_, pi) => (
                                <div key={pi} style={{ height: 18 }} />
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
                {activeProjects.length === 0 && (
                  <p style={{ textAlign: 'center', color: '#bbb', fontSize: 13, padding: '24px 16px', margin: 0 }}>No active projects scheduled.</p>
                )}
              </div>

              {/* Mobile legend */}
              <div style={{ display: 'flex', gap: 14, marginTop: 12, padding: '8px 12px', background: 'white', borderRadius: 10, border: '0.5px solid #e8e8e8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 16, height: 6, borderRadius: 2, background: 'rgba(24,95,165,0.85)' }} />
                  <span style={{ fontSize: 11, color: '#555' }}>Actual</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 16, height: 6, borderRadius: 2, background: 'rgba(24,95,165,0.15)', border: '1px dashed #185FA5' }} />
                  <span style={{ fontSize: 11, color: '#555' }}>Planned</span>
                </div>
              </div>
            </div>

            {/* ── DESKTOP MONTH CALENDAR ── */}
            <div className="hidden md:block" style={{ padding: '0 24px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', paddingTop: 16, marginBottom: 1 }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 0' }}>{d}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: '#e8e8e8', border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden' }}>
                {cells.map((day, idx) => {
                  const dayOfWeek = idx % 7
                  const isSunday = dayOfWeek === 0
                  const isSaturday = dayOfWeek === 6
                  if (!day) return <div key={`empty-${idx}`} style={{ background: '#fafafa', minHeight: minCellHeight }} />
                  const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const isToday = dateStr === todayStr
                  return (
                    <div key={dateStr} style={{ background: 'white', minHeight: minCellHeight, paddingBottom: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 8px 4px' }}>
                        <span style={{ fontSize: 12, fontWeight: isToday ? 600 : 400, width: 22, height: 22, borderRadius: '50%', background: isToday ? '#E24B4A' : 'transparent', color: isToday ? 'white' : '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{day}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {activeProjects.map((project) => {
                          const events = getEventsForProjectDay(project.id, dateStr)
                          const maxRows = maxRowsPerProject[project.id] || 1
                          const color = project.color || '#185FA5'
                          return (
                            <div key={project.id} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              {events.map((ev, ei) => {
                                const isStarting = ev.isStart || isSunday
                                const isEnding = ev.isEnd || isSaturday
                                return (
                                  <div key={ei} title={`${project.name}: ${ev.stepName}`}
                                    style={{ height: 18, fontSize: 10, fontWeight: 500, lineHeight: '18px', paddingLeft: isStarting ? 6 : 0, paddingRight: isEnding ? 4 : 0, background: ev.isPlanned ? `rgba(${hexToRgb(color)}, 0.15)` : `rgba(${hexToRgb(color)}, 0.85)`, color: ev.isPlanned ? color : 'white', border: ev.isPlanned ? `1px dashed rgba(${hexToRgb(color)}, 0.7)` : 'none', borderLeft: !ev.isPlanned ? 'none' : isStarting ? `1px dashed rgba(${hexToRgb(color)}, 0.7)` : 'none', borderRight: !ev.isPlanned ? 'none' : isEnding ? `1px dashed rgba(${hexToRgb(color)}, 0.7)` : 'none', borderRadius: `${isStarting ? 4 : 0}px ${isEnding ? 4 : 0}px ${isEnding ? 4 : 0}px ${isStarting ? 4 : 0}px`, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', marginLeft: isStarting ? 2 : -1, marginRight: isEnding ? 2 : -1 }}>
                                    {isStarting ? `${project.name.split(' ')[0]}: ${ev.stepName}` : ''}
                                  </div>
                                )
                              })}
                              {Array.from({ length: Math.max(0, maxRows - events.length) }).map((_, pi) => (
                                <div key={`placeholder-${pi}`} style={{ height: 18 }} />
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 16, padding: '10px 16px', background: 'white', borderRadius: 10, border: '0.5px solid #e8e8e8', width: 'fit-content' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 20, height: 8, borderRadius: 3, background: 'rgba(24,95,165,0.85)' }} />
                  <span style={{ fontSize: 12, color: '#555' }}>Actual / In Progress</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 20, height: 8, borderRadius: 3, background: 'rgba(24,95,165,0.15)', border: '1px dashed #185FA5' }} />
                  <span style={{ fontSize: 12, color: '#555' }}>Planned</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#E24B4A' }} />
                  <span style={{ fontSize: 12, color: '#555' }}>Today</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}