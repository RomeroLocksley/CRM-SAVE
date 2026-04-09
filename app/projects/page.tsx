'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

function NavItem({ href, active, label, icon }: { href: string; active?: boolean; label: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1" style={{ textDecoration: 'none' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors" style={{ background: active ? 'rgba(255,255,255,0.2)' : 'transparent' }}>{icon}</div>
      <span style={{ fontSize: '10px', color: active ? 'white' : 'rgba(255,255,255,0.5)', fontWeight: active ? 500 : 400 }}>{label}</span>
    </Link>
  )
}

// ─── Stage definitions ────────────────────────────────────────────────────────

const STAGES = [
  {
    stage: 'Pre-Construction',
    color: '#185FA5',
    steps: [
      'Draft drawings created',
      'Sent to engineer',
      'Prepare permit package',
      'Walk through with project manager',
      'Finalize selections',
      'Finalize internal drawings',
      'HOA approved',
      'Permits approved',
      'Pool ordered / delivery date set',
      'Pre-construction inspection',
    ],
  },
  {
    stage: 'Construction',
    color: '#0F6E56',
    steps: [
      'Excavation',
      'Gravel base / site prep',
      'Pool shell delivered & set',
      'Bonding inspection',
      'Rough plumbing',
      'Plumbing pressure test & inspection',
      'Electrical rough-in',
      'Electrical inspection',
      'Backfill with gravel',
      'Pool filled with water',
      'Equipment set (pump, filter, lighting)',
      'Bond beam / concrete work',
      'Patio / decking',
      'Fence / barrier installed',
      'Barrier inspection',
      'Final electrical inspection',
      'Final building inspection',
      'Startup & customer walkthrough',
    ],
  },
]

