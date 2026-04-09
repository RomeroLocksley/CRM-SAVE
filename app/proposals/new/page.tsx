'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type CostRow = {
  id: string; item_id: string; proposal_id: string
  name: string; quantity: number | string; unit: string; unit_cost: number | string
}
type ProposalItem = {
  id: string; section_id: string; proposal_id: string
  name: string; description: string; display_quantity: number | string | null
  display_unit: string; rows: CostRow[]
}
type ProposalSection = { id: string; proposal_id: string; name: string; items: ProposalItem[] }
type Template = { id: string; name: string; description: string }
type LeadInfo = { name: string; phone: string; address: string }

function toNumericOrNull(value: any): number | null {
  if (value === '' || value === null || value === undefined) return null
  const n = Number(value); return isNaN(n) ? null : n
}
function formatQtyUnit(qty: any, unit: string): string {
  if (!qty && !unit) return ''; if (!qty) return unit
  const n = Number(qty); const qtyStr = Number.isInteger(n) ? String(n) : String(qty)
  return unit ? `${qtyStr} ${unit}` : qtyStr
}
function NavItem({ href, active, label, icon }: { href: string; active?: boolean; label: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1" style={{ textDecoration: 'none' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors" style={{ background: active ? 'rgba(255,255,255,0.2)' : 'transparent' }}>{icon}</div>
      <span style={{ fontSize: '10px', color: active ? 'white' : 'rgba(255,255,255,0.5)', fontWeight: active ? 500 : 400 }}>{label}</span>
    </Link>
  )
}

// ─── Preview ──────────────────────────────────────────────────────────────────

function ProposalPreview({ proposalId, proposalTitle }: { proposalId: string; proposalTitle: string }) {
  const [sections, setSections] = useState<ProposalSection[]>([])
  const [lead, setLead] = useState<LeadInfo | null>(null)
  const [tc, setTc] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: proposal } = await supabase.from('proposals').select('title, terms_and_conditions, leads(name, phone, address)').eq('id', proposalId).single()
      if (proposal?.leads) { const l = proposal.leads as any; setLead({ name: l.name || '', phone: l.phone || '', address: l.address || '' }) }
      setTc(proposal?.terms_and_conditions || '')
      const { data: sd } = await supabase.from('proposal_sections').select('*').eq('proposal_id', proposalId).order('created_at', { ascending: true })
      const { data: id } = await supabase.from('proposal_items').select('*').eq('proposal_id', proposalId)
      const { data: rd } = await supabase.from('proposal_item_rows').select('*').eq('proposal_id', proposalId)
      setSections((sd || []).map((s) => ({ ...s, items: (id || []).filter((i) => i.section_id === s.id).map((i) => ({ ...i, rows: (rd || []).filter((r) => r.item_id === i.id) })) })))
      setLoading(false)
    }
    load()
  }, [proposalId])

  const grandTotal = sections.reduce((t, s) => t + s.items.reduce((t2, i) => t2 + i.rows.reduce((t3, r) => t3 + Number(r.quantity || 0) * Number(r.unit_cost || 0), 0), 0), 0)
  const printDate = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
  if (loading) return <div className="p-10 text-gray-400">Loading preview…</div>

  return (
    <>
      <div className="flex justify-end px-10 pt-6 print:hidden">
        <button onClick={() => window.print()} className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-700">Print / Save as PDF</button>
      </div>
      <div id="proposal-preview" className="bg-white mx-auto my-6 p-12 shadow-lg print:shadow-none print:my-0 print:p-8" style={{ maxWidth: '850px' }}>
        <div className="flex items-center justify-center mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="K&D Contracting" className="w-16 h-16 mr-4 object-contain" />
          <div className="text-center">
            <p className="text-xl font-bold text-[#1a3a5c]">K&amp;D Contracting LLC</p>
            <p className="text-sm text-gray-500">4611 Carr Dr &bull; Fredericksburg, VA 22408</p>
            <p className="text-sm text-gray-500">Phone: (540) 940-0002</p>
          </div>
        </div>
        <hr className="border-[#1a3a5c] border-t-2 my-4" />
        <div className="flex justify-between items-start mb-6">
          <div className="text-sm">
            <p className="font-semibold">{lead?.name}</p>
            <p className="text-gray-600">Cell: {lead?.phone}</p>
            <div className="mt-2"><p className="font-semibold">Job Address:</p><p className="text-gray-600">{lead?.address}</p></div>
          </div>
          <div className="text-sm text-right"><p><span className="font-semibold">Print Date:</span> {printDate}</p></div>
        </div>
        <h1 className="text-2xl font-bold text-[#1a3a5c] mb-6">{proposalTitle}</h1>
        <div className="mb-6">
          <p className="font-bold text-sm mb-1">CONTRACT SERVICES</p>
          <p className="font-semibold text-sm mb-2">Description of the Services:</p>
          <p className="text-sm text-gray-700 leading-relaxed">The Contractor agrees to provide the following goods and services (collectively &ldquo;Services&rdquo;) to the Customer described in detail below or more specifically outlined in the proposal section of this Agreement.</p>
        </div>
        <hr className="border-gray-200 mb-6" />
        {sections.map((section) => {
          const sectionTotal = section.items.reduce((sum, item) => sum + item.rows.reduce((s, r) => s + Number(r.quantity || 0) * Number(r.unit_cost || 0), 0), 0)
          return (
            <div key={section.id} className="mb-8">
              <h2 className="text-sm font-bold text-[#1a3a5c] uppercase mb-2">{section.name}</h2>
              <table className="w-full text-sm border-collapse">
                <thead><tr className="bg-[#e8f0f7]">
                  <th className="text-left px-3 py-2 font-semibold text-[#1a3a5c] border border-gray-200 w-[28%]">Items</th>
                  <th className="text-left px-3 py-2 font-semibold text-[#1a3a5c] border border-gray-200 w-[57%]">Description</th>
                  <th className="text-left px-3 py-2 font-semibold text-[#1a3a5c] border border-gray-200 w-[15%]">Qty/Unit</th>
                </tr></thead>
                <tbody>{section.items.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#f7fafc]'}>
                    <td className="px-3 py-2 font-semibold border border-gray-200 align-top">{item.name}</td>
                    <td className="px-3 py-2 text-gray-700 border border-gray-200 align-top whitespace-pre-line">{item.description}</td>
                    <td className="px-3 py-2 border border-gray-200 align-top">{formatQtyUnit(item.display_quantity, item.display_unit)}</td>
                  </tr>
                ))}</tbody>
                <tfoot><tr className="bg-[#e8f0f7]">
                  <td colSpan={2} className="px-3 py-2 font-bold text-[#1a3a5c] border border-gray-200">{section.name.toUpperCase()} Total:</td>
                  <td className="px-3 py-2 font-bold text-[#1a3a5c] text-right border border-gray-200">${sectionTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr></tfoot>
              </table>
            </div>
          )
        })}
        <hr className="border-[#1a3a5c] border-t mb-4" />
        <div className="text-right mb-8"><p className="text-lg font-bold text-[#1a3a5c]">Total Price: ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
        <hr className="border-gray-200 mb-6" />
        <div className="text-xs text-gray-700 leading-relaxed">
          <p className="font-bold text-sm text-[#1a3a5c] mb-4">Terms and Conditions</p>
          {tc ? <div className="whitespace-pre-wrap">{tc}</div> : <p className="text-gray-400 italic">No terms and conditions set for this proposal.</p>}
        </div>
        <div className="mt-10 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-600 mb-6">I confirm that my action here represents my electronic signature and is binding.</p>
          <div className="grid grid-cols-2 gap-8">
            <div><div className="border-b border-gray-400 mb-1 h-8"></div><p className="text-xs text-gray-500">Signature</p></div>
            <div><div className="border-b border-gray-400 mb-1 h-8"></div><p className="text-xs text-gray-500">Date</p></div>
            <div><div className="border-b border-gray-400 mb-1 h-8"></div><p className="text-xs text-gray-500">Print Name</p></div>
          </div>
        </div>
      </div>
      <style>{`@media print{body *{visibility:hidden;}#proposal-preview,#proposal-preview *{visibility:visible;}#proposal-preview{position:absolute;left:0;top:0;width:100%;max-width:100%;margin:0;padding:20px;box-shadow:none;}}`}</style>
    </>
  )
}

