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
    const { data: projs } = await supabase.from('projects').select('id, name, color, status, leads(name)').order('created_at', { ascending: true })
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

  function getEventsForDay(dateStr: string) {
    const events: any[] = []
    for (const stage of stages) {
      const project = projects.find((p) => p.id === stage.project_id)
      if (!project) continue
      if (stage.started_at) {
        const start = stage.started_at.slice(0, 10)
        const end = stage.completed_at ? stage.completed_at.slice(0, 10) : start
        if (dateInRange(dateStr, start, end)) {
          events.push({ stage, project, isPlanned: false, isStart: dateStr === start, isEnd: dateStr === end })
          continue
        }
      }
      if (!stage.started_at && stage.planned_start) {
        const start = stage.planned_start
        const end = stage.planned_end || start
        if (dateInRange(dateStr, start, end)) {
          events.push({ stage, project, isPlanned: true, isStart: dateStr === start, isEnd: dateStr === end })
        }
      }
    }
    return events
  }

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const todayStr = today.toISOString().slice(0, 10)

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
          {/* Legend */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', maxWidth: 500, alignItems: 'center' }}>
            {projects.filter((p) => p.status !== 'completed').map((p) => (
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
              if (!day) return <div key={`empty-${idx}`} style={{ background: '#fafafa', minHeight: 110 }} />
              const dateStr = toDateStr(viewYear, viewMonth, day)
              const isToday = dateStr === todayStr
              const events = getEventsForDay(dateStr)

              return (
                <div key={dateStr} style={{ background: 'white', minHeight: 110, padding: '6px 8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: isToday ? 600 : 400, width: 22, height: 22, borderRadius: '50%', background: isToday ? '#E24B4A' : 'transparent', color: isToday ? 'white' : '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {day}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {events.slice(0, 3).map((ev, ei) => {
                      const color = ev.project.color || '#185FA5'
                      return (
                        <div key={`${ev.stage.id}-${ei}`}
                          title={`${ev.project.name}: ${ev.stage.step_name}`}
                          style={{
                            fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 4,
                            background: ev.isPlanned ? `rgba(${hexToRgb(color)}, 0.15)` : `rgba(${hexToRgb(color)}, 0.9)`,
                            color: ev.isPlanned ? color : 'white',
                            border: ev.isPlanned ? `1px dashed ${color}` : 'none',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}
                        >
                          {ev.isStart ? `${ev.project.name.split(' ')[0]}: ${ev.stage.step_name}` : '\u00A0'}
                        </div>
                      )
                    })}
                    {events.length > 3 && <span style={{ fontSize: 10, color: '#aaa', paddingLeft: 4 }}>+{events.length - 3} more</span>}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Bottom legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 16, padding: '10px 16px', background: 'white', borderRadius: 10, border: '0.5px solid #e8e8e8', width: 'fit-content' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 20, height: 8, borderRadius: 3, background: 'rgba(24,95,165,0.9)' }} />
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