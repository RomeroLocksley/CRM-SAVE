'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const SOURCES = [
  'Referral', 'Google Call In', 'Google Website Form', 'Barrier Reef',
  'Facebook', 'Instagram', 'TikTok', 'YouTube', 'Vehicle Wrap', 'Other',
]

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length === 0) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

declare global {
  interface Window { google: any; initGooglePlaces: () => void }
}

export default function AddLeadModal({ onClose, onSaved, serviceOptions }: {
  onClose: () => void
  onSaved: () => void
  serviceOptions: string[]
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [service, setService] = useState('')
  const [source, setSource] = useState('')
  const [saving, setSaving] = useState(false)

  const addressInputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)

  const inputStyle = {
    width: '100%', boxSizing: 'border-box' as const,
    padding: '10px 12px', borderRadius: 12,
    border: '0.5px solid #e5e5e5', background: '#fafafa',
    fontSize: 14, outline: 'none',
  }

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
    if (!apiKey || !addressInputRef.current) return

    function initAutocomplete() {
      if (!window.google?.maps?.places || !addressInputRef.current) return
      try {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          addressInputRef.current,
          { componentRestrictions: { country: 'us' }, types: ['address'], fields: ['formatted_address'] }
        )
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current.getPlace()
          if (place?.formatted_address) {
            setAddress(place.formatted_address)
          }
        })
      } catch (err) {
        console.error('Autocomplete error:', err)
      }
    }

    if (window.google?.maps?.places) {
      initAutocomplete()
    } else {
      // Load script if not already loaded
      const existingScript = document.getElementById('google-maps-script')
      if (!existingScript) {
        window.initGooglePlaces = initAutocomplete
        const script = document.createElement('script')
        script.id = 'google-maps-script'
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGooglePlaces`
        script.async = true
        script.defer = true
        document.head.appendChild(script)
      } else {
        // Script already loading — poll for ready
        const interval = setInterval(() => {
          if (window.google?.maps?.places) {
            clearInterval(interval)
            initAutocomplete()
          }
        }, 100)
        setTimeout(() => clearInterval(interval), 10000)
      }
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)

    // If user typed something in address field but didn't pick from dropdown, use what they typed
    const finalAddress = address || addressInputRef.current?.value || ''

    await supabase.from('leads').insert([{
      name: name.trim(),
      email: email.trim() || null,
      phone: phone || null,
      address: finalAddress.trim() || null,
      service: service || null,
      source: source || null,
      status: 'uncontacted',
    }])
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div
        style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 -10px 40px rgba(0,0,0,0.15)' }}
        className="md:rounded-[20px] md:max-w-[460px] md:m-4 md:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar for mobile */}
        <div className="md:hidden sticky top-0 bg-white pt-3 pb-1 z-10">
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e0e0e0', margin: '0 auto' }} />
        </div>

        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#1a1a2e' }}>New Lead</p>
            <button onClick={onClose} style={{ color: '#ccc', background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '0 24px 40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>

            <div>
              <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Full Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Smith" required style={inputStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@email.com" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Phone</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(703) 123-4567" style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Address</label>
              <input
                ref={addressInputRef}
                type="text"
                placeholder="Start typing an address…"
                onChange={(e) => setAddress(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Service</label>
                <select value={service} onChange={(e) => setService(e.target.value)} style={{ ...inputStyle, color: service ? '#1a1a2e' : '#aaa' }}>
                  <option value="">— Select —</option>
                  {serviceOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 4 }}>Source</label>
                <select value={source} onChange={(e) => setSource(e.target.value)} style={{ ...inputStyle, color: source ? '#1a1a2e' : '#aaa' }}>
                  <option value="">— Select —</option>
                  {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          <button type="submit" disabled={saving || !name.trim()}
            style={{ width: '100%', padding: '13px', borderRadius: 12, background: name.trim() ? '#185FA5' : '#f0f0f0', color: name.trim() ? 'white' : '#bbb', fontWeight: 500, fontSize: 15, border: 'none', cursor: name.trim() ? 'pointer' : 'not-allowed' }}>
            {saving ? 'Saving…' : 'Add Lead'}
          </button>
        </form>
      </div>
    </div>
  )
}