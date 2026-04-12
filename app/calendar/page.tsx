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

export default function CalendarPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [stages, setStages] = useState<any[]>([])
  const [today] = useState(new Date())
  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(new Date().getMonth())

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
  const todayStr = today.toISOString().slice(0, 10)

  function toDateStr(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

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
      const dateStr = toDateStr(viewYear, viewMonth, d)
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

  const cells: (number | null)[] = []
  for (let i = 0; i < startDay; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const minCellHeight = 80 + activeProjects.reduce((sum, p) => sum + (maxRowsPerProject[p.id] || 1) * 20 + 2, 0)

  // For mobile — get active stages for each project this month
  function getProjectActivityThisMonth(projectId: string) {
    const monthStart = toDateStr(viewYear, viewMonth, 1)
    const monthEnd = toDateStr(viewYear, viewMonth, totalDays)
    const projectStages = stages.filter((s) => s.project_id === projectId)
    return projectStages.filter((s) => {
      const start = s.started_at?.slice(0, 10) || s.planned_start
      const end = s.completed_at?.slice(0, 10) || s.planned_end || start
      if (!start) return false
      return start <= monthEnd && end >= monthStart
    })
  }

  return (
    <div style={{ background: '#f4f7fb', minHeight: '100vh' }}>
      <div className="flex h-screen overflow-hidden">
        <NavSidebar />

        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Top bar */}
          <div style={{ flexShrink: 0, background: 'white', borderBottom: '0.5px solid #eee', padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h1 className="hidden md:block" style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#1a1a2e' }}>Production Calendar</h1>
              <MobileHeader title="Production Calendar" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={prevMonth} style={{ width: 32, height: 32, borderRadius: 8, border: '0.5px solid #e5e5e5', background: 'white', cursor: 'pointer', fontSize: 18, color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', minWidth: 100, textAlign: 'center' }}>{monthName}</span>
                <button onClick={nextMonth} style={{ width: 32, height: 32, borderRadius: 8, border: '0.5px solid #e5e5e5', background: 'white', cursor: 'pointer', fontSize: 18, color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
                <button onClick={() => { setViewMonth(today.getMonth()); setViewYear(today.getFullYear()) }} style={{ padding: '5px 10px', borderRadius: 8, border: '0.5px solid #e5e5e5', background: 'white', cursor: 'pointer', fontSize: 12, color: '#555' }}>Today</button>
              </div>
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {activeProjects.map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || '#185FA5' }} />
                  <span style={{ fontSize: 11, color: '#555' }}>{p.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-24 md:pb-4">

            {/* ── MOBILE — project activity list ── */}
            <div className="md:hidden" style={{ padding: '12px 16px' }}>
              {activeProjects.map((project) => {
                const activities = getProjectActivityThisMonth(project.id)
                if (activities.length === 0) return null
                const color = project.color || '#185FA5'
                return (
                  <div key={project.id} style={{ background: 'white', borderRadius: 14, padding: '14px 16px', marginBottom: 12, border: '0.5px solid #e8e8e8' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: '#1a1a2e' }}>{project.name}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {activities.map((stage) => {
                        const isActual = !!stage.started_at
                        const start = isActual ? stage.started_at?.slice(0, 10) : stage.planned_start
                        const end = isActual ? (stage.completed_at?.slice(0, 10) || start) : (stage.planned_end || start)
                        const startDate = new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        const endDate = end && end !== start ? new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null
                        return (
                          <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: isActual ? `rgba(${hexToRgb(color)}, 0.08)` : '#fafafa', border: `0.5px solid ${isActual ? `rgba(${hexToRgb(color)}, 0.2)` : '#f0f0f0'}` }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: isActual ? color : '#ccc', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stage.step_name}</p>
                              <p style={{ fontSize: 11, color: '#aaa', margin: '1px 0 0' }}>
                                {isActual ? '' : 'Planned: '}{startDate}{endDate ? ` → ${endDate}` : ''}
                                {stage.completed ? ' ✓' : ''}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              {activeProjects.every((p) => getProjectActivityThisMonth(p.id).length === 0) && (
                <p style={{ textAlign: 'center', color: '#bbb', fontSize: 14, marginTop: 32 }}>No scheduled activity this month.</p>
              )}
            </div>

            {/* ── DESKTOP — full grid calendar ── */}
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
                  const dateStr = toDateStr(viewYear, viewMonth, day)
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
              {/* Legend */}
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