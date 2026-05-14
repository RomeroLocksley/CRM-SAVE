'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import NavSidebar from '../components/NavSidebar'
import MobileHeader from '../components/MobileHeader'

const PRESET_COLORS = [
  '#185FA5', '#0F6E56', '#8B3FC8', '#C0392B', '#D4810A',
  '#1A7A6E', '#5C3D8F', '#B03060', '#2E7D32', '#00838F',
]

// Stages are now loaded from the database (stage_templates table)
// STAGES, SCHEDULABLE_STEPS, and ALL_STEPS are built dynamically from DB data

function fmtDate(ts: string): string {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDateInput(ts: string): string {
  if (!ts) return ''
  return ts.slice(0, 10)
}

function daysBetween(a: string, b: string): number {
  if (!a || !b) return 0
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000))
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

function formatTs(ts: string) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [stageTemplates, setStageTemplates] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState('Unknown')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [showNewProject, setShowNewProject] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list')
  const [mobileTab, setMobileTab] = useState<'updates' | 'timeclock'>('updates')
  const [mobileProject, setMobileProject] = useState<any>(null)
  const [mobileLogs, setMobileLogs] = useState<any[]>([])
  const [mobileTimeEntries, setMobileTimeEntries] = useState<any[]>([])
  const [mobileNewLog, setMobileNewLog] = useState('')
  const [mobileClockEmployee, setMobileClockEmployee] = useState('')

  const [project, setProject] = useState<any>(null)
  const [stages, setStages] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [timeEntries, setTimeEntries] = useState<any[]>([])
  const [budgetItems, setBudgetItems] = useState<any[]>([])
  const [budgetSections, setBudgetSections] = useState<any[]>([])
  const [actuals, setActuals] = useState<any[]>([])

  const [leads, setLeads] = useState<any[]>([])
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [selectedProposalId, setSelectedProposalId] = useState('')
  const [leadProposals, setLeadProposals] = useState<any[]>([])
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectService, setNewProjectService] = useState('')
  const [newProjectLaborRate, setNewProjectLaborRate] = useState('75')
  const [newProjectColor, setNewProjectColor] = useState(PRESET_COLORS[0])

  const [newLog, setNewLog] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState('')
  const [clockEmployee, setClockEmployee] = useState('')
  const [clockNote, setClockNote] = useState('')
  const [actualEdits, setActualEdits] = useState<Record<string, { actual_cost: string; notes: string }>>({})
  const [plannedEdits, setPlannedEdits] = useState<Record<string, { planned_start: string; planned_end: string }>>({})
  const [savedSteps, setSavedSteps] = useState<Set<string>>(new Set())

  // ─── Load ──────────────────────────────────────────────────────────────────

  async function loadProjects() {
    const { data } = await supabase.from('projects').select('*, leads(name, address)').order('created_at', { ascending: false })
    setProjects(data || [])
  }

  async function loadProject(projectId: string) {
    const { data } = await supabase.from('projects').select('*, leads(name, email, phone, address), proposals(title, total_price)').eq('id', projectId).single()
    setProject(data)
  }

  async function loadStages(projectId: string) {
    const { data } = await supabase.from('project_stages').select('*').eq('project_id', projectId).order('sort_order', { ascending: true })
    setStages(data || [])
  }

  async function loadLogs(projectId: string) {
    const { data } = await supabase.from('project_daily_logs').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
    setLogs(data || [])
  }

  async function loadTasks(projectId: string) {
    const { data } = await supabase.from('project_tasks').select('*').eq('project_id', projectId).order('created_at', { ascending: true })
    setTasks(data || [])
  }

  async function loadTimeEntries(projectId: string) {
    const { data } = await supabase.from('time_clock').select('*').eq('project_id', projectId).order('clock_in', { ascending: false })
    setTimeEntries(data || [])
  }

  async function loadBudget(projectId: string, proposalId: string) {
    const { data: sections } = await supabase.from('proposal_sections').select('*').eq('proposal_id', proposalId).order('created_at', { ascending: true })
    const { data: items } = await supabase.from('proposal_items').select('*, proposal_item_rows(*)').eq('proposal_id', proposalId)
    setBudgetSections(sections || [])
    setBudgetItems(items || [])
    const { data: acts } = await supabase.from('project_budget_actuals').select('*').eq('project_id', projectId)
    setActuals(acts || [])
  }

  async function loadLeads() {
    const { data } = await supabase.from('leads').select('id, name').order('created_at', { ascending: false })
    setLeads(data || [])
  }

  useEffect(() => {
    loadProjects(); loadLeads(); loadStageTemplates()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUser(user.user_metadata?.full_name || user.email || 'Unknown')
    })
  }, [])

  async function loadStageTemplates() {
    const { data } = await supabase.from('stage_templates').select('*').order('stage_type', { ascending: false }).order('sort_order')
    setStageTemplates(data || [])
  }

  async function selectProject(projectId: string) {
    setSelectedProjectId(projectId)
    setActiveTab('overview')
    const proj = projects.find((p) => p.id === projectId)
    await loadProject(projectId)
    await loadStages(projectId)
    if (proj?.proposal_id) await loadBudget(projectId, proj.proposal_id)
  }

  // ─── Create project ────────────────────────────────────────────────────────

  async function createProject() {
    if (!newProjectName.trim() || !selectedLeadId) return
    let budget = null
    if (selectedProposalId) {
      const { data: prop } = await supabase.from('proposals').select('total_price').eq('id', selectedProposalId).single()
      budget = prop?.total_price || null
    }
    // Auto-assign next project number — find max across all projects
    const { data: existingProjects } = await supabase.from('projects').select('project_number')
    const maxNumber = existingProjects && existingProjects.length > 0
      ? Math.max(0, ...existingProjects.map((p: any) => Number(p.project_number) || 0))
      : 0
    const nextNumber = maxNumber + 1
    const { data: newProject, error } = await supabase.from('projects').insert([{
      name: newProjectName.trim(), lead_id: selectedLeadId || null,
      proposal_id: selectedProposalId || null, service: newProjectService || null,
      status: 'active', budget, labor_rate: Number(newProjectLaborRate) || 75, color: newProjectColor,
      project_number: nextNumber,
    }]).select().single()
    if (error) { console.error(error); return }
    const stageRows = stageTemplates.map((s, i) => ({ project_id: newProject.id, stage: s.name, step_name: s.step_name, sort_order: s.sort_order ?? i, completed: false }))
    await supabase.from('project_stages').insert(stageRows)
    setShowNewProject(false)
    setNewProjectName(''); setSelectedLeadId(''); setSelectedProposalId(''); setNewProjectService(''); setNewProjectLaborRate('75'); setNewProjectColor(PRESET_COLORS[0])
    await loadProjects()
    selectProject(newProject.id)
  }

  // ─── Stage actions ─────────────────────────────────────────────────────────

  async function markStarted(stepId: string, stepName: string) {
    const confirmed = window.confirm(`Mark "${stepName}" as started?\n\nThis will record today as the start date.`)
    if (!confirmed) return
    const now = new Date().toISOString()
    await supabase.from('project_stages').update({ started_at: now }).eq('id', stepId)
    if (selectedProjectId) {
      await supabase.from('project_daily_logs').insert([{ project_id: selectedProjectId, note: `▶ Stage started: ${stepName}`, created_by: currentUser, created_at: now }])
      loadStages(selectedProjectId); loadLogs(selectedProjectId)
    }
  }

  async function markComplete(stepId: string, stepName: string) {
    const confirmed = window.confirm(`Mark "${stepName}" as complete?\n\nThis cannot be undone.`)
    if (!confirmed) return
    const now = new Date().toISOString()
    await supabase.from('project_stages').update({ completed: true, completed_at: now }).eq('id', stepId)
    if (selectedProjectId) {
      await supabase.from('project_daily_logs').insert([{ project_id: selectedProjectId, note: `✓ Stage completed: ${stepName}`, created_by: currentUser, created_at: now }])
      loadStages(selectedProjectId); loadLogs(selectedProjectId)
    }
  }

  // ─── Save planned dates with confirmation ──────────────────────────────────

  async function savePlannedDates(stepId: string) {
    const edit = plannedEdits[stepId]
    if (!edit) return
    const { error } = await supabase.from('project_stages').update({
      planned_start: edit.planned_start || null,
      planned_end: edit.planned_end || null,
    }).eq('id', stepId)
    if (error) { console.error(error); return }
    // Remove from edits and mark as saved
    setPlannedEdits((prev) => { const next = { ...prev }; delete next[stepId]; return next })
    setSavedSteps((prev) => new Set([...prev, stepId]))
    setTimeout(() => setSavedSteps((prev) => { const next = new Set(prev); next.delete(stepId); return next }), 2000)
    if (selectedProjectId) loadStages(selectedProjectId)
  }

  // ─── Project updates ───────────────────────────────────────────────────────

  async function addLog() {
    if (!newLog.trim() || !selectedProjectId) return
    await supabase.from('project_daily_logs').insert([{ project_id: selectedProjectId, note: newLog.trim(), created_by: currentUser }])
    setNewLog(''); loadLogs(selectedProjectId)
  }

  // ─── Tasks ─────────────────────────────────────────────────────────────────

  async function addTask() {
    if (!newTaskTitle.trim() || !selectedProjectId) return
    await supabase.from('project_tasks').insert([{ project_id: selectedProjectId, title: newTaskTitle.trim(), assigned_to: newTaskAssignedTo.trim() || null, completed: false }])
    setNewTaskTitle(''); setNewTaskAssignedTo(''); loadTasks(selectedProjectId)
  }

  async function toggleTask(taskId: string, completed: boolean) {
    await supabase.from('project_tasks').update({ completed: !completed }).eq('id', taskId)
    if (selectedProjectId) loadTasks(selectedProjectId)
  }

  async function deleteTask(taskId: string) {
    await supabase.from('project_tasks').delete().eq('id', taskId)
    if (selectedProjectId) loadTasks(selectedProjectId)
  }

  // ─── Time clock ────────────────────────────────────────────────────────────

  async function clockIn() {
    if (!selectedProjectId) return
    await supabase.from('time_clock').insert([{ project_id: selectedProjectId, employee_name: currentUser, clock_in: new Date().toISOString(), notes: clockNote.trim() || null }])
    setClockNote(''); loadTimeEntries(selectedProjectId)
  }

  async function clockOut(entryId: string) {
    await supabase.from('time_clock').update({ clock_out: new Date().toISOString() }).eq('id', entryId)
    if (selectedProjectId) loadTimeEntries(selectedProjectId)
  }

  function hoursWorked(entry: any): number {
    if (!entry.clock_in || !entry.clock_out) return 0
    return (new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime()) / 3600000
  }

  const totalHours = timeEntries.reduce((sum, e) => sum + hoursWorked(e), 0)
  const laborRate = project?.labor_rate || 75
  const totalLaborCost = totalHours * laborRate

  // Labor-hours rows: name contains "labor" AND unit is explicitly hours
  function isHourlyLaborRow(row: any): boolean {
    const unit = (row.unit || '').toLowerCase().trim()
    const name = (row.name || '').toLowerCase()
    return ['hr', 'hrs', 'hour', 'hours'].includes(unit) && name.includes('labor')
  }

  // Group hourly labor rows by type for breakdown
  const allRowsFlat = budgetItems.flatMap((item: any) => (item.proposal_item_rows || []).map((row: any) => ({ ...row, item_name: item.name })))
  const hourlyLaborRows = allRowsFlat.filter(isHourlyLaborRow)
  const laborByType: Record<string, { hours: number; rate: number; cost: number }> = {}
  for (const row of hourlyLaborRows) {
    const typeName = row.name || 'Labor'
    const hrs = Number(row.quantity || 0)
    const rate = Number(row.unit_cost || 0)
    if (!laborByType[typeName]) laborByType[typeName] = { hours: 0, rate, cost: 0 }
    laborByType[typeName].hours += hrs
    laborByType[typeName].cost += hrs * rate
  }
  const budgetedLaborHours = hourlyLaborRows.reduce((sum: number, row: any) => sum + Number(row.quantity || 0), 0)
  const budgetedLaborCost = hourlyLaborRows.reduce((sum: number, row: any) => sum + Number(row.quantity || 0) * Number(row.unit_cost || 0), 0)

  // ─── Budget actuals ────────────────────────────────────────────────────────

  async function saveActual(rowId: string) {
    const edit = actualEdits[rowId]
    if (!edit || !selectedProjectId) return
    const existing = actuals.find((a) => a.proposal_item_row_id === rowId)
    if (existing) {
      await supabase.from('project_budget_actuals').update({ actual_cost: Number(edit.actual_cost) || null, notes: edit.notes || null }).eq('id', existing.id)
    } else {
      await supabase.from('project_budget_actuals').insert([{ project_id: selectedProjectId, proposal_item_row_id: rowId, actual_cost: Number(edit.actual_cost) || null, notes: edit.notes || null }])
    }
    setActualEdits((prev) => { const next = { ...prev }; delete next[rowId]; return next })
    if (project?.proposal_id) loadBudget(selectedProjectId!, project.proposal_id)
  }

  // ─── Derived ───────────────────────────────────────────────────────────────

  // Build stageGroups dynamically from DB templates
  const stageGroupNames = [...new Set(stageTemplates.map((s) => s.name))]
  const stageGroups = stageGroupNames.map((groupName) => {
    const groupSteps = stageTemplates
      .filter((s) => s.name === groupName)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s) => ({ step_name: s.step_name, stage: groupName }))
    const groupStageRecords = stages.filter((s) => s.stage === groupName)
    return {
      stage: groupName,
      steps: groupSteps,
      totalCount: groupSteps.length,
      completedCount: groupStageRecords.filter((s) => s.completed).length,
    }
  })

  const overallPct = stages.length > 0 ? Math.round((stages.filter((s) => s.completed).length / stages.length) * 100) : 0

  // Non-labor rows: anything that is NOT an hourly labor row
  const nonLaborRows = allRowsFlat.filter((row: any) => !isHourlyLaborRow(row))
  const totalBudgetedMaterials = nonLaborRows.reduce((sum, row) => sum + Number(row.quantity || 0) * Number(row.unit_cost || 0), 0)
  const totalActualMaterials = nonLaborRows.reduce((sum, row) => { const act = actuals.find((a) => a.proposal_item_row_id === row.id); return sum + Number(act?.actual_cost || 0) }, 0)

  const projectColor = project?.color || '#185FA5'

  const schedulableStepNames = new Set(stageTemplates.filter((s) => s.stage_type === 'construction').map((s) => s.step_name))
  const ganttSteps = stages.filter((s) => schedulableStepNames.has(s.step_name) && (s.planned_start || s.started_at))
  const allDates = ganttSteps.flatMap((s: any) => [s.planned_start, s.planned_end, s.started_at, s.completed_at].filter(Boolean))
  const ganttStartDate = allDates.length > 0 ? new Date(Math.min(...allDates.map((d: string) => new Date(d).getTime()))) : new Date()
  const ganttEndDate = allDates.length > 0 ? new Date(Math.max(...allDates.map((d: string) => new Date(d).getTime()))) : new Date()
  ganttStartDate.setDate(ganttStartDate.getDate() - 2)
  ganttEndDate.setDate(ganttEndDate.getDate() + 4)
  const totalGanttDays = Math.max(1, daysBetween(ganttStartDate.toISOString(), ganttEndDate.toISOString()))

  function ganttPct(date: string): number {
    return Math.max(0, Math.min(100, (daysBetween(ganttStartDate.toISOString(), date) / totalGanttDays) * 100))
  }

  function ganttWidth(start: string, end: string): number {
    return Math.max(1, Math.min(100 - ganttPct(start), (daysBetween(start, end) / totalGanttDays) * 100))
  }

  const btnPrimary = { padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500 as const, border: 'none', cursor: 'pointer', background: '#185FA5', color: 'white' }
  const inputStyle = { padding: '8px 10px', borderRadius: 8, border: '0.5px solid #e5e5e5', background: '#fafafa', fontSize: 13, outline: 'none' } as React.CSSProperties

  // ─── Mobile helpers ───────────────────────────────────────────────────────

  async function loadMobileProject(proj: any) {
    setMobileProject(proj)
    setMobileView('detail')
    setMobileTab('updates')
    const { data: logs } = await supabase.from('project_daily_logs').select('*').eq('project_id', proj.id).order('created_at', { ascending: false })
    setMobileLogs(logs || [])
    const { data: entries } = await supabase.from('time_clock').select('*').eq('project_id', proj.id).order('clock_in', { ascending: false })
    setMobileTimeEntries(entries || [])
  }

  async function mobileAddLog() {
    if (!mobileNewLog.trim() || !mobileProject) return
    await supabase.from('project_daily_logs').insert([{ project_id: mobileProject.id, note: mobileNewLog.trim(), created_by: currentUser }])
    setMobileNewLog('')
    const { data } = await supabase.from('project_daily_logs').select('*').eq('project_id', mobileProject.id).order('created_at', { ascending: false })
    setMobileLogs(data || [])
  }

  async function mobileClockIn() {
    if (!mobileClockEmployee.trim() || !mobileProject) return
    await supabase.from('time_clock').insert([{ project_id: mobileProject.id, employee_name: currentUser, clock_in: new Date().toISOString() }])
    const { data } = await supabase.from('time_clock').select('*').eq('project_id', mobileProject.id).order('clock_in', { ascending: false })
    setMobileTimeEntries(data || [])
  }

  async function mobileClockOut(entryId: string) {
    await supabase.from('time_clock').update({ clock_out: new Date().toISOString() }).eq('id', entryId)
    const { data } = await supabase.from('time_clock').select('*').eq('project_id', mobileProject.id).order('clock_in', { ascending: false })
    setMobileTimeEntries(data || [])
  }

  function mobileHoursWorked(entry: any): number {
    if (!entry.clock_in || !entry.clock_out) return 0
    return (new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime()) / 3600000
  }

  const activeProjects = projects.filter((p) => p.status === 'active')

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f4f7fb' }}>
      <NavSidebar />

      {/* ── MOBILE VIEW ──────────────────────────────────────────── */}
      <div className="md:hidden flex-1 flex flex-col overflow-hidden" style={{ background: '#f4f7fb' }}>

        {mobileView === 'list' ? (
          <>
            {/* Header */}
            <MobileHeader title="Projects" />
            {/* Active project cards */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 100px' }}>
              {activeProjects.length === 0 && <p style={{ textAlign: 'center', color: '#bbb', fontSize: 14, marginTop: 32 }}>No active projects.</p>}
              {activeProjects.map((p) => (
                <div key={p.id} onClick={() => loadMobileProject(p)}
                  style={{ background: 'white', borderRadius: 14, padding: '14px 16px', marginBottom: 12, border: '0.5px solid #e8e8e8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: p.color || '#185FA5', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      {p.project_number && <span style={{ fontSize: 10, fontWeight: 600, color: '#aaa', background: '#f0f0f0', padding: '1px 6px', borderRadius: 20 }}>#{p.project_number}</span>}
                      <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                    </div>
                    <p style={{ fontSize: 13, color: '#777', margin: 0 }}>{p.leads?.name || '—'}</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Project detail header */}
            <div style={{ flexShrink: 0, background: 'white', borderBottom: '0.5px solid #eee', padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <button onClick={() => setMobileView('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#185FA5', fontSize: 20 }}>‹</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: mobileProject?.color || '#185FA5', flexShrink: 0 }} />
                  <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mobileProject?.name}</p>
                </div>
              </div>
              {/* Tab bar */}
              <div style={{ display: 'flex', gap: 0, border: '0.5px solid #e5e5e5', borderRadius: 10, overflow: 'hidden' }}>
                {[{ id: 'updates', label: 'Project Updates' }, { id: 'timeclock', label: 'Time Clock' }].map((tab) => (
                  <button key={tab.id} onClick={() => setMobileTab(tab.id as any)}
                    style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', background: mobileTab === tab.id ? (mobileProject?.color || '#185FA5') : 'white', color: mobileTab === tab.id ? 'white' : '#666' }}>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 100px' }}>

              {/* Project Updates tab */}
              {mobileTab === 'updates' && (
                <div>
                  <div style={{ background: 'white', borderRadius: 14, padding: '14px', marginBottom: 14, border: '0.5px solid #e8e8e8' }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#555', margin: '0 0 10px' }}>Add Update</p>
                    <textarea value={mobileNewLog} onChange={(e) => setMobileNewLog(e.target.value)} placeholder="What happened today?" rows={3}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '0.5px solid #e5e5e5', background: '#fafafa', fontSize: 14, outline: 'none', resize: 'none', lineHeight: 1.5, marginBottom: 10 }} />
                    <button onClick={mobileAddLog} disabled={!mobileNewLog.trim()}
                      style={{ width: '100%', padding: '12px', borderRadius: 12, background: mobileNewLog.trim() ? (mobileProject?.color || '#185FA5') : '#f0f0f0', color: mobileNewLog.trim() ? 'white' : '#bbb', fontSize: 14, fontWeight: 500, border: 'none', cursor: mobileNewLog.trim() ? 'pointer' : 'not-allowed' }}>
                      Post Update
                    </button>
                  </div>
                  {mobileLogs.map((log) => (
                    <div key={log.id} style={{ background: 'white', borderRadius: 12, padding: '12px 14px', marginBottom: 10, border: '0.5px solid #e8e8e8' }}>
                      <p style={{ fontSize: 14, color: '#333', margin: '0 0 6px', lineHeight: 1.5 }}>{log.note}</p>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: mobileProject?.color || '#185FA5', fontWeight: 500 }}>{log.created_by}</span>
                        <span style={{ color: '#ddd' }}>•</span>
                        <span style={{ fontSize: 12, color: '#aaa' }}>{formatTs(log.created_at)}</span>
                      </div>
                    </div>
                  ))}
                  {mobileLogs.length === 0 && <p style={{ textAlign: 'center', color: '#bbb', fontSize: 13, marginTop: 16 }}>No updates yet.</p>}
                </div>
              )}

              {/* Time Clock tab */}
              {mobileTab === 'timeclock' && (
                <div>
                  {/* Show who is clocking in */}
                  <div style={{ background: '#E6F1FB', borderRadius: 14, padding: '12px 14px', marginBottom: 14, border: '0.5px solid #c5d5e8' }}>
                    <p style={{ fontSize: 12, color: '#0C447C', margin: 0 }}>Clocking in as <strong>{currentUser}</strong></p>
                  </div>

                  {/* Currently clocked in? */}
                  {mobileTimeEntries.filter((e) => !e.clock_out && e.employee_name === currentUser).map((entry) => (
                    <div key={entry.id} style={{ background: '#EAF3DE', border: '0.5px solid #c0dd97', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#27500A', margin: '0 0 4px' }}>✓ Clocked in</p>
                      <p style={{ fontSize: 12, color: '#555', margin: '0 0 12px' }}>Since {formatTs(entry.clock_in)}</p>
                      <button onClick={() => mobileClockOut(entry.id)}
                        style={{ width: '100%', padding: '12px', borderRadius: 12, background: '#27500A', color: 'white', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
                        Clock Out
                      </button>
                    </div>
                  ))}

                  {/* Clock in button — only if not already clocked in */}
                  {mobileTimeEntries.filter((e) => !e.clock_out && e.employee_name === currentUser).length === 0 && (
                    <button onClick={mobileClockIn}
                      style={{ width: '100%', padding: '16px', borderRadius: 14, background: mobileProject?.color || '#185FA5', color: 'white', fontSize: 16, fontWeight: 600, border: 'none', cursor: 'pointer', marginBottom: 14 }}>
                      Clock In to {mobileProject?.name}
                    </button>
                  )}

                  {/* Time log */}
                  {mobileTimeEntries.filter((e) => e.clock_out).length > 0 && (
                    <div style={{ background: 'white', borderRadius: 14, overflow: 'hidden', border: '0.5px solid #e8e8e8' }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '12px 14px', borderBottom: '0.5px solid #f0f0f0', margin: 0 }}>Recent Time Entries</p>
                      {mobileTimeEntries.filter((e) => e.clock_out).slice(0, 10).map((entry, i, arr) => (
                        <div key={entry.id} style={{ padding: '10px 14px', borderBottom: i < arr.length - 1 ? '0.5px solid #f5f5f5' : 'none' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1a2e', margin: 0 }}>{entry.employee_name}</p>
                            <p style={{ fontSize: 13, fontWeight: 600, color: mobileProject?.color || '#185FA5', margin: 0 }}>{mobileHoursWorked(entry).toFixed(1)} hrs</p>
                          </div>
                          <p style={{ fontSize: 11, color: '#aaa', margin: '2px 0 0' }}>{formatTs(entry.clock_in)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* PROJECTS LIST SIDEBAR — desktop only */}
      <div className="hidden md:flex flex-col flex-shrink-0" style={{ width: 240, background: 'white', borderRight: '0.5px solid #eee' }}>
        <div style={{ padding: '20px 16px 12px', borderBottom: '0.5px solid #f0f0f0' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', margin: '0 0 12px' }}>Projects</p>
          <button onClick={() => setShowNewProject(true)} style={{ ...btnPrimary, width: '100%', padding: '9px', borderRadius: 9, fontSize: 13 }}>+ New Project</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {projects.length === 0 && <p style={{ fontSize: 13, color: '#bbb', padding: '12px 8px' }}>No projects yet.</p>}
          {projects.map((p) => (
            <div key={p.id} onClick={() => selectProject(p.id)}
              style={{ padding: '10px 12px', borderRadius: 10, cursor: 'pointer', marginBottom: 4, background: selectedProjectId === p.id ? '#E6F1FB' : 'transparent', display: 'flex', alignItems: 'center', gap: 10 }}
              onMouseOver={(e) => { if (selectedProjectId !== p.id) e.currentTarget.style.background = '#f5f5f5' }}
              onMouseOut={(e) => { if (selectedProjectId !== p.id) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color || '#185FA5', flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {p.project_number && <span style={{ fontSize: 10, fontWeight: 600, color: selectedProjectId === p.id ? '#0C447C' : '#aaa', background: selectedProjectId === p.id ? '#d0e6f7' : '#f0f0f0', padding: '1px 6px', borderRadius: 20, flexShrink: 0 }}>#{p.project_number}</span>}
                  <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: selectedProjectId === p.id ? '#0C447C' : '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                </div>
                <p style={{ fontSize: 11, color: '#aaa', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.leads?.name || '—'}</p>
                <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: p.status === 'completed' ? '#EAF3DE' : p.status === 'on_hold' ? '#FAEEDA' : '#E6F1FB', color: p.status === 'completed' ? '#27500A' : p.status === 'on_hold' ? '#633806' : '#0C447C', fontWeight: 500, display: 'inline-block', marginTop: 4 }}>
                  {p.status === 'on_hold' ? 'On Hold' : p.status === 'completed' ? 'Completed' : 'Active'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT — desktop only */}
      <div className="hidden md:flex flex-1 flex-col overflow-hidden">
        {!selectedProjectId ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <p style={{ fontSize: 16, color: '#bbb' }}>Select a project or create a new one.</p>
          </div>
        ) : (
          <>
            {/* Top bar */}
            <div style={{ flexShrink: 0, background: 'white', borderBottom: '0.5px solid #eee', padding: '14px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: projectColor, flexShrink: 0 }} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {project?.project_number && <span style={{ fontSize: 12, fontWeight: 600, color: projectColor, background: `rgba(${hexToRgb(projectColor)}, 0.1)`, padding: '2px 8px', borderRadius: 20 }}>#{project.project_number}</span>}
                      <p style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#1a1a2e' }}>{project?.name}</p>
                    </div>
                    <p style={{ fontSize: 12, color: '#aaa', margin: '2px 0 0' }}>{project?.leads?.name} &bull; {project?.leads?.address}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: projectColor }}>{overallPct}% complete</span>
                  <select value={project?.status || 'active'} onChange={async (e) => { await supabase.from('projects').update({ status: e.target.value }).eq('id', selectedProjectId); loadProject(selectedProjectId); loadProjects() }}
                    style={{ ...inputStyle, fontSize: 12, padding: '5px 10px', borderRadius: 20, background: '#f5f5f5', border: 'none' }}>
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {stageGroups.map((sg) => {
                  const pct = sg.totalCount > 0 ? sg.completedCount / sg.totalCount : 0
                  return (
                    <div key={sg.stage} style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{sg.stage}</span>
                        <span style={{ fontSize: 10, color: '#aaa' }}>{sg.completedCount}/{sg.totalCount}</span>
                      </div>
                      <div style={{ height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct * 100}%`, background: projectColor, borderRadius: 4, transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Tabs */}
            <div style={{ flexShrink: 0, background: 'white', borderBottom: '0.5px solid #eee', padding: '0 24px', display: 'flex' }}>
              {['overview', 'schedule', 'budget', 'updates', 'tasks', 'timeclock'].map((tab) => {
                const labels: Record<string, string> = { overview: 'Overview', schedule: 'Schedule', budget: 'Budget', updates: 'Project Updates', tasks: 'Tasks', timeclock: 'Time Clock' }
                return (
                  <button key={tab} onClick={() => {
                    setActiveTab(tab)
                    if (tab === 'updates') loadLogs(selectedProjectId)
                    if (tab === 'tasks') loadTasks(selectedProjectId)
                    if (tab === 'timeclock') loadTimeEntries(selectedProjectId)
                    if (tab === 'budget' && project?.proposal_id) loadBudget(selectedProjectId, project.proposal_id)
                  }}
                    style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, border: 'none', background: 'transparent', cursor: 'pointer', color: activeTab === tab ? projectColor : '#aaa', borderBottom: activeTab === tab ? `2px solid ${projectColor}` : '2px solid transparent', marginBottom: -1 }}
                  >
                    {labels[tab]}
                  </button>
                )
              })}
            </div>

            <div className="flex-1 overflow-y-auto" style={{ padding: 24 }}>

              {/* ── OVERVIEW ── */}
              {activeTab === 'overview' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 14, padding: '20px' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', margin: '0 0 14px' }}>Project Info</p>
                    {[
                      { label: 'Customer', value: project?.leads?.name },
                      { label: 'Address', value: project?.leads?.address },
                      { label: 'Phone', value: project?.leads?.phone },
                      { label: 'Service', value: project?.service },
                      { label: 'Contract Amount', value: project?.budget ? `$${Number(project.budget).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—' },
                      { label: 'Proposal', value: project?.proposals?.title },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid #f5f5f5' }}>
                        <span style={{ fontSize: 13, color: '#aaa' }}>{label}</span>
                        <span style={{ fontSize: 13, color: '#1a1a2e', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value || '—'}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 14, padding: '20px', maxHeight: 520, overflowY: 'auto' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', margin: '0 0 14px' }}>Stage Checklist</p>
                    {stageGroups.map((sg) => (
                      <div key={sg.stage} style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: projectColor, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>{sg.stage}</p>
                        {sg.steps.map((step) => {
                          // Look up actual stage record for this step
                          const stageRecord = stages.find((s) => s.step_name === step.step_name && s.stage === step.stage)
                          const isSchedulable = schedulableStepNames.has(step.step_name)
                          const isCompleted = stageRecord?.completed
                          const isStarted = !!stageRecord?.started_at
                          const isPlanned = !!stageRecord?.planned_start
                          return (
                            <div key={step.step_name} style={{ marginBottom: 6 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: isCompleted ? '#f0faf0' : isStarted ? '#f0f7ff' : 'transparent' }}>
                                <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${isCompleted ? '#27500A' : isStarted ? projectColor : '#ddd'}`, background: isCompleted ? '#27500A' : isStarted ? `rgba(${hexToRgb(projectColor)}, 0.15)` : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  {isCompleted && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                  {isStarted && !isCompleted && <div style={{ width: 6, height: 6, borderRadius: '50%', background: projectColor }} />}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <span style={{ fontSize: 13, color: isCompleted ? '#aaa' : '#333', textDecoration: isCompleted ? 'line-through' : 'none' }}>{step.step_name}</span>
                                  {isStarted && !isCompleted && <p style={{ fontSize: 11, color: '#aaa', margin: '2px 0 0' }}>Started {fmtDate(stageRecord?.started_at)}</p>}
                                  {isCompleted && stageRecord?.started_at && <p style={{ fontSize: 11, color: '#aaa', margin: '2px 0 0' }}>{fmtDate(stageRecord.started_at)} → {fmtDate(stageRecord.completed_at)} ({daysBetween(stageRecord.started_at, stageRecord.completed_at)} days)</p>}
                                  {!isStarted && isPlanned && <p style={{ fontSize: 11, color: '#aaa', margin: '2px 0 0' }}>Planned: {fmtDate(stageRecord?.planned_start)}{stageRecord?.planned_end ? ` → ${fmtDate(stageRecord.planned_end)}` : ''}</p>}
                                </div>
                                {!isCompleted && isSchedulable && !isStarted && stageRecord && (
                                  <button onClick={() => markStarted(stageRecord.id, stageRecord.step_name)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: `rgba(${hexToRgb(projectColor)}, 0.1)`, color: projectColor, border: `0.5px solid rgba(${hexToRgb(projectColor)}, 0.3)`, cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>Mark Started</button>
                                )}
                                {!isCompleted && isStarted && stageRecord && (
                                  <button onClick={() => markComplete(stageRecord.id, stageRecord.step_name)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: '#EAF3DE', color: '#27500A', border: '0.5px solid #c0dd97', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>Mark Complete</button>
                                )}
                                {!isCompleted && !isSchedulable && stageRecord && (
                                  <button onClick={() => markComplete(stageRecord.id, stageRecord.step_name)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: '#f5f5f5', color: '#888', border: '0.5px solid #e0e0e0', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>Mark Done</button>
                                )}
                                {isCompleted && stageRecord?.completed_at && (
                                  <span style={{ fontSize: 11, color: '#aaa', whiteSpace: 'nowrap' }}>{new Date(stageRecord.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── SCHEDULE ── */}
              {activeTab === 'schedule' && (
                <div>
                  <div style={{ background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
                    <div style={{ padding: '14px 20px', borderBottom: '0.5px solid #f0f0f0', background: '#fafafa' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', margin: 0 }}>Planned Dates</p>
                      <p style={{ fontSize: 12, color: '#aaa', margin: '3px 0 0' }}>Set planned start and end dates. Actual dates are recorded when you mark steps started and complete.</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px 150px 100px', gap: 8, padding: '9px 16px', background: '#fafafa', borderBottom: '0.5px solid #f0f0f0' }}>
                      {['Step', 'Planned Start', 'Planned End', ''].map((h) => (
                        <span key={h} style={{ fontSize: 11, color: '#aaa', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</span>
                      ))}
                    </div>
                    {stages.filter((s) => schedulableStepNames.has(s.step_name)).map((step, i, arr) => {
                      const edit = plannedEdits[step.id]
                      const hasEdit = !!edit
                      const isSaved = savedSteps.has(step.id)
                      return (
                        <div key={step.id} style={{ display: 'grid', gridTemplateColumns: '1fr 150px 150px 100px', gap: 8, padding: '10px 16px', borderBottom: i < arr.length - 1 ? '0.5px solid #f5f5f5' : 'none', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: step.completed ? '#27500A' : step.started_at ? projectColor : step.planned_start ? `rgba(${hexToRgb(projectColor)}, 0.4)` : '#ddd', flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: step.completed ? '#aaa' : '#333', textDecoration: step.completed ? 'line-through' : 'none' }}>{step.step_name}</span>
                          </div>
                          <input type="date"
                            value={edit?.planned_start ?? fmtDateInput(step.planned_start || '')}
                            onChange={(e) => setPlannedEdits((prev) => ({ ...prev, [step.id]: { planned_start: e.target.value, planned_end: prev[step.id]?.planned_end ?? fmtDateInput(step.planned_end || '') } }))}
                            style={{ ...inputStyle, padding: '6px 8px', fontSize: 12, width: '100%', boxSizing: 'border-box' as const }}
                          />
                          <input type="date"
                            value={edit?.planned_end ?? fmtDateInput(step.planned_end || '')}
                            onChange={(e) => setPlannedEdits((prev) => ({ ...prev, [step.id]: { planned_start: prev[step.id]?.planned_start ?? fmtDateInput(step.planned_start || ''), planned_end: e.target.value } }))}
                            style={{ ...inputStyle, padding: '6px 8px', fontSize: 12, width: '100%', boxSizing: 'border-box' as const }}
                          />
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button onClick={() => savePlannedDates(step.id)} disabled={!hasEdit}
                              style={{ ...btnPrimary, padding: '6px 12px', fontSize: 12, background: hasEdit ? projectColor : '#f0f0f0', color: hasEdit ? 'white' : '#bbb', cursor: hasEdit ? 'pointer' : 'not-allowed' }}>
                              Save
                            </button>
                            {isSaved && <span style={{ fontSize: 12, color: '#27500A', fontWeight: 500 }}>✓ Saved</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Gantt */}
                  {ganttSteps.length === 0 ? (
                    <div style={{ background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 14, padding: '32px', textAlign: 'center' }}>
                      <p style={{ fontSize: 14, color: '#bbb', margin: 0 }}>No scheduled steps yet. Set planned dates above to see the timeline.</p>
                    </div>
                  ) : (
                    <div style={{ background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 14, overflow: 'hidden' }}>
                      <div style={{ padding: '14px 20px', borderBottom: '0.5px solid #f0f0f0', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', margin: 0 }}>Timeline</p>
                        <div style={{ display: 'flex', gap: 16 }}>
                          {[{ bg: `rgba(${hexToRgb(projectColor)}, 0.2)`, border: `1px dashed ${projectColor}`, label: 'Planned' }, { bg: projectColor, border: 'none', label: 'Actual' }].map(({ bg, border, label }) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 16, height: 8, borderRadius: 3, background: bg, border }} />
                              <span style={{ fontSize: 12, color: '#aaa' }}>{label}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Date markers */}
                      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', borderBottom: '0.5px solid #f0f0f0' }}>
                        <div style={{ background: '#fafafa', padding: '6px 0' }} />
                        <div style={{ background: '#fafafa', position: 'relative', height: 28, overflow: 'hidden' }}>
                          {Array.from({ length: 6 }).map((_, i) => {
                            const pct = (i / 5) * 100
                            const d = new Date(ganttStartDate.getTime() + (i / 5) * (ganttEndDate.getTime() - ganttStartDate.getTime()))
                            return (
                              <span key={i} style={{ position: 'absolute', left: `${pct}%`, fontSize: 10, color: '#bbb', transform: 'translateX(-50%)', whiteSpace: 'nowrap', top: 8 }}>
                                {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )
                          })}
                        </div>
                      </div>

                      {ganttSteps.map((step, i) => (
                        <div key={step.id} style={{ display: 'grid', gridTemplateColumns: '200px 1fr', borderBottom: i < ganttSteps.length - 1 ? '0.5px solid #f5f5f5' : 'none', alignItems: 'center' }}>
                          <div style={{ padding: '10px 16px', borderRight: '0.5px solid #f5f5f5' }}>
                            <p style={{ fontSize: 12, color: step.completed ? '#aaa' : '#333', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: step.completed ? 'line-through' : 'none' }}>{step.step_name}</p>
                            <p style={{ fontSize: 10, color: step.completed ? '#27500A' : step.started_at ? projectColor : '#aaa', margin: '2px 0 0' }}>
                              {step.completed ? 'Complete' : step.started_at ? 'In progress' : 'Planned'}
                            </p>
                          </div>
                          <div style={{ position: 'relative', height: 44, padding: '0 4px' }}>
                            {/* Planned bar */}
                            {step.planned_start && (
                              <div style={{ position: 'absolute', left: `${ganttPct(step.planned_start)}%`, width: `${ganttWidth(step.planned_start, step.planned_end || step.planned_start)}%`, top: 7, height: 12, background: `rgba(${hexToRgb(projectColor)}, 0.2)`, border: `1px dashed rgba(${hexToRgb(projectColor)}, 0.6)`, borderRadius: 4 }} />
                            )}
                            {/* Actual bar */}
                            {step.started_at && (
                              <div style={{ position: 'absolute', left: `${ganttPct(step.started_at)}%`, width: `${ganttWidth(step.started_at, step.completed_at || new Date().toISOString())}%`, top: 25, height: 12, background: step.completed ? projectColor : `rgba(${hexToRgb(projectColor)}, 0.7)`, borderRadius: 4 }} />
                            )}
                            {/* Today line */}
                            <div style={{ position: 'absolute', left: `${ganttPct(new Date().toISOString())}%`, top: 0, bottom: 0, width: 1, background: '#E24B4A', opacity: 0.6 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── BUDGET ── */}
              {activeTab === 'budget' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                    {[
                      { label: 'Contract Budget', value: `$${Number(project?.budget || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: '#1a1a2e' },
                      { label: 'Budgeted Materials', value: `$${totalBudgetedMaterials.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: '#185FA5' },
                      { label: 'Actual Materials', value: `$${totalActualMaterials.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: totalActualMaterials > totalBudgetedMaterials ? '#A32D2D' : '#27500A' },
                      { label: 'Budgeted Labor', value: `$${budgetedLaborCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: '#185FA5' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 14, padding: '16px 20px' }}>
                        <p style={{ fontSize: 11, color: '#aaa', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>{label}</p>
                        <p style={{ fontSize: 20, fontWeight: 600, margin: 0, color }}>{value}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 14, padding: '16px 20px', marginBottom: 16 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', margin: '0 0 12px' }}>Labor Summary</p>
                    {/* Totals row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
                      {[
                        { label: 'Total Budgeted Hours', value: `${budgetedLaborHours.toFixed(1)} hrs` },
                        { label: 'Total Budgeted Labor Cost', value: `$${budgetedLaborCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
                        { label: 'Actual Hours Clocked', value: `${totalHours.toFixed(1)} hrs` },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ background: '#fafafa', borderRadius: 10, padding: '10px 14px' }}>
                          <p style={{ fontSize: 11, color: '#aaa', margin: '0 0 4px' }}>{label}</p>
                          <p style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e', margin: 0 }}>{value}</p>
                        </div>
                      ))}
                    </div>
                    {/* Per-type breakdown */}
                    {Object.keys(laborByType).length > 0 && (
                      <div style={{ border: '0.5px solid #f0f0f0', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 120px', gap: 8, padding: '8px 14px', background: '#fafafa', borderBottom: '0.5px solid #f0f0f0' }}>
                          {['Labor Type', 'Rate', 'Budgeted Hrs', 'Budgeted Cost'].map((h) => (
                            <span key={h} style={{ fontSize: 11, color: '#aaa', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</span>
                          ))}
                        </div>
                        {Object.entries(laborByType).map(([type, data]) => (
                          <div key={type} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 120px', gap: 8, padding: '10px 14px', borderBottom: '0.5px solid #f5f5f5', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a2e' }}>{type}</span>
                            <span style={{ fontSize: 13, color: '#555' }}>${data.rate}/hr</span>
                            <span style={{ fontSize: 13, color: '#555' }}>{data.hours.toFixed(1)} hrs</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: projectColor }}>${data.cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 120px', gap: 8, padding: '10px 14px', background: '#fafafa', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>Total</span>
                          <span style={{ fontSize: 13, color: '#aaa' }}>—</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{budgetedLaborHours.toFixed(1)} hrs</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: projectColor }}>${budgetedLaborCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    )}
                    {Object.keys(laborByType).length === 0 && (
                      <p style={{ fontSize: 13, color: '#bbb', margin: 0 }}>No hourly labor rows found in this proposal.</p>
                    )}
                  </div>
                  {!project?.proposal_id ? (
                    <p style={{ fontSize: 13, color: '#bbb' }}>No proposal linked to this project.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {budgetSections.map((section) => {
                        // Get non-labor rows for this section only
                        const sectionItems = budgetItems.filter((item: any) => item.section_id === section.id)
                        const sectionRows = sectionItems.flatMap((item: any) =>
                          (item.proposal_item_rows || []).map((row: any) => ({ ...row, item_name: item.name }))
                        ).filter((row: any) => !isHourlyLaborRow(row))
                        if (sectionRows.length === 0) return null
                        const sectionBudgetTotal = sectionRows.reduce((sum: number, row: any) => sum + Number(row.quantity || 0) * Number(row.unit_cost || 0), 0)
                        return (
                          <div key={section.id} style={{ background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 14, overflow: 'hidden' }}>
                            {/* Section header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#f5f9ff', borderBottom: '0.5px solid #e0eaf5' }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: projectColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{section.name}</span>
                              <span style={{ fontSize: 12, fontWeight: 600, color: projectColor }}>${sectionBudgetTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                            {/* Column headers */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 120px 160px 80px', gap: 8, padding: '8px 16px', background: '#fafafa', borderBottom: '0.5px solid #f0f0f0' }}>
                              {['Item', 'Cost Row', 'Budgeted', 'Actual', 'Notes', ''].map((h) => (
                                <span key={h} style={{ fontSize: 11, color: '#aaa', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</span>
                              ))}
                            </div>
                            {sectionRows.map((row: any, ri: number) => {
                              const budgeted = Number(row.quantity || 0) * Number(row.unit_cost || 0)
                              const actual = actuals.find((a: any) => a.proposal_item_row_id === row.id)
                              const edit = actualEdits[row.id]
                              const hasEdit = !!edit
                              return (
                                <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 120px 160px 80px', gap: 8, padding: '10px 16px', borderBottom: ri < sectionRows.length - 1 ? '0.5px solid #f5f5f5' : 'none', alignItems: 'center' }}>
                                  <span style={{ fontSize: 13, color: '#555' }}>{row.item_name}</span>
                                  <span style={{ fontSize: 13, color: '#555' }}>{row.name}</span>
                                  <span style={{ fontSize: 13, color: '#1a1a2e', fontWeight: 500 }}>${budgeted.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                  <input type="number" placeholder="Enter actual" value={edit?.actual_cost ?? (actual?.actual_cost || '')} onChange={(e) => setActualEdits((prev) => ({ ...prev, [row.id]: { actual_cost: e.target.value, notes: prev[row.id]?.notes ?? actual?.notes ?? '' } }))} style={{ ...inputStyle, padding: '6px 8px', fontSize: 12 }} />
                                  <input placeholder="Notes" value={edit?.notes ?? (actual?.notes || '')} onChange={(e) => setActualEdits((prev) => ({ ...prev, [row.id]: { actual_cost: prev[row.id]?.actual_cost ?? String(actual?.actual_cost ?? ''), notes: e.target.value } }))} style={{ ...inputStyle, padding: '6px 8px', fontSize: 12 }} />
                                  <button onClick={() => saveActual(row.id)} disabled={!hasEdit} style={{ ...btnPrimary, padding: '6px 10px', fontSize: 12, background: hasEdit ? projectColor : '#f0f0f0', color: hasEdit ? 'white' : '#bbb', cursor: hasEdit ? 'pointer' : 'not-allowed' }}>Save</button>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── PROJECT UPDATES ── */}
              {activeTab === 'updates' && (
                <div>
                  <div style={{ background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 14, padding: '16px 20px', marginBottom: 16 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#555', margin: '0 0 10px' }}>Add Project Update</p>
                    <textarea placeholder="What happened today? Notes, updates, progress…" value={newLog} onChange={(e) => setNewLog(e.target.value)} rows={3} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' as const, resize: 'none', marginBottom: 10, lineHeight: 1.5 }} />
                    <button onClick={addLog} style={{ ...btnPrimary, background: projectColor }}>Add Update</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {logs.length === 0 && <p style={{ fontSize: 13, color: '#bbb' }}>No updates yet.</p>}
                    {logs.map((log) => (
                      <div key={log.id} style={{ background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 12, padding: '14px 16px' }}>
                        <p style={{ fontSize: 14, color: '#333', margin: '0 0 8px', lineHeight: 1.5 }}>{log.note}</p>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: projectColor, fontWeight: 500 }}>{log.created_by}</span>
                          <span style={{ color: '#ddd' }}>•</span>
                          <span style={{ fontSize: 12, color: '#aaa' }}>{formatTs(log.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── TASKS ── */}
              {activeTab === 'tasks' && (
                <div>
                  <div style={{ background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 14, padding: '16px 20px', marginBottom: 16 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#555', margin: '0 0 10px' }}>Add Task</p>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <input placeholder="Task description" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} style={{ ...inputStyle, flex: 2 }} />
                      <input placeholder="Assign to" value={newTaskAssignedTo} onChange={(e) => setNewTaskAssignedTo(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                      <button onClick={addTask} style={{ ...btnPrimary, background: projectColor }}>Add</button>
                    </div>
                  </div>
                  <div style={{ background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 14, overflow: 'hidden' }}>
                    {tasks.length === 0 && <p style={{ fontSize: 13, color: '#bbb', padding: '16px 20px' }}>No tasks yet.</p>}
                    {tasks.map((task, i) => (
                      <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < tasks.length - 1 ? '0.5px solid #f5f5f5' : 'none' }}>
                        <div onClick={() => toggleTask(task.id, task.completed)} style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${task.completed ? '#639922' : '#ddd'}`, background: task.completed ? '#639922' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                          {task.completed && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 14, color: task.completed ? '#aaa' : '#1a1a2e', margin: 0, textDecoration: task.completed ? 'line-through' : 'none' }}>{task.title}</p>
                          {task.assigned_to && <p style={{ fontSize: 12, color: '#aaa', margin: '2px 0 0' }}>Assigned to: {task.assigned_to}</p>}
                        </div>
                        <button onClick={() => deleteTask(task.id)} style={{ fontSize: 12, color: '#f09595', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── TIME CLOCK ── */}
              {activeTab === 'timeclock' && (
                <div>
                  <div style={{ background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 14, padding: '16px 20px', marginBottom: 16 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#555', margin: '0 0 10px' }}>Clock In</p>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: '#555', fontWeight: 500 }}>Clocking in as: <strong>{currentUser}</strong></span>
                      <input placeholder="Notes (optional)" value={clockNote} onChange={(e) => setClockNote(e.target.value)} style={{ ...inputStyle, flex: 2 }} />
                      <button onClick={clockIn} style={{ ...btnPrimary, background: projectColor }}>Clock In</button>
                    </div>
                  </div>
                  {timeEntries.filter((e) => !e.clock_out).length > 0 && (
                    <div style={{ background: '#EAF3DE', border: '0.5px solid #c0dd97', borderRadius: 14, padding: '14px 20px', marginBottom: 16 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#27500A', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Currently Clocked In</p>
                      {timeEntries.filter((e) => !e.clock_out).map((entry) => (
                        <div key={entry.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid #c0dd97' }}>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1a2e', margin: 0 }}>{entry.employee_name}</p>
                            <p style={{ fontSize: 12, color: '#555', margin: '2px 0 0' }}>Since {formatTs(entry.clock_in)}</p>
                          </div>
                          <button onClick={() => clockOut(entry.id)} style={{ ...btnPrimary, background: '#27500A' }}>Clock Out</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #f0f0f0', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', margin: 0 }}>Time Log</p>
                      <p style={{ fontSize: 13, color: projectColor, fontWeight: 600, margin: 0 }}>Total: {totalHours.toFixed(1)} hrs</p>
                    </div>
                    {timeEntries.filter((e) => e.clock_out).length === 0 && <p style={{ fontSize: 13, color: '#bbb', padding: '16px 20px' }}>No completed entries yet.</p>}
                    {timeEntries.filter((e) => e.clock_out).map((entry, i, arr) => (
                      <div key={entry.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', gap: 8, padding: '10px 16px', borderBottom: i < arr.length - 1 ? '0.5px solid #f5f5f5' : 'none', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a2e' }}>{entry.employee_name}</span>
                        <span style={{ fontSize: 12, color: '#555' }}>{formatTs(entry.clock_in)}</span>
                        <span style={{ fontSize: 12, color: '#555' }}>{formatTs(entry.clock_out)}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: projectColor, textAlign: 'right' }}>{hoursWorked(entry).toFixed(1)} hrs</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </>
        )}
      </div>

      {/* NEW PROJECT MODAL */}
      {showNewProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowNewProject(false)}>
          <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 480, margin: '0 16px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#1a1a2e' }}>New Project</p>
              <button onClick={() => setShowNewProject(false)} style={{ color: '#ccc', background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Customer (Lead) *</label>
                <select value={selectedLeadId} onChange={async (e) => {
                  const leadId = e.target.value
                  setSelectedLeadId(leadId); setSelectedProposalId(''); setLeadProposals([])
                  if (leadId) {
                    const { data } = await supabase.from('proposals').select('id, title, total_price, status').eq('lead_id', leadId).neq('status', 'draft')
                    setLeadProposals(data || [])
                    // Auto-generate name: nextNumber - LastName
                    const lead = leads.find((l: any) => l.id === leadId)
                    const lastName = lead?.name?.split(' ').pop() || lead?.name || ''
                    const { data: existing } = await supabase.from('projects').select('project_number')
                    const maxNum = existing && existing.length > 0
                      ? Math.max(0, ...existing.map((p: any) => Number(p.project_number) || 0))
                      : 0
                    const nextNum = maxNum + 1
                    setNewProjectName(`${nextNum} - ${lastName}`)
                  }
                }} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' as const }}>
                  <option value="">— Select customer —</option>
                  {leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              {leadProposals.length > 0 && (
                <div>
                  <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Linked Proposal</label>
                  <select value={selectedProposalId} onChange={(e) => {
                    const propId = e.target.value
                    setSelectedProposalId(propId)
                    if (propId) {
                      const proposal = leadProposals.find((p: any) => p.id === propId)
                      const lead = leads.find((l: any) => l.id === selectedLeadId)
                      const lastName = lead?.name?.split(' ').pop() || lead?.name || ''
                      const numPart = newProjectName.split(' - ')[0] || '1'
                      setNewProjectName(`${numPart} - ${lastName} - ${proposal?.title || ''}`)
                    }
                  }} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' as const }}>
                    <option value="">— Select proposal —</option>
                    {leadProposals.map((p: any) => <option key={p.id} value={p.id}>{p.title} ({p.status}) — ${Number(p.total_price || 0).toLocaleString()}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Project Name</label>
                <input value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="Auto-filled when you select a customer" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' as const }} />
                <p style={{ fontSize: 11, color: '#bbb', margin: '4px 0 0' }}>Auto-generated — edit freely</p>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Service</label>
                <input value={newProjectService} onChange={(e) => setNewProjectService(e.target.value)} placeholder="e.g. Fiberglass Pool" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' as const }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Labor Rate ($/hr)</label>
                <input type="number" value={newProjectLaborRate} onChange={(e) => setNewProjectLaborRate(e.target.value)} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' as const }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 8 }}>Project Color</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {PRESET_COLORS.map((c) => (
                    <div key={c} onClick={() => setNewProjectColor(c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: newProjectColor === c ? '3px solid #1a1a2e' : '3px solid transparent', transition: 'border 0.15s' }} />
                  ))}
                </div>
              </div>
              <button onClick={createProject} style={{ ...btnPrimary, width: '100%', padding: '11px', borderRadius: 12, fontSize: 14, marginTop: 4, background: newProjectColor }}>Create Project</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}