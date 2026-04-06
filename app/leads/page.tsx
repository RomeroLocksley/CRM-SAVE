'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import LeadModal from '../components/LeadModal'

const SOURCES = [
  'Referral',
  'Google Call In',
  'Google Website Form',
  'Barrier Reef',
  'Facebook',
  'Instagram',
  'TikTok',
  'YouTube',
  'Vehicle Wrap',
  'Other',
]

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [selectedLead, setSelectedLead] = useState<any | null>(null)
  const [notes, setNotes] = useState<any[]>([])
  const [noteText, setNoteText] = useState('')
  const [search, setSearch] = useState('')
  const [proposals, setProposals] = useState<any[]>([])
  const [serviceOptions, setServiceOptions] = useState<string[]>([])

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [service, setService] = useState('')
  const [source, setSource] = useState('')
  const [address, setAddress] = useState('')
  const [status, setStatus] = useState('new')
  const [result, setResult] = useState('')

  async function getLeads() {
    const { data } = await supabase.from('leads').select('*')
    setLeads(
      (data || []).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    )
  }

  async function getServiceOptions() {
    const { data, error } = await supabase
      .from('templates')
      .select('name')
      .order('created_at', { ascending: true })
    if (error) { console.error(error); return }
    setServiceOptions((data || []).map((t: any) => t.name))
  }

  async function getNotes(leadId: string) {
    const { data } = await supabase
      .from('lead_notes')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
    setNotes(data || [])
  }

  async function getProposals(leadId: string) {
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
    if (error) { console.error('ERROR FETCHING PROPOSALS:', error); return }
    setProposals(data || [])
  }

  async function addLead(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from('leads').insert([
      { name, email, phone, service, source, address, status, result }
    ])
    setName(''); setEmail(''); setPhone(''); setService('')
    setSource(''); setAddress(''); setStatus('new'); setResult('')
    getLeads()
  }

  async function deleteLead(leadId: string, e: React.MouseEvent) {
    e.stopPropagation()

    const confirmed = window.confirm('Delete this lead and all its notes and proposals? This cannot be undone.')
    if (!confirmed) return

    // Get all proposals for this lead
    const { data: leadProposals } = await supabase
      .from('proposals')
      .select('id')
      .eq('lead_id', leadId)

    const proposalIds = (leadProposals || []).map((p: any) => p.id)

    // Delete proposal data bottom-up
    if (proposalIds.length > 0) {
      await supabase.from('proposal_item_rows').delete().in('proposal_id', proposalIds)
      await supabase.from('proposal_items').delete().in('proposal_id', proposalIds)
      await supabase.from('proposal_sections').delete().in('proposal_id', proposalIds)
      await supabase.from('proposals').delete().in('id', proposalIds)
    }

    // Delete notes
    await supabase.from('lead_notes').delete().eq('lead_id', leadId)

    // Delete lead
    await supabase.from('leads').delete().eq('id', leadId)

    // Close modal if this lead was selected
    if (selectedLead?.id === leadId) setSelectedLead(null)

    getLeads()
  }

  async function addNote() {
    if (!noteText || !selectedLead) return
    await supabase.from('lead_notes').insert([{
      lead_id: selectedLead.id,
      note: noteText,
      created_by: 'You'
    }])
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

  useEffect(() => {
    getLeads()
    getServiceOptions()
  }, [])

  const filteredLeads = leads.filter((lead) =>
    (lead.name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex min-h-screen bg-[#f4f7fb]">

      {/* SIDEBAR */}
      <aside className="w-60 bg-white border-r border-gray-100 p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-8">CRM</h2>
        <nav className="flex flex-col gap-3 text-sm">
          <Link href="/" className="text-gray-500 hover:text-blue-700">Dashboard</Link>
          <Link href="/leads" className="text-blue-700 font-medium">Leads</Link>
          <Link href="/projects" className="text-gray-500 hover:text-blue-700">Projects</Link>
          <Link href="/catalog" className="text-gray-500 hover:text-blue-700">Catalog</Link>
          <Link href="/templates" className="text-gray-500 hover:text-blue-700">Templates</Link>
        </nav>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-10 max-w-6xl">

        <h1 className="text-3xl font-semibold mb-8">Leads</h1>

        <input
          className="w-full mb-6 bg-white border rounded-xl px-4 py-3 shadow-sm"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* ADD LEAD FORM */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-10">
          <form onSubmit={addLead} className="grid grid-cols-2 gap-4">
            <input
              className="bg-gray-100 p-2 rounded-xl"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="bg-gray-100 p-2 rounded-xl"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="bg-gray-100 p-2 rounded-xl"
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <input
              className="bg-gray-100 p-2 rounded-xl"
              placeholder="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />

            {/* Service dropdown */}
            <select
              className="bg-gray-100 p-2 rounded-xl text-sm"
              value={service}
              onChange={(e) => setService(e.target.value)}
            >
              <option value="">— Select service —</option>
              {serviceOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Source dropdown */}
            <select
              className="bg-gray-100 p-2 rounded-xl text-sm"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="">— Select source —</option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <button className="col-span-2 bg-blue-700 text-white py-2 rounded-xl">
              Add Lead
            </button>
          </form>
        </div>

        {/* LEADS LIST */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <div className="space-y-3">
            {filteredLeads.map((lead) => (
              <div
                key={lead.id}
                onClick={() => {
                  setSelectedLead(lead)
                  getNotes(lead.id)
                  getProposals(lead.id)
                }}
                className="cursor-pointer px-4 py-4 rounded-xl border border-gray-100 hover:shadow-md flex items-center gap-4"
              >
                <div className="flex-1">
                  <p className="font-medium">{lead.name}</p>
                  <p className="text-sm text-gray-500">{lead.service}</p>
                </div>
                <div className="w-56">
                  <p className="text-xs text-gray-400">Address</p>
                  <p className="text-sm">{lead.address}</p>
                </div>
                <div className="w-32">
                  <p className="text-xs text-gray-400">Source</p>
                  <p className="text-sm">{lead.source}</p>
                </div>
                <div className="w-32">
                  <p className="text-xs text-gray-400 mb-1">Status</p>
                  <select
                    className="w-full bg-gray-100 rounded-lg px-2 py-1 text-sm"
                    value={lead.status ?? 'new'}
                    onChange={(e) => updateStatus(lead.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="new">New</option>
                    <option value="appointment">Appointment</option>
                    <option value="proposal">Proposal</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                <div className="w-40">
                  <p className="text-xs text-gray-400 mb-1">Result</p>
                  <select
                    className="w-full bg-gray-100 rounded-lg px-2 py-1 text-sm"
                    value={lead.result ?? ''}
                    onChange={(e) => updateResult(lead.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="">—</option>
                    <option value="sold">Sold</option>
                    <option value="price_high">Price Too High</option>
                    <option value="competitor">Went With Competitor</option>
                    <option value="future">Future Date</option>
                    <option value="finance">Financing Turned Down</option>
                  </select>
                </div>

                {/* Delete lead button */}
                <button
                  onClick={(e) => deleteLead(lead.id, e)}
                  className="text-xs text-red-400 hover:text-red-600 px-2 py-1 whitespace-nowrap"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>

      </main>

      <LeadModal
        selectedLead={selectedLead}
        setSelectedLead={setSelectedLead}
        notes={notes}
        noteText={noteText}
        setNoteText={setNoteText}
        addNote={addNote}
        proposals={proposals}
        onProposalDeleted={() => getProposals(selectedLead.id)}
        onLeadUpdated={() => getLeads()}
        serviceOptions={serviceOptions}
      />

    </div>
  )
}