const ALL_STEPS = STAGES.flatMap((s) => s.steps.map((step) => ({ stage: s.stage, step_name: step, color: s.color })))

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [showNewProject, setShowNewProject] = useState(false)

  // Project data
  const [project, setProject] = useState<any>(null)
  const [stages, setStages] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [timeEntries, setTimeEntries] = useState<any[]>([])
  const [budgetItems, setBudgetItems] = useState<any[]>([])
  const [actuals, setActuals] = useState<any[]>([])

  // New project form
  const [leads, setLeads] = useState<any[]>([])
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [selectedProposalId, setSelectedProposalId] = useState('')
  const [leadProposals, setLeadProposals] = useState<any[]>([])
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectService, setNewProjectService] = useState('')
  const [newProjectLaborRate, setNewProjectLaborRate] = useState('75')

  // Log form
  const [newLog, setNewLog] = useState('')

  // Task form
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState('')

  // Time clock form
  const [clockEmployee, setClockEmployee] = useState('')
  const [clockNote, setClockNote] = useState('')

  // Budget actual form
  const [actualEdits, setActualEdits] = useState<Record<string, { actual_cost: string; notes: string }>>({})

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
    const { data: items } = await supabase.from('proposal_items').select('*, proposal_item_rows(*)').eq('proposal_id', proposalId)
    setBudgetItems(items || [])
    const { data: acts } = await supabase.from('project_budget_actuals').select('*').eq('project_id', projectId)
    setActuals(acts || [])
  }

  async function loadLeads() {
    const { data } = await supabase.from('leads').select('id, name').order('created_at', { ascending: false })
    setLeads(data || [])
  }

  useEffect(() => { loadProjects(); loadLeads() }, [])

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

    // Get proposal budget
    let budget = null
    if (selectedProposalId) {
      const { data: prop } = await supabase.from('proposals').select('total_price').eq('id', selectedProposalId).single()
      budget = prop?.total_price || null
    }

    const { data: newProject, error } = await supabase.from('projects').insert([{
      name: newProjectName.trim(),
      lead_id: selectedLeadId || null,
      proposal_id: selectedProposalId || null,
      service: newProjectService || null,
      status: 'active',
      budget,
      labor_rate: Number(newProjectLaborRate) || 75,
    }]).select().single()

    if (error) { console.error(error); return }

    // Create all stage steps
    const stageRows = ALL_STEPS.map((s, i) => ({
      project_id: newProject.id,
      stage: s.stage,
      step_name: s.step_name,
      sort_order: i,
      completed: false,
    }))
    await supabase.from('project_stages').insert(stageRows)

    setShowNewProject(false)
    setNewProjectName(''); setSelectedLeadId(''); setSelectedProposalId(''); setNewProjectService(''); setNewProjectLaborRate('75')
    await loadProjects()
    selectProject(newProject.id)
  }

  // ─── Toggle stage step ─────────────────────────────────────────────────────

  async function toggleStep(stepId: string, completed: boolean) {
    await supabase.from('project_stages').update({
      completed: !completed,
      completed_at: !completed ? new Date().toISOString() : null,
    }).eq('id', stepId)
    if (selectedProjectId) loadStages(selectedProjectId)
  }

  // ─── Daily logs ────────────────────────────────────────────────────────────

  async function addLog() {
    if (!newLog.trim() || !selectedProjectId) return
    await supabase.from('project_daily_logs').insert([{ project_id: selectedProjectId, note: newLog.trim(), created_by: 'Henrry' }])
    setNewLog('')
    loadLogs(selectedProjectId)
  }

  // ─── Tasks ─────────────────────────────────────────────────────────────────

  async function addTask() {
    if (!newTaskTitle.trim() || !selectedProjectId) return
    await supabase.from('project_tasks').insert([{ project_id: selectedProjectId, title: newTaskTitle.trim(), assigned_to: newTaskAssignedTo.trim() || null, completed: false }])
    setNewTaskTitle(''); setNewTaskAssignedTo('')
    loadTasks(selectedProjectId)
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
    if (!clockEmployee.trim() || !selectedProjectId) return
    await supabase.from('time_clock').insert([{ project_id: selectedProjectId, employee_name: clockEmployee.trim(), clock_in: new Date().toISOString(), notes: clockNote.trim() || null }])
    setClockNote('')
    loadTimeEntries(selectedProjectId)
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

  // Budgeted labor from proposal cost rows
  const budgetedLaborHours = budgetItems.flatMap((item: any) => item.proposal_item_rows || [])
    .filter((row: any) => row.unit?.toLowerCase().includes('hr') || row.name?.toLowerCase().includes('labor'))
    .reduce((sum: number, row: any) => sum + Number(row.quantity || 0), 0)
  const budgetedLaborCost = budgetedLaborHours * laborRate

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

  // ─── Derived data ──────────────────────────────────────────────────────────

  const stageGroups = STAGES.map((s) => ({
    ...s,
    steps: stages.filter((st) => st.stage === s.stage),
    completedCount: stages.filter((st) => st.stage === s.stage && st.completed).length,
    totalCount: stages.filter((st) => st.stage === s.stage).length,
  }))

  const overallPct = stages.length > 0 ? Math.round((stages.filter((s) => s.completed).length / stages.length) * 100) : 0

  const allRows = budgetItems.flatMap((item: any) => (item.proposal_item_rows || []).map((row: any) => ({ ...row, item_name: item.name })))
  const nonLaborRows = allRows.filter((row: any) => !(row.unit?.toLowerCase().includes('hr') || row.name?.toLowerCase().includes('labor')))
  const totalBudgetedMaterials = nonLaborRows.reduce((sum, row) => sum + Number(row.quantity || 0) * Number(row.unit_cost || 0), 0)
  const totalActualMaterials = nonLaborRows.reduce((sum, row) => { const act = actuals.find((a) => a.proposal_item_row_id === row.id); return sum + Number(act?.actual_cost || 0) }, 0)

  function formatTs(ts: string) {
    if (!ts) return ''
    return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
  }

  const btnPrimary = { padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500 as const, border: 'none', cursor: 'pointer', background: '#185FA5', color: 'white' }
  const inputStyle = { padding: '8px 10px', borderRadius: 8, border: '0.5px solid #e5e5e5', background: '#fafafa', fontSize: 13, outline: 'none' } as React.CSSProperties

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f4f7fb' }}>

      {/* SLIM SIDEBAR */}
      <aside className="flex flex-col items-center py-5 gap-5 flex-shrink-0" style={{ width: '68px', background: '#0C447C' }}>
        <div className="mb-2" style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" fill="white"/><rect x="9" y="2" width="5" height="5" rx="1" fill="white" opacity="0.6"/><rect x="2" y="9" width="5" height="5" rx="1" fill="white" opacity="0.6"/><rect x="9" y="9" width="5" height="5" rx="1" fill="white" opacity="0.4"/></svg>
        </div>
        <NavItem href="/" label="Home" icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 7.5L9 2l7 5.5V16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5z" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinejoin="round"/><rect x="6.5" y="10" width="5" height="7" rx="0.5" fill="rgba(255,255,255,0.6)"/></svg>}/>
        <NavItem href="/leads" label="Leads" icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="6" r="3.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/><path d="M2 16c0-3.866 3.134-6 7-6s7 2.134 7 6" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/></svg>}/>
        <NavItem href="/projects" active label="Projects" icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="5" width="16" height="11" rx="1.5" stroke="white" strokeWidth="1.5"/><path d="M6 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" stroke="white" strokeWidth="1.5"/><path d="M1 9h16" stroke="white" strokeWidth="1.5"/></svg>}/>
        <NavItem href="/catalog" label="Catalog" icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 4h12M3 9h12M3 14h7" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/></svg>}/>
        <NavItem href="/templates" label="Templates" icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="1" width="16" height="5" rx="1.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/><rect x="1" y="9" width="7" height="8" rx="1.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/><rect x="10" y="9" width="7" height="8" rx="1.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/></svg>}/>
      </aside>

      {/* PROJECTS LIST SIDEBAR */}
      <div className="flex flex-col flex-shrink-0" style={{ width: 240, background: 'white', borderRight: '0.5px solid #eee' }}>
        <div style={{ padding: '20px 16px 12px', borderBottom: '0.5px solid #f0f0f0' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', margin: '0 0 12px' }}>Projects</p>
          <button onClick={() => setShowNewProject(true)} style={{ ...btnPrimary, width: '100%', padding: '9px', borderRadius: 9, fontSize: 13 }}>+ New Project</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {projects.length === 0 && <p style={{ fontSize: 13, color: '#bbb', padding: '12px 8px' }}>No projects yet.</p>}
          {projects.map((p) => (
            <div key={p.id} onClick={() => selectProject(p.id)}
              style={{ padding: '10px 12px', borderRadius: 10, cursor: 'pointer', marginBottom: 4, background: selectedProjectId === p.id ? '#E6F1FB' : 'transparent' }}
              onMouseOver={(e) => { if (selectedProjectId !== p.id) e.currentTarget.style.background = '#f5f5f5' }}
              onMouseOut={(e) => { if (selectedProjectId !== p.id) e.currentTarget.style.background = 'transparent' }}
            >
              <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: selectedProjectId === p.id ? '#0C447C' : '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
              <p style={{ fontSize: 11, color: '#aaa', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.leads?.name || '—'}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: p.status === 'completed' ? '#EAF3DE' : p.status === 'on_hold' ? '#FAEEDA' : '#E6F1FB', color: p.status === 'completed' ? '#27500A' : p.status === 'on_hold' ? '#633806' : '#0C447C', fontWeight: 500 }}>
                  {p.status === 'on_hold' ? 'On Hold' : p.status === 'completed' ? 'Completed' : 'Active'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {!selectedProjectId ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 16, color: '#bbb' }}>Select a project or create a new one.</p>
          </div>
        ) : (
          <>
            {/* Project top bar */}
            <div style={{ flexShrink: 0, background: 'white', borderBottom: '0.5px solid #eee', padding: '14px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#1a1a2e' }}>{project?.name}</p>
                  <p style={{ fontSize: 12, color: '#aaa', margin: '2px 0 0' }}>{project?.leads?.name} &bull; {project?.leads?.address}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#185FA5' }}>{overallPct}% complete</span>
                  <select
                    value={project?.status || 'active'}
                    onChange={async (e) => { await supabase.from('projects').update({ status: e.target.value }).eq('id', selectedProjectId); loadProject(selectedProjectId); loadProjects() }}
                    style={{ ...inputStyle, fontSize: 12, padding: '5px 10px', borderRadius: 20, background: '#f5f5f5', border: 'none' }}
                  >
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Pizza tracker */}
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
                        <div style={{ height: '100%', width: `${pct * 100}%`, background: sg.color, borderRadius: 4, transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Tabs */}
            <div style={{ flexShrink: 0, background: 'white', borderBottom: '0.5px solid #eee', padding: '0 24px', display: 'flex', gap: 0 }}>
              {['overview', 'budget', 'logs', 'tasks', 'timeclock'].map((tab) => {
                const labels: Record<string, string> = { overview: 'Overview', budget: 'Budget', logs: 'Daily Logs', tasks: 'Tasks', timeclock: 'Time Clock' }
                return (
                  <button key={tab} onClick={() => {
                    setActiveTab(tab)
                    if (tab === 'logs') loadLogs(selectedProjectId)
                    if (tab === 'tasks') loadTasks(selectedProjectId)
                    if (tab === 'timeclock') loadTimeEntries(selectedProjectId)
                    if (tab === 'budget' && project?.proposal_id) loadBudget(selectedProjectId, project.proposal_id)
                  }}
                    style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, border: 'none', background: 'transparent', cursor: 'pointer', color: activeTab === tab ? '#185FA5' : '#aaa', borderBottom: activeTab === tab ? '2px solid #185FA5' : '2px solid transparent', marginBottom: -1 }}
                  >
                    {labels[tab]}
                  </button>
                )
              })}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto" style={{ padding: 24 }}>

              {/* ── OVERVIEW ── */}
              {activeTab === 'overview' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                  {/* Project info */}
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

                  {/* Stage checklist */}
                  <div style={{ background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 14, padding: '20px', maxHeight: 500, overflowY: 'auto' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', margin: '0 0 14px' }}>Stage Checklist</p>
                    {stageGroups.map((sg) => (
                      <div key={sg.stage} style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: sg.color, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>{sg.stage}</p>
                        {sg.steps.map((step) => (
                          <div key={step.id} onClick={() => toggleStep(step.id, step.completed)}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 2, background: step.completed ? '#f0faf0' : 'transparent' }}
                            onMouseOver={(e) => (e.currentTarget.style.background = step.completed ? '#e8f5e8' : '#f9f9f9')}
                            onMouseOut={(e) => (e.currentTarget.style.background = step.completed ? '#f0faf0' : 'transparent')}
                          >
                            <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${step.completed ? sg.color : '#ddd'}`, background: step.completed ? sg.color : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                              {step.completed && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </div>
                            <span style={{ fontSize: 13, color: step.completed ? '#444' : '#666', textDecoration: step.completed ? 'line-through' : 'none' }}>{step.step_name}</span>
                            {step.completed_at && <span style={{ fontSize: 11, color: '#aaa', marginLeft: 'auto' }}>{new Date(step.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── BUDGET ── */}
              {activeTab === 'budget' && (
                <div>
                  {/* Summary cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                    {[
                      { label: 'Contract Budget', value: `$${Number(project?.budget || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: '#1a1a2e' },
                      { label: 'Budgeted Materials', value: `$${totalBudgetedMaterials.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: '#185FA5' },
                      { label: 'Actual Materials', value: `$${totalActualMaterials.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: totalActualMaterials > totalBudgetedMaterials ? '#A32D2D' : '#27500A' },
                      { label: 'Labor Cost', value: `$${totalLaborCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: totalLaborCost > budgetedLaborCost ? '#A32D2D' : '#27500A' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 14, padding: '16px 20px' }}>
                        <p style={{ fontSize: 11, color: '#aaa', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>{label}</p>
                        <p style={{ fontSize: 20, fontWeight: 600, margin: 0, color }}>{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Labor summary */}
                  <div style={{ background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 14, padding: '16px 20px', marginBottom: 16 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', margin: '0 0 10px' }}>Labor Summary</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                      {[
                        { label: 'Budgeted Hours', value: `${budgetedLaborHours.toFixed(1)} hrs` },
                        { label: 'Actual Hours', value: `${totalHours.toFixed(1)} hrs` },
                        { label: `Labor Rate`, value: `$${laborRate}/hr` },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ background: '#fafafa', borderRadius: 10, padding: '10px 14px' }}>
                          <p style={{ fontSize: 11, color: '#aaa', margin: '0 0 4px' }}>{label}</p>
                          <p style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e', margin: 0 }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Materials line items */}
                  {!project?.proposal_id ? (
                    <p style={{ fontSize: 13, color: '#bbb' }}>No proposal linked to this project.</p>
                  ) : (
                    <div style={{ background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 14, overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 120px 160px 80px', gap: 8, padding: '10px 16px', background: '#fafafa', borderBottom: '0.5px solid #f0f0f0' }}>
                        {['Item', 'Cost Row', 'Budgeted', 'Actual', 'Notes', ''].map((h) => (
                          <span key={h} style={{ fontSize: 11, color: '#aaa', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</span>
                        ))}
                      </div>
                      {nonLaborRows.map((row: any) => {
                        const budgeted = Number(row.quantity || 0) * Number(row.unit_cost || 0)
                        const actual = actuals.find((a) => a.proposal_item_row_id === row.id)
                        const edit = actualEdits[row.id]
                        const hasEdit = !!edit
                        return (
                          <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 120px 160px 80px', gap: 8, padding: '10px 16px', borderBottom: '0.5px solid #f5f5f5', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, color: '#555' }}>{row.item_name}</span>
                            <span style={{ fontSize: 13, color: '#555' }}>{row.name}</span>
                            <span style={{ fontSize: 13, color: '#1a1a2e', fontWeight: 500 }}>${budgeted.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            <input
                              type="number"
                              placeholder="Enter actual"
                              value={edit?.actual_cost ?? (actual?.actual_cost || '')}
                              onChange={(e) => setActualEdits((prev) => ({ ...prev, [row.id]: { actual_cost: e.target.value, notes: prev[row.id]?.notes ?? actual?.notes ?? '' } }))}
                              style={{ ...inputStyle, padding: '6px 8px', fontSize: 12 }}
                            />
                            <input
                              placeholder="Notes"
                              value={edit?.notes ?? (actual?.notes || '')}
                              onChange={(e) => setActualEdits((prev) => ({ ...prev, [row.id]: { actual_cost: prev[row.id]?.actual_cost ?? String(actual?.actual_cost ?? ''), notes: e.target.value } }))}
                              style={{ ...inputStyle, padding: '6px 8px', fontSize: 12 }}
                            />
                            <button onClick={() => saveActual(row.id)} disabled={!hasEdit} style={{ ...btnPrimary, padding: '6px 10px', fontSize: 12, background: hasEdit ? '#185FA5' : '#f0f0f0', color: hasEdit ? 'white' : '#bbb', cursor: hasEdit ? 'pointer' : 'not-allowed' }}>Save</button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── DAILY LOGS ── */}
              {activeTab === 'logs' && (
                <div>
                  <div style={{ background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 14, padding: '16px 20px', marginBottom: 16 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#555', margin: '0 0 10px' }}>Add Daily Log</p>
                    <textarea
                      placeholder="What happened today? Add photos, notes, updates…"
                      value={newLog}
                      onChange={(e) => setNewLog(e.target.value)}
                      rows={3}
                      style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', resize: 'none', marginBottom: 10, lineHeight: 1.5 }}
                    />
                    <button onClick={addLog} style={btnPrimary}>Add Log</button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {logs.length === 0 && <p style={{ fontSize: 13, color: '#bbb' }}>No logs yet.</p>}
                    {logs.map((log) => (
                      <div key={log.id} style={{ background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 12, padding: '14px 16px' }}>
                        <p style={{ fontSize: 14, color: '#333', margin: '0 0 8px', lineHeight: 1.5 }}>{log.note}</p>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: '#185FA5', fontWeight: 500 }}>{log.created_by}</span>
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
                      <button onClick={addTask} style={btnPrimary}>Add</button>
                    </div>
                  </div>

                  <div style={{ background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 14, overflow: 'hidden' }}>
                    {tasks.length === 0 && <p style={{ fontSize: 13, color: '#bbb', padding: '16px 20px' }}>No tasks yet.</p>}
                    {tasks.map((task, i) => (
                      <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < tasks.length - 1 ? '0.5px solid #f5f5f5' : 'none' }}>
                        <div onClick={() => toggleTask(task.id, task.completed)}
                          style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${task.completed ? '#639922' : '#ddd'}`, background: task.completed ? '#639922' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s' }}
                        >
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
                    <div style={{ display: 'flex', gap: 10 }}>
                      <input placeholder="Employee name" value={clockEmployee} onChange={(e) => setClockEmployee(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                      <input placeholder="Notes (optional)" value={clockNote} onChange={(e) => setClockNote(e.target.value)} style={{ ...inputStyle, flex: 2 }} />
                      <button onClick={clockIn} style={btnPrimary}>Clock In</button>
                    </div>
                  </div>

                  {/* Active entries */}
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

                  {/* History */}
                  <div style={{ background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #f0f0f0', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', margin: 0 }}>Time Log</p>
                      <p style={{ fontSize: 13, color: '#185FA5', fontWeight: 600, margin: 0 }}>Total: {totalHours.toFixed(1)} hrs</p>
                    </div>
                    {timeEntries.filter((e) => e.clock_out).length === 0 && <p style={{ fontSize: 13, color: '#bbb', padding: '16px 20px' }}>No completed entries yet.</p>}
                    {timeEntries.filter((e) => e.clock_out).map((entry, i, arr) => (
                      <div key={entry.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', gap: 8, padding: '10px 16px', borderBottom: i < arr.length - 1 ? '0.5px solid #f5f5f5' : 'none', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a2e' }}>{entry.employee_name}</span>
                        <span style={{ fontSize: 12, color: '#555' }}>{formatTs(entry.clock_in)}</span>
                        <span style={{ fontSize: 12, color: '#555' }}>{formatTs(entry.clock_out)}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#185FA5', textAlign: 'right' }}>{hoursWorked(entry).toFixed(1)} hrs</span>
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
          <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 460, margin: '0 16px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#1a1a2e' }}>New Project</p>
              <button onClick={() => setShowNewProject(false)} style={{ color: '#ccc', background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Project Name *</label>
                <input value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="e.g. Smith Residence Pool" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Customer (Lead) *</label>
                <select value={selectedLeadId} onChange={async (e) => {
                  setSelectedLeadId(e.target.value)
                  setSelectedProposalId('')
                  if (e.target.value) {
                    const { data } = await supabase.from('proposals').select('id, title, total_price').eq('lead_id', e.target.value).eq('status', 'signed')
                    setLeadProposals(data || [])
                  }
                }} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}>
                  <option value="">— Select customer —</option>
                  {leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              {leadProposals.length > 0 && (
                <div>
                  <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Linked Proposal (signed)</label>
                  <select value={selectedProposalId} onChange={(e) => setSelectedProposalId(e.target.value)} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}>
                    <option value="">— Select proposal —</option>
                    {leadProposals.map((p: any) => <option key={p.id} value={p.id}>{p.title} — ${Number(p.total_price || 0).toLocaleString()}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Service</label>
                <input value={newProjectService} onChange={(e) => setNewProjectService(e.target.value)} placeholder="e.g. Fiberglass Pool" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Labor Rate ($/hr)</label>
                <input type="number" value={newProjectLaborRate} onChange={(e) => setNewProjectLaborRate(e.target.value)} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
              </div>
              <button onClick={createProject} style={{ ...btnPrimary, width: '100%', padding: '11px', borderRadius: 12, fontSize: 14, marginTop: 4 }}>Create Project</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}