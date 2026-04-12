import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { proposalId } = await req.json()

    if (!proposalId) {
      return NextResponse.json({ error: 'Missing proposalId' }, { status: 400 })
    }

    // ─── Fetch proposal + lead ─────────────────────────────────────────────
    const { data: proposal, error: propErr } = await supabase
      .from('proposals')
      .select('*, leads(name, email, phone, address)')
      .eq('id', proposalId)
      .single()

    if (propErr || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    const lead = proposal.leads as any

    if (!lead?.email) {
      return NextResponse.json({ error: 'Lead has no email address. Please add an email before sending.' }, { status: 400 })
    }

    // ─── Fetch sections, items, rows ───────────────────────────────────────
    const { data: sections } = await supabase
      .from('proposal_sections')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('created_at', { ascending: true })

    const { data: items } = await supabase
      .from('proposal_items')
      .select('*')
      .eq('proposal_id', proposalId)

    const { data: rows } = await supabase
      .from('proposal_item_rows')
      .select('*')
      .eq('proposal_id', proposalId)

    // ─── Structure data ────────────────────────────────────────────────────
    const structured = (sections || []).map((section: any) => ({
      ...section,
      items: (items || [])
        .filter((item: any) => item.section_id === section.id)
        .map((item: any) => ({
          ...item,
          itemTotal: (rows || [])
            .filter((row: any) => row.item_id === item.id)
            .reduce((sum: number, row: any) => sum + Number(row.quantity || 0) * Number(row.unit_cost || 0), 0),
        })),
    }))

    const grandTotal = structured.reduce((sum: number, section: any) =>
      sum + section.items.reduce((iSum: number, item: any) => iSum + item.itemTotal, 0), 0)

    const printDate = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })

    // ─── Build sections HTML ───────────────────────────────────────────────
    const sectionsHtml = structured.map((section: any) => {
      const sectionTotal = section.items.reduce((sum: number, item: any) => sum + item.itemTotal, 0)

      const rowsHtml = section.items.map((item: any) => {
        let qtyUnit = ''
        if (item.display_quantity && Number(item.display_quantity) !== 0) {
          qtyUnit = String(item.display_quantity)
          if (item.display_unit) qtyUnit += ` ${item.display_unit}`
        } else if (item.display_unit) {
          qtyUnit = item.display_unit
        }

        return `
          <tr>
            <td style="padding:6px 10px;border:1px solid #ddd;font-weight:600;vertical-align:top;">${item.name || ''}</td>
            <td style="padding:6px 10px;border:1px solid #ddd;color:#555;vertical-align:top;white-space:pre-line;">${item.description || ''}</td>
            <td style="padding:6px 10px;border:1px solid #ddd;vertical-align:top;">${qtyUnit}</td>
          </tr>`
      }).join('')

      return `
        <h3 style="color:#1a3a5c;font-size:13px;text-transform:uppercase;margin:20px 0 6px;">${section.name}</h3>
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:4px;">
          <thead>
            <tr style="background:#e8f0f7;">
              <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;color:#1a3a5c;width:28%;">Items</th>
              <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;color:#1a3a5c;width:57%;">Description</th>
              <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;color:#1a3a5c;width:15%;">Qty/Unit</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
          <tfoot>
            <tr style="background:#e8f0f7;">
              <td colspan="2" style="padding:6px 10px;border:1px solid #ddd;font-weight:700;color:#1a3a5c;">${section.name.toUpperCase()} Total:</td>
              <td style="padding:6px 10px;border:1px solid #ddd;font-weight:700;color:#1a3a5c;text-align:right;">$${sectionTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tfoot>
        </table>`
    }).join('')

    // ─── Terms and conditions HTML ─────────────────────────────────────────
    const tcText = proposal.terms_and_conditions || ''
    const tcHtml = tcText
      ? tcText
          .split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0)
          .map((line: string) => `<p style="margin:4px 0;">${line}</p>`)
          .join('')
      : '<p style="color:#999;">No terms and conditions provided.</p>'

    // ─── Build full HTML document ──────────────────────────────────────────
    const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${proposal.title || 'Proposal'}</title></head>
