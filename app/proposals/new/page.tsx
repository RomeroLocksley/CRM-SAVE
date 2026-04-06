'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

type CostRow = {
  id: string
  item_id: string
  proposal_id: string
  name: string
  quantity: number | string
  unit: string
  unit_cost: number | string
}

type ProposalItem = {
  id: string
  section_id: string
  proposal_id: string
  name: string
  description: string
  display_quantity: number | string
  display_unit: string
  rows: CostRow[]
}

type ProposalSection = {
  id: string
  proposal_id: string
  name: string
  items: ProposalItem[]
}

type Template = {
  id: string
  name: string
  description: string
}

type LeadInfo = {
  name: string
  phone: string
  address: string
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function toNumericOrNull(value: any): number | null {
  if (value === '' || value === null || value === undefined) return null
  const n = Number(value)
  return isNaN(n) ? null : n
}

function formatQtyUnit(qty: any, unit: string): string {
  if (!qty && !unit) return ''
  if (!qty) return unit
  const n = Number(qty)
  const qtyStr = Number.isInteger(n) ? String(n) : String(qty)
  return unit ? `${qtyStr} ${unit}` : qtyStr
}

// ─── Preview component ────────────────────────────────────────────────────────

function ProposalPreview({ proposalId, proposalTitle }: { proposalId: string, proposalTitle: string }) {
  const [sections, setSections] = useState<ProposalSection[]>([])
  const [lead, setLead] = useState<LeadInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)

      const { data: proposal } = await supabase
        .from('proposals')
        .select('title, leads(name, phone, address)')
        .eq('id', proposalId)
        .single()

      if (proposal?.leads) {
        const l = proposal.leads as any
        setLead({ name: l.name || '', phone: l.phone || '', address: l.address || '' })
      }

      const { data: sectionsData } = await supabase
        .from('proposal_sections')
        .select('*')
        .eq('proposal_id', proposalId)
        .order('created_at', { ascending: true })

      const { data: itemsData } = await supabase
        .from('proposal_items')
        .select('*')
        .eq('proposal_id', proposalId)

      const { data: rowsData } = await supabase
        .from('proposal_item_rows')
        .select('*')
        .eq('proposal_id', proposalId)

      const structured: ProposalSection[] = (sectionsData || []).map((section) => ({
        ...section,
        items: (itemsData || [])
          .filter((item) => item.section_id === section.id)
          .map((item) => ({
            ...item,
            rows: (rowsData || []).filter((row) => row.item_id === item.id),
          })),
      }))

      setSections(structured)
      setLoading(false)
    }
    load()
  }, [proposalId])

  const grandTotal = sections.reduce((sTotal, section) =>
    sTotal + section.items.reduce((iTotal, item) =>
      iTotal + item.rows.reduce((rTotal, row) =>
        rTotal + Number(row.quantity || 0) * Number(row.unit_cost || 0), 0), 0), 0)

  const printDate = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })

  if (loading) return <div className="p-10 text-gray-400">Loading preview…</div>

  return (
    <>
      {/* Print button — hidden when printing */}
      <div className="flex justify-end px-10 pt-6 print:hidden">
        <button
          onClick={() => window.print()}
          className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
        >
          Print / Save as PDF
        </button>
      </div>

      {/* Preview document */}
      <div id="proposal-preview" className="bg-white mx-auto my-6 p-12 shadow-lg print:shadow-none print:my-0 print:p-8" style={{ maxWidth: '850px' }}>

        {/* Header */}
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

        {/* Client info */}
        <div className="flex justify-between items-start mb-6">
          <div className="text-sm">
            <p className="font-semibold">{lead?.name}</p>
            <p className="text-gray-600">Cell: {lead?.phone}</p>
            <div className="mt-2">
              <p className="font-semibold">Job Address:</p>
              <p className="text-gray-600">{lead?.address}</p>
            </div>
          </div>
          <div className="text-sm text-right">
            <p><span className="font-semibold">Print Date:</span> {printDate}</p>
          </div>
        </div>

        {/* Proposal title */}
        <h1 className="text-2xl font-bold text-[#1a3a5c] mb-6">{proposalTitle}</h1>

        {/* Contract services intro */}
        <div className="mb-6">
          <p className="font-bold text-sm mb-1">CONTRACT SERVICES</p>
          <p className="font-semibold text-sm mb-2">Description of the Services:</p>
          <p className="text-sm text-gray-700 leading-relaxed">
            The Contractor agrees to provide the following goods and services (collectively &ldquo;Services&rdquo;) to the Customer described in detail below or more specifically outlined in the proposal section of this Agreement.
          </p>
        </div>

        <hr className="border-gray-200 mb-6" />

        {/* Sections */}
        {sections.map((section) => {
          const sectionTotal = section.items.reduce((sum, item) =>
            sum + item.rows.reduce((rSum, row) =>
              rSum + Number(row.quantity || 0) * Number(row.unit_cost || 0), 0), 0)

          return (
            <div key={section.id} className="mb-8">
              <h2 className="text-sm font-bold text-[#1a3a5c] uppercase mb-2">{section.name}</h2>

              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#e8f0f7]">
                    <th className="text-left px-3 py-2 font-semibold text-[#1a3a5c] border border-gray-200 w-[28%]">Items</th>
                    <th className="text-left px-3 py-2 font-semibold text-[#1a3a5c] border border-gray-200 w-[57%]">Description</th>
                    <th className="text-left px-3 py-2 font-semibold text-[#1a3a5c] border border-gray-200 w-[15%]">Qty/Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {section.items.map((item, idx) => (
                    <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#f7fafc]'}>
                      <td className="px-3 py-2 font-semibold border border-gray-200 align-top">{item.name}</td>
                      <td className="px-3 py-2 text-gray-700 border border-gray-200 align-top whitespace-pre-line">{item.description}</td>
                      <td className="px-3 py-2 border border-gray-200 align-top">
                        {formatQtyUnit(item.display_quantity, item.display_unit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#e8f0f7]">
                    <td colSpan={2} className="px-3 py-2 font-bold text-[#1a3a5c] border border-gray-200">
                      {section.name.toUpperCase()} Total:
                    </td>
                    <td className="px-3 py-2 font-bold text-[#1a3a5c] text-right border border-gray-200">
                      ${sectionTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        })}

        {/* Grand total */}
        <hr className="border-[#1a3a5c] border-t mb-4" />
        <div className="text-right mb-8">
          <p className="text-lg font-bold text-[#1a3a5c]">
            Total Price: ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <hr className="border-gray-200 mb-6" />

        {/* Terms and Conditions */}
        <div className="text-xs text-gray-700 leading-relaxed space-y-3">
          <p className="font-bold text-sm text-[#1a3a5c]">Terms and Conditions</p>

          <p className="font-semibold">1. Terms and Conditions</p>
          <p>The contractor agrees to design, supply materials, and install a fiberglass pool according to the specifications detailed in the agreed plans and the scope of work outlined below:</p>
          <p><span className="font-semibold">b) Planning and Permits:</span> This includes the review and approval of plans by a certified engineer, as well as the comprehensive management and acquisition of all required permits. The contractor will coordinate all required inspections to ensure regulatory compliance throughout the construction process. The contractor makes a good faith effort to evaluate site conditions, including but not limited to available soil information, Resource Protection Areas (RPA), septic system locations and setbacks, property setbacks, and applicable zoning or HOA requirements. However, final approvals are subject to third-party entities such as counties, municipalities, and homeowners associations.</p>
          <p><span className="font-semibold">c) Excavation and Site Preparation:</span> This phase includes mobilization of specialized equipment for excavation of the pool to the agreed dimensions. Clean #68 gravel will be provided and used for proper base preparation. Excavation is based on normal soil conditions. If unforeseen conditions such as large boulders, rock formations, groundwater, unsuitable soils, or other subsurface obstructions are encountered, additional costs may apply. Any such changes will be discussed with and approved by the homeowner prior to proceeding.</p>
          <p><span className="font-semibold">d) Fiberglass Shell Installation and Backfill:</span> The fiberglass pool shell will be delivered, set, and leveled in accordance with manufacturer specifications. Backfilling around the pool shell will be completed using clean #68 gravel only. No excavated soil will be used for backfilling against the pool shell. The pool shell will be filled with water at the same time as the backfilling process to maintain equalized pressure on the shell and ensure proper structural support during installation. A reinforced concrete bond beam will be installed around the perimeter of the pool.</p>
          <p><span className="font-semibold">e) Plumbing and Electrical Installation:</span> Excavation and trenching for plumbing and electrical lines will be performed. This includes the supply and installation of all necessary PVC piping, fittings, and electrical conduits for pool circulation, lighting, and equipment. All plumbing lines will be pressure tested prior to backfilling.</p>
          <p><span className="font-semibold">f) Equipment Installation:</span> Provision and installation of essential pool equipment including pumps, filters, and lighting systems, installed in accordance with manufacturer specifications and local code requirements.</p>
          <p><span className="font-semibold">g) Drainage and Groundwater Management:</span> A gravel drainage layer will be installed around the pool shell using #68 gravel to promote proper drainage and reduce hydrostatic pressure.</p>
          <p><span className="font-semibold">h) Backfill for Grading and Site Restoration:</span> Excavated soil will be reused for general site grading only and will not be used for backfilling around the pool shell. Soil used for grading will be spread, graded, and compacted in lifts of approximately 6 inches.</p>
          <p><span className="font-semibold">i) Completion and General Conditions:</span> Final connections and comprehensive testing of all plumbing and electrical systems will be performed to ensure proper operation.</p>
          <p><span className="font-semibold">j) Groundwater and Pool Uplift Disclaimer:</span> The homeowner acknowledges that fiberglass pools are subject to hydrostatic pressure from groundwater conditions. The contractor is not responsible for damage, movement, or floating of the pool shell caused by homeowner lowering or draining the pool without proper precautions.</p>

          <p className="font-semibold">1.2 Changes in Scope of Work:</p>
          <p>Any modifications to the scope of work during the project must be agreed upon in writing through a Change Order or Addendum. These changes may result in adjustments to both the cost and schedule of the project and require approval from both parties.</p>
          <p><span className="font-semibold">1.3 Written Document:</span> Any accepted modification must be formalized through a Change Order or Addendum detailing the new costs.</p>
          <p><span className="font-semibold">1.4 Signature and Approval:</span> Change Orders or Addendums require written approval and signatures from both parties before implementation.</p>
          <p><span className="font-semibold">1.5 Payment Terms:</span> Change Orders or Addendums must be paid 50% upon signing and the remaining 50% upon completion. Any agreements made with the sales agent must be formalized in writing and signed by both parties; verbal agreements will not be valid.</p>

          <p className="font-semibold">2. Timelines</p>
          <p><span className="font-semibold">2.1 Administrative Management:</span> Administrative management of your project will begin immediately after receiving the initial payment. This administrative phase is estimated to take approximately 6 weeks from receipt of the initial payment, subject to variations due to the engineer&apos;s workload and county permit processing times.</p>
          <p><span className="font-semibold">2.2 Project Execution:</span> The contractor will notify the client once construction permits are approved by the County. Once construction tasks commence on-site, completion is estimated to take approximately 60 calendar days, subject to external factors beyond the contractor&apos;s control.</p>
          <p><span className="font-semibold">2.3 Builder Trend Schedule:</span> Our team works hard to keep our clients updated on the progress of your project. This schedule reflects our projected schedule and may be updated by our field team at any time to reflect construction delays.</p>

          <p className="font-semibold">3. Payments</p>
          <p><span className="font-semibold">3.1 Regular Payment Schedule:</span></p>
          <ul className="list-disc ml-5 space-y-0.5">
            <li>10% Upon signing the contract.</li>
            <li>30% After permits are approved.</li>
            <li>30% Pool installation.</li>
            <li>20% Pool equipment set and start-up.</li>
            <li>10% Upon completion and approval of the project.</li>
          </ul>
          <p><span className="font-semibold">3.2 Financing Payment Schedule:</span> If financing is obtained through Lyon Financial or another institution, the payment schedule will be determined by that financial entity.</p>
          <p><span className="font-semibold">3.3 Available Payment Methods:</span> Check (payable to K&amp;D Contracting LLC), Credit Card (3% fee), ACH Payment (1% fee), or Direct Deposit for financed projects.</p>

          <p className="font-semibold">4. Site Conditions</p>
          <p>a) Property Access: The client agrees to provide safe and clear access to the property during construction hours. b) Access to Water and Electricity: The client will ensure continuous access to potable water and electricity. c) Clearing the Work Area: The client must clear the work area of any items that may interfere with construction. d) Pets: All pets must be kept away from the work area during construction. e) Underground Obstacles: The contractor is not responsible for damage to unforeseen underground obstacles.</p>

          <p className="font-semibold">5. Warranty and Liability</p>
          <p>a) Warranty Coverage: The contractor provides a warranty on labor and materials for one year from the date of completion. All equipment will be warranted by the manufacturer per the Magnuson Act, and K&amp;D will assist with all warranty claims.</p>
          <p><span className="font-semibold">5.1 Other Warranties:</span> Non-Transferrable: Tile — one year; Fiberglass — Lifetime (non-transferable); Pool Finish — Lifetime; Coping — one year. Transferrable: Auto Cover — three-year motor/components warranty, seven-year fabric warranty.</p>

          <p className="font-semibold">6. Termination</p>
          <p>The homeowner acknowledges that a portion of the contract price is allocated to planning, design, engineering, permitting, and administrative services, which are initiated the day after contract approval and receipt of deposit. All costs associated with these services become non-refundable once begun.</p>

          <p className="font-semibold">7. Dispute Resolution</p>
          <p>Any disputes will first be addressed through mediation before pursuing legal action in the appropriate jurisdiction.</p>

          <p className="font-semibold">8. Miscellaneous</p>
          <p>This contract constitutes the entire agreement between the parties and supersedes all prior agreements. Governing Law: State of Virginia.</p>

          <p className="font-semibold">Exclusions</p>
          <p>The following matters are excluded from the work unless specified in writing: a) Disposal of excavated dirt beyond 50&apos; of excavation site. b) Re-attachment of railings/fencing removed during construction. c) Damage to existing irrigation lines. d) Drainage and downspout extension damage. e) Painting and staining. f) Conduit and connections for utilities outside pool services. g) Damage to existing finishes unless caused by K&amp;D gross negligence. h) Sod, turf replacement, and topsoil. i) Relocating existing utilities. j) Repair of cut cable lines. k) Site unknowns including sub-surface conditions. l) Window/Door alarms required by code.</p>
        </div>

        {/* Signature block */}
        <div className="mt-10 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-600 mb-6">I confirm that my action here represents my electronic signature and is binding.</p>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="border-b border-gray-400 mb-1 h-8"></div>
              <p className="text-xs text-gray-500">Signature</p>
            </div>
            <div>
              <div className="border-b border-gray-400 mb-1 h-8"></div>
              <p className="text-xs text-gray-500">Date</p>
            </div>
            <div>
              <div className="border-b border-gray-400 mb-1 h-8"></div>
              <p className="text-xs text-gray-500">Print Name</p>
            </div>
          </div>
        </div>

      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #proposal-preview, #proposal-preview * { visibility: visible; }
          #proposal-preview { position: absolute; left: 0; top: 0; width: 100%; max-width: 100%; margin: 0; padding: 20px; box-shadow: none; }
        }
      `}</style>
    </>
  )
}

// ─── Builder component ────────────────────────────────────────────────────────

function ProposalBuilder() {
  const searchParams = useSearchParams()
  const proposalId = searchParams.get('proposalId')

  const [activeTab, setActiveTab] = useState<'builder' | 'preview'>('builder')
  const [sections, setSections] = useState<ProposalSection[]>([])
  const [proposalTitle, setProposalTitle] = useState('New Proposal')
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving' | 'error'>('saved')

  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false)
  const [templateError, setTemplateError] = useState<string | null>(null)

  // ─── Load proposal ─────────────────────────────────────────────────────────

  async function loadProposal() {
    if (!proposalId) return

    const { data: proposalData } = await supabase
      .from('proposals')
      .select('title')
      .eq('id', proposalId)
      .single()

    if (proposalData) setProposalTitle(proposalData.title || 'New Proposal')

    const { data: sectionsData } = await supabase
      .from('proposal_sections')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('created_at', { ascending: true })

    const { data: itemsData } = await supabase
      .from('proposal_items')
      .select('*')
      .eq('proposal_id', proposalId)

    const { data: rowsData } = await supabase
      .from('proposal_item_rows')
      .select('*')
      .eq('proposal_id', proposalId)

    const structured: ProposalSection[] = (sectionsData || []).map((section) => ({
      ...section,
      items: (itemsData || [])
        .filter((item) => item.section_id === section.id)
        .map((item) => ({
          ...item,
          rows: (rowsData || []).filter((row) => row.item_id === item.id),
        })),
    }))

    setSections(structured)
    setIsDirty(false)
    setSaveStatus('saved')
  }

  async function loadTemplates() {
    const { data, error } = await supabase
      .from('templates')
      .select('id, name, description')
      .order('created_at', { ascending: true })
    if (error) { console.error('Error loading templates:', error); return }
    setTemplates(data || [])
  }

  useEffect(() => {
    loadProposal()
    loadTemplates()
  }, [proposalId])

  // ─── Load template ─────────────────────────────────────────────────────────

  async function handleLoadTemplate() {
    if (!selectedTemplateId || !proposalId) return

    const confirmReplace = sections.length > 0
      ? window.confirm('This will replace all existing content in this proposal. Continue?')
      : true
    if (!confirmReplace) return

    setIsLoadingTemplate(true)
    setTemplateError(null)

    try {
      const { data: tSections, error: tsErr } = await supabase
        .from('template_sections').select('*')
        .eq('template_id', selectedTemplateId).order('sort_order', { ascending: true })
      if (tsErr) throw tsErr
      if (!tSections || tSections.length === 0) throw new Error('No sections found in this template.')

      const tSectionIds = tSections.map((s: any) => s.id)
      const { data: tItems, error: tiErr } = await supabase
        .from('template_items').select('*')
        .in('section_id', tSectionIds).order('sort_order', { ascending: true })
      if (tiErr) throw tiErr

      const catalogItemIds = (tItems || []).map((i: any) => i.catalog_item_id).filter(Boolean)
      const { data: catalogItems, error: ciErr } = catalogItemIds.length > 0
        ? await supabase.from('catalog_items').select('*').in('id', catalogItemIds)
        : { data: [], error: null }
      if (ciErr) throw ciErr

      const tItemIds = (tItems || []).map((i: any) => i.id)
      const { data: tRows, error: trErr } = tItemIds.length > 0
        ? await supabase.from('template_item_rows').select('*').in('item_id', tItemIds).order('sort_order', { ascending: true })
        : { data: [], error: null }
      if (trErr) throw trErr

      const catalogCostRowIds = (tRows || []).map((r: any) => r.catalog_cost_row_id).filter(Boolean)
      const { data: catalogCostRows, error: ccrErr } = catalogCostRowIds.length > 0
        ? await supabase.from('catalog_cost_rows').select('*').in('id', catalogCostRowIds)
        : { data: [], error: null }
      if (ccrErr) throw ccrErr

      await supabase.from('proposal_item_rows').delete().eq('proposal_id', proposalId)
      await supabase.from('proposal_items').delete().eq('proposal_id', proposalId)
      await supabase.from('proposal_sections').delete().eq('proposal_id', proposalId)

      const newSections = tSections.map((ts: any) => ({
        id: crypto.randomUUID(), proposal_id: proposalId, name: ts.name, _tid: ts.id,
      }))
      await supabase.from('proposal_sections').insert(newSections.map(({ _tid, ...r }) => r))

      const newItems: any[] = []
      for (const ts of tSections) {
        const ns = newSections.find((s: any) => s._tid === ts.id)
        if (!ns) continue
        for (const ti of (tItems || []).filter((i: any) => i.section_id === ts.id)) {
          const ci = (catalogItems || []).find((c: any) => c.id === ti.catalog_item_id)
          newItems.push({
            id: crypto.randomUUID(), proposal_id: proposalId, section_id: ns.id,
            name: ci?.name || '', description: ci?.description || '',
            display_quantity: toNumericOrNull(ti.display_quantity),
            display_unit: ti.display_unit || ci?.unit || '',
            _tid: ti.id,
          })
        }
      }
      await supabase.from('proposal_items').insert(newItems.map(({ _tid, ...r }) => r))

      const newRows: any[] = []
      for (const ti of (tItems || [])) {
        const ni = newItems.find((i: any) => i._tid === ti.id)
        if (!ni) continue
        for (const tr of (tRows || []).filter((r: any) => r.item_id === ti.id)) {
          const cr = (catalogCostRows || []).find((c: any) => c.id === tr.catalog_cost_row_id)
          newRows.push({
            id: crypto.randomUUID(), proposal_id: proposalId, item_id: ni.id,
            name: cr?.name || '', quantity: toNumericOrNull(tr.quantity) ?? 0,
            unit: cr?.unit || '', unit_cost: toNumericOrNull(cr?.unit_cost) ?? 0,
          })
        }
      }
      if (newRows.length > 0) await supabase.from('proposal_item_rows').insert(newRows)

      await loadProposal()
      setSelectedTemplateId('')
    } catch (err: any) {
      console.error('Template load failed:', err)
      setTemplateError(err.message || 'Something went wrong loading the template.')
    } finally {
      setIsLoadingTemplate(false)
    }
  }

  // ─── Update helpers ────────────────────────────────────────────────────────

  function updateItem(sectionIndex: number, itemIndex: number, field: keyof ProposalItem, value: any) {
    setSections((prev) => prev.map((s, si) => si !== sectionIndex ? s : {
      ...s, items: s.items.map((item, ii) => ii !== itemIndex ? item : { ...item, [field]: value })
    }))
    markDirty()
  }

  function updateRow(sectionIndex: number, itemIndex: number, rowIndex: number, field: keyof CostRow, value: any) {
    setSections((prev) => prev.map((s, si) => si !== sectionIndex ? s : {
      ...s, items: s.items.map((item, ii) => ii !== itemIndex ? item : {
        ...item, rows: item.rows.map((row, ri) => ri !== rowIndex ? row : { ...row, [field]: value })
      })
    }))
    markDirty()
  }

  function markDirty() { setIsDirty(true); setSaveStatus('unsaved') }

  // ─── Save ──────────────────────────────────────────────────────────────────

  async function saveProposal() {
    if (!proposalId || isSaving) return
    setIsSaving(true); setSaveStatus('saving')
    try {
      const total = sections.reduce((sT, s) => sT + s.items.reduce((iT, i) =>
        iT + i.rows.reduce((rT, r) => rT + Number(r.quantity || 0) * Number(r.unit_cost || 0), 0), 0), 0)

      await supabase.from('proposals').update({ title: proposalTitle, total_price: total }).eq('id', proposalId)

      await supabase.from('proposal_sections').upsert(
        sections.map((s) => ({ id: s.id, proposal_id: proposalId, name: s.name })), { onConflict: 'id' })

      const allItems = sections.flatMap((s) => s.items.map((item) => ({
        id: item.id, proposal_id: proposalId, section_id: s.id, name: item.name,
        description: item.description, display_quantity: toNumericOrNull(item.display_quantity),
        display_unit: item.display_unit,
      })))
      if (allItems.length > 0) await supabase.from('proposal_items').upsert(allItems, { onConflict: 'id' })

      const allRows = sections.flatMap((s) => s.items.flatMap((item) => item.rows.map((row) => ({
        id: row.id, proposal_id: proposalId, item_id: item.id, name: row.name,
        quantity: toNumericOrNull(row.quantity) ?? 0, unit: row.unit,
        unit_cost: toNumericOrNull(row.unit_cost) ?? 0,
      }))))
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
    } catch (err) {
      console.error('Save failed:', err); setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  const proposalTotal = sections.reduce((sT, s) => sT + s.items.reduce((iT, i) =>
    iT + i.rows.reduce((rT, r) => rT + Number(r.quantity || 0) * Number(r.unit_cost || 0), 0), 0), 0)

  if (!proposalId) return <p className="p-10 text-gray-400">No proposal ID provided.</p>

  return (
    <div className="flex min-h-screen bg-[#f4f7fb]">

      {/* SIDEBAR */}
      <aside className="w-60 bg-white border-r border-gray-100 p-6 shadow-sm flex-shrink-0 print:hidden">
        <h2 className="text-xl font-semibold mb-8">CRM</h2>
        <nav className="flex flex-col gap-3 text-sm">
          <Link href="/" className="text-gray-500 hover:text-blue-700">Dashboard</Link>
          <Link href="/leads" className="text-gray-500 hover:text-blue-700">Leads</Link>
          <Link href="/projects" className="text-gray-500 hover:text-blue-700">Projects</Link>
          <Link href="/catalog" className="text-gray-500 hover:text-blue-700">Catalog</Link>
          <Link href="/templates" className="text-gray-500 hover:text-blue-700">Templates</Link>
        </nav>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* TOP BAR */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-10 py-4 flex items-center justify-between shadow-sm print:hidden">
          <input
            className="text-xl font-semibold bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none px-1 py-0.5 transition-colors w-72"
            value={proposalTitle}
            onChange={(e) => { setProposalTitle(e.target.value); markDirty() }}
            placeholder="Proposal name"
          />

          <div className="flex items-center gap-3">
            {/* Tabs */}
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setActiveTab('builder')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'builder' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                Builder
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'preview' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                Preview
              </button>
            </div>

            <span className={`text-sm ${
              saveStatus === 'saved' ? 'text-green-600' :
              saveStatus === 'unsaved' ? 'text-amber-500' :
              saveStatus === 'saving' ? 'text-gray-400' : 'text-red-500'
            }`}>
              {saveStatus === 'saved' && '✓ Saved'}
              {saveStatus === 'unsaved' && '● Unsaved changes'}
              {saveStatus === 'saving' && 'Saving…'}
              {saveStatus === 'error' && '✕ Save failed'}
            </span>

            <button
              onClick={saveProposal}
              disabled={isSaving || !isDirty}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDirty && !isSaving ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {/* PREVIEW TAB */}
        {activeTab === 'preview' && (
          <div className="flex-1 overflow-y-auto bg-gray-100">
            <ProposalPreview proposalId={proposalId} proposalTitle={proposalTitle} />
          </div>
        )}

        {/* BUILDER TAB */}
        {activeTab === 'builder' && (
          <div className="p-10 overflow-y-auto">

            {/* Template loader */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8 shadow-sm">
              <p className="text-sm font-medium text-gray-600 mb-3">Load a template</p>
              <div className="flex items-center gap-3">
                <select
                  className="flex-1 border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                >
                  <option value="">— Select a template —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleLoadTemplate}
                  disabled={!selectedTemplateId || isLoadingTemplate}
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedTemplateId && !isLoadingTemplate ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isLoadingTemplate ? 'Loading…' : 'Load Template'}
                </button>
              </div>
              {templateError && <p className="mt-3 text-sm text-red-500">{templateError}</p>}
            </div>

            {sections.length === 0 && (
              <p className="text-gray-400">No data found for this proposal. Select a template above to get started.</p>
            )}

            {sections.map((section, sIndex) => (
              <div key={section.id} className="mb-10">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">{section.name}</h2>

                {section.items.map((item, iIndex) => {
                  const itemTotal = item.rows.reduce((sum, row) =>
                    sum + Number(row.quantity || 0) * Number(row.unit_cost || 0), 0)

                  return (
                    <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-5 mb-5 shadow-sm">

                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-400 uppercase mb-2">Display (customer-facing)</p>
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">Name</label>
                            <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                              value={item.name || ''} onChange={(e) => updateItem(sIndex, iIndex, 'name', e.target.value)} />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">Description</label>
                            <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                              value={item.description || ''} onChange={(e) => updateItem(sIndex, iIndex, 'description', e.target.value)} />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">Qty</label>
                            <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                              value={item.display_quantity || ''} onChange={(e) => updateItem(sIndex, iIndex, 'display_quantity', e.target.value)} />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">Unit</label>
                            <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                              value={item.display_unit || ''} onChange={(e) => updateItem(sIndex, iIndex, 'display_unit', e.target.value)} />
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-dashed border-gray-200 my-4" />

                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase mb-2">Cost rows (internal)</p>
                        {item.rows.length === 0 ? (
                          <p className="text-xs text-gray-400">No cost rows for this item.</p>
                        ) : (
                          <>
                            <div className="grid grid-cols-5 gap-3 mb-1 px-1">
                              <p className="text-xs text-gray-400">Name</p>
                              <p className="text-xs text-gray-400">Qty</p>
                              <p className="text-xs text-gray-400">Unit</p>
                              <p className="text-xs text-gray-400">Unit cost</p>
                              <p className="text-xs text-gray-400 text-right">Row total</p>
                            </div>
                            <div className="space-y-2">
                              {item.rows.map((row, rIndex) => {
                                const rowTotal = Number(row.quantity || 0) * Number(row.unit_cost || 0)
                                return (
                                  <div key={row.id} className="grid grid-cols-5 gap-3 items-center bg-gray-50 rounded-lg px-3 py-2">
                                    <p className="text-sm text-gray-600 truncate">{row.name}</p>
                                    <input type="number" className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                                      value={row.quantity === 0 || row.quantity === '0' ? '' : row.quantity || ''} placeholder="0"
                                      onChange={(e) => updateRow(sIndex, iIndex, rIndex, 'quantity', e.target.value)} />
                                    <p className="text-sm text-gray-500">{row.unit || '—'}</p>
                                    <p className="text-sm text-gray-500">${Number(row.unit_cost || 0).toFixed(2)}</p>
                                    <p className="text-sm font-medium text-right">${rowTotal.toFixed(2)}</p>
                                  </div>
                                )
                              })}
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex justify-end mt-4 pt-3 border-t border-gray-100">
                        <p className="text-sm font-semibold text-gray-700">
                          Item total: <span className="text-blue-600">${itemTotal.toFixed(2)}</span>
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}

            {sections.length > 0 && (
              <div className="flex justify-end mt-4">
                <div className="bg-white border border-gray-200 rounded-xl px-8 py-5 shadow-sm text-right">
                  <p className="text-sm text-gray-400 mb-1">Proposal total</p>
                  <p className="text-2xl font-semibold text-blue-600">${proposalTotal.toFixed(2)}</p>
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