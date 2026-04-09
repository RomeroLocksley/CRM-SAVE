'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import NavSidebar from '../components/NavSidebar'

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
      .from('projects')
      .select('id, name, color, status, leads(name)')
      .order('created_at', { ascending: true })
    setProjects(projs || [])

    if (projs && projs.length > 0) {
      const ids = projs.map((p: any) => p.id)
      const { data: stgs } = await supabase
        .from('project_stages')
        .select('*')
        .in('project_id', ids)
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

  // Get ALL stages active for a project on a given day (can be multiple)
  function getEventsForProjectDay(projectId: string, dateStr: string) {
    const color = projects.find((p) => p.id === projectId)?.color || '#185FA5'
    const projectStages = stages.filter((s) => s.project_id === projectId)
    const events: { stepName: string; isPlanned: boolean; isStart: boolean; isEnd: boolean; color: string }[] = []

    for (const stage of projectStages) {
      // Actual
      if (stage.started_at) {
        const start = stage.started_at.slice(0, 10)
        const end = stage.completed_at ? stage.completed_at.slice(0, 10) : start
        if (dateInRange(dateStr, start, end)) {
          events.push({ stepName: stage.step_name, isPlanned: false, isStart: dateStr === start, isEnd: dateStr === end, color })
          continue
        }
      }
      // Planned (only if not yet started)
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

  // Figure out the max number of rows any project needs on any day this month
  // so we can pre-compute consistent lane heights
  // We do a simpler approach: track per-project the max concurrent stages seen
  // For rendering we just let each project's section grow naturally but keep order fixed

  const activeProjects = projects.filter((p) => p.status !== 'completed')

  // Pre-compute max rows per project across this whole month so lane heights are consistent
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

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f4f7fb' }}>
      <NavSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div style={{ flexShrink: 0, background: 'white', borderBottom: '0.5px solid #eee', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: '#1a1a2e' }}>Calendar</h1>
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

        <div className="flex-1 overflow-y-auto" style={{ padding: '0 24px 24px' }}>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', paddingTop: 16, marginBottom: 1 }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 0' }}>{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: '#e8e8e8', border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden' }}>
            {cells.map((day, idx) => {
              const dayOfWeek = idx % 7
              const isSunday = dayOfWeek === 0
              const isSaturday = dayOfWeek === 6

              if (!day) {
                return <div key={`empty-${idx}`} style={{ background: '#fafafa', minHeight: minCellHeight }} />
              }

              const dateStr = toDateStr(viewYear, viewMonth, day)
              const isToday = dateStr === todayStr

              return (
                <div key={dateStr} style={{ background: 'white', minHeight: minCellHeight, paddingBottom: 4 }}>
                  {/* Day number */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 8px 4px' }}>
                    <span style={{ fontSize: 12, fontWeight: isToday ? 600 : 400, width: 22, height: 22, borderRadius: '50%', background: isToday ? '#E24B4A' : 'transparent', color: isToday ? 'white' : '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {day}
                    </span>
                  </div>

                  {/* Project lanes — fixed order, each project gets its reserved rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {activeProjects.map((project) => {
                      const events = getEventsForProjectDay(project.id, dateStr)
                      const maxRows = maxRowsPerProject[project.id] || 1
                      const color = project.color || '#185FA5'

                      return (
                        <div key={project.id} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {/* Render actual events */}
                          {events.map((ev, ei) => {
                            const isStarting = ev.isStart || isSunday
                            const isEnding = ev.isEnd || isSaturday
                            return (
                              <div
                                key={ei}
                                title={`${project.name}: ${ev.stepName}`}
                                style={{
                                  height: 18,
                                  fontSize: 10,
                                  fontWeight: 500,
                                  lineHeight: '18px',
                                  paddingLeft: isStarting ? 6 : 0,
                                  paddingRight: isEnding ? 4 : 0,
                                  background: ev.isPlanned
                                    ? `rgba(${hexToRgb(color)}, 0.15)`
                                    : `rgba(${hexToRgb(color)}, 0.85)`,
                                  color: ev.isPlanned ? color : 'white',
                                  border: ev.isPlanned ? `1px dashed rgba(${hexToRgb(color)}, 0.7)` : 'none',
                                  borderLeft: !ev.isPlanned ? 'none' : isStarting ? `1px dashed rgba(${hexToRgb(color)}, 0.7)` : 'none',
                                  borderRight: !ev.isPlanned ? 'none' : isEnding ? `1px dashed rgba(${hexToRgb(color)}, 0.7)` : 'none',
                                  borderRadius: `${isStarting ? 4 : 0}px ${isEnding ? 4 : 0}px ${isEnding ? 4 : 0}px ${isStarting ? 4 : 0}px`,
                                  overflow: 'hidden',
                                  whiteSpace: 'nowrap',
                                  textOverflow: 'ellipsis',
                                  marginLeft: isStarting ? 2 : -1,
                                  marginRight: isEnding ? 2 : -1,
                                }}
                              >
                                {isStarting ? `${project.name.split(' ')[0]}: ${ev.stepName}` : ''}
                              </div>
                            )
                          })}
                          {/* Fill remaining reserved rows with empty placeholders */}
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
  )
}