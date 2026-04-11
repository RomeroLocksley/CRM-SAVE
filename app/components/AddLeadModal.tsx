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
  interface Window { google: any }
}

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.places?.PlaceAutocompleteElement) { resolve(); return }
    if (document.getElementById('google-maps-script')) {
      const interval = setInterval(() => {
        if (window.google?.maps?.places?.PlaceAutocompleteElement) { clearInterval(interval); resolve() }
      }, 100)
      setTimeout(() => { clearInterval(interval); reject(new Error('Timeout')) }, 10000)
      return
    }
    const script = document.createElement('script')
    script.id = 'google-maps-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&v=weekly`
    script.async = true
    script.onload = () => {
      const interval = setInterval(() => {
        if (window.google?.maps?.places?.PlaceAutocompleteElement) { clearInterval(interval); resolve() }
      }, 100)
      setTimeout(() => { clearInterval(interval); resolve() }, 3000)
    }
    script.onerror = () => reject(new Error('Script load failed'))
    document.head.appendChild(script)
  })
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
  const [placesReady, setPlacesReady] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  const inputStyle = {
    width: '100%', boxSizing: 'border-box' as const,
    padding: '10px 12px', borderRadius: 12,
    border: '0.5px solid #e5e5e5', background: '#fafafa',
    fontSize: 14, outline: 'none',
  }

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
    if (!apiKey) return

    loadGoogleMapsScript(apiKey).then(() => {
      if (!containerRef.current) return
      if (!window.google?.maps?.places?.PlaceAutocompleteElement) return

      try {
        const el = new window.google.maps.places.PlaceAutocompleteElement({
          componentRestrictions: { country: 'us' },
          types: ['address'],
        })

        // Match our input styling via inline style on the custom element
        el.style.cssText = `
          width: 100%;
          --gmpx-color-surface: #fafafa;
          --gmpx-font-size-base: 14px;
        `

        containerRef.current.innerHTML = ''
        containerRef.current.appendChild(el)
        setPlacesReady(true)

        el.addEventListener('gmp-placeselect', async (e: any) => {
          try {
            const place = e.placePrediction.toPlace()
            await place.fetchFields({ fields: ['formattedAddress'] })
            setAddress(place.formattedAddress || '')
          } catch {
            // fallback
          }
        })
      } catch (err) {
        console.error('PlaceAutocompleteElement error:', err)
      }
    }).catch((err) => {
      console.error('Failed to load Google Maps:', err)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await supabase.from('leads').insert([{
      name: name.trim(),
      email: email.trim() || null,
      phone: phone || null,
      address: address.trim() || null,
      service: service || null,
      source: source || null,
      status: 'uncontacted',
    }])
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 460, margin: '0 16px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}>

        <div style={{ padding: '24px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#1a1a2e' }}>New Lead</p>
            <button onClick={onClose} style={{ color: '#ccc', background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '0 24px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>

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
              {/* Google PlaceAutocompleteElement mounts here */}
              <div ref={containerRef} style={{ width: '100%', minHeight: 42 }} />
              {/* Fallback plain input if Places not ready */}
              {!placesReady && (
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Start typing an address…"
                  style={{ ...inputStyle, marginTop: -42 }}
                />
              )}
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
            style={{ width: '100%', padding: '11px', borderRadius: 12, background: name.trim() ? '#185FA5' : '#f0f0f0', color: name.trim() ? 'white' : '#bbb', fontWeight: 500, fontSize: 14, border: 'none', cursor: name.trim() ? 'pointer' : 'not-allowed', marginTop: 4 }}>
            {saving ? 'Saving…' : 'Add Lead'}
          </button>
        </form>
      </div>
    </div>
  )
}