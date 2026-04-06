'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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

export default function LeadModal({
  selectedLead,
  setSelectedLead,
  notes,
  noteText,
  setNoteText,
  addNote,
  proposals,
  onProposalDeleted,
  onLeadUpdated,
  serviceOptions,
}: any) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editService, setEditService] = useState('')
  const [editSource, setEditSource] = useState('')

  useEffect(() => {
    if (selectedLead) {
      setEditName(selectedLead.name || '')
      setEditEmail(selectedLead.email || '')
      setEditPhone(selectedLead.phone || '')
      setEditAddress(selectedLead.address || '')
      setEditService(selectedLead.service || '')
      setEditSource(selectedLead.source || '')
      setEditing(false)
    }
  }, [selectedLead])

  if (!selectedLead) return null

  async function saveLead() {
    const { error } = await supabase
      .from('leads')
      .update({
        name: editName,
        email: editEmail,
        phone: editPhone,
        address: editAddress,
        service: editService,
        source: editSource,
      })
      .eq('id', selectedLead.id)

    if (error) { console.error(error); return }

    setEditing(false)
    if (onLeadUpdated) onLeadUpdated()
  }

  async function createProposal() {
    const { data, error } = await supabase
      .from('proposals')
      .insert([{ lead_id: selectedLead.id, title: 'New Proposal' }])
      .select()
      .single()

    if (error) { console.error('Error creating proposal:', error); return }

    window.location.href = `/proposals/new?proposalId=${data.id}`
  }

  async function deleteProposal(proposalId: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    const confirmed = window.confirm('Delete this proposal and all its data? This cannot be undone.')
    if (!confirmed) return

    await supabase.from('proposal_item_rows').delete().eq('proposal_id', proposalId)
    await supabase.from('proposal_items').delete().eq('proposal_id', proposalId)
    await supabase.from('proposal_sections').delete().eq('proposal_id', proposalId)
    await supabase.from('proposals').delete().eq('id', proposalId)

    if (onProposalDeleted) onProposalDeleted()
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex justify-end z-50">
      <div className="w-[500px] h-full bg-white shadow-xl p-6 overflow-y-auto">

        {/* CLOSE */}
        <button
          onClick={() => setSelectedLead(null)}
          className="mb-4 text-sm text-gray-500 hover:text-gray-700"
        >
          Close
        </button>

        {/* NAME + EDIT TOGGLE */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold">{selectedLead.name}</h2>
          <button
            onClick={() => setEditing(!editing)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {/* CONTACT INFO — view or edit */}
        {editing ? (
          <div className="mb-4 space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Name</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Email</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Phone</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Address</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Service</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={editService}
                onChange={(e) => setEditService(e.target.value)}
              >
                <option value="">— Select service —</option>
                {(serviceOptions || []).map((s: string) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Source</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={editSource}
                onChange={(e) => setEditSource(e.target.value)}
              >
                <option value="">— Select source —</option>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <button
              onClick={saveLead}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        ) : (
          <div className="mb-4 space-y-1 text-sm text-gray-600">
            <p><span className="font-medium">Email:</span> {selectedLead.email || '—'}</p>
            <p><span className="font-medium">Phone:</span> {selectedLead.phone || '—'}</p>
            <p><span className="font-medium">Address:</span> {selectedLead.address || '—'}</p>
            <p><span className="font-medium">Service:</span> {selectedLead.service || '—'}</p>
            <p><span className="font-medium">Source:</span> {selectedLead.source || '—'}</p>
          </div>
        )}

        {/* CREATE PROPOSAL */}
        <button
          onClick={createProposal}
          className="inline-block mb-6 bg-blue-600 text-white px-4 py-2 rounded"
        >
          + Create Proposal
        </button>

        {/* NOTES */}
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Notes</h3>

          <div className="space-y-2 mb-3">
            {notes.map((note: any) => (
              <div key={note.id} className="p-3 bg-gray-100 rounded">
                <p className="text-sm">{note.note}</p>
                <p className="text-xs text-gray-400 mt-1">{note.created_by}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              className="flex-1 border p-2 rounded"
              placeholder="Add note..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <button
              onClick={addNote}
              className="bg-blue-600 text-white px-3 rounded"
            >
              Add
            </button>
          </div>
        </div>

        {/* PROPOSALS */}
        <div>
          <h3 className="font-semibold mb-2">Proposals</h3>

          {proposals?.length === 0 && (
            <p className="text-sm text-gray-400">No proposals yet</p>
          )}

          <div className="space-y-2">
            {proposals?.map((p: any) => (
              <div key={p.id} className="flex items-center gap-2">
                <a
                  href={`/proposals/new?proposalId=${p.id}`}
                  className="flex-1 border p-3 rounded hover:bg-gray-50"
                >
                  <p className="font-medium">{p.title || 'Untitled Proposal'}</p>
                  <p className="text-sm text-gray-500">
                    ${Number(p.total_price || 0).toFixed(2)}
                  </p>
                </a>
                <button
                  onClick={(e) => deleteProposal(p.id, e)}
                  className="text-xs text-red-400 hover:text-red-600 px-2 py-1 whitespace-nowrap"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}