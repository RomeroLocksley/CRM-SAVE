import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    console.log('Webhook raw body:', body.substring(0, 500))

    // Dropbox Sign sends form-encoded data with a 'json' field
    const params = new URLSearchParams(body)
    const jsonPayload = params.get('json')

    console.log('JSON payload:', jsonPayload?.substring(0, 500))

    if (!jsonPayload) {
      console.log('No json payload found, returning early')
      return new NextResponse('Hello API Event Received', { status: 200 })
    }

    const event = JSON.parse(jsonPayload)
    const eventType = event?.event?.event_type
    const signatureRequest = event?.signature_request
    const signatureRequestId = signatureRequest?.signature_request_id

    console.log('Event type:', eventType)
    console.log('Signature request ID from webhook:', signatureRequestId)

    if (eventType === 'callback_test') {
      return new NextResponse('Hello API Event Received', { status: 200 })
    }

    if (eventType === 'signature_request_signed' && signatureRequestId) {
      console.log('Looking for proposal with signature_request_id:', signatureRequestId)

      const { data: proposal, error } = await supabase
        .from('proposals')
        .select('id')
        .eq('signature_request_id', signatureRequestId)
        .single()

      console.log('Proposal found:', proposal, 'Error:', error)

      if (proposal) {
        const { error: updateError } = await supabase
          .from('proposals')
          .update({
            status: 'signed',
            signed_at: new Date().toISOString(),
          })
          .eq('id', proposal.id)

        console.log('Update error:', updateError)
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