// ─── Builder ──────────────────────────────────────────────────────────────────

function ProposalBuilder() {
  const searchParams = useSearchParams()
  const proposalId = searchParams.get('proposalId')

  const [activeTab, setActiveTab] = useState<'builder' | 'preview'>('builder')
  const [sections, setSections] = useState<ProposalSection[]>([])
  const [proposalTitle, setProposalTitle] = useState('New Proposal')
  const [proposalStatus, setProposalStatus] = useState('draft')
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving' | 'error'>('saved')
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendSuccess, setSendSuccess] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false)
  const [templateError, setTemplateError] = useState<string | null>(null)

  // Catalog data for pickers
  const [catalogSections, setCatalogSections] = useState<any[]>([])
  const [catalogItems, setCatalogItems] = useState<any[]>([])

  // Add section picker state
  const [showAddSectionPicker, setShowAddSectionPicker] = useState(false)

  // Add item picker state: sectionId → open
  const [addItemPickerSectionId, setAddItemPickerSectionId] = useState<string | null>(null)
  const [addItemCatalogSectionFilter, setAddItemCatalogSectionFilter] = useState('')
  const [addItemSearch, setAddItemSearch] = useState('')

  // ─── Load ──────────────────────────────────────────────────────────────────

  async function loadProposal() {
    if (!proposalId) return
    const { data: pd } = await supabase.from('proposals').select('title, status').eq('id', proposalId).single()
    if (pd) { setProposalTitle(pd.title || 'New Proposal'); setProposalStatus(pd.status || 'draft') }
    const { data: sd } = await supabase.from('proposal_sections').select('*').eq('proposal_id', proposalId).order('created_at', { ascending: true })
    const { data: id } = await supabase.from('proposal_items').select('*').eq('proposal_id', proposalId)
    const { data: rd } = await supabase.from('proposal_item_rows').select('*').eq('proposal_id', proposalId)
    setSections((sd || []).map((s) => ({ ...s, items: (id || []).filter((i) => i.section_id === s.id).map((i) => ({ ...i, rows: (rd || []).filter((r) => r.item_id === i.id) })) })))
    setIsDirty(false); setSaveStatus('saved')
  }

  async function loadTemplates() {
    const { data } = await supabase.from('templates').select('id, name, description').order('created_at', { ascending: true })
    setTemplates(data || [])
  }

  async function loadCatalog() {
    const { data: cs } = await supabase.from('catalog_sections').select('*').order('created_at', { ascending: true })
    const { data: ci } = await supabase.from('catalog_items').select('*').order('created_at', { ascending: true })
    setCatalogSections(cs || [])
    setCatalogItems(ci || [])
  }

  useEffect(() => { loadProposal(); loadTemplates(); loadCatalog() }, [proposalId])

  // ─── Add Section from catalog ─────────────────────────────────────────────

  async function addSectionFromCatalog(catalogSection: any) {
    if (!proposalId) return
    const newSection = { id: crypto.randomUUID(), proposal_id: proposalId, name: catalogSection.name }
    await supabase.from('proposal_sections').insert([newSection])
    setSections((prev) => [...prev, { ...newSection, items: [] }])
    setShowAddSectionPicker(false)
    markDirty()
  }

  // ─── Delete section ───────────────────────────────────────────────────────

  async function deleteSection(sectionId: string) {
    const confirmed = window.confirm('Delete this section and all its items? This cannot be undone.')
    if (!confirmed) return
    const sectionItems = sections.find((s) => s.id === sectionId)?.items || []
    const itemIds = sectionItems.map((i) => i.id)
    if (itemIds.length > 0) {
      await supabase.from('proposal_item_rows').delete().in('item_id', itemIds)
      await supabase.from('proposal_items').delete().in('id', itemIds)
    }
    await supabase.from('proposal_sections').delete().eq('id', sectionId)
    setSections((prev) => prev.filter((s) => s.id !== sectionId))
    markDirty()
  }

  // ─── Add item from catalog ────────────────────────────────────────────────

  async function addItemFromCatalog(sectionId: string, catalogItem: any) {
    if (!proposalId) return
    // Fetch cost rows for this catalog item
    const { data: costRows } = await supabase.from('catalog_cost_rows').select('*').eq('item_id', catalogItem.id).order('created_at', { ascending: true })
    const newItemId = crypto.randomUUID()
    await supabase.from('proposal_items').insert([{
      id: newItemId, proposal_id: proposalId, section_id: sectionId,
      name: catalogItem.name || '', description: catalogItem.description || '',
      display_quantity: null, display_unit: catalogItem.unit || '',
    }])
    const newRows: any[] = (costRows || []).map((cr: any) => ({
      id: crypto.randomUUID(), proposal_id: proposalId, item_id: newItemId,
      name: cr.name, quantity: 0, unit: cr.unit, unit_cost: cr.unit_cost,
    }))
    if (newRows.length > 0) await supabase.from('proposal_item_rows').insert(newRows)
    setSections((prev) => prev.map((s) => s.id !== sectionId ? s : {
      ...s, items: [...s.items, {
        id: newItemId, section_id: sectionId, proposal_id: proposalId!,
        name: catalogItem.name || '', description: catalogItem.description || '',
        display_quantity: '', display_unit: catalogItem.unit || '',
        rows: newRows,
      }]
    }))
    setAddItemPickerSectionId(null)
    setAddItemCatalogSectionFilter('')
    setAddItemSearch('')
    markDirty()
  }

  // ─── Add custom item ──────────────────────────────────────────────────────

  async function addCustomItem(sectionId: string) {
    if (!proposalId) return
    const newItem = {
      id: crypto.randomUUID(), proposal_id: proposalId, section_id: sectionId,
      name: '', description: '', display_quantity: null, display_unit: '',
    }
    await supabase.from('proposal_items').insert([newItem])
    setSections((prev) => prev.map((s) => s.id !== sectionId ? s : {
      ...s, items: [...s.items, { ...newItem, rows: [] }]
    }))
    markDirty()
  }

  // ─── Delete item ──────────────────────────────────────────────────────────

  async function deleteItem(sectionIndex: number, itemId: string) {
    const confirmed = window.confirm('Delete this item? This cannot be undone.')
    if (!confirmed) return
    await supabase.from('proposal_item_rows').delete().eq('item_id', itemId)
    await supabase.from('proposal_items').delete().eq('id', itemId)
    setSections((prev) => prev.map((s, si) => si !== sectionIndex ? s : { ...s, items: s.items.filter((i) => i.id !== itemId) }))
    markDirty()
  }

  // ─── Update helpers ───────────────────────────────────────────────────────

  function updateSectionName(sectionIndex: number, value: string) {
    setSections((prev) => prev.map((s, si) => si !== sectionIndex ? s : { ...s, name: value }))
    markDirty()
  }

  function updateItem(sectionIndex: number, itemIndex: number, field: keyof ProposalItem, value: any) {
    setSections((prev) => prev.map((s, si) => si !== sectionIndex ? s : { ...s, items: s.items.map((item, ii) => ii !== itemIndex ? item : { ...item, [field]: value }) }))
    markDirty()
  }

  function updateRow(sectionIndex: number, itemIndex: number, rowIndex: number, field: keyof CostRow, value: any) {
    setSections((prev) => prev.map((s, si) => si !== sectionIndex ? s : { ...s, items: s.items.map((item, ii) => ii !== itemIndex ? item : { ...item, rows: item.rows.map((row, ri) => ri !== rowIndex ? row : { ...row, [field]: value }) }) }))
    markDirty()
  }

  function markDirty() { setIsDirty(true); setSaveStatus('unsaved') }

  // ─── Send for signature ───────────────────────────────────────────────────

  async function sendForSignature() {
    if (!proposalId || isSending) return
    if (isDirty) { alert('Please save the proposal before sending for signature.'); return }
    const confirmed = window.confirm('This will send the proposal to the client for electronic signature. Continue?')
    if (!confirmed) return
    setIsSending(true); setSendError(null); setSendSuccess(false)
    try {
      const res = await fetch('/api/send-for-signature', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proposalId }) })
      const data = await res.json()
      if (!res.ok) { setSendError(data.error || 'Failed to send for signature.'); return }
      setSendSuccess(true); setProposalStatus('sent')
    } catch (err: any) { setSendError(err.message || 'Something went wrong.') }
    finally { setIsSending(false) }
  }

  // ─── Load template ────────────────────────────────────────────────────────

  async function handleLoadTemplate() {
    if (!selectedTemplateId || !proposalId) return
    const confirmReplace = sections.length > 0 ? window.confirm('This will replace all existing content in this proposal. Continue?') : true
    if (!confirmReplace) return
    setIsLoadingTemplate(true); setTemplateError(null)
    try {
      const { data: templateData } = await supabase.from('templates').select('terms_and_conditions').eq('id', selectedTemplateId).single()
      const { data: tSections, error: tsErr } = await supabase.from('template_sections').select('*').eq('template_id', selectedTemplateId).order('sort_order', { ascending: true })
      if (tsErr) throw tsErr
      if (!tSections || tSections.length === 0) throw new Error('No sections found in this template.')
      const tSectionIds = tSections.map((s: any) => s.id)
      const { data: tItems, error: tiErr } = await supabase.from('template_items').select('*').in('section_id', tSectionIds).order('sort_order', { ascending: true })
      if (tiErr) throw tiErr
      const catalogItemIds = (tItems || []).map((i: any) => i.catalog_item_id).filter(Boolean)
      const { data: catItems } = catalogItemIds.length > 0 ? await supabase.from('catalog_items').select('*').in('id', catalogItemIds) : { data: [] }
      const tItemIds = (tItems || []).map((i: any) => i.id)
      const { data: tRows } = tItemIds.length > 0 ? await supabase.from('template_item_rows').select('*').in('item_id', tItemIds).order('sort_order', { ascending: true }) : { data: [] }
      const costRowIds = (tRows || []).map((r: any) => r.catalog_cost_row_id).filter(Boolean)
      const { data: catCostRows } = costRowIds.length > 0 ? await supabase.from('catalog_cost_rows').select('*').in('id', costRowIds) : { data: [] }
      await supabase.from('proposal_item_rows').delete().eq('proposal_id', proposalId)
      await supabase.from('proposal_items').delete().eq('proposal_id', proposalId)
      await supabase.from('proposal_sections').delete().eq('proposal_id', proposalId)
      await supabase.from('proposals').update({ terms_and_conditions: templateData?.terms_and_conditions || null }).eq('id', proposalId)
      const newSections = tSections.map((ts: any) => ({ id: crypto.randomUUID(), proposal_id: proposalId, name: ts.name, _tid: ts.id }))
      await supabase.from('proposal_sections').insert(newSections.map(({ _tid, ...r }) => r))
      const newItems: any[] = []
      for (const ts of tSections) {
        const ns = newSections.find((s: any) => s._tid === ts.id); if (!ns) continue
        for (const ti of (tItems || []).filter((i: any) => i.section_id === ts.id)) {
          const ci = (catItems || []).find((c: any) => c.id === ti.catalog_item_id)
          newItems.push({ id: crypto.randomUUID(), proposal_id: proposalId, section_id: ns.id, name: ci?.name || '', description: ci?.description || '', display_quantity: toNumericOrNull(ti.display_quantity), display_unit: ti.display_unit || ci?.unit || '', _tid: ti.id })
        }
      }
      await supabase.from('proposal_items').insert(newItems.map(({ _tid, ...r }) => r))
      const newRows: any[] = []
      for (const ti of (tItems || [])) {
        const ni = newItems.find((i: any) => i._tid === ti.id); if (!ni) continue
        for (const tr of (tRows || []).filter((r: any) => r.item_id === ti.id)) {
          const cr = (catCostRows || []).find((c: any) => c.id === tr.catalog_cost_row_id)
          newRows.push({ id: crypto.randomUUID(), proposal_id: proposalId, item_id: ni.id, name: cr?.name || '', quantity: toNumericOrNull(tr.quantity) ?? 0, unit: cr?.unit || '', unit_cost: toNumericOrNull(cr?.unit_cost) ?? 0 })
        }
      }
      if (newRows.length > 0) await supabase.from('proposal_item_rows').insert(newRows)
      await loadProposal(); setSelectedTemplateId('')
    } catch (err: any) { console.error(err); setTemplateError(err.message || 'Something went wrong.') }
    finally { setIsLoadingTemplate(false) }
  }

  // ─── Save ─────────────────────────────────────────────────────────────────

  async function saveProposal() {
    if (!proposalId || isSaving) return
    setIsSaving(true); setSaveStatus('saving')
    try {
      const total = sections.reduce((sT, s) => sT + s.items.reduce((iT, i) => iT + i.rows.reduce((rT, r) => rT + Number(r.quantity || 0) * Number(r.unit_cost || 0), 0), 0), 0)
      await supabase.from('proposals').update({ title: proposalTitle, total_price: total }).eq('id', proposalId)
      await supabase.from('proposal_sections').upsert(sections.map((s) => ({ id: s.id, proposal_id: proposalId, name: s.name })), { onConflict: 'id' })
      const allItems = sections.flatMap((s) => s.items.map((item) => ({ id: item.id, proposal_id: proposalId, section_id: s.id, name: item.name, description: item.description, display_quantity: toNumericOrNull(item.display_quantity), display_unit: item.display_unit })))
      if (allItems.length > 0) await supabase.from('proposal_items').upsert(allItems, { onConflict: 'id' })
      const allRows = sections.flatMap((s) => s.items.flatMap((item) => item.rows.map((row) => ({ id: row.id, proposal_id: proposalId, item_id: item.id, name: row.name, quantity: toNumericOrNull(row.quantity) ?? 0, unit: row.unit, unit_cost: toNumericOrNull(row.unit_cost) ?? 0 }))))
      if (allRows.length > 0) await supabase.from('proposal_item_rows').upsert(allRows, { onConflict: 'id' })
      const liveRowIds = allRows.map((r) => r.id)
      if (liveRowIds.length > 0) await supabase.from('proposal_item_rows').delete().eq('proposal_id', proposalId).not('id', 'in', `(${liveRowIds.join(',')})`)
      else await supabase.from('proposal_item_rows').delete().eq('proposal_id', proposalId)
      const liveItemIds = allItems.map((i) => i.id)
      if (liveItemIds.length > 0) await supabase.from('proposal_items').delete().eq('proposal_id', proposalId).not('id', 'in', `(${liveItemIds.join(',')})`)
      else await supabase.from('proposal_items').delete().eq('proposal_id', proposalId)
      const liveSectionIds = sections.map((s) => s.id)
      if (liveSectionIds.length > 0) await supabase.from('proposal_sections').delete().eq('proposal_id', proposalId).not('id', 'in', `(${liveSectionIds.join(',')})`)
      else await supabase.from('proposal_sections').delete().eq('proposal_id', proposalId)
      setIsDirty(false); setSaveStatus('saved')
    } catch (err) { console.error(err); setSaveStatus('error') }
    finally { setIsSaving(false) }
  }

  const proposalTotal = sections.reduce((sT, s) => sT + s.items.reduce((iT, i) => iT + i.rows.reduce((rT, r) => rT + Number(r.quantity || 0) * Number(r.unit_cost || 0), 0), 0), 0)
  const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
    draft: { bg: '#f5f5f5', text: '#888' }, sent: { bg: '#FAEEDA', text: '#633806' },
    viewed: { bg: '#E6F1FB', text: '#0C447C' }, signed: { bg: '#EAF3DE', text: '#27500A' },
  }
  const badge = STATUS_BADGE[proposalStatus] || STATUS_BADGE.draft

  // Filtered catalog items for the add item picker
  const filteredCatalogItems = catalogItems.filter((ci) => {
    const matchesSection = !addItemCatalogSectionFilter || ci.section_id === addItemCatalogSectionFilter
    const matchesSearch = !addItemSearch || ci.name.toLowerCase().includes(addItemSearch.toLowerCase())
    return matchesSection && matchesSearch
  })

  if (!proposalId) return <p className="p-10 text-gray-400">No proposal ID provided.</p>

  // Button style helpers
  const btnPrimary = { padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500 as const, border: 'none', cursor: 'pointer', background: '#185FA5', color: 'white' }
  const btnDanger = { padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500 as const, border: '0.5px solid #f5c5c5', cursor: 'pointer', background: '#fff5f5', color: '#c0392b' }
  const btnOutline = { padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500 as const, border: '0.5px solid #e0e0e0', cursor: 'pointer', background: 'white', color: '#555' }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f4f7fb' }}>

      {/* SLIM SIDEBAR */}
      <aside className="flex flex-col items-center py-5 gap-5 flex-shrink-0 print:hidden" style={{ width: '68px', background: '#0C447C' }}>
        <div className="mb-2" style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" fill="white"/><rect x="9" y="2" width="5" height="5" rx="1" fill="white" opacity="0.6"/><rect x="2" y="9" width="5" height="5" rx="1" fill="white" opacity="0.6"/><rect x="9" y="9" width="5" height="5" rx="1" fill="white" opacity="0.4"/></svg>
        </div>
        <NavItem href="/" label="Home" icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 7.5L9 2l7 5.5V16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5z" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinejoin="round"/><rect x="6.5" y="10" width="5" height="7" rx="0.5" fill="rgba(255,255,255,0.6)"/></svg>}/>
        <NavItem href="/leads" label="Leads" icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="6" r="3.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/><path d="M2 16c0-3.866 3.134-6 7-6s7 2.134 7 6" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/></svg>}/>
        <NavItem href="/projects" label="Projects" icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="5" width="16" height="11" rx="1.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/><path d="M6 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/><path d="M1 9h16" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/></svg>}/>
        <NavItem href="/catalog" label="Catalog" icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 4h12M3 9h12M3 14h7" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/></svg>}/>
        <NavItem href="/templates" label="Templates" icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="1" width="16" height="5" rx="1.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/><rect x="1" y="9" width="7" height="8" rx="1.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/><rect x="10" y="9" width="7" height="8" rx="1.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/></svg>}/>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* TOP BAR */}
        <div className="flex-shrink-0 print:hidden" style={{ background: 'white', borderBottom: '0.5px solid #eee', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input className="text-xl font-semibold bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none px-1 py-0.5 transition-colors w-64" value={proposalTitle} onChange={(e) => { setProposalTitle(e.target.value); markDirty() }} placeholder="Proposal name"/>
            <span style={{ fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 20, background: badge.bg, color: badge.text, textTransform: 'capitalize' }}>{proposalStatus}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', border: '0.5px solid #e5e5e5', borderRadius: 10, overflow: 'hidden' }}>
              <button onClick={() => setActiveTab('builder')} style={{ padding: '7px 16px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', background: activeTab === 'builder' ? '#185FA5' : 'white', color: activeTab === 'builder' ? 'white' : '#666' }}>Builder</button>
              <button onClick={() => setActiveTab('preview')} style={{ padding: '7px 16px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', background: activeTab === 'preview' ? '#185FA5' : 'white', color: activeTab === 'preview' ? 'white' : '#666' }}>Preview</button>
            </div>
            <span style={{ fontSize: 13, color: saveStatus === 'saved' ? '#639922' : saveStatus === 'unsaved' ? '#BA7517' : saveStatus === 'saving' ? '#aaa' : '#E24B4A' }}>
              {saveStatus === 'saved' && '✓ Saved'}{saveStatus === 'unsaved' && '● Unsaved'}{saveStatus === 'saving' && 'Saving…'}{saveStatus === 'error' && '✕ Failed'}
            </span>
            <button onClick={saveProposal} disabled={isSaving || !isDirty} style={{ padding: '7px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500, border: 'none', cursor: isDirty && !isSaving ? 'pointer' : 'not-allowed', background: isDirty && !isSaving ? '#185FA5' : '#f0f0f0', color: isDirty && !isSaving ? 'white' : '#bbb' }}>{isSaving ? 'Saving…' : 'Save'}</button>
            {proposalStatus !== 'signed' && (
              <button onClick={sendForSignature} disabled={isSending || sections.length === 0} style={{ padding: '7px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500, border: 'none', cursor: !isSending && sections.length > 0 ? 'pointer' : 'not-allowed', background: !isSending && sections.length > 0 ? '#534AB7' : '#f0f0f0', color: !isSending && sections.length > 0 ? 'white' : '#bbb' }}>
                {isSending ? 'Sending…' : proposalStatus === 'sent' || proposalStatus === 'viewed' ? 'Resend for Signature' : 'Send for Signature'}
              </button>
            )}
            {proposalStatus === 'signed' && <span style={{ padding: '7px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500, background: '#EAF3DE', color: '#27500A' }}>✓ Signed</span>}
          </div>
        </div>

        {sendError && <div style={{ margin: '12px 24px 0', padding: '10px 14px', background: '#FCEBEB', borderRadius: 10, fontSize: 13, color: '#A32D2D' }} className="print:hidden">{sendError}</div>}
        {sendSuccess && <div style={{ margin: '12px 24px 0', padding: '10px 14px', background: '#EAF3DE', borderRadius: 10, fontSize: 13, color: '#27500A' }} className="print:hidden">✓ Proposal sent! The client will receive an email to review and sign.</div>}

        {/* PREVIEW */}
        {activeTab === 'preview' && <div className="flex-1 overflow-y-auto" style={{ background: '#f4f7fb' }}><ProposalPreview proposalId={proposalId} proposalTitle={proposalTitle} /></div>}

        {/* BUILDER */}
        {activeTab === 'builder' && (
          <div className="flex-1 overflow-y-auto" style={{ padding: 24 }}>

            {/* Template loader */}
            <div style={{ background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 14, padding: '16px 20px', marginBottom: 24 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#555', margin: '0 0 10px' }}>Load a template</p>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: '0.5px solid #e5e5e5', background: '#fafafa', fontSize: 13, outline: 'none' }}>
                  <option value="">— Select a template —</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button onClick={handleLoadTemplate} disabled={!selectedTemplateId || isLoadingTemplate} style={{ padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500, border: 'none', cursor: selectedTemplateId && !isLoadingTemplate ? 'pointer' : 'not-allowed', background: selectedTemplateId && !isLoadingTemplate ? '#185FA5' : '#f0f0f0', color: selectedTemplateId && !isLoadingTemplate ? 'white' : '#bbb' }}>
                  {isLoadingTemplate ? 'Loading…' : 'Load Template'}
                </button>
              </div>
              {templateError && <p style={{ fontSize: 13, color: '#E24B4A', margin: '8px 0 0' }}>{templateError}</p>}
            </div>

            {sections.length === 0 && <p style={{ color: '#bbb', fontSize: 14, marginBottom: 16 }}>No data found. Load a template or add a section below.</p>}

            {/* Sections */}
            {sections.map((section, sIndex) => (
              <div key={section.id} style={{ marginBottom: 32 }}>

                {/* Section header */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                  <input
                    value={section.name}
                    onChange={(e) => updateSectionName(sIndex, e.target.value)}
                    style={{ fontSize: 12, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'transparent', border: 'none', borderBottom: '1px solid transparent', outline: 'none', flex: 1, padding: '2px 0' }}
                    onFocus={(e) => (e.currentTarget.style.borderBottomColor = '#e5e5e5')}
                    onBlur={(e) => (e.currentTarget.style.borderBottomColor = 'transparent')}
                  />
                  <button onClick={() => deleteSection(section.id)} style={btnDanger}>Delete Section</button>
                </div>

                {/* Items */}
                {section.items.map((item, iIndex) => {
                  const itemTotal = item.rows.reduce((sum, row) => sum + Number(row.quantity || 0) * Number(row.unit_cost || 0), 0)
                  return (
                    <div key={item.id} style={{ background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 14, padding: '16px 20px', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <p style={{ fontSize: 11, fontWeight: 500, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Display (customer-facing)</p>
                        <button onClick={() => deleteItem(sIndex, item.id)} style={btnDanger}>Delete Item</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 100px 120px', gap: 10, marginBottom: 16 }}>
                        {([
                          { label: 'Name', value: item.name, field: 'name', type: 'text' },
                          { label: 'Description', value: item.description, field: 'description', type: 'text' },
                          { label: 'Qty', value: item.display_quantity, field: 'display_quantity', type: 'number' },
                          { label: 'Unit', value: item.display_unit, field: 'display_unit', type: 'text' },
                        ] as any[]).map(({ label, value, field, type }) => (
                          <div key={label}>
                            <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>{label}</label>
                            <input type={type} value={value || ''} onChange={(e) => updateItem(sIndex, iIndex, field, e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px', borderRadius: 8, border: '0.5px solid #e5e5e5', background: '#fafafa', fontSize: 13, outline: 'none' }} />
                          </div>
                        ))}
                      </div>
                      <div style={{ borderTop: '0.5px dashed #f0f0f0', paddingTop: 14 }}>
                        <p style={{ fontSize: 11, fontWeight: 500, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Cost rows (internal)</p>
                        {item.rows.length === 0 ? <p style={{ fontSize: 12, color: '#bbb' }}>No cost rows for this item.</p> : (
                          <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 120px 100px', gap: 8, marginBottom: 6, padding: '0 2px' }}>
                              {['Name', 'Qty', 'Unit', 'Unit cost', 'Row total'].map((h) => <span key={h} style={{ fontSize: 11, color: '#bbb' }}>{h}</span>)}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {item.rows.map((row, rIndex) => {
                                const rowTotal = Number(row.quantity || 0) * Number(row.unit_cost || 0)
                                return (
                                  <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 120px 100px', gap: 8, alignItems: 'center', background: '#fafafa', borderRadius: 8, padding: '8px 10px' }}>
                                    <p style={{ fontSize: 13, color: '#444', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</p>
                                    <input type="number" value={row.quantity === 0 || row.quantity === '0' ? '' : row.quantity || ''} placeholder="0" onChange={(e) => updateRow(sIndex, iIndex, rIndex, 'quantity', e.target.value)} style={{ padding: '6px 8px', borderRadius: 6, border: '0.5px solid #e5e5e5', background: 'white', fontSize: 13, outline: 'none' }} />
                                    <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>{row.unit || '—'}</p>
                                    <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>${Number(row.unit_cost || 0).toFixed(2)}</p>
                                    <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1a2e', margin: 0, textAlign: 'right' }}>${rowTotal.toFixed(2)}</p>
                                  </div>
                                )
                              })}
                            </div>
                          </>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, paddingTop: 10, borderTop: '0.5px solid #f5f5f5' }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#555', margin: 0 }}>Item total: <span style={{ color: '#185FA5' }}>${itemTotal.toFixed(2)}</span></p>
                      </div>
                    </div>
                  )
                })}

                {/* Add Item button + picker inside section */}
                {addItemPickerSectionId === section.id ? (
                  <div style={{ background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 14, padding: '16px 20px', marginTop: 8 }}>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
                      <select
                        value={addItemCatalogSectionFilter}
                        onChange={(e) => setAddItemCatalogSectionFilter(e.target.value)}
                        style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '0.5px solid #e5e5e5', background: '#fafafa', fontSize: 13, outline: 'none' }}
                      >
                        <option value="">— All catalog sections —</option>
                        {catalogSections.map((cs) => <option key={cs.id} value={cs.id}>{cs.name}</option>)}
                      </select>
                      <input
                        placeholder="Search items…"
                        value={addItemSearch}
                        onChange={(e) => setAddItemSearch(e.target.value)}
                        style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '0.5px solid #e5e5e5', background: '#fafafa', fontSize: 13, outline: 'none' }}
                      />
                      <button onClick={() => { setAddItemPickerSectionId(null); setAddItemCatalogSectionFilter(''); setAddItemSearch('') }} style={btnOutline}>Cancel</button>
                    </div>
                    <div style={{ maxHeight: 220, overflowY: 'auto', border: '0.5px solid #f0f0f0', borderRadius: 10 }}>
                      {filteredCatalogItems.length === 0 ? (
                        <p style={{ fontSize: 13, color: '#bbb', padding: '12px 14px', margin: 0 }}>No items found.</p>
                      ) : filteredCatalogItems.map((ci) => (
                        <div key={ci.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '0.5px solid #f5f5f5', background: 'white' }}
                          onMouseOver={(e) => (e.currentTarget.style.background = '#fafafa')}
                          onMouseOut={(e) => (e.currentTarget.style.background = 'white')}
                        >
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1a2e', margin: 0 }}>{ci.name}</p>
                            {ci.description && <p style={{ fontSize: 11, color: '#aaa', margin: '2px 0 0' }}>{ci.description.slice(0, 60)}{ci.description.length > 60 ? '…' : ''}</p>}
                          </div>
                          <button onClick={() => addItemFromCatalog(section.id, ci)} style={btnPrimary}>+ Add</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAddItemPickerSectionId(section.id); setAddItemCatalogSectionFilter(''); setAddItemSearch('') }}
                    style={{ ...btnPrimary, marginTop: 8 }}
                  >
                    + Add Item from Catalog
                  </button>
                )}
              </div>
            ))}

            {/* Bottom action buttons */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>

              {/* Add Section picker */}
              {showAddSectionPicker ? (
                <div style={{ flex: 1, background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 14, padding: '16px 20px' }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#555', margin: '0 0 10px' }}>Pick a section to add</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                    {catalogSections.map((cs) => (
                      <button key={cs.id} onClick={() => addSectionFromCatalog(cs)}
                        style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, border: '0.5px solid #e0e0e0', background: 'white', color: '#1a1a2e', cursor: 'pointer' }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#E6F1FB'; e.currentTarget.style.borderColor = '#185FA5'; e.currentTarget.style.color = '#0C447C' }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e0e0e0'; e.currentTarget.style.color = '#1a1a2e' }}
                      >
                        {cs.name}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setShowAddSectionPicker(false)} style={btnOutline}>Cancel</button>
                </div>
              ) : (
                <button onClick={() => setShowAddSectionPicker(true)} style={{ padding: '10px 20px', borderRadius: 12, border: '0.5px solid #c5d5e8', background: 'white', color: '#185FA5', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                  + Add Section
                </button>
              )}

              {!showAddSectionPicker && (
                <button
                  onClick={() => {
                    const lastSection = sections[sections.length - 1]
                    if (lastSection) addCustomItem(lastSection.id)
                    else alert('Add a section first before adding a custom item.')
                  }}
                  style={{ padding: '10px 20px', borderRadius: 12, border: '0.5px solid #e0e0e0', background: 'white', color: '#555', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                >
                  + Add Custom Item
                </button>
              )}
            </div>

            {/* Proposal total */}
            {sections.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 14, padding: '16px 28px', textAlign: 'right' }}>
                  <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 4px' }}>Proposal total</p>
                  <p style={{ fontSize: 24, fontWeight: 600, color: '#185FA5', margin: 0 }}>${proposalTotal.toFixed(2)}</p>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}

export default function ProposalPage() {
  return (
    <Suspense fallback={<p className="p-10 text-gray-400">Loading proposal…</p>}>
      <ProposalBuilder />
    </Suspense>
  )
}