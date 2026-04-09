'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import NavSidebar from '../components/NavSidebar'

export default function CatalogPage() {
  const [sections, setSections] = useState<any[]>([])
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [items, setItems] = useState<any[]>([])
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)
  const [costRows, setCostRows] = useState<Record<string, any[]>>({})

  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [editingSectionName, setEditingSectionName] = useState('')
  const [newSectionName, setNewSectionName] = useState('')
  const [newItemName, setNewItemName] = useState('')
  const [itemEdits, setItemEdits] = useState<Record<string, { name: string; description: string; unit: string }>>({})
  const [newRowName, setNewRowName] = useState('')
  const [newRowUnit, setNewRowUnit] = useState('')
  const [newRowUnitCost, setNewRowUnitCost] = useState('')
  const [rowEdits, setRowEdits] = useState<Record<string, { name: string; unit: string; unit_cost: string }>>({})

  // ─── Sections ──────────────────────────────────────────────────────────────

  async function getSections() {
    const { data, error } = await supabase.from('catalog_sections').select('*').order('created_at', { ascending: true })
    if (error) { console.error(error); return }
    setSections(data || [])
  }

  async function addSection() {
    if (!newSectionName.trim()) return
    const { error } = await supabase.from('catalog_sections').insert([{ name: newSectionName.trim() }])
    if (error) { console.error(error); return }
    setNewSectionName('')
    getSections()
  }

  async function saveEditSection(sectionId: string) {
    if (!editingSectionName.trim()) return
    const { error } = await supabase.from('catalog_sections').update({ name: editingSectionName.trim() }).eq('id', sectionId)
    if (error) { console.error(error); return }
    setEditingSectionId(null); setEditingSectionName('')
    getSections()
  }

  async function deleteSection(sectionId: string) {
    const { data, error } = await supabase.from('catalog_items').select('id').eq('section_id', sectionId)
    if (error) { console.error(error); return }
    if (data && data.length > 0) {
      alert(`This section still has ${data.length} item${data.length > 1 ? 's' : ''} in it. Move or delete all items before deleting this section.`)
      return
    }
    const confirmed = window.confirm('Delete this section? This cannot be undone.')
    if (!confirmed) return
    await supabase.from('catalog_sections').delete().eq('id', sectionId)
    if (selectedSectionId === sectionId) { setSelectedSectionId(null); setItems([]) }
    getSections()
  }

  // ─── Items ─────────────────────────────────────────────────────────────────

  async function getItems(sectionId: string) {
    const { data, error } = await supabase.from('catalog_items').select('*').eq('section_id', sectionId).order('created_at', { ascending: true })
    if (error) { console.error(error); return }
    setItems(data || [])
  }

  async function addItem() {
    if (!newItemName.trim() || !selectedSectionId) return
    const { error } = await supabase.from('catalog_items').insert([{ name: newItemName.trim(), description: '', unit: '', section_id: selectedSectionId }])
    if (error) { console.error(error); return }
    setNewItemName('')
    getItems(selectedSectionId)
  }

  async function saveItemEdits(itemId: string) {
    const edits = itemEdits[itemId]
    if (!edits) return
    const { error } = await supabase.from('catalog_items').update({ name: edits.name, description: edits.description, unit: edits.unit }).eq('id', itemId)
    if (error) { console.error(error); return }
    setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, ...edits } : i))
    setItemEdits((prev) => { const next = { ...prev }; delete next[itemId]; return next })
  }

  function updateItemEdit(itemId: string, field: 'name' | 'description' | 'unit', value: string) {
    setItemEdits((prev) => ({
      ...prev,
      [itemId]: { name: prev[itemId]?.name ?? '', description: prev[itemId]?.description ?? '', unit: prev[itemId]?.unit ?? '', [field]: value },
    }))
  }

  async function deleteItem(itemId: string) {
    const confirmed = window.confirm('Delete this item and all its cost rows? This cannot be undone.')
    if (!confirmed) return
    const { data: costRowData } = await supabase.from('catalog_cost_rows').select('id').eq('item_id', itemId)
    const costRowIds = (costRowData || []).map((r: any) => r.id)
    if (costRowIds.length > 0) await supabase.from('template_item_rows').delete().in('catalog_cost_row_id', costRowIds)
    await supabase.from('catalog_cost_rows').delete().eq('item_id', itemId)
    await supabase.from('catalog_items').delete().eq('id', itemId)
    if (expandedItemId === itemId) setExpandedItemId(null)
    setCostRows((prev) => { const next = { ...prev }; delete next[itemId]; return next })
    setItemEdits((prev) => { const next = { ...prev }; delete next[itemId]; return next })
    if (selectedSectionId) getItems(selectedSectionId)
  }

  async function moveItem(itemId: string, newSectionId: string) {
    if (!newSectionId || newSectionId === selectedSectionId) return
    await supabase.from('catalog_items').update({ section_id: newSectionId }).eq('id', itemId)
    setItems((prev) => prev.filter((i) => i.id !== itemId))
    if (expandedItemId === itemId) setExpandedItemId(null)
  }

  // ─── Cost rows ─────────────────────────────────────────────────────────────

  async function getCostRows(itemId: string) {
    const { data, error } = await supabase.from('catalog_cost_rows').select('*').eq('item_id', itemId).order('created_at', { ascending: true })
    if (error) { console.error(error); return }
    setCostRows((prev) => ({ ...prev, [itemId]: data || [] }))
  }

  async function addCostRow(itemId: string) {
    if (!newRowName.trim() || !newRowUnitCost) return
    await supabase.from('catalog_cost_rows').insert([{ item_id: itemId, name: newRowName.trim(), unit: newRowUnit.trim(), unit_cost: Number(newRowUnitCost) }])
    setNewRowName(''); setNewRowUnit(''); setNewRowUnitCost('')
    getCostRows(itemId)
  }

  async function saveCostRowEdits(rowId: string, itemId: string) {
    const edits = rowEdits[rowId]
    if (!edits) return
    await supabase.from('catalog_cost_rows').update({ name: edits.name, unit: edits.unit, unit_cost: Number(edits.unit_cost) || 0 }).eq('id', rowId)
    setRowEdits((prev) => { const next = { ...prev }; delete next[rowId]; return next })
    getCostRows(itemId)
  }

  function updateRowEdit(rowId: string, field: 'name' | 'unit' | 'unit_cost', value: string, currentRow: any) {
    setRowEdits((prev) => ({
      ...prev,
      [rowId]: { name: prev[rowId]?.name ?? currentRow.name ?? '', unit: prev[rowId]?.unit ?? currentRow.unit ?? '', unit_cost: prev[rowId]?.unit_cost ?? String(currentRow.unit_cost ?? '0'), [field]: value },
    }))
  }

  async function deleteCostRow(rowId: string, itemId: string) {
    const confirmed = window.confirm('Delete this cost row? This cannot be undone.')
    if (!confirmed) return
    await supabase.from('template_item_rows').delete().eq('catalog_cost_row_id', rowId)
    await supabase.from('catalog_cost_rows').delete().eq('id', rowId)
    setRowEdits((prev) => { const next = { ...prev }; delete next[rowId]; return next })
    getCostRows(itemId)
  }

  function toggleItem(item: any) {
    if (expandedItemId === item.id) {
      setExpandedItemId(null)
    } else {
      setExpandedItemId(item.id)
      setItemEdits((prev) => ({ ...prev, [item.id]: { name: item.name || '', description: item.description || '', unit: item.unit || '' } }))
      setNewRowName(''); setNewRowUnit(''); setNewRowUnitCost('')
      getCostRows(item.id)
    }
  }

  useEffect(() => { getSections() }, [])

  const inputStyle = { padding: '8px 10px', borderRadius: 8, border: '0.5px solid #e5e5e5', background: '#fafafa', fontSize: 13, outline: 'none' } as React.CSSProperties

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f4f7fb' }}>

      <NavSidebar />

      {/* ── SECTIONS SIDEBAR ─────────────────────────────────────────── */}
      <div className="flex flex-col flex-shrink-0 overflow-hidden" style={{ width: 220, background: 'white', borderRight: '0.5px solid #eee' }}>
        <div style={{ padding: '20px 16px 12px', borderBottom: '0.5px solid #f0f0f0' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', margin: '0 0 12px' }}>Sections</p>
          <input
            placeholder="New section name"
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSection()}
            style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', marginBottom: 8 }}
          />
          <button onClick={addSection} style={{ width: '100%', padding: '8px', borderRadius: 8, background: '#185FA5', color: 'white', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
            + Add Section
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {sections.map((section) => (
            <div key={section.id}>
              {editingSectionId === section.id ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '4px 6px' }}>
                  <input autoFocus value={editingSectionName} onChange={(e) => setEditingSectionName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveEditSection(section.id); if (e.key === 'Escape') setEditingSectionId(null) }}
                    style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: '0.5px solid #e5e5e5', fontSize: 13, outline: 'none' }} />
                  <button onClick={() => saveEditSection(section.id)} style={{ fontSize: 12, color: '#639922', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Save</button>
                  <button onClick={() => setEditingSectionId(null)} style={{ fontSize: 12, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                </div>
              ) : (
                <div
                  className="group"
                  onClick={() => { setSelectedSectionId(section.id); setExpandedItemId(null); getItems(section.id) }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 2, background: selectedSectionId === section.id ? '#E6F1FB' : 'transparent' }}
                  onMouseOver={(e) => { if (selectedSectionId !== section.id) e.currentTarget.style.background = '#f5f5f5' }}
                  onMouseOut={(e) => { if (selectedSectionId !== section.id) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ fontSize: 13, fontWeight: 500, color: selectedSectionId === section.id ? '#0C447C' : '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {section.name}
                  </span>
                  <div style={{ display: 'flex', gap: 2, marginLeft: 4, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { setEditingSectionId(section.id); setEditingSectionName(section.name) }}
                      style={{ fontSize: 12, color: '#ddd', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 3px' }}
                      onMouseOver={(e) => (e.currentTarget.style.color = '#185FA5')}
                      onMouseOut={(e) => (e.currentTarget.style.color = '#ddd')}>✎</button>
                    <button onClick={() => deleteSection(section.id)}
                      style={{ fontSize: 12, color: '#ddd', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 3px' }}
                      onMouseOver={(e) => (e.currentTarget.style.color = '#f09595')}
                      onMouseOut={(e) => (e.currentTarget.style.color = '#ddd')}>✕</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div style={{ flexShrink: 0, padding: '16px 24px', background: 'white', borderBottom: '0.5px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: '#1a1a2e' }}>
            {selectedSectionId ? sections.find((s) => s.id === selectedSectionId)?.name : 'Catalog'}
          </h1>
          {selectedSectionId && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input placeholder="New item name" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItem()}
                style={{ ...inputStyle, width: 200 }} />
              <button onClick={addItem} style={{ padding: '8px 16px', borderRadius: 10, background: '#185FA5', color: 'white', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                + Add Item
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto" style={{ padding: 24 }}>
          {!selectedSectionId ? (
            <p style={{ color: '#aaa', fontSize: 14 }}>Select a section on the left to view and manage items.</p>
          ) : items.length === 0 ? (
            <p style={{ color: '#bbb', fontSize: 14 }}>No items in this section yet. Add one above.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map((item) => {
                const isExpanded = expandedItemId === item.id
                const rows = costRows[item.id] || []
                const edits = itemEdits[item.id]
                const hasUnsavedEdits = !!edits

                return (
                  <div key={item.id} style={{ background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
                      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => toggleItem(item)}>
                        <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: '#1a1a2e' }}>{item.name}</p>
                        <p style={{ fontSize: 12, color: '#aaa', margin: '2px 0 0', whiteSpace: 'normal', wordBreak: 'break-word' }}>{item.description}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 16, flexShrink: 0 }}>
                        <span style={{ fontSize: 12, color: '#aaa' }}>Unit: {item.unit || '—'}</span>
                        <button onClick={() => deleteItem(item.id)} style={{ fontSize: 12, color: '#f09595', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                        <span style={{ color: '#bbb', fontSize: 13, cursor: 'pointer' }} onClick={() => toggleItem(item)}>{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ borderTop: '0.5px solid #f0f0f0', padding: '16px' }}>
                        <p style={{ fontSize: 11, fontWeight: 500, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Item details</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px', gap: 10, marginBottom: 10 }}>
                          <div>
                            <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Name</label>
                            <input value={edits?.name ?? item.name ?? ''} onChange={(e) => updateItemEdit(item.id, 'name', e.target.value)}
                              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Unit</label>
                            <input placeholder="e.g. sqft" value={edits?.unit ?? item.unit ?? ''} onChange={(e) => updateItemEdit(item.id, 'unit', e.target.value)}
                              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <button onClick={() => saveItemEdits(item.id)} disabled={!hasUnsavedEdits}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: hasUnsavedEdits ? '#185FA5' : '#f0f0f0', color: hasUnsavedEdits ? 'white' : '#bbb', fontSize: 13, fontWeight: 500, border: 'none', cursor: hasUnsavedEdits ? 'pointer' : 'not-allowed' }}>
                              Save
                            </button>
                          </div>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                          <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Description (customer-facing)</label>
                          <textarea rows={3} placeholder="This description will appear on the customer proposal..." value={edits?.description ?? item.description ?? ''} onChange={(e) => updateItemEdit(item.id, 'description', e.target.value)}
                            style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', resize: 'none', lineHeight: 1.5 }} />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 16, borderBottom: '0.5px dashed #f0f0f0' }}>
                          <span style={{ fontSize: 12, color: '#aaa', whiteSpace: 'nowrap' }}>Move to section:</span>
                          <select defaultValue="" onChange={(e) => { if (e.target.value) moveItem(item.id, e.target.value) }}
                            style={{ ...inputStyle, padding: '7px 10px' }}>
                            <option value="" disabled>— Select section —</option>
                            {sections.filter((s) => s.id !== selectedSectionId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>

                        {rows.length > 0 && (
                          <>
                            <p style={{ fontSize: 11, fontWeight: 500, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Cost rows</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 80px 60px', gap: 8, marginBottom: 6, padding: '0 2px' }}>
                              {['Name', 'Unit', 'Unit cost', '', ''].map((h, i) => <span key={i} style={{ fontSize: 11, color: '#bbb' }}>{h}</span>)}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                              {rows.map((row) => {
                                const rEdits = rowEdits[row.id]
                                const hasRowEdits = !!rEdits
                                return (
                                  <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 80px 60px', gap: 8, alignItems: 'center', background: '#fafafa', borderRadius: 8, padding: '8px 10px' }}>
                                    <input value={rEdits?.name ?? row.name ?? ''} onChange={(e) => updateRowEdit(row.id, 'name', e.target.value, row)}
                                      style={{ ...inputStyle, padding: '6px 8px', background: 'white' }} />
                                    <input placeholder="unit" value={rEdits?.unit ?? row.unit ?? ''} onChange={(e) => updateRowEdit(row.id, 'unit', e.target.value, row)}
                                      style={{ ...inputStyle, padding: '6px 8px', background: 'white' }} />
                                    <input type="number" value={rEdits?.unit_cost ?? String(row.unit_cost ?? '0')} onChange={(e) => updateRowEdit(row.id, 'unit_cost', e.target.value, row)}
                                      style={{ ...inputStyle, padding: '6px 8px', background: 'white' }} />
                                    <button onClick={() => saveCostRowEdits(row.id, item.id)} disabled={!hasRowEdits}
                                      style={{ padding: '6px 8px', borderRadius: 6, background: hasRowEdits ? '#185FA5' : '#f0f0f0', color: hasRowEdits ? 'white' : '#bbb', fontSize: 12, fontWeight: 500, border: 'none', cursor: hasRowEdits ? 'pointer' : 'not-allowed' }}>Save</button>
                                    <button onClick={() => deleteCostRow(row.id, item.id)}
                                      style={{ fontSize: 12, color: '#f09595', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right' }}>Delete</button>
                                  </div>
                                )
                              })}
                            </div>
                          </>
                        )}

                        {rows.length === 0 && <p style={{ fontSize: 12, color: '#bbb', marginBottom: 16 }}>No cost rows yet. Add one below.</p>}

                        <div style={{ paddingTop: 16, borderTop: '0.5px dashed #f0f0f0' }}>
                          <p style={{ fontSize: 11, fontWeight: 500, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Add cost row</p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 100px', gap: 10, alignItems: 'flex-end' }}>
                            <div>
                              <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Name</label>
                              <input placeholder="e.g. Labor" value={newRowName} onChange={(e) => setNewRowName(e.target.value)}
                                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Unit</label>
                              <input placeholder="e.g. hrs" value={newRowUnit} onChange={(e) => setNewRowUnit(e.target.value)}
                                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Unit cost ($)</label>
                              <input type="number" placeholder="0.00" value={newRowUnitCost} onChange={(e) => setNewRowUnitCost(e.target.value)}
                                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                            </div>
                            <button onClick={() => addCostRow(item.id)}
                              style={{ padding: '8px 14px', borderRadius: 8, background: '#185FA5', color: 'white', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
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
        </div>
      </div>
    </div>
  )
}