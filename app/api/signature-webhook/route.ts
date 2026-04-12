import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function extractJsonFromMultipart(body: string): string | null {
  // Find the json field value in multipart form data
  // Look for: name="json"\r\n\r\n{...}\r\n
  const match = body.match(/name="json"\r?\n\r?\n([\s\S]*?)(\r?\n---)/)
  if (match) return match[1].trim()

  // Fallback: find anything that looks like a JSON object starting with {"signature_request"
  const jsonMatch = body.match(/(\{"signature_request"[\s\S]*?\})(\r?\n---)/)
  if (jsonMatch) return jsonMatch[1].trim()

  return null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    console.log('Webhook body preview:', body.substring(0, 200))

    let event: any = null

    // Check content type
    const contentType = req.headers.get('content-type') || ''
    console.log('Content-Type:', contentType)

    if (contentType.includes('multipart/form-data')) {
      // Parse multipart form data manually
      const jsonStr = extractJsonFromMultipart(body)
      console.log('Extracted JSON string:', jsonStr?.substring(0, 200))
      if (jsonStr) {
        try {
          event = JSON.parse(jsonStr)
        } catch (e) {
          console.error('Failed to parse extracted JSON:', e)
        }
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams(body)
      const jsonPayload = params.get('json')
      if (jsonPayload) event = JSON.parse(jsonPayload)
    } else {
      // Try direct JSON parse
      try {
        event = JSON.parse(body)
      } catch {
        // Try multipart as fallback
        const jsonStr = extractJsonFromMultipart(body)
        if (jsonStr) event = JSON.parse(jsonStr)
      }
    }

    if (!event) {
      console.log('Could not parse event')
      return new NextResponse('Hello API Event Received', { status: 200 })
    }

    const eventType = event?.event?.event_type
    const signatureRequest = event?.signature_request
    const signatureRequestId = signatureRequest?.signature_request_id

    console.log('Event type:', eventType)
    console.log('Signature request ID:', signatureRequestId)

    if (eventType === 'callback_test') {
      return new NextResponse('Hello API Event Received', { status: 200 })
    }

    if (eventType === 'signature_request_signed' && signatureRequestId) {
      console.log('Processing signed event for:', signatureRequestId)

      const { data: proposal, error: findError } = await supabase
        .from('proposals')
        .select('id, lead_id')
        .eq('signature_request_id', signatureRequestId)
        .single()

      console.log('Proposal found:', proposal, 'Error:', findError)

      if (proposal) {
        const { error: updateError } = await supabase
          .from('proposals')
          .update({
            status: 'signed',
            signed_at: new Date().toISOString(),
          })
          .eq('id', proposal.id)

        console.log('Update error:', updateError)

        // ─── Update lead status and result when signed ─────────────────────
        if (proposal.lead_id) {
          await supabase
            .from('leads')
            .update({
              status: 'proposal_sent',
              result: 'sold',
            })
            .eq('id', proposal.lead_id)
        }
      } else {
        const { data: allProposals } = await supabase
          .from('proposals')
          .select('id, signature_request_id, status')
        console.log('All proposals signature IDs:', JSON.stringify(allProposals?.map(p => ({ id: p.id, sig: p.signature_request_id, status: p.status }))))
      }
    }

    if (eventType === 'signature_request_viewed' && signatureRequestId) {
      const { data: proposal } = await supabase
        .from('proposals')
        .select('id, status')
        .eq('signature_request_id', signatureRequestId)
        .single()

      if (proposal && proposal.status === 'sent') {
        await supabase
          .from('proposals')
          .update({ status: 'viewed' })
          .eq('id', proposal.id)
      }
    }

    return new NextResponse('Hello API Event Received', { status: 200 })

  } catch (err) {
    console.error('Webhook error:', err)
    return new NextResponse('Hello API Event Received', { status: 200 })
  }
}