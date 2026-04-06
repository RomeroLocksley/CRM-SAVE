'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function CatalogPage() {
  const [sections, setSections] = useState<any[]>([])
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [items, setItems] = useState<any[]>([])
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)
  const [costRows, setCostRows] = useState<Record<string, any[]>>({})

  // Section editing
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [editingSectionName, setEditingSectionName] = useState('')
  const [newSectionName, setNewSectionName] = useState('')

  // New item form (name only)
  const [newItemName, setNewItemName] = useState('')

  // Inline item editing
  const [itemEdits, setItemEdits] = useState<Record<string, { name: string; description: string; unit: string }>>({})

  // Cost row form
  const [newRowName, setNewRowName] = useState('')
  const [newRowUnit, setNewRowUnit] = useState('')
  const [newRowUnitCost, setNewRowUnitCost] = useState('')

  // Inline cost row editing
  const [rowEdits, setRowEdits] = useState<Record<string, { name: string; unit: string; unit_cost: string }>>({})

  // ─── Sections ──────────────────────────────────────────────────────────────

  async function getSections() {
    const { data, error } = await supabase
      .from('catalog_sections')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) { console.error(error); return }
    setSections(data || [])
  }

  async function addSection() {
    if (!newSectionName.trim()) return
    const { error } = await supabase
      .from('catalog_sections')
      .insert([{ name: newSectionName.trim() }])
    if (error) { console.error(error); return }
    setNewSectionName('')
    getSections()
  }

  async function saveEditSection(sectionId: string) {
    if (!editingSectionName.trim()) return
    const { error } = await supabase
      .from('catalog_sections')
      .update({ name: editingSectionName.trim() })
      .eq('id', sectionId)
    if (error) { console.error(error); return }
    setEditingSectionId(null)
    setEditingSectionName('')
    getSections()
  }

  async function deleteSection(sectionId: string) {
    const { data, error } = await supabase
      .from('catalog_items')
      .select('id')
      .eq('section_id', sectionId)
    if (error) { console.error(error); return }
    if (data && data.length > 0) {
      alert(`This section still has ${data.length} item${data.length > 1 ? 's' : ''} in it. Move or delete all items before deleting this section.`)
      return
    }
    const confirmed = window.confirm('Are you sure you want to delete this section? This cannot be undone.')
    if (!confirmed) return
    const { error: delError } = await supabase
      .from('catalog_sections')
      .delete()
      .eq('id', sectionId)
    if (delError) { console.error(delError); return }
    if (selectedSectionId === sectionId) {
      setSelectedSectionId(null)
      setItems([])
    }
    getSections()
  }

  // ─── Items ─────────────────────────────────────────────────────────────────

  async function getItems(sectionId: string) {
    const { data, error } = await supabase
      .from('catalog_items')
      .select('*')
      .eq('section_id', sectionId)
      .order('created_at', { ascending: true })
    if (error) { console.error(error); return }
    setItems(data || [])
  }

  async function addItem() {
    if (!newItemName.trim() || !selectedSectionId) return
    const { error } = await supabase
      .from('catalog_items')
      .insert([{
        name: newItemName.trim(),
        description: '',
        unit: '',
        section_id: selectedSectionId
      }])
    if (error) { console.error(error); return }
    setNewItemName('')
    getItems(selectedSectionId)
  }

  async function saveItemEdits(itemId: string) {
    const edits = itemEdits[itemId]
    if (!edits) return
    const { error } = await supabase
      .from('catalog_items')
      .update({ name: edits.name, description: edits.description, unit: edits.unit })
      .eq('id', itemId)
    if (error) { console.error(error); return }
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, name: edits.name, description: edits.description, unit: edits.unit }
          : i
      )
    )
    setItemEdits((prev) => {
      const next = { ...prev }
      delete next[itemId]
      return next
    })
  }

  function updateItemEdit(itemId: string, field: 'name' | 'description' | 'unit', value: string) {
    setItemEdits((prev) => ({
      ...prev,
      [itemId]: {
        name: prev[itemId]?.name ?? '',
        description: prev[itemId]?.description ?? '',
        unit: prev[itemId]?.unit ?? '',
        [field]: value,
      },
    }))
  }

  async function deleteItem(itemId: string) {
    const confirmed = window.confirm('Delete this item and all its cost rows? This cannot be undone.')
    if (!confirmed) return

    const { data: costRowData, error: fetchErr } = await supabase
      .from('catalog_cost_rows')
      .select('id')
      .eq('item_id', itemId)
    if (fetchErr) { console.error(fetchErr); return }

    const costRowIds = (costRowData || []).map((r: any) => r.id)

    if (costRowIds.length > 0) {
      const { error: tirErr } = await supabase
        .from('template_item_rows')
        .delete()
        .in('catalog_cost_row_id', costRowIds)
      if (tirErr) { console.error(tirErr); return }
    }

    const { error: rowsError } = await supabase
      .from('catalog_cost_rows')
      .delete()
      .eq('item_id', itemId)
    if (rowsError) { console.error(rowsError); return }

    const { error: itemError } = await supabase
      .from('catalog_items')
      .delete()
      .eq('id', itemId)
    if (itemError) { console.error(itemError); return }

    if (expandedItemId === itemId) setExpandedItemId(null)
    setCostRows((prev) => {
      const next = { ...prev }
      delete next[itemId]
      return next
    })
    setItemEdits((prev) => {
      const next = { ...prev }
      delete next[itemId]
      return next
    })
    if (selectedSectionId) getItems(selectedSectionId)
  }

  async function moveItem(itemId: string, newSectionId: string) {
    if (!newSectionId || newSectionId === selectedSectionId) return
    const { error } = await supabase
      .from('catalog_items')
      .update({ section_id: newSectionId })
      .eq('id', itemId)
    if (error) { console.error(error); return }
    setItems((prev) => prev.filter((i) => i.id !== itemId))
    if (expandedItemId === itemId) setExpandedItemId(null)
  }

  // ─── Cost rows ─────────────────────────────────────────────────────────────

  async function getCostRows(itemId: string) {
    const { data, error } = await supabase
      .from('catalog_cost_rows')
      .select('*')
      .eq('item_id', itemId)
      .order('created_at', { ascending: true })
    if (error) { console.error(error); return }
    setCostRows((prev) => ({ ...prev, [itemId]: data || [] }))
  }

  async function addCostRow(itemId: string) {
    if (!newRowName.trim() || !newRowUnitCost) return
    const { error } = await supabase
      .from('catalog_cost_rows')
      .insert([{
        item_id: itemId,
        name: newRowName.trim(),
        unit: newRowUnit.trim(),
        unit_cost: Number(newRowUnitCost)
      }])
    if (error) { console.error(error); return }
    setNewRowName('')
    setNewRowUnit('')
    setNewRowUnitCost('')
    getCostRows(itemId)
  }

  async function saveCostRowEdits(rowId: string, itemId: string) {
    const edits = rowEdits[rowId]
    if (!edits) return
    const { error } = await supabase
      .from('catalog_cost_rows')
      .update({
        name: edits.name,
        unit: edits.unit,
        unit_cost: Number(edits.unit_cost) || 0,
      })
      .eq('id', rowId)
    if (error) { console.error(error); return }
    setRowEdits((prev) => {
      const next = { ...prev }
      delete next[rowId]
      return next
    })
    getCostRows(itemId)
  }

  function updateRowEdit(rowId: string, field: 'name' | 'unit' | 'unit_cost', value: string, currentRow: any) {
    setRowEdits((prev) => ({
      ...prev,
      [rowId]: {
        name: prev[rowId]?.name ?? currentRow.name ?? '',
        unit: prev[rowId]?.unit ?? currentRow.unit ?? '',
        unit_cost: prev[rowId]?.unit_cost ?? String(currentRow.unit_cost ?? '0'),
        [field]: value,
      },
    }))
  }

  async function deleteCostRow(rowId: string, itemId: string) {
    const confirmed = window.confirm('Delete this cost row? This cannot be undone.')
    if (!confirmed) return

    const { error: tirErr } = await supabase
      .from('template_item_rows')
      .delete()
      .eq('catalog_cost_row_id', rowId)
    if (tirErr) { console.error(tirErr); return }

    const { error } = await supabase
      .from('catalog_cost_rows')
      .delete()
      .eq('id', rowId)
    if (error) { console.error(error); return }

    setRowEdits((prev) => {
      const next = { ...prev }
      delete next[rowId]
      return next
    })
    getCostRows(itemId)
  }

  // ─── Toggle item expand ────────────────────────────────────────────────────

  function toggleItem(item: any) {
    if (expandedItemId === item.id) {
      setExpandedItemId(null)
    } else {
      setExpandedItemId(item.id)
      setItemEdits((prev) => ({
        ...prev,
        [item.id]: {
          name: item.name || '',
          description: item.description || '',
          unit: item.unit || '',
        },
      }))
      setNewRowName('')
      setNewRowUnit('')
      setNewRowUnitCost('')
      getCostRows(item.id)
    }
  }

  useEffect(() => {
    getSections()
  }, [])

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#f4f7fb]">

      {/* LEFT — Sections */}
      <div className="w-72 bg-white border-r p-6 flex flex-col">
        <h2 className="text-lg font-semibold mb-4">Sections</h2>

        <div className="mb-4">
          <input
            className="w-full p-2 border rounded mb-2 text-sm"
            placeholder="New section name"
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSection()}
          />
          <button
            onClick={addSection}
            className="w-full bg-blue-600 text-white py-2 rounded text-sm"
          >
            + Add Section
          </button>
        </div>

        <div className="space-y-1 overflow-y-auto">
          {sections.map((section) => (
            <div key={section.id}>
              {editingSectionId === section.id ? (
                <div className="flex gap-1 items-center px-1">
                  <input
                    className="flex-1 p-1 border rounded text-sm"
                    value={editingSectionName}
                    onChange={(e) => setEditingSectionName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditSection(section.id)
                      if (e.key === 'Escape') setEditingSectionId(null)
                    }}
                    autoFocus
                  />
                  <button onClick={() => saveEditSection(section.id)} className="text-xs text-green-600 font-medium px-1">Save</button>
                  <button onClick={() => setEditingSectionId(null)} className="text-xs text-gray-400 px-1">✕</button>
                </div>
              ) : (
                <div
                  className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm ${
                    selectedSectionId === section.id
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                  onClick={() => {
                    setSelectedSectionId(section.id)
                    setExpandedItemId(null)
                    getItems(section.id)
                  }}
                >
                  <span className="truncate flex-1">{section.name}</span>
                  <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingSectionId(section.id)
                        setEditingSectionName(section.name)
                      }}
                      className="text-xs text-gray-400 hover:text-blue-600 px-1"
                      title="Rename"
                    >✎</button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteSection(section.id)
                      }}
                      className="text-xs text-gray-400 hover:text-red-500 px-1"
                      title="Delete"
                    >✕</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT — Items + Cost Rows */}
      <div className="flex-1 p-10 overflow-y-auto">
        <h1 className="text-2xl font-semibold mb-6">Catalog</h1>

        {!selectedSectionId ? (
          <p className="text-gray-500">Select a section to view items</p>
        ) : (
          <>
            {/* Add item form */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6 shadow-sm">
              <h3 className="font-medium mb-3 text-sm text-gray-600">Add Item</h3>
              <div className="flex gap-3">
                <input
                  className="flex-1 p-2 border rounded text-sm"
                  placeholder="Item name"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addItem()}
                />
                <button
                  onClick={addItem}
                  className="bg-green-600 text-white px-4 py-2 rounded text-sm whitespace-nowrap"
                >
                  + Add Item
                </button>
              </div>
            </div>

            {/* Items list */}
            {items.length === 0 ? (
              <p className="text-gray-500 text-sm">No items in this section yet.</p>
            ) : (
              <div className="space-y-3">
                {items.map((item) => {
                  const isExpanded = expandedItemId === item.id
                  const rows = costRows[item.id] || []
                  const edits = itemEdits[item.id]
                  const hasUnsavedEdits = !!edits

                  return (
                    <div
                      key={item.id}
                      className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
                    >
                      {/* Item header */}
                      <div className="flex items-center justify-between px-5 py-4">
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => toggleItem(item)}
                        >
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5 whitespace-normal break-words">{item.description}</p>
                        </div>
                        <div className="flex items-center gap-4 ml-4">
                          <span className="text-xs text-gray-400">Unit: {item.unit || '—'}</span>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="text-xs text-red-400 hover:text-red-600 px-1"
                          >
                            Delete
                          </button>
                          <span
                            className="text-gray-400 text-sm cursor-pointer select-none"
                            onClick={() => toggleItem(item)}
                          >
                            {isExpanded ? '▲' : '▼'}
                          </span>
                        </div>
                      </div>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="border-t border-gray-100 px-5 py-4">

                          {/* Editable item fields */}
                          <div className="mb-5">
                            <p className="text-xs font-medium text-gray-400 uppercase mb-2">Item details</p>
                            <div className="grid grid-cols-3 gap-3 mb-2">
                              <div>
                                <label className="text-xs text-gray-400 block mb-1">Name</label>
                                <input
                                  className="w-full p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                                  value={edits?.name ?? item.name ?? ''}
                                  onChange={(e) => updateItemEdit(item.id, 'name', e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-400 block mb-1">Unit</label>
                                <input
                                  className="w-full p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                                  placeholder="e.g. sqft, ea, hrs"
                                  value={edits?.unit ?? item.unit ?? ''}
                                  onChange={(e) => updateItemEdit(item.id, 'unit', e.target.value)}
                                />
                              </div>
                              <div className="flex items-end">
                                <button
                                  onClick={() => saveItemEdits(item.id)}
                                  disabled={!hasUnsavedEdits}
                                  className={`w-full px-4 py-2 rounded text-sm font-medium transition-colors ${
                                    hasUnsavedEdits
                                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  }`}
                                >
                                  Save changes
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">Description (customer-facing)</label>
                              <textarea
                                className="w-full p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                                rows={4}
                                placeholder="This description will appear on the customer proposal..."
                                value={edits?.description ?? item.description ?? ''}
                                onChange={(e) => updateItemEdit(item.id, 'description', e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="border-t border-dashed border-gray-200 mb-4" />

                          {/* Move item */}
                          <div className="mb-4 flex items-center gap-3">
                            <p className="text-xs text-gray-400 whitespace-nowrap">Move to section:</p>
                            <select
                              className="border rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                              defaultValue=""
                              onChange={(e) => { if (e.target.value) moveItem(item.id, e.target.value) }}
                            >
                              <option value="" disabled>— Select section —</option>
                              {sections
                                .filter((s) => s.id !== selectedSectionId)
                                .map((s) => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                          </div>

                          <div className="border-t border-dashed border-gray-200 mb-4" />

                          {/* Cost row headers */}
                          {rows.length > 0 && (
                            <div className="grid grid-cols-5 gap-3 mb-2 px-1">
                              <p className="text-xs text-gray-400">Name</p>
                              <p className="text-xs text-gray-400">Unit</p>
                              <p className="text-xs text-gray-400">Unit cost</p>
                              <p className="text-xs text-gray-400"></p>
                              <p className="text-xs text-gray-400"></p>
                            </div>
                          )}

                          {/* Cost rows */}
                          <div className="space-y-2 mb-4">
                            {rows.length === 0 && (
                              <p className="text-xs text-gray-400 mb-3">No cost rows yet. Add one below.</p>
                            )}
                            {rows.map((row) => {
                              const rEdits = rowEdits[row.id]
                              const hasRowEdits = !!rEdits

                              return (
                                <div
                                  key={row.id}
                                  className="grid grid-cols-5 gap-3 items-center bg-gray-50 rounded-lg px-3 py-2"
                                >
                                  {/* Name */}
                                  <input
                                    className="w-full p-1.5 border rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                                    value={rEdits?.name ?? row.name ?? ''}
                                    onChange={(e) => updateRowEdit(row.id, 'name', e.target.value, row)}
                                  />
                                  {/* Unit */}
                                  <input
                                    className="w-full p-1.5 border rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                                    value={rEdits?.unit ?? row.unit ?? ''}
                                    placeholder="unit"
                                    onChange={(e) => updateRowEdit(row.id, 'unit', e.target.value, row)}
                                  />
                                  {/* Unit cost */}
                                  <input
                                    type="number"
                                    className="w-full p-1.5 border rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                                    value={rEdits?.unit_cost ?? String(row.unit_cost ?? '0')}
                                    onChange={(e) => updateRowEdit(row.id, 'unit_cost', e.target.value, row)}
                                  />
                                  {/* Save button */}
                                  <button
                                    onClick={() => saveCostRowEdits(row.id, item.id)}
                                    disabled={!hasRowEdits}
                                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                                      hasRowEdits
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    }`}
                                  >
                                    Save
                                  </button>
                                  {/* Delete button */}
                                  <button
                                    onClick={() => deleteCostRow(row.id, item.id)}
                                    className="text-xs text-red-400 hover:text-red-600 text-right"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )
                            })}
                          </div>

                          {/* Add cost row */}
                          <div className="border-t border-dashed border-gray-200 pt-4">
                            <p className="text-xs font-medium text-gray-400 uppercase mb-2">Add cost row</p>
                            <div className="grid grid-cols-4 gap-3 items-end">
                              <div>
                                <label className="text-xs text-gray-400 block mb-1">Name</label>
                                <input
                                  className="w-full p-2 border rounded text-sm"
                                  placeholder="e.g. Labor"
                                  value={newRowName}
                                  onChange={(e) => setNewRowName(e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-400 block mb-1">Unit</label>
                                <input
                                  className="w-full p-2 border rounded text-sm"
                                  placeholder="e.g. hrs"
                                  value={newRowUnit}
                                  onChange={(e) => setNewRowUnit(e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-400 block mb-1">Unit cost ($)</label>
                                <input
                                  type="number"
                                  className="w-full p-2 border rounded text-sm"
                                  placeholder="0.00"
                                  value={newRowUnitCost}
                                  onChange={(e) => setNewRowUnitCost(e.target.value)}
                                />
                              </div>
                              <button
                                onClick={() => addCostRow(item.id)}
                                className="bg-blue-600 text-white px-4 py-2 rounded text-sm h-[38px]"
                              >
                                + Add Row
                              </button>
                            </div>
                          </div>

                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}