'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

function NavItem({ href, active, label, icon }: { href: string; active?: boolean; label: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1" style={{ textDecoration: 'none' }}>
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
        style={{ background: active ? 'rgba(255,255,255,0.2)' : 'transparent' }}
      >
        {icon}
      </div>
      <span style={{ fontSize: '10px', color: active ? 'white' : 'rgba(255,255,255,0.5)', fontWeight: active ? 500 : 400 }}>
        {label}
      </span>
    </Link>
  )
}

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

  const [tcText, setTcText] = useState('')
  const [tcSaving, setTcSaving] = useState(false)
  const [tcSaved, setTcSaved] = useState(false)

  // ─── Templates ────────────────────────────────────────────────────────────

  async function getTemplates() {
    const { data, error } = await supabase.from('templates').select('*').order('created_at', { ascending: true })
    if (error) { console.error(error); return }
    setTemplates(data || [])
  }

  async function createTemplate() {
    if (!newTemplateName.trim()) return
    const { data, error } = await supabase.from('templates').insert([{ name: newTemplateName.trim(), description: newTemplateDescription.trim() }]).select().single()
    if (error) { console.error(error); return }
    setNewTemplateName(''); setNewTemplateDescription('')
    getTemplates()
    setSelectedTemplateId(data.id)
    setTcText('')
    getTemplateSections(data.id)
  }

  async function deleteTemplate(templateId: string) {
    const confirmed = window.confirm('Delete this template and all its sections and items? This cannot be undone.')
    if (!confirmed) return
    const { data: sections } = await supabase.from('template_sections').select('id').eq('template_id', templateId)
    const sectionIds = (sections || []).map((s: any) => s.id)
    if (sectionIds.length > 0) {
      const { data: items } = await supabase.from('template_items').select('id').in('section_id', sectionIds)
      const itemIds = (items || []).map((i: any) => i.id)
      if (itemIds.length > 0) await supabase.from('template_item_rows').delete().in('item_id', itemIds)
      await supabase.from('template_items').delete().in('section_id', sectionIds)
      await supabase.from('template_sections').delete().eq('template_id', templateId)
    }
    await supabase.from('templates').delete().eq('id', templateId)
    if (selectedTemplateId === templateId) { setSelectedTemplateId(null); setTemplateSections([]); setTemplateItems({}); setTcText('') }
    getTemplates()
  }

  async function saveTc() {
    if (!selectedTemplateId) return
    setTcSaving(true)
    await supabase.from('templates').update({ terms_and_conditions: tcText }).eq('id', selectedTemplateId)
    setTcSaving(false); setTcSaved(true)
    setTimeout(() => setTcSaved(false), 2000)
  }

  // ─── Template sections ────────────────────────────────────────────────────

  async function getTemplateSections(templateId: string) {
    const { data, error } = await supabase.from('template_sections').select('*').eq('template_id', templateId).order('created_at', { ascending: true })
    if (error) { console.error(error); return }
    setTemplateSections(data || [])
  }

  async function addTemplateSection() {
    if (!selectedCatalogSectionId || !selectedTemplateId) return
    const catalogSection = catalogSections.find((s) => s.id === selectedCatalogSectionId)
    if (!catalogSection) return
    const { error } = await supabase.from('template_sections').insert([{ template_id: selectedTemplateId, name: catalogSection.name, sort_order: templateSections.length }])
    if (error) { console.error(error); return }
    setSelectedCatalogSectionId(''); setShowAddSection(false)
    getTemplateSections(selectedTemplateId)
  }

  async function deleteTemplateSection(sectionId: string) {
    const confirmed = window.confirm('Delete this section and all its items? This cannot be undone.')
    if (!confirmed) return
    const { data: items } = await supabase.from('template_items').select('id').eq('section_id', sectionId)
    const itemIds = (items || []).map((i: any) => i.id)
    if (itemIds.length > 0) {
      await supabase.from('template_item_rows').delete().in('item_id', itemIds)
      await supabase.from('template_items').delete().in('section_id', [sectionId])
    }
    await supabase.from('template_sections').delete().eq('id', sectionId)
    if (expandedSectionId === sectionId) setExpandedSectionId(null)
    setTemplateItems((prev) => { const next = { ...prev }; delete next[sectionId]; return next })
    if (selectedTemplateId) getTemplateSections(selectedTemplateId)
  }

  async function getCatalogSections() {
    const { data, error } = await supabase.from('catalog_sections').select('*').order('created_at', { ascending: true })
    if (error) { console.error(error); return }
    setCatalogSections(data || [])
  }

  // ─── Template items ───────────────────────────────────────────────────────

  async function getTemplateItems(sectionId: string) {
    const { data, error } = await supabase.from('template_items').select('*, catalog_items(name, description, unit)').eq('section_id', sectionId).order('sort_order', { ascending: true })
    if (error) { console.error(error); return }
    setTemplateItems((prev) => ({ ...prev, [sectionId]: data || [] }))
  }

  async function getCatalogItemsForSection(catalogSectionId: string) {
    const { data, error } = await supabase.from('catalog_items').select('*').eq('section_id', catalogSectionId).order('created_at', { ascending: true })
    if (error) { console.error(error); return }
    setCatalogItemsForSection(data || [])
  }

  async function addTemplateItem(catalogItem: any, templateSectionId: string) {
    const existing = (templateItems[templateSectionId] || []).find((i: any) => i.catalog_item_id === catalogItem.id)
    if (existing) return
    const { error } = await supabase.from('template_items').insert([{ section_id: templateSectionId, catalog_item_id: catalogItem.id, display_quantity: null, display_unit: catalogItem.unit || '', sort_order: (templateItems[templateSectionId] || []).length }])
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
    const { data: catalogRows, error: crErr } = await supabase.from('catalog_cost_rows').select('*').eq('item_id', catalogItemId).order('created_at', { ascending: true })
    if (crErr) { console.error(crErr); return }
    setItemCostRows((prev) => ({ ...prev, [templateItemId]: catalogRows || [] }))
    const { data: tirData, error: tirErr } = await supabase.from('template_item_rows').select('*').eq('item_id', templateItemId)
    if (tirErr) { console.error(tirErr); return }
    setTemplateItemRows((prev) => ({ ...prev, [templateItemId]: tirData || [] }))
  }

  async function upsertTemplateItemRow(templateItemId: string, catalogCostRowId: string, quantity: number) {
    const existing = (templateItemRows[templateItemId] || []).find((r: any) => r.catalog_cost_row_id === catalogCostRowId)
    if (existing) { await supabase.from('template_item_rows').update({ quantity }).eq('id', existing.id) }
    else { await supabase.from('template_item_rows').insert([{ item_id: templateItemId, catalog_cost_row_id: catalogCostRowId, quantity, sort_order: 0 }]) }
    const firstRow = itemCostRows[templateItemId]?.[0]
    if (firstRow) getTemplateItemRows(templateItemId, firstRow.item_id)
  }

  async function updateDisplayQuantity(templateItemId: string, sectionId: string, value: string) {
    await supabase.from('template_items').update({ display_quantity: value === '' ? null : Number(value) }).eq('id', templateItemId)
    getTemplateItems(sectionId)
  }

  async function updateDisplayUnit(templateItemId: string, sectionId: string, value: string) {
    await supabase.from('template_items').update({ display_unit: value }).eq('id', templateItemId)
    getTemplateItems(sectionId)
  }

  useEffect(() => { getTemplates(); getCatalogSections() }, [])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f4f7fb' }}>

      {/* ── SLIM SIDEBAR ─────────────────────────────────────────────── */}
      <aside className="flex flex-col items-center py-5 gap-5 flex-shrink-0" style={{ width: '68px', background: '#0C447C' }}>
        <div className="mb-2" style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="5" height="5" rx="1" fill="white"/>
            <rect x="9" y="2" width="5" height="5" rx="1" fill="white" opacity="0.6"/>
            <rect x="2" y="9" width="5" height="5" rx="1" fill="white" opacity="0.6"/>
            <rect x="9" y="9" width="5" height="5" rx="1" fill="white" opacity="0.4"/>
          </svg>
        </div>
        <NavItem href="/" label="Home" icon={
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 7.5L9 2l7 5.5V16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5z" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinejoin="round"/>
            <rect x="6.5" y="10" width="5" height="7" rx="0.5" fill="rgba(255,255,255,0.6)"/>
          </svg>
        }/>
        <NavItem href="/leads" label="Leads" icon={
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="6" r="3.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
            <path d="M2 16c0-3.866 3.134-6 7-6s7 2.134 7 6" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        }/>
        <NavItem href="/projects" label="Projects" icon={
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="1" y="5" width="16" height="11" rx="1.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
            <path d="M6 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
            <path d="M1 9h16" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
          </svg>
        }/>
        <NavItem href="/catalog" label="Catalog" icon={
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 4h12M3 9h12M3 14h7" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        }/>
        <NavItem href="/templates" active label="Templates" icon={
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="1" y="1" width="16" height="5" rx="1.5" stroke="white" strokeWidth="1.5"/>
            <rect x="1" y="9" width="7" height="8" rx="1.5" stroke="white" strokeWidth="1.5"/>
            <rect x="10" y="9" width="7" height="8" rx="1.5" stroke="white" strokeWidth="1.5"/>
          </svg>
        }/>
      </aside>

      {/* ── TEMPLATES LIST SIDEBAR ────────────────────────────────────── */}
      <div className="flex flex-col flex-shrink-0 overflow-hidden" style={{ width: 220, background: 'white', borderRight: '0.5px solid #eee' }}>

        <div style={{ padding: '20px 16px 12px', borderBottom: '0.5px solid #f0f0f0' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', margin: '0 0 12px' }}>Templates</p>
          <input
            className="w-full"
            placeholder="Template name"
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createTemplate()}
            style={{ padding: '8px 10px', borderRadius: 8, border: '0.5px solid #e5e5e5', background: '#fafafa', fontSize: 13, outline: 'none', marginBottom: 8, boxSizing: 'border-box', width: '100%' }}
          />
          <input
            className="w-full"
            placeholder="Description (optional)"
            value={newTemplateDescription}
            onChange={(e) => setNewTemplateDescription(e.target.value)}
            style={{ padding: '8px 10px', borderRadius: 8, border: '0.5px solid #e5e5e5', background: '#fafafa', fontSize: 13, outline: 'none', marginBottom: 8, boxSizing: 'border-box', width: '100%' }}
          />
          <button
            onClick={createTemplate}
            style={{ width: '100%', padding: '8px', borderRadius: 8, background: '#185FA5', color: 'white', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer' }}
          >
            + New Template
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {templates.map((t) => (
            <div
              key={t.id}
              onClick={() => { setSelectedTemplateId(t.id); setExpandedSectionId(null); setExpandedItemId(null); setTcText(t.terms_and_conditions || ''); getTemplateSections(t.id) }}
              className="group"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                background: selectedTemplateId === t.id ? '#E6F1FB' : 'transparent',
              }}
              onMouseOver={(e) => { if (selectedTemplateId !== t.id) e.currentTarget.style.background = '#f5f5f5' }}
              onMouseOut={(e) => { if (selectedTemplateId !== t.id) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: selectedTemplateId === t.id ? '#0C447C' : '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</p>
                {t.description && <p style={{ fontSize: 11, color: '#aaa', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</p>}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id) }}
                style={{ fontSize: 12, color: '#ddd', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', flexShrink: 0, marginLeft: 4 }}
                onMouseOver={(e) => (e.currentTarget.style.color = '#f09595')}
                onMouseOut={(e) => (e.currentTarget.style.color = '#ddd')}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div style={{ flexShrink: 0, padding: '16px 24px', background: 'white', borderBottom: '0.5px solid #eee' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: '#1a1a2e' }}>
            {selectedTemplateId ? templates.find((t) => t.id === selectedTemplateId)?.name : 'Template Editor'}
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ padding: 24 }}>

          {!selectedTemplateId ? (
            <p style={{ color: '#aaa', fontSize: 14 }}>Select a template on the left or create a new one to get started.</p>
          ) : (
            <>
              {/* Add section */}
              {!showAddSection ? (
                <button
                  onClick={() => setShowAddSection(true)}
                  style={{ marginBottom: 20, padding: '8px 16px', borderRadius: 10, background: '#185FA5', color: 'white', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer' }}
                >
                  + Add Section
                </button>
              ) : (
                <div style={{ background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 12, padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <select
                    className="flex-1"
                    value={selectedCatalogSectionId}
                    onChange={(e) => setSelectedCatalogSectionId(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 8, border: '0.5px solid #e5e5e5', background: '#fafafa', fontSize: 13, outline: 'none' }}
                  >
                    <option value="">— Pick a catalog section —</option>
                    {catalogSections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button
                    onClick={addTemplateSection}
                    disabled={!selectedCatalogSectionId}
                    style={{ padding: '8px 16px', borderRadius: 8, background: selectedCatalogSectionId ? '#185FA5' : '#e5e5e5', color: selectedCatalogSectionId ? 'white' : '#aaa', fontSize: 13, fontWeight: 500, border: 'none', cursor: selectedCatalogSectionId ? 'pointer' : 'not-allowed' }}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setShowAddSection(false); setSelectedCatalogSectionId('') }}
                    style={{ fontSize: 13, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {templateSections.length === 0 && (
                <p style={{ color: '#bbb', fontSize: 13, marginBottom: 20 }}>No sections yet. Add one above.</p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                {templateSections.map((section) => {
                  const isExpanded = expandedSectionId === section.id
                  const items = templateItems[section.id] || []

                  return (
                    <div key={section.id} style={{ background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 14, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
                        <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => { if (isExpanded) { setExpandedSectionId(null) } else { setExpandedSectionId(section.id); getTemplateItems(section.id) } }}>
                          <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: '#1a1a2e' }}>{section.name}</p>
                          <p style={{ fontSize: 12, color: '#aaa', margin: '2px 0 0' }}>{items.length} item{items.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <button onClick={() => deleteTemplateSection(section.id)} style={{ fontSize: 12, color: '#f09595', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                          <span style={{ color: '#bbb', fontSize: 13, cursor: 'pointer' }} onClick={() => { if (isExpanded) { setExpandedSectionId(null) } else { setExpandedSectionId(section.id); getTemplateItems(section.id) } }}>{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ borderTop: '0.5px solid #f0f0f0', padding: '14px 16px' }}>

                          {addingItemsToSectionId === section.id ? (
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                                <select
                                  value={addingItemsCatalogSectionId || ''}
                                  onChange={(e) => { setAddingItemsCatalogSectionId(e.target.value); if (e.target.value) getCatalogItemsForSection(e.target.value) }}
                                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '0.5px solid #e5e5e5', background: '#fafafa', fontSize: 13, outline: 'none' }}
                                >
                                  <option value="">— Filter by catalog section —</option>
                                  {catalogSections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <button
                                  onClick={() => { setAddingItemsToSectionId(null); setAddingItemsCatalogSectionId(null); setCatalogItemsForSection([]) }}
                                  style={{ fontSize: 13, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                >
                                  Done
                                </button>
                              </div>
                              {catalogItemsForSection.length > 0 && (
                                <div style={{ border: '0.5px solid #e8e8e8', borderRadius: 10, overflow: 'hidden', maxHeight: 200, overflowY: 'auto' }}>
                                  {catalogItemsForSection.map((ci) => {
                                    const alreadyAdded = (templateItems[section.id] || []).some((i: any) => i.catalog_item_id === ci.id)
                                    return (
                                      <div key={ci.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderBottom: '0.5px solid #f5f5f5', background: 'white' }}>
                                        <p style={{ fontSize: 13, color: '#333', margin: 0 }}>{ci.name}</p>
                                        {alreadyAdded
                                          ? <span style={{ fontSize: 12, color: '#639922' }}>Added</span>
                                          : <button onClick={() => addTemplateItem(ci, section.id)} style={{ fontSize: 12, color: '#185FA5', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>+ Add</button>
                                        }
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => { setAddingItemsToSectionId(section.id); setAddingItemsCatalogSectionId(null); setCatalogItemsForSection([]) }}
                              style={{ fontSize: 13, color: '#185FA5', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, marginBottom: 12 }}
                            >
                              + Add Item from Catalog
                            </button>
                          )}

                          {items.length === 0 ? (
                            <p style={{ fontSize: 12, color: '#bbb' }}>No items yet.</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {items.map((item: any) => {
                                const isItemExpanded = expandedItemId === item.id
                                const catalogItem = item.catalog_items
                                const costRows = itemCostRows[item.id] || []
                                const tirRows = templateItemRows[item.id] || []

                                return (
                                  <div key={item.id} style={{ border: '0.5px solid #f0f0f0', borderRadius: 10, overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#fafafa' }}>
                                      <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => { if (isItemExpanded) { setExpandedItemId(null) } else { setExpandedItemId(item.id); getTemplateItemRows(item.id, item.catalog_item_id) } }}>
                                        <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: '#1a1a2e' }}>{catalogItem?.name}</p>
                                        <p style={{ fontSize: 11, color: '#aaa', margin: '2px 0 0' }}>{catalogItem?.description}</p>
                                      </div>
                                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                        <button onClick={() => deleteTemplateItem(item.id, section.id)} style={{ fontSize: 12, color: '#f09595', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                                        <span style={{ color: '#bbb', fontSize: 12, cursor: 'pointer' }} onClick={() => { if (isItemExpanded) { setExpandedItemId(null) } else { setExpandedItemId(item.id); getTemplateItemRows(item.id, item.catalog_item_id) } }}>{isItemExpanded ? '▲' : '▼'}</span>
                                      </div>
                                    </div>

                                    {isItemExpanded && (
                                      <div style={{ padding: '12px 14px', borderTop: '0.5px solid #f0f0f0' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                                          <div>
                                            <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Display quantity</label>
                                            <input type="number" defaultValue={item.display_quantity || ''} onBlur={(e) => updateDisplayQuantity(item.id, section.id, e.target.value)} placeholder="e.g. 300"
                                              style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px', borderRadius: 8, border: '0.5px solid #e5e5e5', background: '#fafafa', fontSize: 13, outline: 'none' }} />
                                          </div>
                                          <div>
                                            <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Display unit</label>
                                            <input defaultValue={item.display_unit || ''} onBlur={(e) => updateDisplayUnit(item.id, section.id, e.target.value)} placeholder="e.g. sq ft"
                                              style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px', borderRadius: 8, border: '0.5px solid #e5e5e5', background: '#fafafa', fontSize: 13, outline: 'none' }} />
                                          </div>
                                        </div>

                                        {costRows.length === 0 ? (
                                          <p style={{ fontSize: 12, color: '#bbb' }}>No cost rows in catalog for this item.</p>
                                        ) : (
                                          <>
                                            <p style={{ fontSize: 11, fontWeight: 500, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Cost row quantities</p>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px', gap: 8, marginBottom: 4, padding: '0 2px' }}>
                                              {['Name', 'Unit', 'Quantity'].map((h) => (
                                                <span key={h} style={{ fontSize: 11, color: '#bbb' }}>{h}</span>
                                              ))}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                              {costRows.map((cr: any) => {
                                                const tir = tirRows.find((r: any) => r.catalog_cost_row_id === cr.id)
                                                return (
                                                  <div key={cr.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px', gap: 8, alignItems: 'center' }}>
                                                    <p style={{ fontSize: 13, color: '#444', margin: 0 }}>{cr.name}</p>
                                                    <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>{cr.unit || '—'}</p>
                                                    <input type="number" defaultValue={tir?.quantity || ''} onBlur={(e) => upsertTemplateItemRow(item.id, cr.id, Number(e.target.value))} placeholder="0"
                                                      style={{ padding: '6px 10px', borderRadius: 8, border: '0.5px solid #e5e5e5', background: '#fafafa', fontSize: 13, outline: 'none' }} />
                                                  </div>
                                                )
                                              })}
                                            </div>
                                          </>
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
              <div style={{ background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 14, padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: '#1a1a2e' }}>Terms and Conditions</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {tcSaved && <span style={{ fontSize: 12, color: '#639922' }}>✓ Saved</span>}
                    <button
                      onClick={saveTc}
                      disabled={tcSaving}
                      style={{ padding: '7px 16px', borderRadius: 8, background: tcSaving ? '#e5e5e5' : '#185FA5', color: tcSaving ? '#aaa' : 'white', fontSize: 13, fontWeight: 500, border: 'none', cursor: tcSaving ? 'not-allowed' : 'pointer' }}
                    >
                      {tcSaving ? 'Saving…' : 'Save T&C'}
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: '#bbb', margin: '0 0 10px' }}>This will appear in the proposal preview and be sent to the client for signature.</p>
                <textarea
                  rows={20}
                  placeholder="Paste your terms and conditions here..."
                  value={tcText}
                  onChange={(e) => setTcText(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '0.5px solid #e5e5e5', background: '#fafafa', fontSize: 13, fontFamily: 'monospace', outline: 'none', resize: 'none', lineHeight: 1.6 }}
                />
              </div>

            </>
          )}
        </div>
      </div>
    </div>
  )
}