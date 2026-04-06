'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateDescription, setNewTemplateDescription] = useState('')

  const [templateSections, setTemplateSections] = useState<any[]>([])
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null)

  const [catalogSections, setCatalogSections] = useState<any[]>([])
  const [selectedCatalogSectionId, setSelectedCatalogSectionId] = useState('')
  const [showAddSection, setShowAddSection] = useState(false)

  const [catalogItemsForSection, setCatalogItemsForSection] = useState<any[]>([])
  const [addingItemsToSectionId, setAddingItemsToSectionId] = useState<string | null>(null)
  const [addingItemsCatalogSectionId, setAddingItemsCatalogSectionId] = useState<string | null>(null)

  const [templateItems, setTemplateItems] = useState<Record<string, any[]>>({})
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)
  const [itemCostRows, setItemCostRows] = useState<Record<string, any[]>>({})
  const [templateItemRows, setTemplateItemRows] = useState<Record<string, any[]>>({})

  // T&C editing
  const [tcText, setTcText] = useState('')
  const [tcSaving, setTcSaving] = useState(false)
  const [tcSaved, setTcSaved] = useState(false)

  // ─── Templates ────────────────────────────────────────────────────────────

  async function getTemplates() {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) { console.error(error); return }
    setTemplates(data || [])
  }

  async function createTemplate() {
    if (!newTemplateName.trim()) return
    const { data, error } = await supabase
      .from('templates')
      .insert([{ name: newTemplateName.trim(), description: newTemplateDescription.trim() }])
      .select()
      .single()
    if (error) { console.error(error); return }
    setNewTemplateName('')
    setNewTemplateDescription('')
    getTemplates()
    setSelectedTemplateId(data.id)
    setTcText('')
    getTemplateSections(data.id)
  }

  async function deleteTemplate(templateId: string) {
    const confirmed = window.confirm('Delete this template and all its sections and items? This cannot be undone.')
    if (!confirmed) return

    const { data: sections } = await supabase
      .from('template_sections')
      .select('id')
      .eq('template_id', templateId)

    const sectionIds = (sections || []).map((s: any) => s.id)

    if (sectionIds.length > 0) {
      const { data: items } = await supabase
        .from('template_items')
        .select('id')
        .in('section_id', sectionIds)

      const itemIds = (items || []).map((i: any) => i.id)

      if (itemIds.length > 0) {
        await supabase.from('template_item_rows').delete().in('item_id', itemIds)
      }

      await supabase.from('template_items').delete().in('section_id', sectionIds)
      await supabase.from('template_sections').delete().eq('template_id', templateId)
    }

    await supabase.from('templates').delete().eq('id', templateId)

    if (selectedTemplateId === templateId) {
      setSelectedTemplateId(null)
      setTemplateSections([])
      setTemplateItems({})
      setTcText('')
    }

    getTemplates()
  }

  async function saveTc() {
    if (!selectedTemplateId) return
    setTcSaving(true)
    await supabase
      .from('templates')
      .update({ terms_and_conditions: tcText })
      .eq('id', selectedTemplateId)
    setTcSaving(false)
    setTcSaved(true)
    setTimeout(() => setTcSaved(false), 2000)
  }

  // ─── Template sections ────────────────────────────────────────────────────

  async function getTemplateSections(templateId: string) {
    const { data, error } = await supabase
      .from('template_sections')
      .select('*')
      .eq('template_id', templateId)
      .order('created_at', { ascending: true })
    if (error) { console.error(error); return }
    setTemplateSections(data || [])
  }

  async function addTemplateSection() {
    if (!selectedCatalogSectionId || !selectedTemplateId) return

    const catalogSection = catalogSections.find((s) => s.id === selectedCatalogSectionId)
    if (!catalogSection) return

    const { error } = await supabase
      .from('template_sections')
      .insert([{
        template_id: selectedTemplateId,
        name: catalogSection.name,
        sort_order: templateSections.length,
      }])

    if (error) { console.error(error); return }

    setSelectedCatalogSectionId('')
    setShowAddSection(false)
    getTemplateSections(selectedTemplateId)
  }

  async function deleteTemplateSection(sectionId: string) {
    const confirmed = window.confirm('Delete this section and all its items? This cannot be undone.')
    if (!confirmed) return

    const { data: items } = await supabase
      .from('template_items')
      .select('id')
      .eq('section_id', sectionId)

    const itemIds = (items || []).map((i: any) => i.id)

    if (itemIds.length > 0) {
      await supabase.from('template_item_rows').delete().in('item_id', itemIds)
      await supabase.from('template_items').delete().in('section_id', [sectionId])
    }

    await supabase.from('template_sections').delete().eq('id', sectionId)

    if (expandedSectionId === sectionId) setExpandedSectionId(null)
    setTemplateItems((prev) => {
      const next = { ...prev }
      delete next[sectionId]
      return next
    })

    if (selectedTemplateId) getTemplateSections(selectedTemplateId)
  }

  async function getCatalogSections() {
    const { data, error } = await supabase
      .from('catalog_sections')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) { console.error(error); return }
    setCatalogSections(data || [])
  }

  // ─── Template items ───────────────────────────────────────────────────────

  async function getTemplateItems(sectionId: string) {
    const { data, error } = await supabase
      .from('template_items')
      .select('*, catalog_items(name, description, unit)')
      .eq('section_id', sectionId)
      .order('sort_order', { ascending: true })
    if (error) { console.error(error); return }
    setTemplateItems((prev) => ({ ...prev, [sectionId]: data || [] }))
  }

  async function getCatalogItemsForSection(catalogSectionId: string) {
    const { data, error } = await supabase
      .from('catalog_items')
      .select('*')
      .eq('section_id', catalogSectionId)
      .order('created_at', { ascending: true })
    if (error) { console.error(error); return }
    setCatalogItemsForSection(data || [])
  }

  async function addTemplateItem(catalogItem: any, templateSectionId: string) {
    const existing = (templateItems[templateSectionId] || []).find(
      (i: any) => i.catalog_item_id === catalogItem.id
    )
    if (existing) return

    const { error } = await supabase
      .from('template_items')
      .insert([{
        section_id: templateSectionId,
        catalog_item_id: catalogItem.id,
        display_quantity: null,
        display_unit: catalogItem.unit || '',
        sort_order: (templateItems[templateSectionId] || []).length,
      }])

    if (error) { console.error(error); return }
    getTemplateItems(templateSectionId)
  }

  async function deleteTemplateItem(itemId: string, sectionId: string) {
    const confirmed = window.confirm('Remove this item from the template?')
    if (!confirmed) return

    await supabase.from('template_item_rows').delete().eq('item_id', itemId)
    await supabase.from('template_items').delete().eq('id', itemId)

    if (expandedItemId === itemId) setExpandedItemId(null)
    getTemplateItems(sectionId)
  }

  // ─── Template item rows ───────────────────────────────────────────────────

  async function getTemplateItemRows(templateItemId: string, catalogItemId: string) {
    const { data: catalogRows, error: crErr } = await supabase
      .from('catalog_cost_rows')
      .select('*')
      .eq('item_id', catalogItemId)
      .order('created_at', { ascending: true })

    if (crErr) { console.error(crErr); return }
    setItemCostRows((prev) => ({ ...prev, [templateItemId]: catalogRows || [] }))

    const { data: tirData, error: tirErr } = await supabase
      .from('template_item_rows')
      .select('*')
      .eq('item_id', templateItemId)

    if (tirErr) { console.error(tirErr); return }
    setTemplateItemRows((prev) => ({ ...prev, [templateItemId]: tirData || [] }))
  }

  async function upsertTemplateItemRow(templateItemId: string, catalogCostRowId: string, quantity: number) {
    const existing = (templateItemRows[templateItemId] || []).find(
      (r: any) => r.catalog_cost_row_id === catalogCostRowId
    )

    if (existing) {
      await supabase.from('template_item_rows').update({ quantity }).eq('id', existing.id)
    } else {
      await supabase.from('template_item_rows').insert([{
        item_id: templateItemId,
        catalog_cost_row_id: catalogCostRowId,
        quantity,
        sort_order: 0,
      }])
    }

    const firstRow = itemCostRows[templateItemId]?.[0]
    if (firstRow) getTemplateItemRows(templateItemId, firstRow.item_id)
  }

  async function updateDisplayQuantity(templateItemId: string, sectionId: string, value: string) {
    await supabase
      .from('template_items')
      .update({ display_quantity: value === '' ? null : Number(value) })
      .eq('id', templateItemId)
    getTemplateItems(sectionId)
  }

  async function updateDisplayUnit(templateItemId: string, sectionId: string, value: string) {
    await supabase
      .from('template_items')
      .update({ display_unit: value })
      .eq('id', templateItemId)
    getTemplateItems(sectionId)
  }

  useEffect(() => {
    getTemplates()
    getCatalogSections()
  }, [])

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#f4f7fb]">

      {/* LEFT — Templates list */}
      <div className="w-72 bg-white border-r p-6 flex flex-col">
        <h2 className="text-lg font-semibold mb-4">Templates</h2>

        <div className="mb-4 space-y-2">
          <input
            className="w-full p-2 border rounded text-sm"
            placeholder="Template name"
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createTemplate()}
          />
          <input
            className="w-full p-2 border rounded text-sm"
            placeholder="Description (optional)"
            value={newTemplateDescription}
            onChange={(e) => setNewTemplateDescription(e.target.value)}
          />
          <button
            onClick={createTemplate}
            className="w-full bg-blue-600 text-white py-2 rounded text-sm"
          >
            + New Template
          </button>
        </div>

        <div className="space-y-1 overflow-y-auto">
          {templates.map((t) => (
            <div
              key={t.id}
              className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm ${
                selectedTemplateId === t.id
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
              onClick={() => {
                setSelectedTemplateId(t.id)
                setExpandedSectionId(null)
                setExpandedItemId(null)
                setTcText(t.terms_and_conditions || '')
                getTemplateSections(t.id)
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="truncate">{t.name}</p>
                {t.description && (
                  <p className="text-xs text-gray-400 truncate">{t.description}</p>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deleteTemplate(t.id)
                }}
                className="ml-2 opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-red-500 transition-opacity"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT — Template editor */}
      <div className="flex-1 p-10 overflow-y-auto">

        {!selectedTemplateId ? (
          <div>
            <h1 className="text-2xl font-semibold mb-2">Template Editor</h1>
            <p className="text-gray-500">Select a template on the left or create a new one to get started.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-semibold">
                {templates.find((t) => t.id === selectedTemplateId)?.name}
              </h1>
            </div>

            {/* Add section */}
            {!showAddSection ? (
              <button
                onClick={() => setShowAddSection(true)}
                className="mb-6 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
              >
                + Add Section
              </button>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm flex items-center gap-3">
                <select
                  className="flex-1 border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={selectedCatalogSectionId}
                  onChange={(e) => setSelectedCatalogSectionId(e.target.value)}
                >
                  <option value="">— Pick a catalog section —</option>
                  {catalogSections.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <button
                  onClick={addTemplateSection}
                  disabled={!selectedCatalogSectionId}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    selectedCatalogSectionId
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Add
                </button>
                <button
                  onClick={() => { setShowAddSection(false); setSelectedCatalogSectionId('') }}
                  className="text-sm text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
              </div>
            )}

            {templateSections.length === 0 && (
              <p className="text-gray-400 text-sm mb-6">No sections yet. Add one above.</p>
            )}

            <div className="space-y-4 mb-8">
              {templateSections.map((section) => {
                const isExpanded = expandedSectionId === section.id
                const items = templateItems[section.id] || []

                return (
                  <div key={section.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">

                    <div className="flex items-center justify-between px-5 py-4">
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => {
                          if (isExpanded) {
                            setExpandedSectionId(null)
                          } else {
                            setExpandedSectionId(section.id)
                            getTemplateItems(section.id)
                          }
                        }}
                      >
                        <p className="font-medium">{section.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{items.length} item{items.length !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => deleteTemplateSection(section.id)}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          Delete
                        </button>
                        <span
                          className="text-gray-400 text-sm cursor-pointer select-none"
                          onClick={() => {
                            if (isExpanded) {
                              setExpandedSectionId(null)
                            } else {
                              setExpandedSectionId(section.id)
                              getTemplateItems(section.id)
                            }
                          }}
                        >
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-100 px-5 py-4">

                        {addingItemsToSectionId === section.id ? (
                          <div className="mb-4">
                            <div className="flex items-center gap-3 mb-3">
                              <select
                                className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                                value={addingItemsCatalogSectionId || ''}
                                onChange={(e) => {
                                  setAddingItemsCatalogSectionId(e.target.value)
                                  if (e.target.value) getCatalogItemsForSection(e.target.value)
                                }}
                              >
                                <option value="">— Filter by catalog section —</option>
                                {catalogSections.map((s) => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => {
                                  setAddingItemsToSectionId(null)
                                  setAddingItemsCatalogSectionId(null)
                                  setCatalogItemsForSection([])
                                }}
                                className="text-sm text-gray-400 hover:text-gray-600 whitespace-nowrap"
                              >
                                Done
                              </button>
                            </div>

                            {catalogItemsForSection.length > 0 && (
                              <div className="space-y-1 max-h-48 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                                {catalogItemsForSection.map((ci) => {
                                  const alreadyAdded = (templateItems[section.id] || []).some(
                                    (i: any) => i.catalog_item_id === ci.id
                                  )
                                  return (
                                    <div
                                      key={ci.id}
                                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-gray-100"
                                    >
                                      <p className="text-sm text-gray-700">{ci.name}</p>
                                      {alreadyAdded ? (
                                        <span className="text-xs text-green-500">Added</span>
                                      ) : (
                                        <button
                                          onClick={() => addTemplateItem(ci, section.id)}
                                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                          + Add
                                        </button>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setAddingItemsToSectionId(section.id)
                              setAddingItemsCatalogSectionId(null)
                              setCatalogItemsForSection([])
                            }}
                            className="mb-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            + Add Item from Catalog
                          </button>
                        )}

                        {items.length === 0 ? (
                          <p className="text-xs text-gray-400">No items yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {items.map((item: any) => {
                              const isItemExpanded = expandedItemId === item.id
                              const catalogItem = item.catalog_items
                              const costRows = itemCostRows[item.id] || []
                              const tirRows = templateItemRows[item.id] || []

                              return (
                                <div key={item.id} className="border border-gray-100 rounded-xl overflow-hidden">

                                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                                    <div
                                      className="flex-1 cursor-pointer"
                                      onClick={() => {
                                        if (isItemExpanded) {
                                          setExpandedItemId(null)
                                        } else {
                                          setExpandedItemId(item.id)
                                          getTemplateItemRows(item.id, item.catalog_item_id)
                                        }
                                      }}
                                    >
                                      <p className="text-sm font-medium">{catalogItem?.name}</p>
                                      <p className="text-xs text-gray-400">{catalogItem?.description}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <button
                                        onClick={() => deleteTemplateItem(item.id, section.id)}
                                        className="text-xs text-red-400 hover:text-red-600"
                                      >
                                        Remove
                                      </button>
                                      <span
                                        className="text-gray-400 text-sm cursor-pointer select-none"
                                        onClick={() => {
                                          if (isItemExpanded) {
                                            setExpandedItemId(null)
                                          } else {
                                            setExpandedItemId(item.id)
                                            getTemplateItemRows(item.id, item.catalog_item_id)
                                          }
                                        }}
                                      >
                                        {isItemExpanded ? '▲' : '▼'}
                                      </span>
                                    </div>
                                  </div>

                                  {isItemExpanded && (
                                    <div className="px-4 py-3 border-t border-gray-100">

                                      <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div>
                                          <label className="text-xs text-gray-400 block mb-1">Display quantity</label>
                                          <input
                                            type="number"
                                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                                            defaultValue={item.display_quantity || ''}
                                            onBlur={(e) => updateDisplayQuantity(item.id, section.id, e.target.value)}
                                            placeholder="e.g. 300"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-xs text-gray-400 block mb-1">Display unit</label>
                                          <input
                                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                                            defaultValue={item.display_unit || ''}
                                            onBlur={(e) => updateDisplayUnit(item.id, section.id, e.target.value)}
                                            placeholder="e.g. sq ft"
                                          />
                                        </div>
                                      </div>

                                      {costRows.length === 0 ? (
                                        <p className="text-xs text-gray-400">No cost rows in catalog for this item.</p>
                                      ) : (
                                        <div>
                                          <p className="text-xs font-medium text-gray-400 uppercase mb-2">Cost row quantities</p>
                                          <div className="grid grid-cols-3 gap-2 mb-1 px-1">
                                            <p className="text-xs text-gray-400">Name</p>
                                            <p className="text-xs text-gray-400">Unit</p>
                                            <p className="text-xs text-gray-400">Quantity</p>
                                          </div>
                                          <div className="space-y-2">
                                            {costRows.map((cr: any) => {
                                              const tir = tirRows.find((r: any) => r.catalog_cost_row_id === cr.id)
                                              return (
                                                <div key={cr.id} className="grid grid-cols-3 gap-2 items-center">
                                                  <p className="text-sm text-gray-700">{cr.name}</p>
                                                  <p className="text-sm text-gray-500">{cr.unit || '—'}</p>
                                                  <input
                                                    type="number"
                                                    className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                                                    defaultValue={tir?.quantity || ''}
                                                    onBlur={(e) => upsertTemplateItemRow(item.id, cr.id, Number(e.target.value))}
                                                    placeholder="0"
                                                  />
                                                </div>
                                              )
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Terms and Conditions */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700">Terms and Conditions</p>
                <div className="flex items-center gap-3">
                  {tcSaved && <span className="text-xs text-green-600">✓ Saved</span>}
                  <button
                    onClick={saveTc}
                    disabled={tcSaving}
                    className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
                  >
                    {tcSaving ? 'Saving…' : 'Save T&C'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-2">
                This text will be included in the proposal preview and sent to the client for signature.
              </p>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none font-mono"
                rows={20}
                placeholder="Paste your terms and conditions here..."
                value={tcText}
                onChange={(e) => setTcText(e.target.value)}
              />
            </div>

          </>
        )}
      </div>
    </div>
  )
}