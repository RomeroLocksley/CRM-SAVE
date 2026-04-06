import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    console.log('Webhook body preview:', body.substring(0, 300))

    let event: any = null

    // Try form-encoded first (json= field)
    const params = new URLSearchParams(body)
    const jsonPayload = params.get('json')

    if (jsonPayload) {
      console.log('Parsing form-encoded JSON')
      event = JSON.parse(jsonPayload)
    } else {
      // Try parsing body directly as JSON
      try {
        event = JSON.parse(body)
        console.log('Parsed body directly as JSON')
      } catch {
        console.log('Could not parse body as JSON either')
      }
    }

    if (!event) {
      console.log('No event parsed, returning')
      return new NextResponse('Hello API Event Received', { status: 200 })
    }

    const eventType = event?.event?.event_type
    const signatureRequest = event?.signature_request
    const signatureRequestId = signatureRequest?.signature_request_id

    console.log('Event type:', eventType)
    console.log('Signature request ID:', signatureRequestId)

    if (eventType === 'callback_test') {
      console.log('Callback test received')
      return new NextResponse('Hello API Event Received', { status: 200 })
    }

    if (eventType === 'signature_request_signed' && signatureRequestId) {
      console.log('Signed event — looking up proposal')

      const { data: proposal, error: findError } = await supabase
        .from('proposals')
        .select('id')
        .eq('signature_request_id', signatureRequestId)
        .single()

      console.log('Proposal lookup result:', proposal, 'Error:', findError)

      if (proposal) {
        const { error: updateError } = await supabase
          .from('proposals')
          .update({
            status: 'signed',
            signed_at: new Date().toISOString(),
          })
          .eq('id', proposal.id)

        console.log('Update result error:', updateError)
      } else {
        // Log all proposals to see what signature_request_ids exist
        const { data: allProposals } = await supabase
          .from('proposals')
          .select('id, signature_request_id, status')
        console.log('All proposals:', JSON.stringify(allProposals))
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
        console.log('Updated to viewed')
      }
    }

    return new NextResponse('Hello API Event Received', { status: 200 })

  } catch (err) {
    console.error('Webhook error:', err)
    return new NextResponse('Hello API Event Received', { status: 200 })
  }
}