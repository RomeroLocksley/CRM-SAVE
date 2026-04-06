import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()

    // Dropbox Sign sends form-encoded data
    const params = new URLSearchParams(body)
    const jsonPayload = params.get('json')

    if (!jsonPayload) {
      return new NextResponse('Hello API Event Received', { status: 200 })
    }

    const event = JSON.parse(jsonPayload)
    const eventType = event?.event?.event_type
    const signatureRequest = event?.signature_request
    const signatureRequestId = signatureRequest?.signature_request_id

    // Dropbox Sign requires this exact response to confirm receipt
    if (eventType === 'callback_test') {
      return new NextResponse('Hello API Event Received', { status: 200 })
    }

    if (eventType === 'signature_request_signed' && signatureRequestId) {
      // Find the proposal with this signature request ID
      const { data: proposal } = await supabase
        .from('proposals')
        .select('id')
        .eq('signature_request_id', signatureRequestId)
        .single()

      if (proposal) {
        await supabase
          .from('proposals')
          .update({
            status: 'signed',
            signed_at: new Date().toISOString(),
          })
          .eq('id', proposal.id)
      }
    }

    if (eventType === 'signature_request_viewed' && signatureRequestId) {
      // Optionally track when the client viewed the proposal
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
    // Still return 200 so Dropbox Sign doesn't keep retrying
    return new NextResponse('Hello API Event Received', { status: 200 })
  }
}