<body style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#333;font-size:12px;">

  <div style="text-align:center;margin-bottom:16px;">
    <p style="font-size:20px;font-weight:700;color:#1a3a5c;margin:0;">K&amp;D Contracting LLC</p>
    <p style="font-size:12px;color:#666;margin:4px 0;">4611 Carr Dr &bull; Fredericksburg, VA 22408 &bull; Phone: (540) 940-0002</p>
  </div>

  <hr style="border-color:#1a3a5c;border-width:2px;margin:12px 0;" />

  <div style="display:flex;justify-content:space-between;margin-bottom:16px;">
    <div>
      <p style="margin:2px 0;font-weight:600;">${lead.name}</p>
      <p style="margin:2px 0;color:#555;">Cell: ${lead.phone || ''}</p>
      <p style="margin:8px 0 2px;font-weight:600;">Job Address:</p>
      <p style="margin:2px 0;color:#555;">${lead.address || ''}</p>
    </div>
    <div style="text-align:right;">
      <p style="margin:2px 0;"><strong>Print Date:</strong> ${printDate}</p>
    </div>
  </div>

  <h1 style="font-size:22px;color:#1a3a5c;margin:0 0 12px;">${proposal.title || 'Proposal'}</h1>

  <div style="margin-bottom:16px;">
    <p style="font-weight:700;margin:0 0 4px;">CONTRACT SERVICES</p>
    <p style="font-weight:600;margin:0 0 6px;">Description of the Services:</p>
    <p style="color:#555;line-height:1.5;">The Contractor agrees to provide the following goods and services (collectively "Services") to the Customer described in detail below or more specifically outlined in the proposal section of this Agreement.</p>
  </div>

  <hr style="border-color:#ddd;margin:12px 0;" />

  ${sectionsHtml}

  <hr style="border-color:#1a3a5c;margin:16px 0;" />
  <p style="text-align:right;font-size:16px;font-weight:700;color:#1a3a5c;">
    Total Price: $${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
  </p>

  <hr style="border-color:#ddd;margin:16px 0;" />

  <div style="font-size:10px;color:#444;line-height:1.7;">
    <p style="font-weight:700;font-size:12px;color:#1a3a5c;margin-bottom:8px;">Terms and Conditions</p>
    ${tcHtml}
  </div>

  <div style="margin-top:30px;padding-top:16px;border-top:1px solid #ddd;">
    <p style="font-size:11px;color:#555;">I confirm that my action here represents my electronic signature and is binding.</p>
  </div>

</body>
</html>`

    // ─── Send to Dropbox Sign ──────────────────────────────────────────────
    const formData = new FormData()
    formData.append('title', proposal.title || 'Proposal')
    formData.append('subject', `Please review and sign: ${proposal.title || 'Proposal'}`)
    formData.append('message', `Hi ${lead.name}, please review and sign your proposal from K&D Contracting LLC.`)
    formData.append('signers[0][email_address]', lead.email)
    formData.append('signers[0][name]', lead.name)
    formData.append('signers[0][order]', '0')
    formData.append('files[0]', new Blob([htmlContent], { type: 'text/html' }), 'proposal.html')
    formData.append('test_mode', '1') // Remove this when going live

    const response = await fetch('https://api.hellosign.com/v3/signature_request/send', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(process.env.DROPBOX_SIGN_API_KEY + ':').toString('base64')}`,
      },
      body: formData,
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('Dropbox Sign error:', result)
      return NextResponse.json({ error: result?.error?.error_msg || 'Failed to send signature request' }, { status: 500 })
    }

    const signatureRequestId = result.signature_request?.signature_request_id

    // ─── Update proposal status ────────────────────────────────────────────
    await supabase
      .from('proposals')
      .update({
        status: 'sent',
        signature_request_id: signatureRequestId,
      })
      .eq('id', proposalId)

    // ─── Update lead status to proposal_sent ──────────────────────────────
    if (proposal.lead_id) {
      await supabase
        .from('leads')
        .update({ status: 'proposal_sent' })
        .eq('id', proposal.lead_id)
    }

    return NextResponse.json({ success: true, signatureRequestId })

  } catch (err: any) {
    console.error('Send for signature error:', err)
    return NextResponse.json({ error: err.message || 'Something went wrong' }, { status: 500 })
  }
}